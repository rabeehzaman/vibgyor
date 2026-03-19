"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, subMonths, addMonths } from "date-fns";
import { STAFF_MEMBERS, LOAN_TYPES, LOAN_STATUSES } from "@/lib/constants";
import { LoanEnquiry, LoanType, LoanStatus, LoanSource, ProfitMethod, LoanRepayment, LoanBooking } from "@/lib/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";

const statusColor: Record<LoanStatus, string> = {
  "Under Process": "bg-yellow-100 text-yellow-700 border-yellow-200",
  Passed: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

export default function LPOPage() {
  const {
    selectedDate, selectedDateEnd, entryDate,
    loanEnquiries, addLoanEnquiry, updateLoanStatus,
    loanBookings, addLoanBooking,
    loanRepayments, addLoanRepayment
  } = useApp();
  const [open, setOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [bookingErrors, setBookingErrors] = useState<Record<string, boolean>>({});
  const { toast, showToast, hideToast } = useToast();

  const [repaymentPeriod, setRepaymentPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [careOfFilter, setCareOfFilter] = useState<string>("all");

  const [paymentForm, setPaymentForm] = useState({
    loanBookingId: "",
    customerName: "",
    expectedEmi: 0,
    amountPaid: "",
    paidDate: format(new Date(), "yyyy-MM-dd"),
    remarks: ""
  });

  const [form, setForm] = useState({
    customerName: "",
    entryCode: "",
    source: "" as LoanSource | "",
    purpose: "",
    loanScheme: "",
    durationMonths: "",
    profitMethod: "" as ProfitMethod | "",
    profitRatio: "",
    loanType: "" as LoanType | "",
    amount: "",
    staffId: "",
  });

  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    startDate: "",
    endDate: "",
    fullLoanAmount: "",
    emiAmount: "",
    tenure: "",
    loanScheme: "",
    careOfId: "",
  });

  const filteredEnquiries = useMemo(
    () => loanEnquiries.filter((l) => l.date >= selectedDate && l.date <= selectedDateEnd),
    [loanEnquiries, selectedDate, selectedDateEnd]
  );

  const filteredBookings = useMemo(
    () => loanBookings.filter((b) => b.date >= selectedDate && b.date <= selectedDateEnd),
    [loanBookings, selectedDate, selectedDateEnd]
  );

  const stats = useMemo(() => {
    const underProcess = filteredEnquiries.filter((l) => l.status === "Under Process").length;
    const passed = filteredEnquiries.filter((l) => l.status === "Passed").length;
    const rejected = filteredEnquiries.filter((l) => l.status === "Rejected").length;
    return { total: filteredEnquiries.length, underProcess, passed, rejected };
  }, [filteredEnquiries]);

  const activeRepaymentBookings = useMemo(() => {
    let active = loanBookings.filter(b => b.status === "Active");
    if (careOfFilter !== "all") {
      active = active.filter(b => b.careOfId === careOfFilter);
    }
    // ensure the loan started on or before the given period end
    const periodStart = parseISO(`${repaymentPeriod}-01`);
    active = active.filter(b => parseISO(b.startDate) <= periodStart);
    return active;
  }, [loanBookings, repaymentPeriod, careOfFilter]);

  const handleRepaymentChange = (bookingId: string, amount: string, remarks?: string) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) return;

    // Use the first LPO staff member as the collector for simplicity in this demo,
    // or ideally the logged-in user if we had auth.
    const collector = STAFF_MEMBERS.find(s => s.department === "LPO") || STAFF_MEMBERS[0];

    const repayment: LoanRepayment = {
      id: `lr${Date.now()}`,
      loanBookingId: bookingId,
      period: repaymentPeriod,
      amountPaid: numAmount,
      paidDate: format(new Date(), "yyyy-MM-dd"),
      collectedBy: collector.id,
      collectedByName: collector.name,
      remarks,
    };
    addLoanRepayment(repayment);
  };

  const handleOpenPaymentDialog = (booking: LoanBooking, currentPaid: number) => {
    setPaymentForm({
      loanBookingId: booking.id,
      customerName: booking.customerName,
      expectedEmi: booking.emiAmount,
      amountPaid: currentPaid ? String(currentPaid) : "",
      paidDate: format(new Date(), "yyyy-MM-dd"),
      remarks: ""
    });
    setPaymentOpen(true);
  };

  const handleReceivePayment = () => {
    if (!paymentForm.amountPaid || isNaN(Number(paymentForm.amountPaid))) {
      showToast("Please enter a valid amount.");
      return;
    }
    const staff = STAFF_MEMBERS.find((s) => s.department === "LPO") || STAFF_MEMBERS[0];

    addLoanRepayment({
      id: `rep-${Date.now()}`,
      loanBookingId: paymentForm.loanBookingId,
      period: repaymentPeriod,
      amountPaid: Number(paymentForm.amountPaid),
      paidDate: paymentForm.paidDate,
      collectedBy: staff.id,
      collectedByName: staff.name,
      remarks: paymentForm.remarks
    });

    setPaymentOpen(false);
    showToast("Payment recorded successfully.");
  };

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.customerName) newErrors.customerName = true;
    if (!form.entryCode) newErrors.entryCode = true;
    if (!form.source) newErrors.source = true;
    if (!form.purpose) newErrors.purpose = true;
    if (!form.loanScheme) newErrors.loanScheme = true;
    if (!form.durationMonths) newErrors.durationMonths = true;
    if (!form.profitMethod) newErrors.profitMethod = true;
    if (!form.profitRatio) newErrors.profitRatio = true;
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
      entryCode: form.entryCode,
      source: form.source as LoanSource,
      purpose: form.purpose,
      loanScheme: form.loanScheme,
      durationMonths: Number(form.durationMonths),
      profitMethod: form.profitMethod as ProfitMethod,
      profitRatio: Number(form.profitRatio),
      loanType: form.loanType as LoanType,
      amount: Number(form.amount),
      staffId: form.staffId,
      staffName: staff?.name ?? "",
      status: "Under Process",
    };
    addLoanEnquiry(enquiry);
    setForm({
      customerName: "", entryCode: "", source: "", purpose: "",
      loanScheme: "", durationMonths: "", profitMethod: "",
      profitRatio: "", loanType: "", amount: "", staffId: ""
    });
    setErrors({});
    setOpen(false);
    showToast(`Loan enquiry added for ${enquiry.customerName}`);
  };

  const handleStatusChange = (id: string, status: LoanStatus) => {
    updateLoanStatus(id, status);
    showToast(`Status updated to ${status}`);
  };

  const handleBookingSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!bookingForm.customerName) newErrors.customerName = true;
    if (!bookingForm.startDate) newErrors.startDate = true;

    if (!bookingForm.fullLoanAmount) newErrors.fullLoanAmount = true;
    if (!bookingForm.emiAmount) newErrors.emiAmount = true;
    if (!bookingForm.tenure) newErrors.tenure = true;
    if (!bookingForm.loanScheme) newErrors.loanScheme = true;
    if (!bookingForm.careOfId) newErrors.careOfId = true;

    if (Object.keys(newErrors).length > 0) {
      setBookingErrors(newErrors);
      return;
    }

    const careOfStaff = STAFF_MEMBERS.find((s) => s.id === bookingForm.careOfId);

    const newBooking = {
      id: `lb${Date.now()}`,
      date: entryDate,
      customerName: bookingForm.customerName,
      startDate: bookingForm.startDate,
      endDate: bookingForm.endDate,
      fullLoanAmount: Number(bookingForm.fullLoanAmount),
      emiAmount: Number(bookingForm.emiAmount),
      tenure: bookingForm.tenure,
      loanScheme: bookingForm.loanScheme,
      careOfId: bookingForm.careOfId,
      careOfName: careOfStaff?.name ?? "",
      status: "Active" as const,
    };

    addLoanBooking(newBooking);

    setBookingForm({
      customerName: "", startDate: "", endDate: "", fullLoanAmount: "",
      emiAmount: "", tenure: "", loanScheme: "", careOfId: ""
    });
    setBookingErrors({});
    setBookingOpen(false);
    showToast(`Loan booking added for ${newBooking.customerName}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">LPO - Loan Processing</h2>
          <p className="text-sm text-muted-foreground">
            {selectedDate === selectedDateEnd
              ? format(parseISO(selectedDate), "dd MMM yyyy")
              : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="enquiries" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="enquiries" className="text-xs sm:text-sm">Enquiries</TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs sm:text-sm">Bookings</TabsTrigger>
          <TabsTrigger value="repayments" className="text-xs sm:text-sm">Repayment</TabsTrigger>
        </TabsList>

        <TabsContent value="enquiries" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrors({}); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Enquiry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Loan Enquiry</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <Label>Entry Code</Label>
                      <Input
                        value={form.entryCode}
                        onChange={(e) => { setForm({ ...form, entryCode: e.target.value }); setErrors({ ...errors, entryCode: false }); }}
                        placeholder="e.g. LE-1234"
                        className={errors.entryCode ? "border-red-500" : ""}
                      />
                      {errors.entryCode && <p className="text-xs text-red-500">Required</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Source</Label>
                      <Select value={form.source} onValueChange={(v) => { setForm({ ...form, source: v as LoanSource }); setErrors({ ...errors, source: false }); }}>
                        <SelectTrigger className={errors.source ? "border-red-500" : ""}><SelectValue placeholder="Select source" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Online">Online</SelectItem>
                          <SelectItem value="Direct to Office">Direct to Office</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.source && <p className="text-xs text-red-500">Required</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Purpose</Label>
                      <Input
                        value={form.purpose}
                        onChange={(e) => { setForm({ ...form, purpose: e.target.value }); setErrors({ ...errors, purpose: false }); }}
                        placeholder="e.g. Business Expansion"
                        className={errors.purpose ? "border-red-500" : ""}
                      />
                      {errors.purpose && <p className="text-xs text-red-500">Required</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Loan Scheme</Label>
                      <Input
                        value={form.loanScheme}
                        onChange={(e) => { setForm({ ...form, loanScheme: e.target.value }); setErrors({ ...errors, loanScheme: false }); }}
                        placeholder="e.g. EMI / BSL"
                        className={errors.loanScheme ? "border-red-500" : ""}
                      />
                      {errors.loanScheme && <p className="text-xs text-red-500">Required</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Duration (Months)</Label>
                      <Input
                        type="number"
                        value={form.durationMonths}
                        onChange={(e) => { setForm({ ...form, durationMonths: e.target.value }); setErrors({ ...errors, durationMonths: false }); }}
                        placeholder="e.g. 24"
                        className={errors.durationMonths ? "border-red-500" : ""}
                      />
                      {errors.durationMonths && <p className="text-xs text-red-500">Required</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Profit Method</Label>
                      <Select value={form.profitMethod} onValueChange={(v) => { setForm({ ...form, profitMethod: v as ProfitMethod }); setErrors({ ...errors, profitMethod: false }); }}>
                        <SelectTrigger className={errors.profitMethod ? "border-red-500" : ""}><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Flat">Flat</SelectItem>
                          <SelectItem value="Diminishing">Diminishing</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.profitMethod && <p className="text-xs text-red-500">Required</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Profit Ratio (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.profitRatio}
                        onChange={(e) => { setForm({ ...form, profitRatio: e.target.value }); setErrors({ ...errors, profitRatio: false }); }}
                        placeholder="e.g. 12"
                        className={errors.profitRatio ? "border-red-500" : ""}
                      />
                      {errors.profitRatio && <p className="text-xs text-red-500">Required</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
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
                    {filteredEnquiries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No loan enquiries for this date
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEnquiries.map((l, idx) => (
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
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={bookingOpen} onOpenChange={(v) => { setBookingOpen(v); if (!v) setBookingErrors({}); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Loan Booking</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Loan Booking</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Customer Name</Label>
                      <Input
                        value={bookingForm.customerName}
                        onChange={(e) => { setBookingForm({ ...bookingForm, customerName: e.target.value }); setBookingErrors({ ...bookingErrors, customerName: false }); }}
                        placeholder="Enter customer name"
                        className={bookingErrors.customerName ? "border-red-500" : ""}
                      />
                      {bookingErrors.customerName && <p className="text-xs text-red-500">Required</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Loan Scheme</Label>
                      <Input
                        value={bookingForm.loanScheme}
                        onChange={(e) => { setBookingForm({ ...bookingForm, loanScheme: e.target.value }); setBookingErrors({ ...bookingErrors, loanScheme: false }); }}
                        placeholder="e.g. EMI / BSL"
                        className={bookingErrors.loanScheme ? "border-red-500" : ""}
                      />
                      {bookingErrors.loanScheme && <p className="text-xs text-red-500">Required</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={bookingForm.startDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          const updated: typeof bookingForm = { ...bookingForm, startDate: newStart };
                          if (newStart && bookingForm.tenure) {
                            updated.endDate = format(addMonths(parseISO(newStart), Number(bookingForm.tenure)), "yyyy-MM-dd");
                          }
                          setBookingForm(updated);
                          setBookingErrors({ ...bookingErrors, startDate: false });
                        }}
                        className={bookingErrors.startDate ? "border-red-500" : ""}
                      />
                      {bookingErrors.startDate && <p className="text-xs text-red-500">Required</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>End Date <span className="text-xs text-muted-foreground font-normal">(auto-calculated)</span></Label>
                      <Input
                        type="date"
                        value={bookingForm.endDate}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      {bookingForm.startDate && bookingForm.tenure && (
                        <p className="text-xs text-muted-foreground">Start + {bookingForm.tenure} months</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Full Loan Amount</Label>
                      <Input
                        type="number"
                        value={bookingForm.fullLoanAmount}
                        onChange={(e) => { setBookingForm({ ...bookingForm, fullLoanAmount: e.target.value }); setBookingErrors({ ...bookingErrors, fullLoanAmount: false }); }}
                        placeholder="Total amount"
                        className={bookingErrors.fullLoanAmount ? "border-red-500" : ""}
                      />
                      {bookingErrors.fullLoanAmount && <p className="text-xs text-red-500">Required</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Tenure (Months)</Label>
                      <Input
                        type="number"
                        value={bookingForm.tenure}
                        onChange={(e) => {
                          const newTenure = e.target.value;
                          const updated: typeof bookingForm = { ...bookingForm, tenure: newTenure };
                          if (bookingForm.startDate && newTenure) {
                            updated.endDate = format(addMonths(parseISO(bookingForm.startDate), Number(newTenure)), "yyyy-MM-dd");
                          } else {
                            updated.endDate = "";
                          }
                          setBookingForm(updated);
                          setBookingErrors({ ...bookingErrors, tenure: false });
                        }}
                        placeholder="e.g. 24"
                        className={bookingErrors.tenure ? "border-red-500" : ""}
                      />
                      {bookingErrors.tenure && <p className="text-xs text-red-500">Required</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Monthly EMI Amount</Label>
                      <Input
                        type="number"
                        value={bookingForm.emiAmount}
                        onChange={(e) => { setBookingForm({ ...bookingForm, emiAmount: e.target.value }); setBookingErrors({ ...bookingErrors, emiAmount: false }); }}
                        placeholder="EMI amount"
                        className={bookingErrors.emiAmount ? "border-red-500" : ""}
                      />
                      {bookingErrors.emiAmount && <p className="text-xs text-red-500">Required</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Care Of (Staff)</Label>
                      <Select value={bookingForm.careOfId} onValueChange={(v) => { setBookingForm({ ...bookingForm, careOfId: v }); setBookingErrors({ ...bookingErrors, careOfId: false }); }}>
                        <SelectTrigger className={bookingErrors.careOfId ? "border-red-500" : ""}><SelectValue placeholder="Select staff" /></SelectTrigger>
                        <SelectContent>
                          {STAFF_MEMBERS.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {bookingErrors.careOfId && <p className="text-xs text-red-500">Required</p>}
                    </div>
                  </div>

                  <Button onClick={handleBookingSubmit} className="mt-4">Submit Loan Booking</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Loan Bookings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Scheme / Tenure</TableHead>
                      <TableHead>Start / End</TableHead>
                      <TableHead className="text-right">Full Amount</TableHead>
                      <TableHead className="text-right">EMI Amount</TableHead>
                      <TableHead>Care Of</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No loan bookings for this date
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((b, idx) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{b.customerName}</TableCell>
                          <TableCell>
                            <div><Badge variant="outline">{b.loanScheme}</Badge></div>
                            <div className="text-xs text-muted-foreground mt-1">{b.tenure} months</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">{format(parseISO(b.startDate), "dd MMM yyyy")}</div>
                            <div className="text-xs text-muted-foreground">to {format(parseISO(b.endDate), "dd MMM yyyy")}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {b.fullLoanAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-blue-600">
                            {b.emiAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </TableCell>
                          <TableCell className="text-sm">{b.careOfName}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 border-green-300">
                              {b.status}
                            </span>
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
        <TabsContent value="repayments" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setRepaymentPeriod((p) => format(subMonths(parseISO(`${p}-01`), 1), "yyyy-MM"))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold w-24 text-center text-sm">
                {format(parseISO(`${repaymentPeriod}-01`), "MMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setRepaymentPeriod((p) => format(addMonths(parseISO(`${p}-01`), 1), "yyyy-MM"))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Label className="whitespace-nowrap text-xs sm:text-sm shrink-0 hidden sm:block">Care Of:</Label>
                <Select value={careOfFilter} onValueChange={setCareOfFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs sm:text-sm">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {STAFF_MEMBERS.map((s) => (
                      <SelectItem key={`filter-${s.id}`} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="h-8 text-xs sm:text-sm" onClick={() => {
                setPaymentForm({ loanBookingId: "", customerName: "", expectedEmi: 0, amountPaid: "", paidDate: format(new Date(), "yyyy-MM-dd"), remarks: "" });
                setPaymentOpen(true);
              }}>
                <Plus className="mr-1 h-3.5 w-3.5" />Add Payment
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Repayments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Care Of</TableHead>
                      <TableHead className="text-right">Total EMI</TableHead>
                      <TableHead className="text-right">Current Month EMI</TableHead>
                      <TableHead className="w-[180px]">Paid Amount</TableHead>
                      <TableHead className="text-right">Repayment Ratio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRepaymentBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No active loan bookings for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeRepaymentBookings.map((b, idx) => {
                        const existingPayment = loanRepayments.find(r => r.loanBookingId === b.id && r.period === repaymentPeriod);
                        const paidAmount = existingPayment?.amountPaid || 0;
                        const pending = b.emiAmount - paidAmount;
                        const ratio = b.emiAmount > 0
                          ? Math.round((paidAmount / b.emiAmount) * 100)
                          : 0;

                        return (
                          <TableRow key={`rep-${b.id}`}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{b.customerName}</TableCell>
                            <TableCell className="text-sm">{b.careOfName}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {b.fullLoanAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {b.emiAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPaymentDialog(b, paidAmount)}
                              >
                                {paidAmount > 0 ? `₹${paidAmount.toLocaleString("en-IN")}` : "Pay EMI"}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant={pending <= 0 ? "outline" : "destructive"}>
                                  {pending <= 0 ? "Paid" : `Pending: ₹${pending.toLocaleString("en-IN")}`}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{ratio}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{paymentForm.customerName ? `Receive Payment - ${paymentForm.customerName}` : "Receive Payment"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!paymentForm.loanBookingId && (
              <div className="grid gap-2">
                <Label>Customer</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value=""
                  onChange={(e) => {
                    const booking = loanBookings.find(b => b.id === e.target.value);
                    if (booking) {
                      setPaymentForm(prev => ({
                        ...prev,
                        loanBookingId: booking.id,
                        customerName: booking.customerName,
                        expectedEmi: booking.emiAmount
                      }));
                    }
                  }}
                >
                  <option value="" disabled>Select a customer</option>
                  {loanBookings.filter(b => b.status === "Active").length === 0 ? (
                    <option value="" disabled>No active bookings — create one first</option>
                  ) : (
                    loanBookings.filter(b => b.status === "Active").map(b => (
                      <option key={`pay-${b.id}`} value={b.id}>{b.customerName} — ₹{b.emiAmount.toLocaleString("en-IN")}/mo</option>
                    ))
                  )}
                </select>
              </div>
            )}
            {paymentForm.expectedEmi > 0 && (
              <div className="grid gap-1">
                <Label className="text-muted-foreground text-sm">Target EMI</Label>
                <div className="font-semibold font-mono text-sm">₹{paymentForm.expectedEmi.toLocaleString("en-IN")}</div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="amountPaid">Amount</Label>
              <Input
                id="amountPaid"
                type="number"
                className="font-mono"
                value={paymentForm.amountPaid}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                placeholder="Enter amount paid"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paidDate">Date</Label>
              <Input
                id="paidDate"
                type="date"
                value={paymentForm.paidDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <Button onClick={handleReceivePayment} className="w-full mt-1">
              Save Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
