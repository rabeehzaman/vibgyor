"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowLeftRight,
  Plus,
  Send,
  Trash2,
  User,
  CheckCircle2,
  Clock,
  Search,
} from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useApp } from "@/context/AppContext";
import {
  generateTicketId,
  generateReferenceNumber,
} from "@/lib/ticket-utils";
import { TICKET_TYPE_DEFAULT_PRIORITY } from "@/lib/constants";
import { CustomerBeneficiary, Ticket } from "@/lib/types";
import {
  fetchCustomerBeneficiariesByUserId,
  insertCustomerBeneficiary,
  deleteCustomerBeneficiary,
} from "@/lib/supabase-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PinDialog } from "@/components/customer/PinDialog";

type Step = "select" | "form" | "review";

interface PendingTransfer {
  beneficiary: CustomerBeneficiary;
  amount: number;
  fromAccount: string;
}

type FromAccountType = "SD" | "DD" | "RD" | "FD" | "Other";

const FROM_ACCOUNT_TYPES: { value: FromAccountType; label: string }[] = [
  { value: "SD", label: "Savings (SD)" },
  { value: "DD", label: "Daily Deposit (DD)" },
  { value: "RD", label: "Recurring Deposit (RD)" },
  { value: "FD", label: "Fixed Deposit (FD)" },
  { value: "Other", label: "Other" },
];

