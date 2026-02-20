"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { STAFF_MEMBERS, LOAN_TYPES, LOAN_STATUSES } from "@/lib/constants";
import { LoanEnquiry, LoanType, LoanStatus } from "@/lib/types";
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
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";

const statusColor: Record<LoanStatus, string> = {
  "Under Process": "bg-yellow-100 text-yellow-800 border-yellow-300",
  Passed: "bg-green-100 text-green-800 border-green-300",
  Rejected: "bg-red-100 text-red-800 border-red-300",
};

export default function LPOPage() {
  const { selectedDate, selectedDateEnd, entryDate, loanEnquiries, addLoanEnquiry, updateLoanStatus } = useApp();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { toast, showToast, hideToast } = useToast();
  const [form, setForm] = useState({
    customerName: "",
    loanType: "" as LoanType | "",
    amount: "",
    staffId: "",
  });

  const filtered = useMemo(
    () => loanEnquiries.filter((l) => l.date >= selectedDate && l.date <= selectedDateEnd),
    [loanEnquiries, selectedDate, selectedDateEnd]
  );

  const stats = useMemo(() => {
    const underProcess = filtered.filter((l) => l.status === "Under Process").length;
    const passed = filtered.filter((l) => l.status === "Passed").length;
    const rejected = filtered.filter((l) => l.status === "Rejected").length;
    return { total: filtered.length, underProcess, passed, rejected };
  }, [filtered]);

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.customerName) newErrors.customerName = true;
    if (!form.loanType) newErrors.loanType = true;
    if (!form.amount) newErrors.amount = true;
    if (!form.staffId) newErrors.staffId = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const staff = STAFF_MEMBERS.find((s) => s.id === form.staffId);
    const enquiry: LoanEnquiry = {
      id: `le${Date.now()}`,
      date: entryDate,
      customerName: form.customerName,
      loanType: form.loanType as LoanType,
      amount: Number(form.amount),
      staffId: form.staffId,
      staffName: staff?.name ?? "",
      status: "Under Process",
    };
    addLoanEnquiry(enquiry);
    setForm({ customerName: "", loanType: "", amount: "", staffId: "" });
    setErrors({});
    setOpen(false);
    showToast(`Loan enquiry added for ${enquiry.customerName}`);
  };

  const handleStatusChange = (id: string, status: LoanStatus) => {
    updateLoanStatus(id, status);
    showToast(`Status updated to ${status}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LPO - Loan Processing</h2>
          <p className="text-sm text-muted-foreground">
            Loan Enquiries -{" "}
            {selectedDate === selectedDateEnd
              ? format(parseISO(selectedDate), "dd MMM yyyy")
              : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrors({}); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Enquiry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Loan Enquiry</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Customer Name</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => { setForm({ ...form, customerName: e.target.value }); setErrors({ ...errors, customerName: false }); }}
                  placeholder="Enter customer name"
                  className={errors.customerName ? "border-red-500" : ""}
                />
                {errors.customerName && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid gap-2">
                <Label>Loan Type</Label>
                <Select value={form.loanType} onValueChange={(v) => { setForm({ ...form, loanType: v as LoanType }); setErrors({ ...errors, loanType: false }); }}>
                  <SelectTrigger className={errors.loanType ? "border-red-500" : ""}><SelectValue placeholder="Select loan type" /></SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.loanType && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => { setForm({ ...form, amount: e.target.value }); setErrors({ ...errors, amount: false }); }}
                  placeholder="Loan amount"
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid gap-2">
                <Label>Staff</Label>
                <Select value={form.staffId} onValueChange={(v) => { setForm({ ...form, staffId: v }); setErrors({ ...errors, staffId: false }); }}>
                  <SelectTrigger className={errors.staffId ? "border-red-500" : ""}><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {STAFF_MEMBERS.filter((s) => s.department === "LPO").map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.staffId && <p className="text-xs text-red-500">Required</p>}
              </div>
              <Button onClick={handleSubmit}>Submit Enquiry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Under Process</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.underProcess}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.passed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{stats.rejected}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Loan Enquiries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No loan enquiries for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l, idx) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{l.customerName}</TableCell>
                      <TableCell><Badge variant="outline">{l.loanType}</Badge></TableCell>
                      <TableCell className="text-right font-mono">
                        {l.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </TableCell>
                      <TableCell>{l.staffName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor[l.status]}`}>
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={l.status}
                          onValueChange={(v) => handleStatusChange(l.id, v as LoanStatus)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LOAN_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
