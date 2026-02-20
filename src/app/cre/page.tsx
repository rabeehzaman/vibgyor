"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  STAFF_MEMBERS,
  PROFIT_TYPES,
  BANK_CASH,
} from "@/lib/constants";
import { CREDailyEntry, CustomerMovement, RecurringDeposit, Scheme } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Plus, Users, TrendingUp, Repeat, FileText, Search, Settings, Check, ChevronsUpDown,
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

// ─── Manage Master Data Dialog ────────────────────────────────────────────────

function ManageMasterDataDialog({
  schemes,
  onAddScheme,
}: {
  schemes: Scheme[];
  onAddScheme: (s: Scheme) => void;
}) {
  const { customReferrers, addCustomReferrer, customerAccounts, addCustomerAccount, masterLists, addToMasterList } = useApp();
  const [open, setOpen] = useState(false);

  // Schemes tab state
  const [schemeName, setSchemeName] = useState("");
  const [schemeType, setSchemeType] = useState<Scheme["type"] | "">("");
  const [schemeNameErr, setSchemeNameErr] = useState(false);
  const [schemeTypeErr, setSchemeTypeErr] = useState(false);

  // Referrers tab state
  const [referrerName, setReferrerName] = useState("");
  const [referrerNameErr, setReferrerNameErr] = useState(false);

  // Customer Accounts tab state
  const [acctNumber, setAcctNumber] = useState("");
  const [acctCustomer, setAcctCustomer] = useState("");
  const [acctNumberErr, setAcctNumberErr] = useState(false);
  const [acctCustomerErr, setAcctCustomerErr] = useState(false);

  // Configure Lists tab state
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
  };

  const handleAddReferrer = () => {
    if (!referrerName.trim()) { setReferrerNameErr(true); return; }
    addCustomReferrer({ id: `ref${Date.now()}`, name: referrerName.trim().toUpperCase() });
    setReferrerName("");
  };

  const handleAddAccount = () => {
    let hasErr = false;
    if (!acctNumber.trim()) { setAcctNumberErr(true); hasErr = true; }
    if (!acctCustomer.trim()) { setAcctCustomerErr(true); hasErr = true; }
    if (hasErr) return;
    addCustomerAccount({ id: `acct${Date.now()}`, accountNumber: acctNumber.trim(), customerName: acctCustomer.trim() });
    setAcctNumber("");
    setAcctCustomer("");
  };

  const handleAddToList = () => {
    if (!newListValue.trim()) { setNewListValueErr(true); return; }
    addToMasterList(selectedListKey as keyof typeof masterLists, newListValue.trim());
    setNewListValue("");
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

          {/* Schemes Tab */}
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

          {/* Referrers Tab */}
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

          {/* Customer Accounts Tab */}
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

          {/* Configure Lists Tab */}
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
      </DialogContent>
    </Dialog>
  );
}

// ─── Daily Report Tab ───────────────────────────────────────────────────────

function AddEntryDialog({
  category,
  schemes,
  onAdd,
}: {
  category: CREDailyEntry["category"];
  schemes: Scheme[];
  onAdd: (entry: CREDailyEntry) => void;
}) {
  const { entryDate, customReferrers, customerAccounts, masterLists } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [referrerOpen, setReferrerOpen] = useState(false);

  const rdSchemes = schemes.filter((s) => s.type === "RD").map((s) => s.name);
  const fdSchemes = schemes.filter((s) => s.type === "FD").map((s) => s.name);
  const loanSchemes = schemes.filter((s) => s.type === "Loan").map((s) => s.name);

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: false }));
  };

  const validate = () => {
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
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const entry: CREDailyEntry = {
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
    };
    onAdd(entry);
    setForm({});
    setErrors({});
    setOpen(false);
  };

  const err = (k: string) => errors[k] ? "border-red-500" : "";

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
            <div className="grid gap-1">
              <Label>Scheme</Label>
              <Select value={form.scheme ?? ""} onValueChange={(v) => set("scheme", v)}>
                <SelectTrigger className={err("scheme")}><SelectValue placeholder="Select scheme" /></SelectTrigger>
                <SelectContent>{rdSchemes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              {errors.scheme && <p className="text-xs text-red-500">Required</p>}
            </div>
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

          <Button onClick={handleSubmit} className="mt-2">Add Entry</Button>
        </div>
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
              {category === "NewRD" && <><TableHead>Amount</TableHead><TableHead>Tenure</TableHead><TableHead>Type</TableHead><TableHead>Scheme</TableHead></>}
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
  const { showToast } = useToast();

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
    showToast(`Entry added: ${entry.accountNumber}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedDate === selectedDateEnd
            ? `Showing entries for ${format(parseISO(selectedDate), "dd MMM yyyy")}`
            : `Showing entries: ${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`}
        </p>
        <ManageMasterDataDialog schemes={schemes} onAddScheme={addScheme} />
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
  const { showToast } = useToast();

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
    </div>
  );
}

// ─── RD List Tab ─────────────────────────────────────────────────────────────

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

const STATUS_BADGE: Record<RecurringDeposit["status"], string> = {
  Active: "bg-green-100 text-green-800",
  Completed: "bg-blue-100 text-blue-800",
  Closed: "bg-gray-100 text-gray-600",
};

function RDListTab() {
  const { rdList, addRD, schemes } = useApp();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rdList;
    return rdList.filter(
      (r) => r.customerName.toLowerCase().includes(q) || r.accountNumber.toLowerCase().includes(q)
    );
  }, [rdList, search]);

  const handleAdd = (rd: RecurringDeposit) => {
    addRD(rd);
    showToast(`RD added: ${rd.accountNumber}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AddRDDialog schemes={schemes} onAdd={handleAdd} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Account No</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheme</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {search ? "No results found" : "No RDs recorded"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{r.accountNumber}</TableCell>
                      <TableCell className="font-medium">{r.customerName}</TableCell>
                      <TableCell className="font-mono text-sm">{r.mobileNumber}</TableCell>
                      <TableCell className="font-mono">₹{r.amount.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-sm">{r.tenure}</TableCell>
                      <TableCell>
                        <Badge variant={r.freshRenewal === "Fresh" ? "default" : "secondary"}>
                          {r.freshRenewal}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.scheme}</TableCell>
                      <TableCell className="text-sm">{format(parseISO(r.startDate), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm">{r.staffName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                          {r.status}
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
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CREPage() {
  const { selectedDate, selectedDateEnd } = useApp();
  const { toast, showToast, hideToast } = useToast();

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

      <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