export default function CustomerTransferPage() {
  const { customer, isLoading } = useCustomerAuth();
  const { tickets, addTicket } = useApp();
  const router = useRouter();

  const [beneficiaries, setBeneficiaries] = useState<CustomerBeneficiary[]>([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(true);

  const [step, setStep] = useState<Step>("select");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [fromAccountType, setFromAccountType] = useState<FromAccountType>("SD");
  const [fromAccountNumber, setFromAccountNumber] = useState("");
  const [search, setSearch] = useState("");

  // Default the "from account number" to the customer's registered account
  useEffect(() => {
    if (customer && !fromAccountNumber) setFromAccountNumber(customer.accountNumber);
  }, [customer, fromAccountNumber]);

  const [addOpen, setAddOpen] = useState(false);
  const [newBen, setNewBen] = useState({
    nickname: "",
    beneficiaryName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });
  const [benError, setBenError] = useState("");
  const [submittingBen, setSubmittingBen] = useState(false);

  const [pinOpen, setPinOpen] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);

  const [successRef, setSuccessRef] = useState<string | null>(null);

  // ─── Auth gate ─────────────────────────────────
  useEffect(() => {
    if (!isLoading && !customer) router.replace("/customer/login");
  }, [isLoading, customer, router]);

  // ─── Load this customer's beneficiaries ─────────
  useEffect(() => {
    if (!customer) return;
    setLoadingBeneficiaries(true);
    fetchCustomerBeneficiariesByUserId(customer.id)
      .then((list) => setBeneficiaries(list))
      .finally(() => setLoadingBeneficiaries(false));
  }, [customer]);

  const filteredBeneficiaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return beneficiaries;
    return beneficiaries.filter(
      (b) =>
        b.nickname.toLowerCase().includes(q) ||
        b.beneficiaryName.toLowerCase().includes(q) ||
        b.accountNumber.toLowerCase().includes(q)
    );
  }, [beneficiaries, search]);

  const myTransfers = useMemo(() => {
    if (!customer) return [];
    return tickets
      .filter(
        (t) => t.type === "TransferRequest" && t.customerMobile === customer.mobile
      )
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10);
  }, [tickets, customer]);

  if (isLoading || !customer) return null;

  const selectedBeneficiary =
    beneficiaries.find((b) => b.id === selectedBeneficiaryId) ?? null;

  const handlePickBeneficiary = (b: CustomerBeneficiary) => {
    setSelectedBeneficiaryId(b.id);
    setStep("form");
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenError("");
    if (!newBen.nickname.trim() || !newBen.beneficiaryName.trim() || !newBen.accountNumber.trim() || !newBen.ifscCode.trim()) {
      setBenError("Please fill in all required fields");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(newBen.ifscCode.trim())) {
      setBenError("IFSC code looks invalid (e.g. SBIN0001234)");
      return;
    }

    setSubmittingBen(true);
    const ben: CustomerBeneficiary = {
      id: `cb_${Date.now()}`,
      customerUserId: customer.id,
      nickname: newBen.nickname.trim(),
      beneficiaryName: newBen.beneficiaryName.trim(),
      accountNumber: newBen.accountNumber.trim(),
      ifscCode: newBen.ifscCode.trim().toUpperCase(),
      bankName: newBen.bankName.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    try {
      await insertCustomerBeneficiary(ben);
      setBeneficiaries((prev) => [...prev, ben]);
      setNewBen({ nickname: "", beneficiaryName: "", accountNumber: "", ifscCode: "", bankName: "" });
      setAddOpen(false);
      setSelectedBeneficiaryId(ben.id);
      setStep("form");
    } catch (err) {
      console.error(err);
      setBenError("Could not save beneficiary. Try again.");
    } finally {
      setSubmittingBen(false);
    }
  };

  const handleDeleteBeneficiary = async (id: string) => {
    await deleteCustomerBeneficiary(id);
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    if (selectedBeneficiaryId === id) {
      setSelectedBeneficiaryId(null);
      setStep("select");
    }
  };

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (
      !selectedBeneficiary ||
      !Number.isFinite(amt) ||
      amt <= 0 ||
      !fromAccountNumber.trim()
    )
      return;
    setStep("review");
  };

  const handleConfirmTransfer = () => {
    if (!selectedBeneficiary) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setPendingTransfer({
      beneficiary: selectedBeneficiary,
      amount: amt,
      fromAccount: `${fromAccountType} • ${fromAccountNumber.trim()}`,
    });
    setPinOpen(true);
  };

  const handlePinSuccess = () => {
    setPinOpen(false);
    if (!pendingTransfer) return;

    const now = new Date().toISOString();
    const refNumber = generateReferenceNumber(tickets);
    const ticket: Ticket = {
      id: generateTicketId(),
      referenceNumber: refNumber,
      type: "TransferRequest",
      status: "Open",
      priority: TICKET_TYPE_DEFAULT_PRIORITY.TransferRequest,
      customerName: customer.name,
      customerMobile: customer.mobile,
      accountNumber: customer.accountNumber,
      details: {
        fromAccount: pendingTransfer.fromAccount,
        toAccount: pendingTransfer.beneficiary.accountNumber,
        toName: pendingTransfer.beneficiary.beneficiaryName,
        toIFSC: pendingTransfer.beneficiary.ifscCode,
        ...(pendingTransfer.beneficiary.bankName
          ? { toBank: pendingTransfer.beneficiary.bankName }
          : {}),
        amount: pendingTransfer.amount,
        nickname: pendingTransfer.beneficiary.nickname,
      },
      createdAt: now,
      updatedAt: now,
      replies: [],
    };
    addTicket(ticket);
    setSuccessRef(refNumber);
    setAmount("");
    setSelectedBeneficiaryId(null);
    setPendingTransfer(null);
    setStep("select");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/customer"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="animate-fade-in relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.40_0.22_265)] to-[oklch(0.50_0.20_290)] p-6 text-white shadow-lg">
        <div className="relative z-10 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Fund Transfer</h1>
            <p className="mt-1 text-sm text-white/80">
              Send money to your saved beneficiaries — secured by your 4-digit PIN.
            </p>
          </div>
        </div>
        <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/5" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column: 3-step flow */}
        <div className="space-y-4 lg:col-span-2">
          {/* Stepper */}
          <Stepper step={step} />

          {step === "select" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                <CardTitle className="text-base">Select Beneficiary</CardTitle>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> New Beneficiary
                </Button>
              </CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name or account..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loadingBeneficiaries ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Loading beneficiaries...
                  </div>
                ) : filteredBeneficiaries.length === 0 ? (
                  <div className="py-12 text-center">
                    <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {beneficiaries.length === 0
                        ? "No beneficiaries yet. Add one to get started."
                        : "No beneficiaries match your search."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredBeneficiaries.map((b) => (
                      <BeneficiaryRow
                        key={b.id}
                        beneficiary={b}
                        onSelect={() => handlePickBeneficiary(b)}
                        onDelete={() => handleDeleteBeneficiary(b.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "form" && selectedBeneficiary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Transfer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Sending to</p>
                  <p className="font-semibold">{selectedBeneficiary.nickname}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBeneficiary.beneficiaryName} •{" "}
                    {maskAccount(selectedBeneficiary.accountNumber)} •{" "}
                    {selectedBeneficiary.ifscCode}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("select")}
                    className="mt-1 text-xs text-primary hover:underline"
                  >
                    Change beneficiary
                  </button>
                </div>

                <form onSubmit={handleContinueToReview} className="space-y-4">
                  <div>
                    <Label>From Account *</Label>
                    <p className="mt-0.5 mb-1.5 text-xs text-muted-foreground">
                      Choose which of your accounts to transfer from.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={fromAccountType}
                        onValueChange={(v) => setFromAccountType(v as FromAccountType)}
                      >
                        <SelectTrigger className="col-span-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FROM_ACCOUNT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="col-span-2"
                        value={fromAccountNumber}
                        onChange={(e) => setFromAccountNumber(e.target.value)}
                        placeholder="Account number"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("select")}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={
                        !amount || Number(amount) <= 0 || !fromAccountNumber.trim()
                      }
                    >
                      Review
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {step === "review" && selectedBeneficiary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Review &amp; Confirm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-lg border p-4">
                  <Row
                    label="From"
                    value={`${fromAccountType} • ${fromAccountNumber}`}
                    mono
                  />
                  <div className="border-t pt-3">
                    <Row label="To" value={selectedBeneficiary.nickname} />
                  </div>
                  <Row label="Beneficiary Name" value={selectedBeneficiary.beneficiaryName} />
                  <Row label="Account Number" value={selectedBeneficiary.accountNumber} mono />
                  <Row label="IFSC Code" value={selectedBeneficiary.ifscCode} mono />
                  {selectedBeneficiary.bankName && (
                    <Row label="Bank" value={selectedBeneficiary.bankName} />
                  )}
                  <div className="border-t pt-3">
                    <Row
                      label="Amount"
                      value={`₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      strong
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                  You&apos;ll be asked for your 4-digit PIN to authorize this transfer.
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleConfirmTransfer}>
                    <Send className="mr-1.5 h-4 w-4" /> Confirm Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: recent transfers */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              {myTransfers.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  No transfers yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {myTransfers.map((t) => {
                    const toLabel = String(
                      t.details.nickname ?? t.details.toName ?? "Beneficiary"
                    );
                    const amt = Number(t.details.amount) || 0;
                    return (
                      <Link
                        key={t.id}
                        href={`/customer/ticket/${t.id}`}
                        className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{toLabel}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {t.referenceNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              ₹{amt.toLocaleString("en-IN")}
                            </p>
                            <StatusBadge status={t.status} dot />
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {format(new Date(t.createdAt), "dd MMM yyyy, hh:mm a")}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add beneficiary dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) { setAddOpen(false); setBenError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Beneficiary</DialogTitle>
            <DialogDescription>
              Save a beneficiary so you can transfer to them quickly next time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBeneficiary} className="space-y-3">
            {benError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {benError}
              </div>
            )}
            <div>
              <Label htmlFor="nickname">Nickname *</Label>
              <Input
                id="nickname"
                value={newBen.nickname}
                onChange={(e) => setNewBen({ ...newBen, nickname: e.target.value })}
                placeholder="e.g. Ahmed - Brother"
                required
              />
            </div>
            <div>
              <Label htmlFor="ben-name">Beneficiary Name *</Label>
              <Input
                id="ben-name"
                value={newBen.beneficiaryName}
                onChange={(e) => setNewBen({ ...newBen, beneficiaryName: e.target.value })}
                placeholder="Full name as on bank record"
                required
              />
            </div>
            <div>
              <Label htmlFor="ben-account">Account Number *</Label>
              <Input
                id="ben-account"
                value={newBen.accountNumber}
                onChange={(e) => setNewBen({ ...newBen, accountNumber: e.target.value })}
                placeholder="Account number"
                required
              />
            </div>
            <div>
              <Label htmlFor="ben-ifsc">IFSC Code *</Label>
              <Input
                id="ben-ifsc"
                value={newBen.ifscCode}
                onChange={(e) => setNewBen({ ...newBen, ifscCode: e.target.value.toUpperCase() })}
                placeholder="e.g. SBIN0001234"
                required
                className="uppercase"
              />
            </div>
            <div>
              <Label htmlFor="ben-bank">Bank Name</Label>
              <Input
                id="ben-bank"
                value={newBen.bankName}
                onChange={(e) => setNewBen({ ...newBen, bankName: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submittingBen}>
                {submittingBen ? "Saving..." : "Save Beneficiary"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIN dialog */}
      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={handlePinSuccess}
        actionLabel="Fund Transfer"
      />

      {/* Success dialog */}
      <Dialog
        open={successRef !== null}
        onOpenChange={(v) => { if (!v) setSuccessRef(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center">Transfer Submitted</DialogTitle>
            <DialogDescription className="text-center">
              Your fund transfer request has been received. Track it with the
              reference number below.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">Reference Number</p>
            <p className="mt-0.5 font-mono text-lg font-bold">{successRef}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSuccessRef(null)}
            >
              New Transfer
            </Button>
            <Button asChild className="flex-1">
              <Link href="/customer">Back to Dashboard</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "select", label: "Beneficiary" },
    { id: "form", label: "Details" },
    { id: "review", label: "Confirm" },
  ];
  const activeIdx = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                    ? "bg-primary/30 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${isDone ? "bg-primary/40" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BeneficiaryRow({
  beneficiary,
  onSelect,
  onDelete,
}: {
  beneficiary: CustomerBeneficiary;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{beneficiary.nickname}</p>
            {beneficiary.bankName && (
              <Badge variant="outline" className="text-[10px]">
                {beneficiary.bankName}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {beneficiary.beneficiaryName} •{" "}
            {maskAccount(beneficiary.accountNumber)} • {beneficiary.ifscCode}
          </p>
        </div>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onDelete}
        aria-label="Delete beneficiary"
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono" : ""} ${strong ? "text-lg font-bold" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

function maskAccount(account: string): string {
  if (account.length <= 4) return account;
  return `****${account.slice(-4)}`;
}
