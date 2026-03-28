"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState, useCallback } from "react";
import { format, parseISO, subDays } from "date-fns";
import { STAFF_MEMBERS } from "@/lib/constants";
import { FundTransfer, Beneficiary, TransferStatus, BankAccount, ProfitPeriodType } from "@/lib/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, ArrowLeftRight, CheckCircle2, Clock, AlertTriangle, ChevronsUpDown, Check, UserPlus, Landmark, Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";
import BankBook from "@/components/accountant/BankBook";
import NetProfitCalculator from "@/components/accountant/NetProfitCalculator";
import { createEmptyDailyBankBookState } from "@/lib/bank-book-utils";

const MOCK_BALANCE = 2500000;

const statusVariant: Record<TransferStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Processed: "bg-blue-100 text-blue-700 border-blue-200",
  Done: "bg-green-100 text-green-700 border-green-200",
};

export default function AccountantPage() {
  const {
    selectedDate, selectedDateEnd, entryDate, fundTransfers, addFundTransfer, updateTransferStatus,
    beneficiaries, addBeneficiary,
    bankAccounts, addBankAccount, dailyBankBookStates, saveDailyBankBookState,
    profitReports, saveProfitReport,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [newBeneficiaryOpen, setNewBeneficiaryOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [beneficiaryErrors, setBeneficiaryErrors] = useState<Record<string, boolean>>({});
  const { toast, showToast, hideToast } = useToast();

  // Net Profit state
  const [profitPeriodType, setProfitPeriodType] = useState<ProfitPeriodType>("monthly");

  // Bank Book state
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", ifscCode: "", branch: "" });
  const [bankErrors, setBankErrors] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    beneficiaryId: "",
    amount: "",
    purpose: "",
    staffId: "",
  });

  const [newBeneficiary, setNewBeneficiary] = useState({
    name: "",
    ifscCode: "",
    accountNumber: "",
  });

  const filtered = useMemo(
    () => fundTransfers.filter((t) => t.date >= selectedDate && t.date <= selectedDateEnd),
    [fundTransfers, selectedDate, selectedDateEnd]
  );

  const totalOut = useMemo(
    () => filtered.reduce((sum, t) => sum + t.amount, 0),
    [filtered]
  );

  const remainingBalance = MOCK_BALANCE - totalOut;

  const stats = useMemo(() => {
    const pending = filtered.filter((t) => t.status === "Pending").length;
    const processed = filtered.filter((t) => t.status === "Processed").length;
    const done = filtered.filter((t) => t.status === "Done").length;
    return { total: filtered.length, pending, processed, done };
  }, [filtered]);

  const selectedBeneficiary = beneficiaries.find((b) => b.id === form.beneficiaryId);

  // ─── Bank Book: get or create daily state ─────
  const currentBankBookState = useMemo(() => {
    if (!selectedBankAccountId) return null;

    // Find existing state for this date + bank account
    const existing = dailyBankBookStates.find(
      (s) => s.date === entryDate && s.bankAccountId === selectedBankAccountId
    );
    if (existing) return existing;

    // Look for previous day's closing balance for carry-forward
    const prevDate = format(subDays(parseISO(entryDate), 1), "yyyy-MM-dd");
    const prevState = dailyBankBookStates.find(
      (s) => s.date === prevDate && s.bankAccountId === selectedBankAccountId
    );
    const prevClosing = prevState?.bankBook.closingBalance ?? 0;

    return createEmptyDailyBankBookState(entryDate, selectedBankAccountId, prevClosing);
  }, [selectedBankAccountId, entryDate, dailyBankBookStates]);

  const handleBankBookUpdate = useCallback(
    (state: typeof currentBankBookState) => {
      if (state) saveDailyBankBookState(state);
    },
    [saveDailyBankBookState]
  );

  // Net Profit state managed by NetProfitCalculator internally

  // Auto-select first bank account
  useMemo(() => {
    if (!selectedBankAccountId && bankAccounts.length > 0) {
      setSelectedBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedBankAccountId]);

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.beneficiaryId) newErrors.beneficiaryId = true;
    if (!form.amount) newErrors.amount = true;
    if (!form.purpose) newErrors.purpose = true;
    if (!form.staffId) newErrors.staffId = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const beneficiary = beneficiaries.find((b) => b.id === form.beneficiaryId);
    const staff = STAFF_MEMBERS.find((s) => s.id === form.staffId);
    const transfer: FundTransfer = {
      id: `ft${Date.now()}`,
      date: entryDate,
      beneficiaryId: form.beneficiaryId,
      beneficiaryName: beneficiary?.name ?? "",
      amount: Number(form.amount),
      purpose: form.purpose,
      status: "Pending",
      staffId: form.staffId,
      staffName: staff?.name ?? "",
    };
    addFundTransfer(transfer);
    setForm({ beneficiaryId: "", amount: "", purpose: "", staffId: "" });
    setErrors({});
    setOpen(false);
    showToast(`Transfer of ${Number(form.amount).toLocaleString("en-IN", { style: "currency", currency: "INR" })} created`);
  };

  const handleAddBeneficiary = () => {
    const newErrors: Record<string, boolean> = {};
    if (!newBeneficiary.name) newErrors.name = true;
    if (!newBeneficiary.ifscCode) newErrors.ifscCode = true;
    if (!newBeneficiary.accountNumber) newErrors.accountNumber = true;

    if (Object.keys(newErrors).length > 0) {
      setBeneficiaryErrors(newErrors);
      return;
    }

    const b: Beneficiary = {
      id: `b${Date.now()}`,
      ...newBeneficiary,
    };
    addBeneficiary(b);
    setForm({ ...form, beneficiaryId: b.id });
    setNewBeneficiary({ name: "", ifscCode: "", accountNumber: "" });
    setBeneficiaryErrors({});
    setNewBeneficiaryOpen(false);
    showToast(`Beneficiary "${b.name}" added`);
  };

  const handleAddBankAccount = () => {
    const newErrors: Record<string, boolean> = {};
    if (!bankForm.bankName) newErrors.bankName = true;
    if (!bankForm.accountNumber) newErrors.accountNumber = true;
    if (!bankForm.ifscCode) newErrors.ifscCode = true;

    if (Object.keys(newErrors).length > 0) {
      setBankErrors(newErrors);
      return;
    }

    const account: BankAccount = {
      id: `ba${Date.now()}`,
      bankName: bankForm.bankName,
      accountNumber: bankForm.accountNumber,
      ifscCode: bankForm.ifscCode,
      branch: bankForm.branch || undefined,
    };
    addBankAccount(account);
    setSelectedBankAccountId(account.id);
    setBankForm({ bankName: "", accountNumber: "", ifscCode: "", branch: "" });
    setBankErrors({});
    setAddBankOpen(false);
    showToast(`Bank account "${account.bankName}" added`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Accountant</h2>
          <p className="text-sm text-muted-foreground">
            {selectedDate === selectedDateEnd
              ? format(parseISO(selectedDate), "dd MMM yyyy")
              : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="transfers" className="w-full">
        <TabsList>
          <TabsTrigger value="transfers">
            <ArrowLeftRight className="h-4 w-4 mr-1.5" />
            Fund Transfers
          </TabsTrigger>
          <TabsTrigger value="bankbook">
            <Landmark className="h-4 w-4 mr-1.5" />
            Bank Book
          </TabsTrigger>
          <TabsTrigger value="netprofit">
            <Calculator className="h-4 w-4 mr-1.5" />
            Net Profit
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: Fund Transfers ═══ */}
        <TabsContent value="transfers" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrors({}); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0"><Plus className="mr-1.5 h-3.5 w-3.5" />New Transfer</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Fund Transfer</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Beneficiary</Label>
                    {errors.beneficiaryId && <p className="text-xs text-red-500">Please select a beneficiary</p>}
                    <div className="flex gap-2">
                      <Popover open={comboOpen} onOpenChange={setComboOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className={cn("flex-1 justify-between", errors.beneficiaryId && "border-red-500")}>
                            {selectedBeneficiary?.name ?? "Select beneficiary..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(350px,90vw)] p-0">
                          <Command>
                            <CommandInput placeholder="Search beneficiary..." />
                            <CommandList>
                              <CommandEmpty>No beneficiary found.</CommandEmpty>
                              <CommandGroup>
                                {beneficiaries.map((b) => (
                                  <CommandItem
                                    key={b.id}
                                    value={b.name}
                                    onSelect={() => {
                                      setForm({ ...form, beneficiaryId: b.id });
                                      setComboOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", form.beneficiaryId === b.id ? "opacity-100" : "opacity-0")} />
                                    <div>
                                      <div className="text-sm font-medium">{b.name}</div>
                                      <div className="text-xs text-muted-foreground">{b.accountNumber}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Dialog open={newBeneficiaryOpen} onOpenChange={setNewBeneficiaryOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon"><UserPlus className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Beneficiary</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label>Name</Label>
                              <Input
                                value={newBeneficiary.name}
                                onChange={(e) => { setNewBeneficiary({ ...newBeneficiary, name: e.target.value }); setBeneficiaryErrors({ ...beneficiaryErrors, name: false }); }}
                                placeholder="Beneficiary name"
                                className={beneficiaryErrors.name ? "border-red-500" : ""}
                              />
                              {beneficiaryErrors.name && <p className="text-xs text-red-500">Required</p>}
                            </div>
                            <div className="grid gap-2">
                              <Label>IFSC Code</Label>
                              <Input
                                value={newBeneficiary.ifscCode}
                                onChange={(e) => { setNewBeneficiary({ ...newBeneficiary, ifscCode: e.target.value }); setBeneficiaryErrors({ ...beneficiaryErrors, ifscCode: false }); }}
                                placeholder="e.g. SBIN0001234"
                                className={beneficiaryErrors.ifscCode ? "border-red-500" : ""}
                              />
                              {beneficiaryErrors.ifscCode && <p className="text-xs text-red-500">Required</p>}
                            </div>
                            <div className="grid gap-2">
                              <Label>Account Number</Label>
                              <Input
                                value={newBeneficiary.accountNumber}
                                onChange={(e) => { setNewBeneficiary({ ...newBeneficiary, accountNumber: e.target.value }); setBeneficiaryErrors({ ...beneficiaryErrors, accountNumber: false }); }}
                                placeholder="Internal account number"
                                className={beneficiaryErrors.accountNumber ? "border-red-500" : ""}
                              />
                              {beneficiaryErrors.accountNumber && <p className="text-xs text-red-500">Required</p>}
                            </div>
                            <Button onClick={handleAddBeneficiary}>Add Beneficiary</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(e) => { setForm({ ...form, amount: e.target.value }); setErrors({ ...errors, amount: false }); }}
                      placeholder="Transfer amount"
                      className={errors.amount ? "border-red-500" : ""}
                    />
                    {errors.amount && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Purpose</Label>
                    <Input
                      value={form.purpose}
                      onChange={(e) => { setForm({ ...form, purpose: e.target.value }); setErrors({ ...errors, purpose: false }); }}
                      placeholder="e.g. Loan disbursement"
                      className={errors.purpose ? "border-red-500" : ""}
                    />
                    {errors.purpose && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Staff</Label>
                    <Select value={form.staffId} onValueChange={(v) => { setForm({ ...form, staffId: v }); setErrors({ ...errors, staffId: false }); }}>
                      <SelectTrigger className={errors.staffId ? "border-red-500" : ""}><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>
                        {STAFF_MEMBERS.filter((s) => s.department === "ACCOUNTANT").map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.staffId && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <Button onClick={handleSubmit}>Create Transfer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-xl font-bold", remainingBalance < 100000 ? "text-red-600" : "text-green-600")}>
                  {remainingBalance.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                </div>
                {remainingBalance < 100000 && (
                  <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                    <AlertTriangle className="h-3 w-3" /> Low Balance
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Processed</CardTitle>
                <ArrowLeftRight className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{stats.processed}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Done</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{stats.done}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fund Transfers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No transfers for this date
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((t, idx) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{t.beneficiaryName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {t.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </TableCell>
                          <TableCell>{t.purpose}</TableCell>
                          <TableCell>{t.staffName}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusVariant[t.status]}`}>
                              {t.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {t.status !== "Done" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const newStatus = t.status === "Pending" ? "Processed" : "Done";
                                  updateTransferStatus(t.id, newStatus);
                                  showToast(`Transfer to ${t.beneficiaryName} marked as ${newStatus}`);
                                }}
                              >
                                {t.status === "Pending" ? "Process" : "Mark Done"}
                              </Button>
                            )}
                            {t.status === "Done" && (
                              <Badge variant="outline" className="text-green-600">
                                <Check className="mr-1 h-3 w-3" /> Complete
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 2: Bank Book ═══ */}
        <TabsContent value="bankbook" className="space-y-4 mt-4">
          {/* Bank Account Selector */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Bank Account</Label>
              {bankAccounts.length > 0 ? (
                <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{a.bankName}</span>
                          <span className="text-xs text-muted-foreground">({a.accountNumber})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No bank accounts yet. Add one to get started.</p>
              )}
            </div>
            <Dialog open={addBankOpen} onOpenChange={(v) => { setAddBankOpen(v); if (!v) setBankErrors({}); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Bank Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Bank Account</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={bankForm.bankName}
                      onChange={(e) => { setBankForm({ ...bankForm, bankName: e.target.value }); setBankErrors({ ...bankErrors, bankName: false }); }}
                      placeholder="e.g. Union Bank of India"
                      className={bankErrors.bankName ? "border-red-500" : ""}
                    />
                    {bankErrors.bankName && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Account Number</Label>
                    <Input
                      value={bankForm.accountNumber}
                      onChange={(e) => { setBankForm({ ...bankForm, accountNumber: e.target.value }); setBankErrors({ ...bankErrors, accountNumber: false }); }}
                      placeholder="e.g. 510101012345678"
                      className={bankErrors.accountNumber ? "border-red-500" : ""}
                    />
                    {bankErrors.accountNumber && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={bankForm.ifscCode}
                      onChange={(e) => { setBankForm({ ...bankForm, ifscCode: e.target.value }); setBankErrors({ ...bankErrors, ifscCode: false }); }}
                      placeholder="e.g. UBIN0512345"
                      className={bankErrors.ifscCode ? "border-red-500" : ""}
                    />
                    {bankErrors.ifscCode && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Branch (optional)</Label>
                    <Input
                      value={bankForm.branch}
                      onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                      placeholder="e.g. Malappuram Main Branch"
                    />
                  </div>
                  <Button onClick={handleAddBankAccount}>Add Bank Account</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Bank Book Component */}
          {currentBankBookState ? (
            <BankBook state={currentBankBookState} onUpdate={handleBankBookUpdate} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select or add a bank account to view the Bank Book</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ TAB 3: Net Profit ═══ */}
        <TabsContent value="netprofit" className="space-y-4 mt-4">
          <NetProfitCalculator
            allReports={profitReports}
            onUpdate={saveProfitReport}
            periodType={profitPeriodType}
            onPeriodTypeChange={setProfitPeriodType}
            entryDate={entryDate}
          />
        </TabsContent>
      </Tabs>

      <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
