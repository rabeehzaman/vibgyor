"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { STAFF_MEMBERS } from "@/lib/constants";
import { FundTransfer, Beneficiary, TransferStatus } from "@/lib/types";
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
import {
  Plus, ArrowLeftRight, CheckCircle2, Clock, AlertTriangle, ChevronsUpDown, Check, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";

const MOCK_BALANCE = 2500000;

const statusVariant: Record<TransferStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Processed: "bg-blue-100 text-blue-800 border-blue-300",
  Done: "bg-green-100 text-green-800 border-green-300",
};

export default function AccountantPage() {
  const {
    selectedDate, fundTransfers, addFundTransfer, updateTransferStatus,
    beneficiaries, addBeneficiary,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [newBeneficiaryOpen, setNewBeneficiaryOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [beneficiaryErrors, setBeneficiaryErrors] = useState<Record<string, boolean>>({});
  const { toast, showToast, hideToast } = useToast();

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
    () => fundTransfers.filter((t) => t.date === selectedDate),
    [fundTransfers, selectedDate]
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
      date: selectedDate,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accountant</h2>
          <p className="text-sm text-muted-foreground">
            Fund Transfers - {format(parseISO(selectedDate), "dd MMM yyyy")}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrors({}); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Transfer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
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
                    <PopoverContent className="w-[350px] p-0">
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

      <div className="grid gap-4 md:grid-cols-5">
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

      <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
