"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle, Scale, Lock, Banknote } from "lucide-react";
import type { DailyCashierState } from "@/lib/types";
import { calcLockerBundleTotal, calcNoteTotal, calcCoinTotal } from "@/lib/cashier-utils";

interface ReconciliationPanelProps {
    state: DailyCashierState;
}

const INR = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function ReconciliationPanel({ state }: ReconciliationPanelProps) {
    const dayBookClosing = state.dayBook.closingBalance;
    const systemClosing = state.dayBook.systemClosingBalance || 0;

    const lockerTotal = useMemo(
        () => calcLockerBundleTotal(state.locker.closingDenominations),
        [state.locker.closingDenominations]
    );
    const looseNotesTotal = useMemo(
        () => calcNoteTotal(state.loose.noteDenominations),
        [state.loose.noteDenominations]
    );
    const looseCoinsTotal = useMemo(
        () => calcCoinTotal(state.loose.coinDenominations),
        [state.loose.coinDenominations]
    );
    const looseTotal = looseNotesTotal + looseCoinsTotal;
    const physicalTotal = lockerTotal + looseTotal;

    // Internal reconciliation: DayBook vs Physical
    const internalMatch = physicalTotal === dayBookClosing;
    const internalDiff = physicalTotal - dayBookClosing;

    // External reconciliation: Physical vs System
    const hasSystemClosing = systemClosing > 0;
    const externalDiff = physicalTotal - systemClosing;
    const excessAmount = Math.max(0, externalDiff);
    const shortAmount = Math.max(0, -externalDiff);

    // Staff shortages total
    const totalShortages = state.reconciliation.staffShortages.reduce((s, sh) => s + sh.amount, 0);
    const totalAdvances = state.staffAdvances.reduce((s, a) => s + a.amount, 0);

    return (
        <div className="space-y-4">
            {/* Internal Reconciliation: DayBook vs Physical */}
            <Card className={`border-2 ${internalMatch ? "border-green-300 bg-green-50/30" : "border-red-300 bg-red-50/30"}`}>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {internalMatch ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        Internal Reconciliation — Day Book vs Physical Cash
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg bg-white/80 border p-3">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Scale className="h-3 w-3" /> Day Book Closing
                            </div>
                            <div className="text-lg font-bold mt-1">{INR(dayBookClosing)}</div>
                        </div>
                        <div className="rounded-lg bg-white/80 border p-3">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Locker Total
                            </div>
                            <div className="text-lg font-bold mt-1 text-blue-600">{INR(lockerTotal)}</div>
                        </div>
                        <div className="rounded-lg bg-white/80 border p-3">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Banknote className="h-3 w-3" /> Loose Total
                            </div>
                            <div className="text-lg font-bold mt-1 text-emerald-600">{INR(looseTotal)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                Notes: {INR(looseNotesTotal)} | Coins: {INR(looseCoinsTotal)}
                            </div>
                        </div>
                        <div className="rounded-lg bg-white/80 border p-3">
                            <div className="text-xs text-muted-foreground">Physical Total (Locker + Loose)</div>
                            <div className="text-lg font-bold mt-1 text-violet-600">{INR(physicalTotal)}</div>
                        </div>
                    </div>

                    <div className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 ${internalMatch
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                        {internalMatch ? (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                ✅ BALANCED — Physical cash matches Day Book closing balance
                            </>
                        ) : (
                            <>
                                <XCircle className="h-4 w-4" />
                                ❌ MISMATCH — Physical cash {internalDiff > 0 ? "exceeds" : "is short of"} Day Book by {INR(Math.abs(internalDiff))}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* External Reconciliation: Physical vs System */}
            <Card className={`border-2 ${!hasSystemClosing
                    ? "border-gray-200"
                    : externalDiff === 0
                        ? "border-green-300 bg-green-50/30"
                        : "border-amber-300 bg-amber-50/30"
                }`}>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {!hasSystemClosing ? (
                            <AlertTriangle className="h-4 w-4 text-gray-400" />
                        ) : externalDiff === 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        System vs Physical Reconciliation
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    {!hasSystemClosing ? (
                        <p className="text-sm text-muted-foreground">
                            Enter the System Closing Balance in the Day Book tab to compare with physical cash.
                        </p>
                    ) : (
                        <>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg bg-white/80 border p-3">
                                    <div className="text-xs text-muted-foreground">System Closing (ERP)</div>
                                    <div className="text-lg font-bold mt-1">{INR(systemClosing)}</div>
                                </div>
                                <div className="rounded-lg bg-white/80 border p-3">
                                    <div className="text-xs text-muted-foreground">Physical Closing</div>
                                    <div className="text-lg font-bold mt-1 text-violet-600">{INR(physicalTotal)}</div>
                                </div>
                                <div className="rounded-lg bg-white/80 border p-3">
                                    <div className="text-xs text-muted-foreground">DIFFERENCE</div>
                                    <div className={`text-lg font-bold mt-1 ${externalDiff === 0 ? "text-green-600" : externalDiff > 0 ? "text-amber-600" : "text-red-600"
                                        }`}>
                                        {externalDiff >= 0 ? "+" : ""}{INR(externalDiff)}
                                    </div>
                                </div>
                            </div>

                            {externalDiff !== 0 && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {excessAmount > 0 && (
                                        <div className="rounded-lg bg-amber-100 text-amber-800 px-4 py-2 text-sm font-semibold">
                                            EXCESS AMOUNT: {INR(excessAmount)}
                                        </div>
                                    )}
                                    {shortAmount > 0 && (
                                        <div className="rounded-lg bg-red-100 text-red-800 px-4 py-2 text-sm font-semibold">
                                            SHORT AMOUNT: {INR(shortAmount)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Summary of Shortages and Advances */}
            {(state.reconciliation.staffShortages.length > 0 || state.staffAdvances.length > 0) && (
                <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-semibold">Shortages & Advances Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {totalShortages > 0 && (
                                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                                    <div className="text-xs text-red-600 font-semibold">Total Staff Shortages</div>
                                    <div className="text-lg font-bold text-red-700 mt-1">{INR(totalShortages)}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {state.reconciliation.staffShortages.length} entries
                                    </div>
                                </div>
                            )}
                            {totalAdvances > 0 && (
                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                                    <div className="text-xs text-amber-600 font-semibold">Total Staff Advances / Petty Cash</div>
                                    <div className="text-lg font-bold text-amber-700 mt-1">{INR(totalAdvances)}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {state.staffAdvances.length} entries
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Overall Status */}
            <Card className={`border-2 ${internalMatch && hasSystemClosing && externalDiff === 0
                    ? "border-green-400 bg-gradient-to-r from-green-50 to-emerald-50"
                    : internalMatch
                        ? "border-blue-300 bg-blue-50/30"
                        : "border-red-300 bg-red-50/30"
                }`}>
                <CardContent className="py-4 px-4 text-center">
                    <div className="text-lg font-bold">
                        {internalMatch && hasSystemClosing && externalDiff === 0 ? (
                            <span className="text-green-700 flex items-center justify-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                FULLY RECONCILED — All balances match
                            </span>
                        ) : internalMatch ? (
                            <span className="text-blue-700 flex items-center justify-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                PARTIAL — Day Book matched, {hasSystemClosing ? "system variance exists" : "awaiting system closing"}
                            </span>
                        ) : (
                            <span className="text-red-700 flex items-center justify-center gap-2">
                                <XCircle className="h-5 w-5" />
                                UNRECONCILED — Physical cash does not match Day Book
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
