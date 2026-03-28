"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Lock, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from "lucide-react";
import type { DailyCashierState, DenominationCount } from "@/lib/types";
import { ALL_DENOMINATIONS, BUNDLE_THRESHOLD } from "@/lib/constants";
import { calcLockerBundleTotal, calcLockerClosing } from "@/lib/cashier-utils";

interface LockerDenominationProps {
    state: DailyCashierState;
    onUpdate: (state: DailyCashierState) => void;
    readOnly?: boolean;
}

const INR = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function LockerDenomination({ state, onUpdate, readOnly }: LockerDenominationProps) {
    const locker = state.locker;

    const getCount = (arr: DenominationCount[], denom: number) =>
        arr.find((d) => d.denomination === denom)?.noteCount || 0;

    const updateDenomArray = (
        arr: DenominationCount[],
        denom: number,
        value: number
    ): DenominationCount[] =>
        arr.map((d) =>
            d.denomination === denom ? { ...d, noteCount: Math.max(0, value) } : d
        );

    const handleOpeningChange = (denom: number, value: number) => {
        const opening = updateDenomArray(locker.openingDenominations, denom, value);
        const closing = calcLockerClosing(opening, locker.deposited, locker.withdrawn);
        onUpdate({
            ...state,
            locker: {
                ...locker,
                openingDenominations: opening,
                closingDenominations: closing,
                openingTotal: calcLockerBundleTotal(opening),
                closingTotal: calcLockerBundleTotal(closing),
            },
        });
    };

    const handleDepositedChange = (denom: number, value: number) => {
        const deposited = updateDenomArray(locker.deposited, denom, value);
        const closing = calcLockerClosing(locker.openingDenominations, deposited, locker.withdrawn);
        onUpdate({
            ...state,
            locker: {
                ...locker,
                deposited,
                closingDenominations: closing,
                depositedTotal: calcLockerBundleTotal(deposited),
                closingTotal: calcLockerBundleTotal(closing),
            },
        });
    };

    const handleWithdrawnChange = (denom: number, value: number) => {
        const withdrawn = updateDenomArray(locker.withdrawn, denom, value);
        const closing = calcLockerClosing(locker.openingDenominations, locker.deposited, withdrawn);
        onUpdate({
            ...state,
            locker: {
                ...locker,
                withdrawn,
                closingDenominations: closing,
                withdrawnTotal: calcLockerBundleTotal(withdrawn),
                closingTotal: calcLockerBundleTotal(closing),
            },
        });
    };

    // Recalculate totals
    const openingTotal = calcLockerBundleTotal(locker.openingDenominations);
    const depositedTotal = calcLockerBundleTotal(locker.deposited);
    const withdrawnTotal = calcLockerBundleTotal(locker.withdrawn);
    const closing = calcLockerClosing(locker.openingDenominations, locker.deposited, locker.withdrawn);
    const closingTotal = calcLockerBundleTotal(closing);

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Opening Total</CardTitle>
                        <Lock className="h-3.5 w-3.5 text-blue-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-lg font-bold text-blue-600">{INR(openingTotal)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Deposited Today</CardTitle>
                        <ArrowDownToLine className="h-3.5 w-3.5 text-green-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-lg font-bold text-green-600">{INR(depositedTotal)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Withdrawn Today</CardTitle>
                        <ArrowUpFromLine className="h-3.5 w-3.5 text-red-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-lg font-bold text-red-600">{INR(withdrawnTotal)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-violet-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Closing Total</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="text-xl font-bold text-violet-600">{INR(closingTotal)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Banner */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                <span>
                    Each entry represents <strong>bundles</strong> (1 bundle = {BUNDLE_THRESHOLD} notes).
                    Value = bundles × {BUNDLE_THRESHOLD} × denomination.
                </span>
            </div>

            {/* Denomination Table */}
            <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Locker Denomination Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-primary/5">
                                    <TableHead className="w-20 font-bold">Denom.</TableHead>
                                    <TableHead className="w-24 text-center bg-blue-50 font-bold">Opening</TableHead>
                                    <TableHead className="w-24 text-center bg-green-50 font-bold">Deposited</TableHead>
                                    <TableHead className="w-24 text-center bg-red-50 font-bold">Withdrawn</TableHead>
                                    <TableHead className="w-24 text-center bg-violet-50 font-bold">Closing</TableHead>
                                    <TableHead className="text-right font-bold">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ALL_DENOMINATIONS.map((d) => {
                                    const openingVal = getCount(locker.openingDenominations, d);
                                    const depositedVal = getCount(locker.deposited, d);
                                    const withdrawnVal = getCount(locker.withdrawn, d);
                                    const closingVal = openingVal + depositedVal - withdrawnVal;
                                    const value = closingVal * BUNDLE_THRESHOLD * d;

                                    return (
                                        <TableRow key={d}>
                                            <TableCell className="font-bold">₹{d.toLocaleString("en-IN")}</TableCell>
                                            <TableCell className="bg-blue-50/30">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={openingVal || ""}
                                                    onChange={(e) => handleOpeningChange(d, Number(e.target.value))}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-20 h-7 text-center text-xs mx-auto"
                                                    placeholder="0"
                                                    disabled={readOnly}
                                                />
                                            </TableCell>
                                            <TableCell className="bg-green-50/30">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={depositedVal || ""}
                                                    onChange={(e) => handleDepositedChange(d, Number(e.target.value))}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-20 h-7 text-center text-xs mx-auto"
                                                    placeholder="0"
                                                    disabled={readOnly}
                                                />
                                            </TableCell>
                                            <TableCell className="bg-red-50/30">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={withdrawnVal || ""}
                                                    onChange={(e) => handleWithdrawnChange(d, Number(e.target.value))}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-20 h-7 text-center text-xs mx-auto"
                                                    placeholder="0"
                                                    disabled={readOnly}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center font-semibold bg-violet-50/30">
                                                {closingVal}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {value > 0 ? INR(value) : "—"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                <TableRow className="bg-primary/10 font-bold border-t-2">
                                    <TableCell>TOTAL</TableCell>
                                    <TableCell className="text-center text-xs">{INR(openingTotal)}</TableCell>
                                    <TableCell className="text-center text-xs text-green-600">{INR(depositedTotal)}</TableCell>
                                    <TableCell className="text-center text-xs text-red-600">{INR(withdrawnTotal)}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right font-mono text-base">{INR(closingTotal)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
