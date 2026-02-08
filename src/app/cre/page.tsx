"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { STAFF_MEMBERS, DEPOSIT_TYPES, DEPOSIT_ACTIONS } from "@/lib/constants";
import { CustomerVisit, DepositType, DepositAction } from "@/lib/types";
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
import { Plus, Users, UserPlus, RefreshCw } from "lucide-react";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";

export default function CREPage() {
  const { selectedDate, customerVisits, addCustomerVisit } = useApp();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { toast, showToast, hideToast } = useToast();
  const [form, setForm] = useState({
    customerName: "",
    staffId: "",
    depositType: "" as DepositType | "",
    action: "" as DepositAction | "",
    amount: "",
  });

  const filtered = useMemo(
    () => customerVisits.filter((v) => v.date === selectedDate),
    [customerVisits, selectedDate]
  );

  const stats = useMemo(() => {
    const newCount = filtered.filter((v) => v.action === "New").length;
    const renewCount = filtered.filter((v) => v.action === "Renew").length;
    return { total: filtered.length, new: newCount, renew: renewCount };
  }, [filtered]);

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.customerName) newErrors.customerName = true;
    if (!form.staffId) newErrors.staffId = true;
    if (!form.depositType) newErrors.depositType = true;
    if (!form.action) newErrors.action = true;
    if (!form.amount) newErrors.amount = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const staff = STAFF_MEMBERS.find((s) => s.id === form.staffId);
    const visit: CustomerVisit = {
      id: `cv${Date.now()}`,
      date: selectedDate,
      customerName: form.customerName,
      staffId: form.staffId,
      staffName: staff?.name ?? "",
      depositType: form.depositType as DepositType,
      action: form.action as DepositAction,
      amount: Number(form.amount),
    };
    addCustomerVisit(visit);
    setForm({ customerName: "", staffId: "", depositType: "", action: "", amount: "" });
    setErrors({});
    setOpen(false);
    showToast(`Visit added for ${visit.customerName}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRE - Customer Relations</h2>
          <p className="text-sm text-muted-foreground">
            Deposits & Customer Visits - {format(parseISO(selectedDate), "dd MMM yyyy")}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrors({}); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Visit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Customer Visit</DialogTitle>
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
                <Label>Staff</Label>
                <Select value={form.staffId} onValueChange={(v) => { setForm({ ...form, staffId: v }); setErrors({ ...errors, staffId: false }); }}>
                  <SelectTrigger className={errors.staffId ? "border-red-500" : ""}><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {STAFF_MEMBERS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.staffId && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Deposit Type</Label>
                  <Select value={form.depositType} onValueChange={(v) => { setForm({ ...form, depositType: v as DepositType }); setErrors({ ...errors, depositType: false }); }}>
                    <SelectTrigger className={errors.depositType ? "border-red-500" : ""}><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {DEPOSIT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.depositType && <p className="text-xs text-red-500">Required</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Action</Label>
                  <Select value={form.action} onValueChange={(v) => { setForm({ ...form, action: v as DepositAction }); setErrors({ ...errors, action: false }); }}>
                    <SelectTrigger className={errors.action ? "border-red-500" : ""}><SelectValue placeholder="Action" /></SelectTrigger>
                    <SelectContent>
                      {DEPOSIT_ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.action && <p className="text-xs text-red-500">Required</p>}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => { setForm({ ...form, amount: e.target.value }); setErrors({ ...errors, amount: false }); }}
                  placeholder="Enter amount"
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount && <p className="text-xs text-red-500">Required</p>}
              </div>
              <Button onClick={handleSubmit}>Add Visit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Memberships</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Renewals</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.renew}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Customer Visits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Deposit Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No visits recorded for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((v, idx) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{v.customerName}</TableCell>
                      <TableCell>{v.staffName}</TableCell>
                      <TableCell><Badge variant="outline">{v.depositType}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={v.action === "New" ? "default" : "secondary"}>
                          {v.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {v.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
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
