"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Banknote, Coins, AlertTriangle, ArrowRight } from "lucide-react";
import type { DailyCashierState, DenominationCount, DenominationValue } from "@/lib/types";
import { NOTE_DENOMINATIONS, COIN_DENOMINATIONS, BUNDLE_THRESHOLD } from "@/lib/constants";
import { detectBundleable, executeBundling, calcNoteTotal, calcCoinTotal, calcLockerBundleTotal, calcLockerClosing } from "@/lib/cashier-utils";

interface LooseDenominationProps {
    state: DailyCashierState;
    onUpdate: (state: DailyCashierState) => void;
}

const INR = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function LooseDenomination({ state, onUpdate }: LooseDenominationProps) {
    const loose = state.loose;

    const notesTotal = useMemo(() => calcNoteTotal(loose.noteDenominations), [loose.noteDenominations]);
    const coinsTotal = useMemo(() => calcCoinTotal(loose.coinDenominations), [loose.coinDenominations]);
    const grandTotal = notesTotal + coinsTotal;

    // Detect bundleable notes
    const bundleAlerts = useMemo(() => detectBundleable(loose.noteDenominations), [loose.noteDenominations]);

    const updateNoteCount = (denom: number, count: number) => {
        const updated = loose.noteDenominations.map((d) =>
            d.denomination === denom ? { ...d, noteCount: Math.max(0, count) } : d
        );
        onUpdate({
            ...state,
            loose: {
                ...loose,
                noteDenominations: updated,
                notesTotal: calcNoteTotal(updated),
                grandTotal: calcNoteTotal(updated) + coinsTotal,
            },
        });
    };

    const updateCoinCount = (denom: number, count: number) => {
        const updated = loose.coinDenominations.map((d) =>
            d.denomination === denom ? { ...d, coinCount: Math.max(0, count) } : d
        );
        onUpdate({
            ...state,
            loose: {
                ...loose,
                coinDenominations: updated,
                coinsTotal: calcCoinTotal(updated),
                grandTotal: notesTotal + calcCoinTotal(updated),
            },
        });
    };

    const handleBundleToLocker = () => {
        if (bundleAlerts.length === 0) return;

        const { updatedLoose, updatedLockerDeposits, bundledItems } = executeBundling(
            loose.noteDenominations,
            state.locker.deposited
        );

        // Recalculate locker
        const newLockerClosing = calcLockerClosing(
            state.locker.openingDenominations,
            updatedLockerDeposits,
            state.locker.withdrawn
        );

        onUpdate({
            ...state,
            loose: {
                ...loose,
                noteDenominations: updatedLoose,
                notesTotal: calcNoteTotal(updatedLoose),
                grandTotal: calcNoteTotal(updatedLoose) + coinsTotal,
            },
            locker: {
                ...state.locker,
                deposited: updatedLockerDeposits,
                closingDenominations: newLockerClosing,
                depositedTotal: calcLockerBundleTotal(updatedLockerDeposits),
                closingTotal: calcLockerBundleTotal(newLockerClosing),
            },
        });
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-3 grid-cols-3">
                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Notes Total</CardTitle>
                        <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-lg font-bold text-emerald-600">{INR(notesTotal)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Coins Total</CardTitle>
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-lg font-bold text-amber-600">{INR(coinsTotal)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-violet-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Grand Total (Loose)</CardTitle>
                        <Banknote className="h-3.5 w-3.5 text-violet-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-xl font-bold text-violet-600">{INR(grandTotal)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Bundle Alert */}
            {bundleAlerts.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/50">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-800 mb-1">Bundle Ready</p>
                                {bundleAlerts.map((b) => (
                                    <p key={b.denomination} className="text-xs text-amber-700">
                                        ₹{b.denomination.toLocaleString("en-IN")}: {b.bundles * BUNDLE_THRESHOLD + b.remainder} notes →{" "}
                                        <strong>{b.bundles} bundle{b.bundles > 1 ? "s" : ""}</strong> ({b.bundles * BUNDLE_THRESHOLD} notes = {INR(b.totalBundled)}) to Locker,{" "}
                                        <strong>{b.remainder}</strong> remain loose
                                    </p>
                                ))}
                                <Button
                                    size="sm"
                                    className="mt-2 h-7 text-xs bg-amber-600 hover:bg-amber-700"
                                    onClick={handleBundleToLocker}
                                >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    Move {bundleAlerts.reduce((s, b) => s + b.bundles, 0)} Bundle{bundleAlerts.reduce((s, b) => s + b.bundles, 0) > 1 ? "s" : ""} to Locker
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Notes Table */}
            <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> Paper Notes
                        <span className="text-xs font-normal text-muted-foreground ml-auto">
                            Counts must be &lt; {BUNDLE_THRESHOLD} per denomination
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24 font-bold">Denomination</TableHead>
                                    <TableHead className="w-28">Count</TableHead>
                                    <TableHead className="text-right font-bold">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loose.noteDenominations
                                    .filter((d) => (NOTE_DENOMINATIONS as readonly number[]).includes(d.denomination))
                                    .map((d) => {
                                        const total = d.denomination * d.noteCount;
                                        const overBundle = d.noteCount >= BUNDLE_THRESHOLD;
                                        return (
                                            <TableRow key={d.denomination} className={overBundle ? "bg-amber-50" : ""}>
                                                <TableCell className="font-bold">
                                                    ₹{d.denomination.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={d.noteCount || ""}
                                                            onChange={(e) => updateNoteCount(d.denomination, Number(e.target.value))}
                                                            onFocus={(e) => e.target.select()}
                                                            className={`w-24 h-7 text-xs ${overBundle ? "border-amber-400 ring-amber-200" : ""}`}
                                                            placeholder="0"
                                                        />
                                                        {overBundle && (
                                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {total > 0 ? INR(total) : "—"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                <TableRow className="bg-primary/10 font-bold border-t-2">
                                    <TableCell colSpan={2}>Notes Total</TableCell>
                                    <TableCell className="text-right font-mono text-base">{INR(notesTotal)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Coins Table */}
            <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Coins className="h-4 w-4" /> Coins
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24 font-bold">Denomination</TableHead>
                                    <TableHead className="w-28">Count</TableHead>
                                    <TableHead className="text-right font-bold">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loose.coinDenominations.map((d) => {
                                    const total = d.denomination * d.coinCount;
                                    return (
                                        <TableRow key={d.denomination}>
                                            <TableCell className="font-bold">
                                                ₹{d.denomination.toLocaleString("en-IN")}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={d.coinCount || ""}
                                                    onChange={(e) => updateCoinCount(d.denomination, Number(e.target.value))}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-24 h-7 text-xs"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {total > 0 ? INR(total) : "—"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                <TableRow className="bg-primary/10 font-bold border-t-2">
                                    <TableCell colSpan={2}>Coins Total</TableCell>
                                    <TableCell className="text-right font-mono text-base">{INR(coinsTotal)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
