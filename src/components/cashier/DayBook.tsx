"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Wallet, ArrowDownToLine, ArrowUpFromLine, Scale,
    Plus, Trash2, Receipt, CreditCard,
} from "lucide-react";
import type { DailyCashierState, CashTransaction } from "@/lib/types";
import { recalcDayBook } from "@/lib/cashier-utils";

interface DayBookProps {
    state: DailyCashierState;
    onUpdate: (state: DailyCashierState) => void;
}

const INR = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function DayBook({ state, onUpdate }: DayBookProps) {
    const [txnType, setTxnType] = useState<"receipt" | "payment">("receipt");
    const [txnAmount, setTxnAmount] = useState("");
    const [txnDesc, setTxnDesc] = useState("");

    const dayBook = state.dayBook;

    const receipts = useMemo(
        () => dayBook.transactions.filter((t) => t.type === "receipt"),
        [dayBook.transactions]
    );
    const payments = useMemo(
        () => dayBook.transactions.filter((t) => t.type === "payment"),
        [dayBook.transactions]
    );

    const handleOpeningChange = (val: number) => {
        const updated = recalcDayBook({ ...dayBook, openingBalance: val });
        onUpdate({ ...state, dayBook: updated });
    };

    const handleSystemClosingChange = (val: number) => {
        const updated = { ...dayBook, systemClosingBalance: val };
        onUpdate({ ...state, dayBook: updated });
    };

    const handleAddTransaction = () => {
        const amount = parseFloat(txnAmount);
        if (!amount || amount <= 0) return;

        const txn: CashTransaction = {
            id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: state.date,
            type: txnType,
            amount,
            description: txnDesc.trim() || undefined,
            timestamp: new Date().toISOString(),
        };

        const updatedDayBook = recalcDayBook({
            ...dayBook,
            transactions: [...dayBook.transactions, txn],
        });
        onUpdate({ ...state, dayBook: updatedDayBook });
        setTxnAmount("");
        setTxnDesc("");
    };

    const handleRemoveTransaction = (txnId: string) => {
        const updatedDayBook = recalcDayBook({
            ...dayBook,
            transactions: dayBook.transactions.filter((t) => t.id !== txnId),
        });
        onUpdate({ ...state, dayBook: updatedDayBook });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTransaction();
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Opening Balance</CardTitle>
                        <Wallet className="h-3.5 w-3.5 text-blue-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <Input
                            type="number"
                            value={dayBook.openingBalance || ""}
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
                        <div className="text-lg font-bold text-green-600">{INR(dayBook.totalReceipts)}</div>
                        <p className="text-xs text-muted-foreground">{receipts.length} entries</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Total Payments</CardTitle>
                        <ArrowUpFromLine className="h-3.5 w-3.5 text-red-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-lg font-bold text-red-600">{INR(dayBook.totalPayments)}</div>
                        <p className="text-xs text-muted-foreground">{payments.length} entries</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-violet-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Closing Balance</CardTitle>
                        <Scale className="h-3.5 w-3.5 text-violet-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-xl font-bold text-violet-600">{INR(dayBook.closingBalance)}</div>
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
                        <div className="flex rounded-lg overflow-hidden border">
                            <button
                                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${txnType === "receipt"
                                        ? "bg-green-600 text-white"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                onClick={() => setTxnType("receipt")}
                            >
                                <ArrowDownToLine className="h-3 w-3 inline mr-1" />
                                Receipt
                            </button>
                            <button
                                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${txnType === "payment"
                                        ? "bg-red-600 text-white"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                onClick={() => setTxnType("payment")}
                            >
                                <ArrowUpFromLine className="h-3 w-3 inline mr-1" />
                                Payment
                            </button>
                        </div>
                        <div className="flex-1 min-w-[120px]">
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
                                placeholder="e.g. Counter deposit"
                                className="h-9"
                            />
                        </div>
                        <Button onClick={handleAddTransaction} size="sm" className="h-9">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction Ledger */}
            <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4" /> Transaction Ledger
                        <span className="text-xs font-normal text-muted-foreground ml-auto">
                            {dayBook.transactions.length} transactions
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10 text-center">#</TableHead>
                                    <TableHead className="w-20">Type</TableHead>
                                    <TableHead className="text-right w-28">Amount</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-20">Time</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dayBook.transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No transactions yet. Add receipts and payments above.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {dayBook.transactions.map((txn, idx) => (
                                            <TableRow key={txn.id}>
                                                <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${txn.type === "receipt"
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-red-100 text-red-700"
                                                            }`}
                                                    >
                                                        {txn.type === "receipt" ? (
                                                            <ArrowDownToLine className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpFromLine className="h-3 w-3" />
                                                        )}
                                                        {txn.type === "receipt" ? "IN" : "OUT"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className={`text-right font-mono font-semibold ${txn.type === "receipt" ? "text-green-600" : "text-red-600"
                                                    }`}>
                                                    {txn.type === "receipt" ? "+" : "−"}{INR(txn.amount)}
                                                </TableCell>
                                                <TableCell className="text-sm">{txn.description || "—"}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
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
                                        <TableRow className="bg-primary/5 border-t-2 font-bold">
                                            <TableCell colSpan={2} className="text-right text-xs text-muted-foreground">TOTALS</TableCell>
                                            <TableCell className="text-right">
                                                <div className="text-green-600 text-xs">Receipts: {INR(dayBook.totalReceipts)}</div>
                                                <div className="text-red-600 text-xs">Payments: {INR(dayBook.totalPayments)}</div>
                                            </TableCell>
                                            <TableCell colSpan={3}></TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* System Closing Balance */}
            <Card className="border-dashed border-amber-300 bg-amber-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-amber-600" />
                        System Closing Balance (ERP/Billing Software)
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Enter System Closing</label>
                            <Input
                                type="number"
                                value={dayBook.systemClosingBalance ?? ""}
                                onChange={(e) => handleSystemClosingChange(Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                placeholder="System closing balance"
                                className="h-9"
                            />
                        </div>
                        {dayBook.systemClosingBalance !== undefined && dayBook.systemClosingBalance > 0 && (
                            <div className="flex gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">System:</span>{" "}
                                    <span className="font-semibold">{INR(dayBook.systemClosingBalance)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Day Book:</span>{" "}
                                    <span className="font-semibold">{INR(dayBook.closingBalance)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Variance:</span>{" "}
                                    <span className={`font-bold ${dayBook.closingBalance - dayBook.systemClosingBalance === 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}>
                                        {dayBook.closingBalance - dayBook.systemClosingBalance >= 0 ? "+" : ""}
                                        {INR(dayBook.closingBalance - dayBook.systemClosingBalance)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
