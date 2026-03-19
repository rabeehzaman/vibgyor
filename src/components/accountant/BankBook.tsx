"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, Scale, Landmark,
  Plus, Trash2, Receipt, Clock, CheckCircle2, AlertTriangle,
  ShieldCheck, BookX,
} from "lucide-react";
import type { DailyBankBookState, BankBookTransaction, PendingItem } from "@/lib/types";
import { recalcBankBook, getPendingTotal, getReconciliationSummary } from "@/lib/bank-book-utils";

interface BankBookProps {
  state: DailyBankBookState;
  onUpdate: (state: DailyBankBookState) => void;
}

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function BankBook({ state, onUpdate }: BankBookProps) {
  const [txnType, setTxnType] = useState<"receipt" | "payment">("receipt");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDesc, setTxnDesc] = useState("");
  const [filter, setFilter] = useState<"all" | "receipts" | "payments">("all");

  // Pending form
  const [pendingDate, setPendingDate] = useState(state.date);
  const [pendingAmount, setPendingAmount] = useState("");
  const [pendingNarration, setPendingNarration] = useState("");

  // Verify dialog
  const [verifyItem, setVerifyItem] = useState<PendingItem | null>(null);

  const bankBook = state.bankBook;

  const receipts = useMemo(
    () => bankBook.transactions.filter((t) => t.type === "receipt"),
    [bankBook.transactions]
  );
  const payments = useMemo(
    () => bankBook.transactions.filter((t) => t.type === "payment"),
    [bankBook.transactions]
  );

  const filteredTransactions = useMemo(() => {
    if (filter === "receipts") return receipts;
    if (filter === "payments") return payments;
    return bankBook.transactions;
  }, [bankBook.transactions, receipts, payments, filter]);

  const filteredReceipts = useMemo(
    () => filteredTransactions.filter((t) => t.type === "receipt").reduce((s, t) => s + t.amount, 0),
    [filteredTransactions]
  );
  const filteredPayments = useMemo(
    () => filteredTransactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0),
    [filteredTransactions]
  );

  const pendingTotal = useMemo(() => getPendingTotal(state.pendingItems), [state.pendingItems]);
  const reconciliation = useMemo(
    () => getReconciliationSummary(bankBook, state.pendingItems),
    [bankBook, state.pendingItems]
  );

  const activePendingItems = useMemo(
    () => state.pendingItems.filter((p) => p.status === "pending"),
    [state.pendingItems]
  );

  // ─── Handlers ───────────────────────────────

  const handleOpeningChange = (val: number) => {
    const updated = recalcBankBook({ ...bankBook, openingBalance: val });
    onUpdate({ ...state, bankBook: updated });
  };

  const handleSettlementChange = (val: number) => {
    const updated = { ...bankBook, settlementBalance: val };
    onUpdate({ ...state, bankBook: updated });
  };

  const handleAddTransaction = () => {
    const amount = parseFloat(txnAmount);
    if (!amount || amount <= 0) return;

    const txn: BankBookTransaction = {
      id: `bbtxn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: state.date,
      type: txnType,
      amount,
      description: txnDesc.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    const updatedBankBook = recalcBankBook({
      ...bankBook,
      transactions: [...bankBook.transactions, txn],
    });
    onUpdate({ ...state, bankBook: updatedBankBook });
    setTxnAmount("");
    setTxnDesc("");
  };

  const handleRemoveTransaction = (txnId: string) => {
    const updatedBankBook = recalcBankBook({
      ...bankBook,
      transactions: bankBook.transactions.filter((t) => t.id !== txnId),
    });
    onUpdate({ ...state, bankBook: updatedBankBook });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddTransaction(); }
  };

  // ─── Pending Handlers ──────────────────────

  const handleAddPending = () => {
    const amount = parseFloat(pendingAmount);
    if (!amount || amount <= 0 || !pendingNarration.trim()) return;

    const item: PendingItem = {
      id: `pend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: pendingDate,
      amount,
      narration: pendingNarration.trim(),
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    onUpdate({ ...state, pendingItems: [...state.pendingItems, item] });
    setPendingAmount("");
    setPendingNarration("");
  };

  const handlePendingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddPending(); }
  };

  const handleDeletePending = (id: string) => {
    onUpdate({ ...state, pendingItems: state.pendingItems.filter((p) => p.id !== id) });
  };

  const handleSuspense = (id: string) => {
    const updated = state.pendingItems.map((p) =>
      p.id === id ? { ...p, status: "suspense" as const, suspenseDate: new Date().toISOString() } : p
    );
    onUpdate({ ...state, pendingItems: updated });
  };

  const handleVerifyConfirm = (addAsReceipt: boolean) => {
    if (!verifyItem) return;
    const now = new Date().toISOString();

    // Mark as verified
    const updatedPending = state.pendingItems.map((p) =>
      p.id === verifyItem.id ? { ...p, status: "verified" as const, verifiedDate: now } : p
    );

    if (addAsReceipt) {
      // Also add a receipt transaction
      const txn: BankBookTransaction = {
        id: `bbtxn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: state.date,
        type: "receipt",
        amount: verifyItem.amount,
        description: `Verified: ${verifyItem.narration}`,
        timestamp: now,
      };
      const updatedBankBook = recalcBankBook({
        ...bankBook,
        transactions: [...bankBook.transactions, txn],
      });
      onUpdate({ ...state, bankBook: updatedBankBook, pendingItems: updatedPending });
    } else {
      onUpdate({ ...state, pendingItems: updatedPending });
    }
    setVerifyItem(null);
  };

  // ─── Render ─────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Opening Balance</CardTitle>
            <Wallet className="h-3.5 w-3.5 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <Input
              type="number"
              value={bankBook.openingBalance || ""}
              onChange={(e) => handleOpeningChange(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="text-lg font-bold h-9"
              placeholder="0"
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Receipts</CardTitle>
            <ArrowDownToLine className="h-3.5 w-3.5 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-lg font-bold text-green-600">{INR(bankBook.totalReceipts)}</div>
            <p className="text-xs text-muted-foreground">{receipts.length} entries</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Payments</CardTitle>
            <ArrowUpFromLine className="h-3.5 w-3.5 text-red-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-lg font-bold text-red-600">{INR(bankBook.totalPayments)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} entries</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Closing Balance</CardTitle>
            <Scale className="h-3.5 w-3.5 text-violet-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-violet-600">{INR(bankBook.closingBalance)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Statement Balance</CardTitle>
            <Landmark className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <Input
              type="number"
              value={bankBook.settlementBalance ?? ""}
              onChange={(e) => handleSettlementChange(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="text-lg font-bold h-9"
              placeholder="0"
            />
          </CardContent>
        </Card>
      </div>

      {/* Transaction Entry Form */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Transaction
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex rounded-lg overflow-hidden border shrink-0">
              <button
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  txnType === "receipt"
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => setTxnType("receipt")}
              >
                <ArrowDownToLine className="h-3 w-3 inline mr-1" />
                Receipt
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  txnType === "payment"
                    ? "bg-red-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => setTxnType("payment")}
              >
                <ArrowUpFromLine className="h-3 w-3 inline mr-1" />
                Payment
              </button>
            </div>
            <div className="flex-1 min-w-[120px] sm:min-w-[120px] w-full sm:w-auto">
              <label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</label>
              <Input
                type="number"
                value={txnAmount}
                onChange={(e) => setTxnAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                placeholder="Enter amount"
                className="h-9"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
              <Input
                value={txnDesc}
                onChange={(e) => setTxnDesc(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. NEFT from customer"
                className="h-9"
              />
            </div>
            <Button onClick={handleAddTransaction} size="sm" className="h-9">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Bank Book Ledger
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border text-xs">
                {(["all", "receipts", "payments"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`px-2.5 py-1 font-medium capitalize transition-colors ${
                      filter === mode
                        ? mode === "receipts" ? "bg-green-600 text-white"
                          : mode === "payments" ? "bg-red-600 text-white"
                            : "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {mode === "all" ? "All" : mode === "receipts" ? "Receipts" : "Payments"}
                  </button>
                ))}
              </div>
              <span className="text-xs font-normal text-muted-foreground">
                {filteredTransactions.length} of {bankBook.transactions.length}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-28 text-green-700">Receipt</TableHead>
                  <TableHead className="text-right w-28 text-red-700">Payment</TableHead>
                  <TableHead className="w-20 text-center">Time</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {bankBook.transactions.length === 0
                        ? "No transactions yet. Add receipts and payments above."
                        : `No ${filter} found.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Opening balance row */}
                    <TableRow className="bg-blue-50/60 border-b">
                      <TableCell className="text-center text-muted-foreground text-xs">—</TableCell>
                      <TableCell className="text-sm font-medium text-blue-700">Opening Balance</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-blue-600">
                        {INR(bankBook.openingBalance)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    {filteredTransactions.map((txn, idx) => (
                      <TableRow key={txn.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            {txn.type === "receipt" ? (
                              <ArrowDownToLine className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <ArrowUpFromLine className="h-3 w-3 text-red-500 flex-shrink-0" />
                            )}
                            {txn.description || (txn.type === "receipt" ? "Bank Receipt" : "Bank Payment")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600">
                          {txn.type === "receipt" ? INR(txn.amount) : ""}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-red-600">
                          {txn.type === "payment" ? INR(txn.amount) : ""}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-center">
                          {new Date(txn.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveTransaction(txn.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Totals row */}
                    <TableRow className="bg-primary/5 border-t-2 font-bold">
                      <TableCell></TableCell>
                      <TableCell className="text-sm text-muted-foreground">TOTALS</TableCell>
                      <TableCell className="text-right font-mono text-green-700">
                        {INR(filteredReceipts)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-700">
                        {INR(filteredPayments)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    {/* Closing balance row */}
                    <TableRow className="bg-violet-50/60">
                      <TableCell></TableCell>
                      <TableCell className="text-sm font-medium text-violet-700">Closing Balance</TableCell>
                      <TableCell className="text-right font-mono font-bold text-violet-700">
                        {INR(bankBook.closingBalance)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Settlement Balance Card */}
      <Card className="border-dashed border-amber-300 bg-amber-50/30">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="h-4 w-4 text-amber-600" />
            Settlement Balance (Bank Statement)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Enter Bank Statement Balance</label>
              <Input
                type="number"
                value={bankBook.settlementBalance ?? ""}
                onChange={(e) => handleSettlementChange(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="Bank statement balance"
                className="h-9"
              />
            </div>
            {bankBook.settlementBalance !== undefined && bankBook.settlementBalance > 0 && (
              <div className="flex gap-4 text-sm flex-wrap">
                <div>
                  <span className="text-muted-foreground">Closing:</span>{" "}
                  <span className="font-semibold">{INR(bankBook.closingBalance)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Statement:</span>{" "}
                  <span className="font-semibold">{INR(bankBook.settlementBalance)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Variance:</span>{" "}
                  <span className={`font-bold ${
                    bankBook.settlementBalance - bankBook.closingBalance === 0
                      ? "text-green-600" : "text-red-600"
                  }`}>
                    {bankBook.settlementBalance - bankBook.closingBalance >= 0 ? "+" : ""}
                    {INR(bankBook.settlementBalance - bankBook.closingBalance)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Transactions Section */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Pending Transactions (Unverified UPI/IMPS)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          {/* Add pending form */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-[130px]">
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input
                type="date"
                value={pendingDate}
                onChange={(e) => setPendingDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 min-w-[100px] w-full sm:w-auto">
              <label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</label>
              <Input
                type="number"
                value={pendingAmount}
                onChange={(e) => setPendingAmount(e.target.value)}
                onKeyDown={handlePendingKeyDown}
                onFocus={(e) => e.target.select()}
                placeholder="Amount"
                className="h-9"
              />
            </div>
            <div className="flex-[2] min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Narration</label>
              <Input
                value={pendingNarration}
                onChange={(e) => setPendingNarration(e.target.value)}
                onKeyDown={handlePendingKeyDown}
                placeholder="e.g. UPI payment from John"
                className="h-9"
              />
            </div>
            <Button onClick={handleAddPending} size="sm" className="h-9">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* Pending table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right w-28">Amount</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead className="w-[160px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.pendingItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No pending transactions
                    </TableCell>
                  </TableRow>
                ) : (
                  state.pendingItems.map((item, idx) => (
                    <TableRow key={item.id} className={
                      item.status === "verified" ? "bg-green-50/40 opacity-70"
                        : item.status === "suspense" ? "bg-orange-50/40 opacity-70"
                          : ""
                    }>
                      <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-xs">{item.date}</TableCell>
                      <TableCell className="text-sm">{item.narration}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {INR(item.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          item.status === "pending"
                            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                            : item.status === "verified"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-orange-100 text-orange-700 border-orange-200"
                        }`}>
                          {item.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {item.status === "verified" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {item.status === "suspense" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status === "pending" && (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => setVerifyItem(item)}
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" /> Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                              onClick={() => handleSuspense(item.id)}
                            >
                              <BookX className="h-3 w-3 mr-1" /> Suspense
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeletePending(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Pending total footer */}
                {activePendingItems.length > 0 && (
                  <TableRow className="bg-yellow-50/60 border-t-2 font-bold">
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Total Pending ({activePendingItems.length} items)
                    </TableCell>
                    <TableCell className="text-right font-mono text-yellow-700">
                      {INR(pendingTotal)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Summary */}
      <Card className={`border-2 ${
        reconciliation.actualStatement > 0 && reconciliation.variance === 0
          ? "border-green-300 bg-green-50/30"
          : reconciliation.actualStatement > 0
            ? "border-red-300 bg-red-50/30"
            : "border-muted"
      }`}>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Reconciliation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Closing Balance</div>
              <div className="font-bold text-violet-700">{INR(reconciliation.closing)}</div>
            </div>
            <div className="rounded-lg border p-3 text-center flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground">+</span>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Pending Total</div>
              <div className="font-bold text-yellow-700">{INR(reconciliation.pendingTotal)}</div>
            </div>
            <div className="rounded-lg border p-3 text-center flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground">=</span>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Expected Statement</div>
              <div className="font-bold text-blue-700">{INR(reconciliation.expectedStatement)}</div>
            </div>
          </div>

          {reconciliation.actualStatement > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg border p-3">
              <div>
                <span className="text-sm text-muted-foreground">Actual Statement Balance: </span>
                <span className="font-bold">{INR(reconciliation.actualStatement)}</span>
              </div>
              <div className={`text-sm font-bold ${
                reconciliation.variance === 0 ? "text-green-600" : "text-red-600"
              }`}>
                {reconciliation.variance === 0 ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Reconciled
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Variance: {INR(reconciliation.variance)}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verify Dialog */}
      <Dialog open={!!verifyItem} onOpenChange={(open) => !open && setVerifyItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify Transaction</DialogTitle>
          </DialogHeader>
          {verifyItem && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-bold">{INR(verifyItem.amount)}</span></div>
                <div><span className="text-muted-foreground">Narration:</span> {verifyItem.narration}</div>
              </div>
              <p className="text-sm">Also add as a receipt in the bank book?</p>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleVerifyConfirm(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Yes, Add Receipt
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleVerifyConfirm(false)}>
                  No, Just Verify
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
