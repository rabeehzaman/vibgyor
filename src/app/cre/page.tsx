"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState, useEffect } from "react";
import {
  format, parseISO, addMonths, subMonths, endOfMonth, startOfMonth,
  eachMonthOfInterval, isBefore, isAfter,
} from "date-fns";
import {
  STAFF_MEMBERS,
  PROFIT_TYPES,
  BANK_CASH,
} from "@/lib/constants";
import { CREDailyEntry, CustomerMovement, RDPayment, RecurringDeposit, Scheme } from "@/lib/types";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Plus, Users, TrendingUp, Repeat, FileText, Search, Settings, Check, ChevronsUpDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const CRE_STAFF = STAFF_MEMBERS.filter((s) => s.department === "CRE");

const CATEGORY_LABELS: Record<CREDailyEntry["category"], string> = {
  NewMembership: "New Membership",
  NewDailyDeposit: "New Daily Deposit",
  NewRD: "New Recurring Deposit",
  NewFD: "New Fixed Deposit",
  LoanBooking: "Loan Booking",
  AMC: "AMC",
};

const CATEGORY_COLORS: Record<CREDailyEntry["category"], string> = {
  NewMembership: "bg-purple-50 text-purple-800 border-purple-200",
  NewDailyDeposit: "bg-blue-50 text-blue-800 border-blue-200",
  NewRD: "bg-green-50 text-green-800 border-green-200",
  NewFD: "bg-yellow-50 text-yellow-800 border-yellow-200",
  LoanBooking: "bg-red-50 text-red-800 border-red-200",
  AMC: "bg-gray-50 text-gray-800 border-gray-200",
};

const CATEGORIES: CREDailyEntry["category"][] = [
  "NewMembership",
  "NewDailyDeposit",
  "NewRD",
  "NewFD",
  "LoanBooking",
  "AMC",
];

const MASTER_LIST_LABELS: { key: string; label: string }[] = [
  { key: "membershipPlans", label: "Membership Plans" },
  { key: "membershipProducts", label: "Membership Products" },
  { key: "ddTypes", label: "DD Types" },
  { key: "collectionAreas", label: "Collection Areas" },
  { key: "tenureOptions", label: "Tenure Options" },
  { key: "migrationTypes", label: "Migration Types" },
  { key: "customerNeeds", label: "Customer Needs" },
  { key: "fdTypes", label: "FD Types" },
  { key: "loanSchemeCodes", label: "Loan Scheme Codes" },
];

// ─── RD Helper Functions ─────────────────────────────────────────────────────

function parseTenureMonths(tenure: string): number {
  const mMatch = tenure.match(/(\d+)\s*month/i);
  if (mMatch) return parseInt(mMatch[1]);
  const yMatch = tenure.match(/(\d+)\s*year/i);
  if (yMatch) return parseInt(yMatch[1]) * 12;
  return 12;
}

function getMaturityDate(startDateStr: string, tenure: string): Date {
  return addMonths(parseISO(startDateStr), parseTenureMonths(tenure));
}

function getMonthsRemaining(rd: RecurringDeposit): number {
  const maturity = getMaturityDate(rd.startDate, rd.tenure);
  const now = new Date();
  return (maturity.getFullYear() - now.getFullYear()) * 12 + (maturity.getMonth() - now.getMonth());
}

function formatPeriod(period: string): string {
  return format(parseISO(`${period}-01`), "MMM yyyy");
}

function goPrevPeriod(period: string): string {
  return format(subMonths(parseISO(`${period}-01`), 1), "yyyy-MM");
}

function goNextPeriod(period: string): string {
  return format(addMonths(parseISO(`${period}-01`), 1), "yyyy-MM");
}

function isRDActiveInPeriod(rd: RecurringDeposit, period: string): boolean {
  if (rd.status !== "Active") return false;
  const periodStart = parseISO(`${period}-01`);
  const periodEnd = endOfMonth(periodStart);
  const rdStart = parseISO(rd.startDate);
  const maturityDate = getMaturityDate(rd.startDate, rd.tenure);
  return rdStart <= periodEnd && maturityDate > periodStart;
}

function hasOverduePriorPayments(rd: RecurringDeposit, currentPeriod: string, rdPayments: RDPayment[]): boolean {
  if (rd.status !== "Active") return false;
  const rdStart = startOfMonth(parseISO(rd.startDate));
  const periodStart = parseISO(`${currentPeriod}-01`);
  if (!isBefore(rdStart, periodStart)) return false;
  const prevMonth = subMonths(periodStart, 1);
  if (isAfter(rdStart, prevMonth)) return false;
  const priorMonths = eachMonthOfInterval({ start: rdStart, end: prevMonth });
  return priorMonths.some((month) => {
    const p = format(month, "yyyy-MM");
    return !rdPayments.some((pay) => pay.rdId === rd.id && pay.period === p);
  });
}

// ─── Manage Master Data Dialog ────────────────────────────────────────────────

