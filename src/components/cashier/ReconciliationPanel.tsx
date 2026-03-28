"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle, Scale, Lock, Banknote, UserMinus, Wallet } from "lucide-react";
import type { DailyCashierState } from "@/lib/types";
import { calcLockerBundleTotal, calcNoteTotal, calcCoinTotal } from "@/lib/cashier-utils";

interface ReconciliationPanelProps {
    state: DailyCashierState;
    section?: "internal" | "external" | "all";
}

const INR = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function ReconciliationPanel({ state, section = "all" }: ReconciliationPanelProps) {
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
    const rawDifference = physicalTotal - dayBookClosing;
    const internalMatch = rawDifference === 0;

    // Staff shortages & advances explain missing physical cash
    const totalShortages = state.reconciliation.staffShortages.reduce((s, sh) => s + sh.amount, 0);
    const totalAdvances = state.staffAdvances.reduce((s, a) => s + a.amount, 0);
    const totalExplained = totalShortages + totalAdvances;

    const unexplainedDifference = dayBookClosing - physicalTotal - totalExplained;
    const isFullyExplained = unexplainedDifference === 0;
    const hasExplanations = totalExplained > 0;
    const isReconciled = internalMatch || isFullyExplained;

    // External reconciliation: Physical vs System
    const hasSystemClosing = systemClosing > 0;
    const externalDiff = physicalTotal - systemClosing;
    const excessAmount = Math.max(0, externalDiff);
    const shortAmount = Math.max(0, -externalDiff);

    const showInternal = section === "all" || section === "internal";
    const showExternal = section === "all" || section === "external";

    return (
        <div className="space-y-4">
            {/* ─── Internal Reconciliation ─── */}
            {showInternal && (
                <Card className={`border-2 ${isReconciled ? "border-green-300 bg-green-50/30" : "border-red-300 bg-red-50/30"}`}>
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            {isReconciled ? (
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

                        {/* Raw difference */}
                        {!internalMatch && (
                            <div className="mt-3 rounded-lg bg-red-100 text-red-800 px-4 py-2 text-sm font-semibold flex items-center gap-2">
                                <XCircle className="h-4 w-4 shrink-0" />
                                Raw Difference: Physical cash {rawDifference > 0 ? "exceeds" : "is short of"} Day Book by {INR(Math.abs(rawDifference))}
                            </div>
                        )}

                        {/* Explained breakdown */}
                        {!internalMatch && hasExplanations && (
                            <div className="mt-3 space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Accounted For
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {totalShortages > 0 && (
                                        <div className="rounded-lg bg-white border border-red-200 px-3 py-2 flex items-center gap-2">
                                            <UserMinus className="h-4 w-4 text-red-500 shrink-0" />
                                            <div>
                                                <div className="text-xs text-muted-foreground">Staff Shortages</div>
                                                <div className="text-sm font-bold text-red-700">{INR(totalShortages)}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {state.reconciliation.staffShortages.length} {state.reconciliation.staffShortages.length === 1 ? "entry" : "entries"}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {totalAdvances > 0 && (
                                        <div className="rounded-lg bg-white border border-amber-200 px-3 py-2 flex items-center gap-2">
                                            <Wallet className="h-4 w-4 text-amber-500 shrink-0" />
                                            <div>
                                                <div className="text-xs text-muted-foreground">Staff Advances / Petty Cash</div>
                                                <div className="text-sm font-bold text-amber-700">{INR(totalAdvances)}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {state.staffAdvances.length} {state.staffAdvances.length === 1 ? "entry" : "entries"}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 ${
                                    isFullyExplained
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                }`}>
                                    {isFullyExplained ? (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            Fully Accounted — Shortages & advances explain the entire difference
                                        </>
                                    ) : unexplainedDifference > 0 ? (
                                        <>
                                            <AlertTriangle className="h-4 w-4" />
                                            Unexplained Short: {INR(unexplainedDifference)} still unaccounted for
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-4 w-4" />
                                            Unexplained Excess: {INR(Math.abs(unexplainedDifference))} more explained than the actual difference
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Balanced */}
                        {internalMatch && (
                            <div className="mt-3 rounded-lg bg-green-100 text-green-800 px-4 py-2 text-sm font-semibold flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                BALANCED — Physical cash matches Day Book closing balance
                            </div>
                        )}

                        {/* Mismatch with no explanations */}
                        {!internalMatch && !hasExplanations && (
                            <div className="mt-2 text-xs text-muted-foreground px-1">
                                Record staff shortages or advances in the Staff tab to account for this difference.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ─── External Reconciliation ─── */}
            {showExternal && (
                <>
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
                                            <div className={`text-lg font-bold mt-1 ${externalDiff === 0 ? "text-green-600" : externalDiff > 0 ? "text-amber-600" : "text-red-600"}`}>
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

                    {/* Shortages & Advances detail */}
                    {(state.reconciliation.staffShortages.length > 0 || state.staffAdvances.length > 0) && (
                        <Card>
                            <CardHeader className="pb-2 pt-3 px-4">
                                <CardTitle className="text-sm font-semibold">Shortages & Advances Detail</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {totalShortages > 0 && (
                                        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                                            <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
                                                <UserMinus className="h-3 w-3" /> Staff Shortages
                                            </div>
                                            <div className="text-lg font-bold text-red-700 mt-1">{INR(totalShortages)}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {state.reconciliation.staffShortages.map((sh) => (
                                                    <div key={sh.id} className="flex justify-between py-0.5">
                                                        <span>{sh.staffName}{sh.reason ? ` — ${sh.reason}` : ""}</span>
                                                        <span className="font-mono font-medium">{INR(sh.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {totalAdvances > 0 && (
                                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                                            <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                                                <Wallet className="h-3 w-3" /> Staff Advances / Petty Cash
                                            </div>
                                            <div className="text-lg font-bold text-amber-700 mt-1">{INR(totalAdvances)}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {state.staffAdvances.map((adv) => (
                                                    <div key={adv.id} className="flex justify-between py-0.5">
                                                        <span>{adv.staffName} — {adv.category}</span>
                                                        <span className="font-mono font-medium">{INR(adv.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Overall Status */}
                    <Card className={`border-2 ${isReconciled && hasSystemClosing && externalDiff === 0
                            ? "border-green-400 bg-gradient-to-r from-green-50 to-emerald-50"
                            : isReconciled
                                ? "border-blue-300 bg-blue-50/30"
                                : "border-red-300 bg-red-50/30"
                        }`}>
                        <CardContent className="py-4 px-4 text-center">
                            <div className="text-lg font-bold">
                                {isReconciled && hasSystemClosing && externalDiff === 0 ? (
                                    <span className="text-green-700 flex items-center justify-center gap-2">
                                        <CheckCircle className="h-5 w-5" />
                                        FULLY RECONCILED — All balances match
                                    </span>
                                ) : isReconciled ? (
                                    <span className="text-blue-700 flex items-center justify-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        PARTIAL — Day Book {internalMatch ? "matched" : "accounted for"}, {hasSystemClosing ? "system variance exists" : "awaiting system closing"}
                                    </span>
                                ) : (
                                    <span className="text-red-700 flex items-center justify-center gap-2">
                                        <XCircle className="h-5 w-5" />
                                        UNRECONCILED — {!internalMatch && hasExplanations
                                            ? `${INR(Math.abs(unexplainedDifference))} unexplained difference remains`
                                            : "Physical cash does not match Day Book"
                                        }
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