function ManageMasterDataDialog({
  schemes,
  onAddScheme,
}: {
  schemes: Scheme[];
  onAddScheme: (s: Scheme) => void;
}) {
  const { customReferrers, addCustomReferrer, customerAccounts, addCustomerAccount, masterLists, addToMasterList } = useApp();
  const { toast, showToast, hideToast } = useToast();
  const [open, setOpen] = useState(false);

  const [schemeName, setSchemeName] = useState("");
  const [schemeType, setSchemeType] = useState<Scheme["type"] | "">("");
  const [schemeNameErr, setSchemeNameErr] = useState(false);
  const [schemeTypeErr, setSchemeTypeErr] = useState(false);

  const [referrerName, setReferrerName] = useState("");
  const [referrerNameErr, setReferrerNameErr] = useState(false);

  const [acctNumber, setAcctNumber] = useState("");
  const [acctCustomer, setAcctCustomer] = useState("");
  const [acctNumberErr, setAcctNumberErr] = useState(false);
  const [acctCustomerErr, setAcctCustomerErr] = useState(false);

  const [selectedListKey, setSelectedListKey] = useState("membershipPlans");
  const [newListValue, setNewListValue] = useState("");
  const [newListValueErr, setNewListValueErr] = useState(false);

  const handleAddScheme = () => {
    let hasErr = false;
    if (!schemeName.trim()) { setSchemeNameErr(true); hasErr = true; }
    if (!schemeType) { setSchemeTypeErr(true); hasErr = true; }
    if (hasErr) return;
    onAddScheme({ id: `sch${Date.now()}`, name: schemeName.trim(), type: schemeType as Scheme["type"] });
    setSchemeName("");
    setSchemeType("");
    showToast(`Scheme "${schemeName.trim()}" added`);
  };

  const handleAddReferrer = () => {
    if (!referrerName.trim()) { setReferrerNameErr(true); return; }
    addCustomReferrer({ id: `ref${Date.now()}`, name: referrerName.trim().toUpperCase() });
    setReferrerName("");
    showToast(`Referrer "${referrerName.trim().toUpperCase()}" added`);
  };

  const handleAddAccount = () => {
    let hasErr = false;
    if (!acctNumber.trim()) { setAcctNumberErr(true); hasErr = true; }
    if (!acctCustomer.trim()) { setAcctCustomerErr(true); hasErr = true; }
    if (hasErr) return;
    addCustomerAccount({ id: `acct${Date.now()}`, accountNumber: acctNumber.trim(), customerName: acctCustomer.trim() });
    setAcctNumber("");
    setAcctCustomer("");
    showToast(`Account ${acctNumber.trim()} added`);
  };

  const handleAddToList = () => {
    if (!newListValue.trim()) { setNewListValueErr(true); return; }
    addToMasterList(selectedListKey as keyof typeof masterLists, newListValue.trim());
    setNewListValue("");
    showToast(`"${newListValue.trim()}" added to list`);
  };

  const currentList = masterLists[selectedListKey as keyof typeof masterLists] as string[];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs">
          <Settings className="h-3 w-3 mr-1" /> Manage Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Manage Data</DialogTitle></DialogHeader>
        <Tabs defaultValue="schemes">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="schemes" className="text-xs">Schemes</TabsTrigger>
            <TabsTrigger value="referrers" className="text-xs">Referrers</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs">Accounts</TabsTrigger>
            <TabsTrigger value="lists" className="text-xs">Lists</TabsTrigger>
          </TabsList>

          <TabsContent value="schemes" className="space-y-4 py-2">
            <div className="max-h-48 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.name}</TableCell>
                      <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Add New Scheme</p>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label>Scheme Name</Label>
                  <Input value={schemeName} onChange={(e) => { setSchemeName(e.target.value); setSchemeNameErr(false); }} className={schemeNameErr ? "border-red-500" : ""} placeholder="e.g. Diamond RD" />
                  {schemeNameErr && <p className="text-xs text-red-500">Required</p>}
                </div>
                <div className="grid gap-1">
                  <Label>Type</Label>
                  <Select value={schemeType} onValueChange={(v) => { setSchemeType(v as Scheme["type"]); setSchemeTypeErr(false); }}>
                    <SelectTrigger className={schemeTypeErr ? "border-red-500" : ""}><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {(["RD", "FD", "Loan", "Membership"] as const).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {schemeTypeErr && <p className="text-xs text-red-500">Required</p>}
                </div>
                <Button onClick={handleAddScheme}><Plus className="h-4 w-4 mr-1" /> Add Scheme</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="referrers" className="space-y-4 py-2">
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {customReferrers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">No custom referrers added yet.</p>
              ) : (
                <div className="p-2 flex flex-wrap gap-2">
                  {customReferrers.map((r) => (
                    <Badge key={r.id} variant="secondary">{r.name}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Add Custom Referrer</p>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label>Name</Label>
                  <Input value={referrerName} onChange={(e) => { setReferrerName(e.target.value); setReferrerNameErr(false); }} className={referrerNameErr ? "border-red-500" : ""} placeholder="e.g. EXTERNAL AGENT" />
                  {referrerNameErr && <p className="text-xs text-red-500">Required</p>}
                </div>
                <Button onClick={handleAddReferrer}><Plus className="h-4 w-4 mr-1" /> Add Referrer</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4 py-2">
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {customerAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">No customer accounts added yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account No</TableHead>
                      <TableHead>Customer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAccounts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
                        <TableCell className="text-sm">{a.customerName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Add Customer Account</p>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label>Account Number</Label>
                    <Input value={acctNumber} onChange={(e) => { setAcctNumber(e.target.value); setAcctNumberErr(false); }} className={acctNumberErr ? "border-red-500" : ""} placeholder="RD-10050" />
                    {acctNumberErr && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="grid gap-1">
                    <Label>Customer Name</Label>
                    <Input value={acctCustomer} onChange={(e) => { setAcctCustomer(e.target.value); setAcctCustomerErr(false); }} className={acctCustomerErr ? "border-red-500" : ""} placeholder="Full name" />
                    {acctCustomerErr && <p className="text-xs text-red-500">Required</p>}
                  </div>
                </div>
                <Button onClick={handleAddAccount}><Plus className="h-4 w-4 mr-1" /> Add Account</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lists" className="space-y-4 py-2">
            <div className="grid gap-1">
              <Label>Which list</Label>
              <Select value={selectedListKey} onValueChange={(v) => { setSelectedListKey(v); setNewListValue(""); setNewListValueErr(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MASTER_LIST_LABELS.map((l) => (
                    <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-md p-2 min-h-[60px] flex flex-wrap gap-2">
              {currentList.map((item) => (
                <Badge key={item} variant="secondary">{item}</Badge>
              ))}
            </div>
            <div className="border-t pt-3 flex gap-2 items-end">
              <div className="grid gap-1 flex-1">
                <Label>Add new value</Label>
                <Input
                  value={newListValue}
                  onChange={(e) => { setNewListValue(e.target.value); setNewListValueErr(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddToList(); }}
                  className={newListValueErr ? "border-red-500" : ""}
                  placeholder="Enter value..."
                />
                {newListValueErr && <p className="text-xs text-red-500">Required</p>}
              </div>
              <Button onClick={handleAddToList} className="shrink-0"><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
          </TabsContent>
        </Tabs>
        <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
      </DialogContent>
    </Dialog>
  );
}

// ─── Daily Report Tab ───────────────────────────────────────────────────────

function EntryFormFields({
  category,
  schemes,
  form,
  errors,
  set,
  referrerOpen,
  setReferrerOpen,
}: {
  category: CREDailyEntry["category"];
  schemes: Scheme[];
  form: Record<string, string>;
  errors: Record<string, boolean>;
  set: (k: string, v: string) => void;
  referrerOpen: boolean;
  setReferrerOpen: (v: boolean) => void;
}) {
  const { customReferrers, customerAccounts, masterLists } = useApp();
  const rdSchemes = schemes.filter((s) => s.type === "RD").map((s) => s.name);
  const fdSchemes = schemes.filter((s) => s.type === "FD").map((s) => s.name);
  const loanSchemes = schemes.filter((s) => s.type === "Loan").map((s) => s.name);
  const err = (k: string) => errors[k] ? "border-red-500" : "";

  return (
    <div className="grid gap-3 py-2">
      {/* Account Number with datalist */}
      <div className="grid gap-1">
        <Label>Account Number</Label>
        <Input
          list="acct-list"
          value={form.accountNumber ?? ""}
          onChange={(e) => set("accountNumber", e.target.value)}
          className={err("accountNumber")}
          placeholder="e.g. RD-10050"
        />
        <datalist id="acct-list">
          {customerAccounts.map((a) => (
            <option key={a.id} value={a.accountNumber}>{a.customerName}</option>
          ))}
        </datalist>
        {errors.accountNumber && <p className="text-xs text-red-500">Required</p>}
      </div>

      {/* Referred By — Combobox */}
      <div className="grid gap-1">
        <Label>Referred By</Label>
        <Popover open={referrerOpen} onOpenChange={setReferrerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn("w-full justify-between font-normal", errors.referredBy && "border-red-500")}
            >
              {form.referredBy || "Select referrer..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No match found.</CommandEmpty>
                <CommandGroup heading="CRE Staff">
                  {CRE_STAFF.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.name}
                      onSelect={() => { set("referredBy", s.name); setReferrerOpen(false); }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", form.referredBy === s.name ? "opacity-100" : "opacity-0")} />
                      {s.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {customReferrers.length > 0 && (
                  <CommandGroup heading="Custom">
                    {customReferrers.map((r) => (
                      <CommandItem
                        key={r.id}
                        value={r.name}
                        onSelect={() => { set("referredBy", r.name); setReferrerOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", form.referredBy === r.name ? "opacity-100" : "opacity-0")} />
                        {r.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.referredBy && <p className="text-xs text-red-500">Required</p>}
      </div>

      {category === "NewMembership" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Plan</Label>
            <Select value={form.plan ?? ""} onValueChange={(v) => set("plan", v)}>
              <SelectTrigger className={err("plan")}><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>{masterLists.membershipPlans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            {errors.plan && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="grid gap-1">
            <Label>Product</Label>
            <Select value={form.product ?? ""} onValueChange={(v) => set("product", v)}>
              <SelectTrigger className={err("product")}><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{masterLists.membershipProducts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            {errors.product && <p className="text-xs text-red-500">Required</p>}
          </div>
        </div>
      )}

      {category === "NewDailyDeposit" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>DD Type</Label>
            <Select value={form.ddType ?? ""} onValueChange={(v) => set("ddType", v)}>
              <SelectTrigger className={err("ddType")}><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>{masterLists.ddTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            {errors.ddType && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="grid gap-1">
            <Label>Collection Area</Label>
            <Select value={form.collectionArea ?? ""} onValueChange={(v) => set("collectionArea", v)}>
              <SelectTrigger className={err("collectionArea")}><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>{masterLists.collectionAreas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            {errors.collectionArea && <p className="text-xs text-red-500">Required</p>}
          </div>
        </div>
      )}

      {(category === "NewRD" || category === "NewFD" || category === "LoanBooking") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Amount (₹)</Label>
            <Input type="number" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value)} className={err("amount")} placeholder="0" />
            {errors.amount && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="grid gap-1">
            <Label>Tenure</Label>
            <Select value={form.tenure ?? ""} onValueChange={(v) => set("tenure", v)}>
              <SelectTrigger className={err("tenure")}><SelectValue placeholder="Tenure" /></SelectTrigger>
              <SelectContent>{masterLists.tenureOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            {errors.tenure && <p className="text-xs text-red-500">Required</p>}
          </div>
        </div>
      )}

      {(category === "NewRD" || category === "NewFD") && (
        <div className="grid gap-1">
          <Label>Fresh / Renewal</Label>
          <Select value={form.freshRenewal ?? ""} onValueChange={(v) => set("freshRenewal", v)}>
            <SelectTrigger className={err("freshRenewal")}><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Fresh">Fresh</SelectItem>
              <SelectItem value="Renewal">Renewal</SelectItem>
            </SelectContent>
          </Select>
          {errors.freshRenewal && <p className="text-xs text-red-500">Required</p>}
        </div>
      )}

      {category === "NewRD" && (
        <>
          <div className="grid gap-1">
            <Label>Scheme</Label>
            <Select value={form.scheme ?? ""} onValueChange={(v) => set("scheme", v)}>
              <SelectTrigger className={err("scheme")}><SelectValue placeholder="Select scheme" /></SelectTrigger>
              <SelectContent>{rdSchemes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.scheme && <p className="text-xs text-red-500">Required</p>}
          </div>
          {/* NewRD-specific customer + staff fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Customer Name</Label>
              <Input
                value={form.customerName ?? ""}
                onChange={(e) => set("customerName", e.target.value)}
                className={err("customerName")}
                placeholder="Full name"
              />
              {errors.customerName && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Mobile Number</Label>
              <Input
                value={form.mobileNumber ?? ""}
                onChange={(e) => set("mobileNumber", e.target.value)}
                className={err("mobileNumber")}
                placeholder="10 digits"
                maxLength={10}
              />
              {errors.mobileNumber && <p className="text-xs text-red-500">10-digit number required</p>}
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Staff</Label>
            <Select value={form.staffId ?? ""} onValueChange={(v) => set("staffId", v)}>
              <SelectTrigger className={err("staffId")}><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.staffId && <p className="text-xs text-red-500">Required</p>}
          </div>
        </>
      )}

      {category === "NewFD" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Bank / Cash</Label>
              <Select value={form.bankCash ?? ""} onValueChange={(v) => set("bankCash", v)}>
                <SelectTrigger className={err("bankCash")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BANK_CASH.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
              {errors.bankCash && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>FD Type</Label>
              <Select value={form.fdType ?? ""} onValueChange={(v) => set("fdType", v)}>
                <SelectTrigger className={err("fdType")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{masterLists.fdTypes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              {errors.fdType && <p className="text-xs text-red-500">Required</p>}
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Scheme</Label>
            <Select value={form.scheme ?? ""} onValueChange={(v) => set("scheme", v)}>
              <SelectTrigger className={err("scheme")}><SelectValue placeholder="Select scheme" /></SelectTrigger>
              <SelectContent>{fdSchemes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.scheme && <p className="text-xs text-red-500">Required</p>}
          </div>
        </>
      )}

      {category === "LoanBooking" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Profit Type</Label>
              <Select value={form.profitType ?? ""} onValueChange={(v) => set("profitType", v)}>
                <SelectTrigger className={err("profitType")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{PROFIT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              {errors.profitType && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Profit Rate (%)</Label>
              <Input type="number" step="0.1" value={form.profitRate ?? ""} onChange={(e) => set("profitRate", e.target.value)} className={err("profitRate")} placeholder="e.g. 12" />
              {errors.profitRate && <p className="text-xs text-red-500">Required</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Loan Scheme</Label>
              <Select value={form.loanScheme ?? ""} onValueChange={(v) => set("loanScheme", v)}>
                <SelectTrigger className={err("loanScheme")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {masterLists.loanSchemeCodes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  {loanSchemes.map((s) => <SelectItem key={`loan-${s}`} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.loanScheme && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Migration (optional)</Label>
              <Select value={form.migration ?? ""} onValueChange={(v) => set("migration", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{masterLists.migrationTypes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function buildEntry(entryDate: string, category: CREDailyEntry["category"], form: Record<string, string>): CREDailyEntry {
  const staffMember = CRE_STAFF.find((s) => s.id === form.staffId);
  return {
    id: `cre${Date.now()}`,
    date: entryDate,
    category,
    accountNumber: form.accountNumber,
    referredBy: form.referredBy,
    plan: form.plan as CREDailyEntry["plan"],
    product: form.product as CREDailyEntry["product"],
    ddType: form.ddType,
    collectionArea: form.collectionArea,
    amount: form.amount ? Number(form.amount) : undefined,
    tenure: form.tenure,
    freshRenewal: form.freshRenewal as CREDailyEntry["freshRenewal"],
    scheme: form.scheme,
    bankCash: form.bankCash as CREDailyEntry["bankCash"],
    fdType: form.fdType as CREDailyEntry["fdType"],
    profitType: form.profitType as CREDailyEntry["profitType"],
    profitRate: form.profitRate ? Number(form.profitRate) : undefined,
    loanScheme: form.loanScheme,
    migration: form.migration,
    // NewRD sync fields
    customerName: form.customerName,
    mobileNumber: form.mobileNumber,
    staffId: form.staffId,
    staffName: staffMember?.name ?? form.staffId,
  };
}

function validateEntryForm(category: CREDailyEntry["category"], form: Record<string, string>): Record<string, boolean> {
  const e: Record<string, boolean> = {};
  if (!form.accountNumber) e.accountNumber = true;
  if (!form.referredBy) e.referredBy = true;
  if (category === "NewMembership") {
    if (!form.plan) e.plan = true;
    if (!form.product) e.product = true;
  }
  if (category === "NewDailyDeposit") {
    if (!form.ddType) e.ddType = true;
    if (!form.collectionArea) e.collectionArea = true;
  }
  if (category === "NewRD") {
    if (!form.amount) e.amount = true;
    if (!form.tenure) e.tenure = true;
    if (!form.freshRenewal) e.freshRenewal = true;
    if (!form.scheme) e.scheme = true;
    if (!form.customerName?.trim()) e.customerName = true;
    if (!form.mobileNumber || form.mobileNumber.length !== 10) e.mobileNumber = true;
    if (!form.staffId) e.staffId = true;
  }
  if (category === "NewFD") {
    if (!form.amount) e.amount = true;
    if (!form.tenure) e.tenure = true;
    if (!form.freshRenewal) e.freshRenewal = true;
    if (!form.bankCash) e.bankCash = true;
    if (!form.fdType) e.fdType = true;
    if (!form.scheme) e.scheme = true;
  }
  if (category === "LoanBooking") {
    if (!form.amount) e.amount = true;
    if (!form.tenure) e.tenure = true;
    if (!form.profitType) e.profitType = true;
    if (!form.profitRate) e.profitRate = true;
    if (!form.loanScheme) e.loanScheme = true;
  }
  return e;
}

function AddEntryDialog({
  category,
  schemes,
  onAdd,
}: {
  category: CREDailyEntry["category"];
  schemes: Scheme[];
  onAdd: (entry: CREDailyEntry) => void;
}) {
  const { entryDate } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [referrerOpen, setReferrerOpen] = useState(false);

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: false }));
  };

  const handleSubmit = () => {
    const e = validateEntryForm(category, form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onAdd(buildEntry(entryDate, category, form));
    setForm({});
    setErrors({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({}); setErrors({}); setReferrerOpen(false); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {CATEGORY_LABELS[category]}</DialogTitle>
        </DialogHeader>
        <EntryFormFields
          category={category}
          schemes={schemes}
          form={form}
          errors={errors}
          set={set}
          referrerOpen={referrerOpen}
          setReferrerOpen={setReferrerOpen}
        />
        <Button onClick={handleSubmit} className="mt-2">Add Entry</Button>
      </DialogContent>
    </Dialog>
  );
}

function QuickAddEntryDialog({
  schemes,
  onAdd,
}: {
  schemes: Scheme[];
  onAdd: (entry: CREDailyEntry) => void;
}) {
  const { entryDate } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [selectedCategory, setSelectedCategory] = useState<CREDailyEntry["category"] | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [referrerOpen, setReferrerOpen] = useState(false);

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: false }));
  };

  const reset = () => {
    setStep("pick");
    setSelectedCategory(null);
    setForm({});
    setErrors({});
    setReferrerOpen(false);
  };

  const handleSubmit = () => {
    const category = selectedCategory!;
    const e = validateEntryForm(category, form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onAdd(buildEntry(entryDate, category, form));
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "pick" ? "Add Entry" : `Add ${CATEGORY_LABELS[selectedCategory!]}`}
          </DialogTitle>
        </DialogHeader>
        {step === "pick" ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant="outline"
                className={`h-16 text-sm font-semibold border ${CATEGORY_COLORS[cat]}`}
                onClick={() => { setSelectedCategory(cat); setStep("form"); }}
              >
                {CATEGORY_LABELS[cat]}
              </Button>
            ))}
          </div>
        ) : (
          <>
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
              onClick={() => { setStep("pick"); setForm({}); setErrors({}); setReferrerOpen(false); }}
            >
              <ChevronLeft className="h-4 w-4" /> Back to categories
            </button>
            <EntryFormFields
              category={selectedCategory!}
              schemes={schemes}
              form={form}
              errors={errors}
              set={set}
              referrerOpen={referrerOpen}
              setReferrerOpen={setReferrerOpen}
            />
            <Button onClick={handleSubmit} className="mt-2">Add Entry</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({
  category,
  entries,
  schemes,
  onAdd,
}: {
  category: CREDailyEntry["category"];
  entries: CREDailyEntry[];
  schemes: Scheme[];
  onAdd: (e: CREDailyEntry) => void;
}) {
  const colorClass = CATEGORY_COLORS[category];
  const label = CATEGORY_LABELS[category];

  return (
    <div className="mb-4">
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-md border ${colorClass}`}>
        <span className="text-sm font-semibold">{label}</span>
        <AddEntryDialog category={category} schemes={schemes} onAdd={onAdd} />
      </div>
      <div className="border border-t-0 rounded-b-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Account No</TableHead>
              <TableHead>Referred By</TableHead>
              {category === "NewMembership" && <><TableHead>Plan</TableHead><TableHead>Product</TableHead></>}
              {category === "NewDailyDeposit" && <><TableHead>DD Type</TableHead><TableHead>Area</TableHead></>}
              {category === "NewRD" && <><TableHead>Amount</TableHead><TableHead>Tenure</TableHead><TableHead>Type</TableHead><TableHead>Scheme</TableHead><TableHead>Customer</TableHead><TableHead>Staff</TableHead></>}
              {category === "NewFD" && <><TableHead>Amount</TableHead><TableHead>Tenure</TableHead><TableHead>Type</TableHead><TableHead>Bank/Cash</TableHead><TableHead>FD Type</TableHead><TableHead>Scheme</TableHead></>}
              {category === "LoanBooking" && <><TableHead>Amount</TableHead><TableHead>Tenure</TableHead><TableHead>Profit</TableHead><TableHead>Rate%</TableHead><TableHead>Scheme</TableHead><TableHead>Migration</TableHead></>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4 text-xs text-muted-foreground">
                  No entries for this date
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e, i) => (
                <TableRow key={e.id} className="text-sm">
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{e.accountNumber}</TableCell>
                  <TableCell>{e.referredBy}</TableCell>
                  {category === "NewMembership" && (
                    <>
                      <TableCell><Badge variant="outline">{e.plan}</Badge></TableCell>
                      <TableCell>{e.product}</TableCell>
                    </>
                  )}
                  {category === "NewDailyDeposit" && (
                    <>
                      <TableCell>{e.ddType}</TableCell>
                      <TableCell className="text-xs">{e.collectionArea}</TableCell>
                    </>
                  )}
                  {category === "NewRD" && (
                    <>
                      <TableCell className="font-mono">₹{e.amount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs">{e.tenure}</TableCell>
                      <TableCell><Badge variant={e.freshRenewal === "Fresh" ? "default" : "secondary"}>{e.freshRenewal}</Badge></TableCell>
                      <TableCell className="text-xs">{e.scheme}</TableCell>
                      <TableCell className="text-xs">{e.customerName ?? "—"}</TableCell>
                      <TableCell className="text-xs">{e.staffName ?? "—"}</TableCell>
                    </>
                  )}
                  {category === "NewFD" && (
                    <>
                      <TableCell className="font-mono">₹{e.amount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs">{e.tenure}</TableCell>
                      <TableCell><Badge variant={e.freshRenewal === "Fresh" ? "default" : "secondary"}>{e.freshRenewal}</Badge></TableCell>
                      <TableCell>{e.bankCash}</TableCell>
                      <TableCell>{e.fdType}</TableCell>
                      <TableCell className="text-xs">{e.scheme}</TableCell>
                    </>
                  )}
                  {category === "LoanBooking" && (
                    <>
                      <TableCell className="font-mono">₹{e.amount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs">{e.tenure}</TableCell>
                      <TableCell>{e.profitType}</TableCell>
                      <TableCell>{e.profitRate}%</TableCell>
                      <TableCell>{e.loanScheme}</TableCell>
                      <TableCell className="text-xs">{e.migration ?? "—"}</TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DailyReportTab() {
  const { selectedDate, selectedDateEnd, creEntries, addCREEntry, schemes, addScheme } = useApp();
  const { toast, showToast, hideToast } = useToast();

  const filtered = useMemo(
    () => creEntries.filter((e) => e.date >= selectedDate && e.date <= selectedDateEnd),
    [creEntries, selectedDate, selectedDateEnd]
  );

  const stats = useMemo(() => ({
    total: filtered.length,
    memberships: filtered.filter((e) => e.category === "NewMembership").length,
    rds: filtered.filter((e) => e.category === "NewRD").length,
    fds: filtered.filter((e) => e.category === "NewFD").length,
  }), [filtered]);

  const handleAdd = (entry: CREDailyEntry) => {
    addCREEntry(entry);
    showToast(`Entry added: ${entry.accountNumber}${entry.category === "NewRD" && entry.customerName ? " — RD also created" : ""}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedDate === selectedDateEnd
            ? `Showing entries for ${format(parseISO(selectedDate), "dd MMM yyyy")}`
            : `Showing entries: ${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`}
        </p>
        <div className="flex items-center gap-2">
          <QuickAddEntryDialog schemes={schemes} onAdd={handleAdd} />
          <ManageMasterDataDialog schemes={schemes} onAddScheme={addScheme} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Entries", value: stats.total, icon: FileText, color: "" },
          { label: "New Memberships", value: stats.memberships, icon: Users, color: "text-purple-600" },
          { label: "New RDs", value: stats.rds, icon: TrendingUp, color: "text-green-600" },
          { label: "New FDs", value: stats.fds, icon: Repeat, color: "text-yellow-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 text-muted-foreground ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          entries={filtered.filter((e) => e.category === cat)}
          schemes={schemes}
          onAdd={handleAdd}
        />
      ))}
      <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}

// ─── Customer Movement Register Tab ─────────────────────────────────────────

function AddMovementDialog({ onAdd }: { onAdd: (m: CustomerMovement) => void }) {
  const { entryDate, masterLists } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerName: "", mobileNumber: "", need: "", treatedBy: "", remarks: "", verifiedBy: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: false }));
  };

  const handleSubmit = () => {
    const e: Record<string, boolean> = {};
    if (!form.customerName) e.customerName = true;
    if (!form.mobileNumber || form.mobileNumber.length !== 10) e.mobileNumber = true;
    if (!form.need) e.need = true;
    if (!form.treatedBy) e.treatedBy = true;
    if (!form.verifiedBy) e.verifiedBy = true;
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onAdd({
      id: `cm${Date.now()}`,
      date: entryDate,
      ...form,
    });
    setForm({ customerName: "", mobileNumber: "", need: "", treatedBy: "", remarks: "", verifiedBy: "" });
    setErrors({});
    setOpen(false);
  };

  const err = (k: string) => errors[k] ? "border-red-500" : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({ customerName: "", mobileNumber: "", need: "", treatedBy: "", remarks: "", verifiedBy: "" }); setErrors({}); } }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Add Movement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Customer Movement</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Customer Name</Label>
              <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} className={err("customerName")} placeholder="Full name" />
              {errors.customerName && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Mobile Number</Label>
              <Input value={form.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} className={err("mobileNumber")} placeholder="10 digits" maxLength={10} />
              {errors.mobileNumber && <p className="text-xs text-red-500">10-digit number required</p>}
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Need</Label>
            <Select value={form.need} onValueChange={(v) => set("need", v)}>
              <SelectTrigger className={err("need")}><SelectValue placeholder="Select need" /></SelectTrigger>
              <SelectContent>
                {masterLists.customerNeeds.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.need && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Treated By</Label>
              <Select value={form.treatedBy} onValueChange={(v) => set("treatedBy", v)}>
                <SelectTrigger className={err("treatedBy")}><SelectValue placeholder="Staff" /></SelectTrigger>
                <SelectContent>{CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.treatedBy && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Verified By</Label>
              <Select value={form.verifiedBy} onValueChange={(v) => set("verifiedBy", v)}>
                <SelectTrigger className={err("verifiedBy")}><SelectValue placeholder="Staff" /></SelectTrigger>
                <SelectContent>{CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.verifiedBy && <p className="text-xs text-red-500">Required</p>}
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Remarks</Label>
            <Textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Optional remarks..." rows={2} />
          </div>
          <Button onClick={handleSubmit}>Add Movement</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerMovementTab() {
  const { selectedDate, selectedDateEnd, customerMovements, addCustomerMovement } = useApp();
  const { toast, showToast, hideToast } = useToast();

  const filtered = useMemo(
    () => customerMovements.filter((m) => m.date >= selectedDate && m.date <= selectedDateEnd),
    [customerMovements, selectedDate, selectedDateEnd]
  );

  const handleAdd = (m: CustomerMovement) => {
    addCustomerMovement(m);
    showToast(`Movement added for ${m.customerName}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} visitor{filtered.length !== 1 ? "s" : ""}{" "}
          {selectedDate === selectedDateEnd
            ? `on ${format(parseISO(selectedDate), "dd MMM yyyy")}`
            : `from ${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`}
        </p>
        <AddMovementDialog onAdd={handleAdd} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Need</TableHead>
                  <TableHead>Treated By</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Verified By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No movements recorded for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m, i) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{m.customerName}</TableCell>
                      <TableCell className="font-mono text-sm">{m.mobileNumber}</TableCell>
                      <TableCell><Badge variant="outline">{m.need}</Badge></TableCell>
                      <TableCell>{m.treatedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.remarks || "—"}</TableCell>
                      <TableCell>{m.verifiedBy}</TableCell>
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

// ─── RD List Tab Components ──────────────────────────────────────────────────

function AddRDDialog({ schemes, onAdd }: { schemes: Scheme[]; onAdd: (rd: RecurringDeposit) => void }) {
  const { masterLists } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const rdSchemes = schemes.filter((s) => s.type === "RD").map((s) => s.name);

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: false }));
  };

  const handleSubmit = () => {
    const e: Record<string, boolean> = {};
    if (!form.accountNumber) e.accountNumber = true;
    if (!form.customerName) e.customerName = true;
    if (!form.mobileNumber || form.mobileNumber.length !== 10) e.mobileNumber = true;
    if (!form.amount) e.amount = true;
    if (!form.tenure) e.tenure = true;
    if (!form.freshRenewal) e.freshRenewal = true;
    if (!form.scheme) e.scheme = true;
    if (!form.startDate) e.startDate = true;
    if (!form.staffId) e.staffId = true;
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    const staff = STAFF_MEMBERS.find((s) => s.id === form.staffId);
    onAdd({
      id: `rd${Date.now()}`,
      accountNumber: form.accountNumber,
      customerName: form.customerName,
      mobileNumber: form.mobileNumber,
      amount: Number(form.amount),
      tenure: form.tenure,
      freshRenewal: form.freshRenewal as "Fresh" | "Renewal",
      scheme: form.scheme,
      startDate: form.startDate,
      staffId: form.staffId,
      staffName: staff?.name ?? "",
      status: "Active",
    });
    setForm({});
    setErrors({});
    setOpen(false);
  };

  const err = (k: string) => errors[k] ? "border-red-500" : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({}); setErrors({}); } }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Add RD</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Recurring Deposit</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Account Number</Label>
              <Input value={form.accountNumber ?? ""} onChange={(e) => set("accountNumber", e.target.value)} className={err("accountNumber")} placeholder="RD-10050" />
              {errors.accountNumber && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Customer Name</Label>
              <Input value={form.customerName ?? ""} onChange={(e) => set("customerName", e.target.value)} className={err("customerName")} placeholder="Full name" />
              {errors.customerName && <p className="text-xs text-red-500">Required</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Mobile Number</Label>
              <Input value={form.mobileNumber ?? ""} onChange={(e) => set("mobileNumber", e.target.value)} className={err("mobileNumber")} placeholder="10 digits" maxLength={10} />
              {errors.mobileNumber && <p className="text-xs text-red-500">10 digits required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Amount (₹)</Label>
              <Input type="number" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value)} className={err("amount")} placeholder="500" />
              {errors.amount && <p className="text-xs text-red-500">Required</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Tenure</Label>
              <Select value={form.tenure ?? ""} onValueChange={(v) => set("tenure", v)}>
                <SelectTrigger className={err("tenure")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{masterLists.tenureOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              {errors.tenure && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Fresh / Renewal</Label>
              <Select value={form.freshRenewal ?? ""} onValueChange={(v) => set("freshRenewal", v)}>
                <SelectTrigger className={err("freshRenewal")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fresh">Fresh</SelectItem>
                  <SelectItem value="Renewal">Renewal</SelectItem>
                </SelectContent>
              </Select>
              {errors.freshRenewal && <p className="text-xs text-red-500">Required</p>}
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Scheme</Label>
            <Select value={form.scheme ?? ""} onValueChange={(v) => set("scheme", v)}>
              <SelectTrigger className={err("scheme")}><SelectValue placeholder="Select scheme" /></SelectTrigger>
              <SelectContent>{rdSchemes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.scheme && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={err("startDate")} />
              {errors.startDate && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="grid gap-1">
              <Label>Staff</Label>
              <Select value={form.staffId ?? ""} onValueChange={(v) => set("staffId", v)}>
                <SelectTrigger className={err("staffId")}><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.staffId && <p className="text-xs text-red-500">Required</p>}
            </div>
          </div>
          <Button onClick={handleSubmit} className="mt-1">Add RD</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MasterAddPaymentDialog({
  open,
  onOpenChange,
  rdList,
  period,
  rdPayments,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rdList: RecurringDeposit[];
  period: string;
  rdPayments: RDPayment[];
  onSave: (payment: RDPayment) => void;
}) {
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [selectedRD, setSelectedRD] = useState<RecurringDeposit | null>(null);
  const [rdComboOpen, setRdComboOpen] = useState(false);
  const [rdSearch, setRdSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [collectedBy, setCollectedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const activeRDs = rdList.filter((r) => r.status === "Active");
  const filteredCombo = rdSearch
    ? activeRDs.filter(
        (r) =>
          r.accountNumber.toLowerCase().includes(rdSearch.toLowerCase()) ||
          r.customerName.toLowerCase().includes(rdSearch.toLowerCase())
      )
    : activeRDs;

  const reset = () => {
    setStep("pick");
    setSelectedRD(null);
    setRdSearch("");
    setAmount("");
    setPaidDate(format(new Date(), "yyyy-MM-dd"));
    setCollectedBy("");
    setRemarks("");
    setErrors({});
  };

  const handlePickRD = (rd: RecurringDeposit) => {
    setSelectedRD(rd);
    const existing = rdPayments.find((p) => p.rdId === rd.id && p.period === period);
    setAmount(existing ? String(existing.amount) : String(rd.amount));
    setPaidDate(existing ? existing.paidDate : format(new Date(), "yyyy-MM-dd"));
    setCollectedBy(existing ? existing.collectedBy : rd.staffId);
    setRemarks(existing ? (existing.remarks ?? "") : "");
    setErrors({});
    setStep("form");
    setRdComboOpen(false);
  };

  const handleSubmit = () => {
    const e: Record<string, boolean> = {};
    if (!amount || Number(amount) <= 0) e.amount = true;
    if (!paidDate) e.paidDate = true;
    if (!collectedBy) e.collectedBy = true;
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const rd = selectedRD!;
    const existing = rdPayments.find((p) => p.rdId === rd.id && p.period === period);
    const staff = CRE_STAFF.find((s) => s.id === collectedBy);
    onSave({
      id: existing?.id ?? `rdp${Date.now()}`,
      rdId: rd.id,
      period,
      amount: Number(amount),
      paidDate,
      collectedBy,
      collectedByName: staff?.name ?? "",
      remarks: remarks || undefined,
    });
    reset();
    onOpenChange(false);
  };

  const err = (k: string) => errors[k] ? "border-red-500" : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "pick" ? "Add Payment" : `Record Payment — ${formatPeriod(period)}`}
          </DialogTitle>
        </DialogHeader>
        {step === "pick" ? (
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">Select an active RD to record payment for {formatPeriod(period)}.</p>
            <Popover open={rdComboOpen} onOpenChange={setRdComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  Select RD...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search by account or name..."
                    value={rdSearch}
                    onValueChange={setRdSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No active RDs found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCombo.map((rd) => (
                        <CommandItem
                          key={rd.id}
                          value={`${rd.accountNumber} ${rd.customerName}`}
                          onSelect={() => handlePickRD(rd)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{rd.customerName}</span>
                            <span className="text-xs text-muted-foreground font-mono">{rd.accountNumber} · ₹{rd.amount.toLocaleString("en-IN")}/month</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -mt-1 mb-1"
              onClick={() => { setStep("pick"); setSelectedRD(null); setRdSearch(""); }}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="bg-muted/50 rounded-md p-3 text-sm mb-2">
              <div className="font-medium">{selectedRD!.customerName}</div>
              <div className="text-muted-foreground font-mono text-xs">{selectedRD!.accountNumber}</div>
              <div className="mt-1 text-muted-foreground">₹{selectedRD!.amount.toLocaleString("en-IN")}/month · {formatPeriod(period)}</div>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Amount Paid (₹)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: false })); }}
                  className={err("amount")}
                />
                {errors.amount && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid gap-1">
                <Label>Paid Date</Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => { setPaidDate(e.target.value); setErrors((p) => ({ ...p, paidDate: false })); }}
                  className={err("paidDate")}
                />
                {errors.paidDate && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid gap-1">
                <Label>Collected By</Label>
                <Select value={collectedBy} onValueChange={(v) => { setCollectedBy(v); setErrors((p) => ({ ...p, collectedBy: false })); }}>
                  <SelectTrigger className={err("collectedBy")}><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.collectedBy && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid gap-1">
                <Label>Remarks (optional)</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Optional..." />
              </div>
              <Button onClick={handleSubmit}>Record Payment</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RDDetailSheet({
  rd,
  period,
  rdPayments,
  onSavePayment,
  open,
  onOpenChange,
}: {
  rd: RecurringDeposit;
  period: string;
  rdPayments: RDPayment[];
  onSavePayment: (payment: RDPayment) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const maturityDate = getMaturityDate(rd.startDate, rd.tenure);
  const today = new Date();
  const monthsLeft = getMonthsRemaining(rd);
  const activeInPeriod = isRDActiveInPeriod(rd, period);
  const currentPayment = rdPayments.find((p) => p.rdId === rd.id && p.period === period);

  // Current period form state
  const [curAmount, setCurAmount] = useState(String(rd.amount));
  const [curDate, setCurDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [curCollectedBy, setCurCollectedBy] = useState(rd.staffId);
  const [curRemarks, setCurRemarks] = useState("");
  const [curErrors, setCurErrors] = useState<Record<string, boolean>>({});
  const [showCurEdit, setShowCurEdit] = useState(false);

  // History form state
  const [payingPeriod, setPayingPeriod] = useState<string | null>(null);
  const [histAmount, setHistAmount] = useState("");
  const [histDate, setHistDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [histCollectedBy, setHistCollectedBy] = useState(rd.staffId);
  const [histRemarks, setHistRemarks] = useState("");
  const [histErrors, setHistErrors] = useState<Record<string, boolean>>({});

  // Reset when sheet opens or RD/period changes
  useEffect(() => {
    const cp = rdPayments.find((p) => p.rdId === rd.id && p.period === period);
    setCurAmount(cp ? String(cp.amount) : String(rd.amount));
    setCurDate(cp ? cp.paidDate : format(new Date(), "yyyy-MM-dd"));
    setCurCollectedBy(cp ? cp.collectedBy : rd.staffId);
    setCurRemarks(cp ? (cp.remarks ?? "") : "");
    setCurErrors({});
    setShowCurEdit(false);
    setPayingPeriod(null);
  }, [rd.id, period, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditToggle = () => {
    if (!showCurEdit && currentPayment) {
      setCurAmount(String(currentPayment.amount));
      setCurDate(currentPayment.paidDate);
      setCurCollectedBy(currentPayment.collectedBy);
      setCurRemarks(currentPayment.remarks ?? "");
      setCurErrors({});
    }
    setShowCurEdit((v) => !v);
  };

  const handleCurSubmit = () => {
    const e: Record<string, boolean> = {};
    if (!curAmount || Number(curAmount) <= 0) e.amount = true;
    if (!curDate) e.paidDate = true;
    if (!curCollectedBy) e.collectedBy = true;
    if (Object.keys(e).length > 0) { setCurErrors(e); return; }
    const staff = CRE_STAFF.find((s) => s.id === curCollectedBy);
    onSavePayment({
      id: currentPayment?.id ?? `rdp${Date.now()}`,
      rdId: rd.id,
      period,
      amount: Number(curAmount),
      paidDate: curDate,
      collectedBy: curCollectedBy,
      collectedByName: staff?.name ?? "",
      remarks: curRemarks || undefined,
    });
    setShowCurEdit(false);
  };

  // History calculations
  const rdStartMonth = startOfMonth(parseISO(rd.startDate));
  const historyEndMonth = startOfMonth(isBefore(maturityDate, today) ? maturityDate : today);
  const historyMonths = isAfter(rdStartMonth, historyEndMonth)
    ? [rdStartMonth]
    : eachMonthOfInterval({ start: rdStartMonth, end: historyEndMonth });
  const myPayments = rdPayments.filter((p) => p.rdId === rd.id);
  const paidMonths = myPayments.filter((p) => historyMonths.some((m) => format(m, "yyyy-MM") === p.period));
  const totalMonths = historyMonths.length;
  const pendingCount = totalMonths - paidMonths.length;
  const totalCollected = paidMonths.reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = totalMonths * rd.amount;

  const openHistPayForm = (p: string, existing?: RDPayment) => {
    setPayingPeriod(p);
    setHistAmount(existing ? String(existing.amount) : String(rd.amount));
    setHistDate(existing ? existing.paidDate : format(new Date(), "yyyy-MM-dd"));
    setHistCollectedBy(existing ? existing.collectedBy : rd.staffId);
    setHistRemarks(existing ? (existing.remarks ?? "") : "");
    setHistErrors({});
  };

  const handleHistSubmit = () => {
    const e: Record<string, boolean> = {};
    if (!histAmount || Number(histAmount) <= 0) e.amount = true;
    if (!histDate) e.payDate = true;
    if (!histCollectedBy) e.collectedBy = true;
    if (Object.keys(e).length > 0) { setHistErrors(e); return; }
    const staff = CRE_STAFF.find((s) => s.id === histCollectedBy);
    const existing = myPayments.find((p) => p.period === payingPeriod);
    onSavePayment({
      id: existing?.id ?? `rdp${Date.now()}`,
      rdId: rd.id,
      period: payingPeriod!,
      amount: Number(histAmount),
      paidDate: histDate,
      collectedBy: histCollectedBy,
      collectedByName: staff?.name ?? "",
      remarks: histRemarks || undefined,
    });
    setPayingPeriod(null);
  };

  const staffMember = STAFF_MEMBERS.find((s) => s.id === rd.staffId);

  let maturityColorClass = "text-green-600";
  if (monthsLeft < 0) maturityColorClass = "text-muted-foreground";
  else if (monthsLeft < 1) maturityColorClass = "text-red-600";
  else if (monthsLeft <= 6) maturityColorClass = "text-yellow-600";

  const curErr = (k: string) => curErrors[k] ? "border-red-500" : "";
  const histErr = (k: string) => histErrors[k] ? "border-red-500" : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
        {/* Sticky header */}
        <div className="sticky top-0 bg-background border-b px-4 py-3 z-10">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-lg leading-tight">{rd.customerName}</SheetTitle>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">{rd.accountNumber}</div>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[rd.status]}`}>
                {rd.status}
              </span>
            </div>
          </SheetHeader>
        </div>

        {/* RD Details Grid */}
        <div className="bg-muted/50 px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Mobile</div>
            <div className="font-mono">{rd.mobileNumber}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Amount/Month</div>
            <div className="font-medium">₹{rd.amount.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tenure</div>
            <div className="flex items-center gap-2">
              {rd.tenure}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-medium",
                monthsLeft < 0 ? "bg-gray-100 text-gray-600" :
                monthsLeft < 1 ? "bg-red-100 text-red-700" :
                monthsLeft <= 6 ? "bg-yellow-100 text-yellow-700" :
                "bg-green-100 text-green-700"
              )}>
                {monthsLeft < 0 ? "Matured" : `${monthsLeft}m left`}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Scheme</div>
            <div>{rd.scheme}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Start Date</div>
            <div>{format(parseISO(rd.startDate), "dd MMM yyyy")}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Maturity</div>
            <div className={cn("font-medium", maturityColorClass)}>{format(maturityDate, "MMM yyyy")}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">Staff</div>
            <div>{staffMember?.name ?? rd.staffName ?? rd.staffId}</div>
          </div>
        </div>

        {/* Current Period Card */}
        <div className="mx-4 mt-4 border rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{formatPeriod(period)} Payment</p>
            {activeInPeriod && currentPayment && !showCurEdit && (
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleEditToggle}>
                Edit
              </Button>
            )}
          </div>
          {!activeInPeriod ? (
            <p className="text-sm text-muted-foreground">Not active this period</p>
          ) : currentPayment && !showCurEdit ? (
            (() => {
              const isFullPay = currentPayment.amount >= rd.amount;
              return (
                <div className={cn("border-l-4 pl-3 py-1 space-y-1 text-sm", isFullPay ? "border-green-500" : "border-yellow-500")}>
                  <div className={cn("flex items-center gap-1 font-medium", isFullPay ? "text-green-700" : "text-yellow-700")}>
                    <Check className="h-3.5 w-3.5" /> {isFullPay ? "Paid" : `Partial — ₹${currentPayment.amount.toLocaleString("en-IN")} of ₹${rd.amount.toLocaleString("en-IN")}`}
                  </div>
                  <div className="text-muted-foreground">Date: <span className="text-foreground">{format(parseISO(currentPayment.paidDate), "dd MMM yyyy")}</span></div>
                  <div className="text-muted-foreground">Collected By: <span className="text-foreground">{currentPayment.collectedByName}</span></div>
                  {currentPayment.remarks && <div className="text-muted-foreground">Remarks: <span className="text-foreground">{currentPayment.remarks}</span></div>}
                </div>
              );
            })()
          ) : (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input
                    type="number"
                    value={curAmount}
                    onChange={(e) => { setCurAmount(e.target.value); setCurErrors((p) => ({ ...p, amount: false })); }}
                    className={cn("h-8 text-sm", curErr("amount"))}
                  />
                  {curErrors.amount && <p className="text-xs text-red-500">Required</p>}
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Paid Date</Label>
                  <Input
                    type="date"
                    value={curDate}
                    onChange={(e) => { setCurDate(e.target.value); setCurErrors((p) => ({ ...p, paidDate: false })); }}
                    className={cn("h-8 text-sm", curErr("paidDate"))}
                  />
                  {curErrors.paidDate && <p className="text-xs text-red-500">Required</p>}
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Collected By</Label>
                <Select value={curCollectedBy} onValueChange={(v) => { setCurCollectedBy(v); setCurErrors((p) => ({ ...p, collectedBy: false })); }}>
                  <SelectTrigger className={cn("h-8 text-sm", curErr("collectedBy"))}><SelectValue placeholder="Staff" /></SelectTrigger>
                  <SelectContent>{CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {curErrors.collectedBy && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Remarks</Label>
                <Input value={curRemarks} onChange={(e) => setCurRemarks(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCurSubmit} className="h-8 text-sm">
                  {currentPayment ? "Update Payment" : "Record Payment"}
                </Button>
                {showCurEdit && (
                  <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={() => setShowCurEdit(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="mx-4 mt-4 mb-4">
          <p className="text-sm font-semibold mb-2">Payment History</p>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs">Expected</TableHead>
                  <TableHead className="text-xs">Paid Date</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">By</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="w-14 text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyMonths.flatMap((month) => {
                  const p = format(month, "yyyy-MM");
                  const payment = myPayments.find((pay) => pay.period === p);
                  const isPaid = !!payment;
                  const isPayingThis = payingPeriod === p;

                  const rows = [
                    <TableRow key={p} className={isPayingThis ? "bg-blue-50" : ""}>
                      <TableCell className="text-xs font-medium">{format(month, "MMM yyyy")}</TableCell>
                      <TableCell className="text-xs font-mono">₹{rd.amount.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs">{payment ? format(parseISO(payment.paidDate), "dd MMM yy") : "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{payment ? `₹${payment.amount.toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell className="text-xs">{payment?.collectedByName ?? "—"}</TableCell>
                      <TableCell>
                        {isPaid ? (
                          payment!.amount >= rd.amount ? (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">Paid</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">Partial</span>
                          )
                        ) : (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-1.5"
                          onClick={() => isPayingThis ? setPayingPeriod(null) : openHistPayForm(p, payment)}
                        >
                          {isPayingThis ? "Cancel" : isPaid ? "Edit" : "Pay"}
                        </Button>
                      </TableCell>
                    </TableRow>,
                  ];

                  if (isPayingThis) {
                    rows.push(
                      <TableRow key={`${p}-form`}>
                        <TableCell colSpan={7} className="bg-blue-50/60 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-1">
                              <Label className="text-xs">Amount (₹)</Label>
                              <Input
                                type="number"
                                value={histAmount}
                                onChange={(e) => { setHistAmount(e.target.value); setHistErrors((prev) => ({ ...prev, amount: false })); }}
                                className={cn("h-7 text-xs", histErr("amount"))}
                              />
                              {histErrors.amount && <p className="text-xs text-red-500">Required</p>}
                            </div>
                            <div className="grid gap-1">
                              <Label className="text-xs">Paid Date</Label>
                              <Input
                                type="date"
                                value={histDate}
                                onChange={(e) => { setHistDate(e.target.value); setHistErrors((prev) => ({ ...prev, payDate: false })); }}
                                className={cn("h-7 text-xs", histErr("payDate"))}
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label className="text-xs">Collected By</Label>
                              <Select value={histCollectedBy} onValueChange={(v) => { setHistCollectedBy(v); setHistErrors((prev) => ({ ...prev, collectedBy: false })); }}>
                                <SelectTrigger className={cn("h-7 text-xs", histErr("collectedBy"))}><SelectValue placeholder="Staff" /></SelectTrigger>
                                <SelectContent>{CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                              </Select>
                              {histErrors.collectedBy && <p className="text-xs text-red-500">Required</p>}
                            </div>
                            <div className="grid gap-1">
                              <Label className="text-xs">Remarks</Label>
                              <Input
                                value={histRemarks}
                                onChange={(e) => setHistRemarks(e.target.value)}
                                className="h-7 text-xs"
                                placeholder="Optional"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={handleHistSubmit} className="h-7 text-xs">Save Payment</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPayingPeriod(null)}>Cancel</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return rows;
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer Summary */}
          <div className="border rounded-md p-3 mt-3 grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{totalMonths}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{paidMonths.length}</div>
              <div className="text-xs text-muted-foreground">Paid</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div>
              <div className="text-base font-bold">₹{totalCollected.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">of ₹{totalExpected.toLocaleString("en-IN")}</div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BulkMarkPaidDialog({
  selectedRDs,
  period,
  rdPayments,
  onSave,
  onClose,
}: {
  selectedRDs: RecurringDeposit[];
  period: string;
  rdPayments: RDPayment[];
  onSave: (payments: RDPayment[]) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [collectedBy, setCollectedBy] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const pendingRDs = selectedRDs.filter(
    (rd) => !rdPayments.find((p) => p.rdId === rd.id && p.period === period)
  );

  const handleSave = () => {
    const e: Record<string, boolean> = {};
    if (!paidDate) e.paidDate = true;
    if (!collectedBy) e.collectedBy = true;
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const staff = CRE_STAFF.find((s) => s.id === collectedBy);
    const payments: RDPayment[] = pendingRDs.map((rd, idx) => ({
      id: `rdp${Date.now()}${idx}`,
      rdId: rd.id,
      period,
      amount: rd.amount,
      paidDate,
      collectedBy,
      collectedByName: staff?.name ?? "",
    }));
    onSave(payments);
    setOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-sm">
          Mark {selectedRDs.length} Selected as Paid
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Bulk Mark as Paid</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Marking <span className="font-medium text-foreground">{pendingRDs.length}</span> pending RDs as paid for <span className="font-medium text-foreground">{formatPeriod(period)}</span>.
          {pendingRDs.length < selectedRDs.length && (
            <span className="text-yellow-600"> ({selectedRDs.length - pendingRDs.length} already paid, will be skipped)</span>
          )}
        </p>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <Label>Paid Date</Label>
            <Input type="date" value={paidDate} onChange={(e) => { setPaidDate(e.target.value); setErrors((p) => ({ ...p, paidDate: false })); }} className={errors.paidDate ? "border-red-500" : ""} />
            {errors.paidDate && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="grid gap-1">
            <Label>Collected By</Label>
            <Select value={collectedBy} onValueChange={(v) => { setCollectedBy(v); setErrors((p) => ({ ...p, collectedBy: false })); }}>
              <SelectTrigger className={errors.collectedBy ? "border-red-500" : ""}><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>{CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.collectedBy && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="max-h-36 overflow-y-auto border rounded-md divide-y">
            {pendingRDs.map((rd) => (
              <div key={rd.id} className="flex justify-between items-center px-3 py-1.5 text-xs">
                <span className="font-medium">{rd.customerName}</span>
                <span className="font-mono text-muted-foreground">₹{rd.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
          <Button onClick={handleSave} disabled={pendingRDs.length === 0}>
            Mark {pendingRDs.length} as Paid
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_BADGE: Record<RecurringDeposit["status"], string> = {
  Active: "bg-green-100 text-green-800",
  Completed: "bg-blue-100 text-blue-800",
  Closed: "bg-gray-100 text-gray-600",
};

function RDListTab() {
  const { rdList, addRD, schemes, rdPayments, addRDPayment } = useApp();
  const { toast, showToast, hideToast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(() => format(new Date(), "yyyy-MM"));
  const [staffFilter, setStaffFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"all" | "defaulters" | "paid">("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sheetRD, setSheetRD] = useState<RecurringDeposit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [masterPayOpen, setMasterPayOpen] = useState(false);

  const handleAdd = (rd: RecurringDeposit) => {
    addRD(rd);
    showToast(`RD added: ${rd.accountNumber}`);
  };

  const handleSavePayment = (payment: RDPayment) => {
    addRDPayment(payment);
    showToast(`Payment recorded for ${formatPeriod(payment.period)}`);
  };

  const handleBulkSave = (payments: RDPayment[]) => {
    payments.forEach((p) => addRDPayment(p));
    showToast(`${payments.length} payments recorded for ${formatPeriod(selectedPeriod)}`);
    setSelectedRows(new Set());
  };

  const filteredRDs = useMemo(() => {
    const q = search.toLowerCase();
    return rdList.filter((rd) => {
      if (staffFilter !== "all" && rd.staffId !== staffFilter) return false;
      if (q && !rd.customerName.toLowerCase().includes(q) && !rd.accountNumber.toLowerCase().includes(q)) return false;
      if (viewMode !== "all") {
        const activeInPeriod = isRDActiveInPeriod(rd, selectedPeriod);
        if (!activeInPeriod) return false;
        const payment = rdPayments.find((p) => p.rdId === rd.id && p.period === selectedPeriod);
        const isFullyPaid = !!payment && payment.amount >= rd.amount;
        if (viewMode === "defaulters" && isFullyPaid) return false;
        if (viewMode === "paid" && !isFullyPaid) return false;
      }
      return true;
    });
  }, [rdList, search, staffFilter, viewMode, selectedPeriod, rdPayments]);

  const stats = useMemo(() => {
    const staffRDs = staffFilter === "all" ? rdList : rdList.filter((r) => r.staffId === staffFilter);
    const activeRDs = staffRDs.filter((r) => r.status === "Active");
    const activeInPeriod = activeRDs.filter((r) => isRDActiveInPeriod(r, selectedPeriod));
    const expectedTotal = activeInPeriod.reduce((sum, r) => sum + r.amount, 0);
    const periodPayments = rdPayments.filter(
      (p) => p.period === selectedPeriod && activeRDs.some((r) => r.id === p.rdId)
    );
    const collectedTotal = periodPayments.reduce((sum, p) => sum + p.amount, 0);
    const fullyPaidRDIds = new Set(
      periodPayments
        .filter((p) => {
          const rd = activeRDs.find((r) => r.id === p.rdId);
          return rd && p.amount >= rd.amount;
        })
        .map((p) => p.rdId)
    );
    const defaulterCount = activeInPeriod.filter((r) => !fullyPaidRDIds.has(r.id)).length;
    return { totalActive: activeRDs.length, expectedTotal, collectedTotal, defaulterCount };
  }, [rdList, rdPayments, selectedPeriod, staffFilter]);

  const staffInfo = useMemo(() => {
    if (staffFilter === "all") return null;
    return STAFF_MEMBERS.find((s) => s.id === staffFilter) ?? null;
  }, [staffFilter]);

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filteredRDs.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRDs.map((r) => r.id)));
    }
  };

  const selectedRDObjects = filteredRDs.filter((r) => selectedRows.has(r.id));

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Period Navigation */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button size="sm" variant="ghost" className="h-9 px-2 rounded-none" onClick={() => setSelectedPeriod(goPrevPeriod(selectedPeriod))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm font-medium min-w-[90px] text-center">{formatPeriod(selectedPeriod)}</span>
          <Button size="sm" variant="ghost" className="h-9 px-2 rounded-none" onClick={() => setSelectedPeriod(goNextPeriod(selectedPeriod))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Staff Filter */}
        <Select value={staffFilter} onValueChange={(v) => { setStaffFilter(v); setSelectedRows(new Set()); }}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All Staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {CRE_STAFF.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex border rounded-md overflow-hidden text-sm">
          {(["all", "defaulters", "paid"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {mode === "defaulters" ? "Defaulters" : mode === "paid" ? "Paid" : "All"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {selectedRows.size > 0 && (
            <BulkMarkPaidDialog
              selectedRDs={selectedRDObjects}
              period={selectedPeriod}
              rdPayments={rdPayments}
              onSave={handleBulkSave}
              onClose={() => setSelectedRows(new Set())}
            />
          )}
          <Button variant="outline" onClick={() => setMasterPayOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Payment
          </Button>
          <AddRDDialog schemes={schemes} onAdd={handleAdd} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Active RDs", value: stats.totalActive, valueClass: "text-foreground" },
          { label: `Expected (${formatPeriod(selectedPeriod)})`, value: `₹${stats.expectedTotal.toLocaleString("en-IN")}`, valueClass: "text-blue-600" },
          { label: "Collected", value: `₹${stats.collectedTotal.toLocaleString("en-IN")}`, valueClass: "text-green-600" },
          { label: "Defaulters", value: stats.defaulterCount, valueClass: "text-red-600" },
        ].map(({ label, value, valueClass }) => (
          <Card key={label} className="p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-xl font-bold", valueClass)}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Staff Summary Panel */}
      {staffInfo && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{staffInfo.name}</span>
              <Badge variant="outline" className="text-xs">{staffInfo.department}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{stats.totalActive} RDs</span>
              <span className="text-green-600 font-medium">₹{stats.collectedTotal.toLocaleString("en-IN")} collected</span>
              {stats.defaulterCount > 0 && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                  {stats.defaulterCount} defaulters
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      checked={filteredRDs.length > 0 && selectedRows.size === filteredRDs.length}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Account No</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Scheme</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{formatPeriod(selectedPeriod)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRDs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      {search
                        ? "No results found"
                        : viewMode === "defaulters"
                        ? "No defaulters for this period"
                        : viewMode === "paid"
                        ? "No paid RDs for this period"
                        : "No RDs recorded"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRDs.map((r, i) => {
                    const maturityDate = getMaturityDate(r.startDate, r.tenure);
                    const monthsLeft = getMonthsRemaining(r);
                    const activeInPeriod = isRDActiveInPeriod(r, selectedPeriod);
                    const payment = rdPayments.find((p) => p.rdId === r.id && p.period === selectedPeriod);
                    const hasOverdue = hasOverduePriorPayments(r, selectedPeriod, rdPayments);
                    const isSelected = selectedRows.has(r.id);

                    let maturityColorClass = "text-green-600";
                    if (monthsLeft < 0) maturityColorClass = "text-muted-foreground";
                    else if (monthsLeft < 1) maturityColorClass = "text-red-600";
                    else if (monthsLeft <= 6) maturityColorClass = "text-yellow-600";

                    return (
                      <TableRow
                        key={r.id}
                        className={cn("cursor-pointer hover:bg-muted/30", isSelected ? "bg-blue-50" : "")}
                        onClick={() => { setSheetRD(r); setSheetOpen(true); }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(r.id)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{r.accountNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{r.customerName}</span>
                            {hasOverdue && (
                              <span
                                className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0"
                                title="Has unpaid prior months"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.mobileNumber}</TableCell>
                        <TableCell className="font-mono">₹{r.amount.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <div className="text-sm">{r.tenure}</div>
                          <div className="text-xs text-muted-foreground">
                            {monthsLeft < 0 ? "Matured" : `${monthsLeft}m left`}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.scheme}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{format(parseISO(r.startDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <span className={cn("text-sm font-medium whitespace-nowrap", maturityColorClass)}>
                            {format(maturityDate, "MMM yyyy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{r.staffName}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {!activeInPeriod ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : payment ? (
                            payment.amount >= r.amount ? (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 cursor-default"
                                title={`Paid ₹${payment.amount.toLocaleString("en-IN")} on ${format(parseISO(payment.paidDate), "dd MMM yyyy")} by ${payment.collectedByName}`}
                              >
                                Paid ✓
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 cursor-default"
                                title={`Partial: ₹${payment.amount.toLocaleString("en-IN")} of ₹${r.amount.toLocaleString("en-IN")} on ${format(parseISO(payment.paidDate), "dd MMM yyyy")} by ${payment.collectedByName}`}
                              >
                                Partial
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                              Pending
                            </span>
                          )}
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

      {sheetRD && (
        <RDDetailSheet
          rd={sheetRD}
          period={selectedPeriod}
          rdPayments={rdPayments}
          onSavePayment={handleSavePayment}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
      <MasterAddPaymentDialog
        open={masterPayOpen}
        onOpenChange={setMasterPayOpen}
        rdList={rdList}
        period={selectedPeriod}
        rdPayments={rdPayments}
        onSave={handleSavePayment}
      />
      <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CREPage() {
  const { selectedDate, selectedDateEnd } = useApp();

  const dateLabel = selectedDate === selectedDateEnd
    ? format(parseISO(selectedDate), "dd MMM yyyy")
    : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">CRE — Customer Relations Executive</h2>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <Tabs defaultValue="daily-report">
        <TabsList>
          <TabsTrigger value="daily-report">Daily Report</TabsTrigger>
          <TabsTrigger value="movements">Customer Movement Register</TabsTrigger>
          <TabsTrigger value="rd-list">RD List</TabsTrigger>
        </TabsList>

        <TabsContent value="daily-report" className="mt-4">
          <DailyReportTab />
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <CustomerMovementTab />
        </TabsContent>

        <TabsContent value="rd-list" className="mt-4">
          <RDListTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
