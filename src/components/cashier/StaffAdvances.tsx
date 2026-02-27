"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserMinus, Wallet, Plus, Trash2 } from "lucide-react";
import type { DailyCashierState, StaffShortage, StaffAdvance } from "@/lib/types";
import { STAFF_MEMBERS, STAFF_ADVANCE_CATEGORIES } from "@/lib/constants";

interface StaffAdvancesProps {
    state: DailyCashierState;
    onUpdate: (state: DailyCashierState) => void;
}

const INR = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function StaffAdvancesPanel({ state, onUpdate }: StaffAdvancesProps) {
    // Shortage form state
    const [shortStaffId, setShortStaffId] = useState("");
    const [shortAmount, setShortAmount] = useState("");
    const [shortReason, setShortReason] = useState("");

    // Advance form state
    const [advStaffId, setAdvStaffId] = useState("");
    const [advCategory, setAdvCategory] = useState("");
    const [advAmount, setAdvAmount] = useState("");
    const [advRemarks, setAdvRemarks] = useState("");

    const shortages = state.reconciliation.staffShortages;
    const advances = state.staffAdvances;

    const totalShortages = shortages.reduce((s, sh) => s + sh.amount, 0);
    const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);

    const handleAddShortage = () => {
        const amt = parseFloat(shortAmount);
        if (!shortStaffId || !amt || amt <= 0) return;
        const staff = STAFF_MEMBERS.find((s) => s.id === shortStaffId);
        const shortage: StaffShortage = {
            id: `short-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: state.date,
            staffId: shortStaffId,
            staffName: staff?.name || shortStaffId,
            amount: amt,
            reason: shortReason.trim() || undefined,
        };
        onUpdate({
            ...state,
            reconciliation: {
                ...state.reconciliation,
                staffShortages: [...shortages, shortage],
            },
        });
        setShortStaffId("");
        setShortAmount("");
        setShortReason("");
    };

    const handleRemoveShortage = (id: string) => {
        onUpdate({
            ...state,
            reconciliation: {
                ...state.reconciliation,
                staffShortages: shortages.filter((s) => s.id !== id),
            },
        });
    };

    const handleAddAdvance = () => {
        const amt = parseFloat(advAmount);
        if ((!advStaffId && !advCategory) || !amt || amt <= 0) return;
        const staff = STAFF_MEMBERS.find((s) => s.id === advStaffId);
        const advance: StaffAdvance = {
            id: `adv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: state.date,
            staffId: advStaffId || "",
            staffName: staff?.name || advCategory || "—",
            category: advCategory || "MISCELLANEOUS",
            amount: amt,
            remarks: advRemarks.trim() || undefined,
        };
        onUpdate({
            ...state,
            staffAdvances: [...advances, advance],
        });
        setAdvStaffId("");
        setAdvCategory("");
        setAdvAmount("");
        setAdvRemarks("");
    };

    const handleRemoveAdvance = (id: string) => {
        onUpdate({
            ...state,
            staffAdvances: advances.filter((a) => a.id !== id),
        });
    };

    return (
        <div className="space-y-4">
            {/* Staff Shortages */}
            <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <UserMinus className="h-4 w-4 text-red-500" />
                        Staff Shortages
                        {totalShortages > 0 && (
                            <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                Total: {INR(totalShortages)}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    {/* Add Shortage Form */}
                    <div className="flex flex-wrap items-end gap-2 mb-3 pb-3 border-b">
                        <div className="min-w-[140px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Staff Member</label>
                            <Select value={shortStaffId} onValueChange={setShortStaffId}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAFF_MEMBERS.map((s) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-[100px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</label>
                            <Input
                                type="number"
                                value={shortAmount}
                                onChange={(e) => setShortAmount(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
                            <Input
                                value={shortReason}
                                onChange={(e) => setShortReason(e.target.value)}
                                placeholder="e.g. Counter shortage"
                                className="h-8 text-xs"
                            />
                        </div>
                        <Button onClick={handleAddShortage} size="sm" variant="destructive" className="h-8 text-xs">
                            <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                    </div>

                    {/* Shortages Table */}
                    {shortages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No shortages recorded</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Staff</TableHead>
                                    <TableHead className="text-right text-xs">Amount</TableHead>
                                    <TableHead className="text-xs">Reason</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shortages.map((sh) => (
                                    <TableRow key={sh.id}>
                                        <TableCell className="font-semibold text-sm">{sh.staffName}</TableCell>
                                        <TableCell className="text-right font-mono text-sm text-red-600 font-bold">
                                            {INR(sh.amount)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{sh.reason || "—"}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-destructive"
                                                onClick={() => handleRemoveShortage(sh.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-red-50/50 border-t-2 font-bold">
                                    <TableCell>TOTAL SHORTAGES</TableCell>
                                    <TableCell className="text-right font-mono text-red-700">{INR(totalShortages)}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Staff Advances / Petty Cash */}
            <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-amber-500" />
                        Staff Advances & Petty Cash
                        {totalAdvances > 0 && (
                            <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                Total: {INR(totalAdvances)}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                    {/* Add Advance Form */}
                    <div className="flex flex-wrap items-end gap-2 mb-3 pb-3 border-b">
                        <div className="min-w-[140px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Staff / Name</label>
                            <Select value={advStaffId} onValueChange={setAdvStaffId}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAFF_MEMBERS.map((s) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-[140px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                            <Select value={advCategory} onValueChange={setAdvCategory}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAFF_ADVANCE_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c} className="text-xs">
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-[100px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</label>
                            <Input
                                type="number"
                                value={advAmount}
                                onChange={(e) => setAdvAmount(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <label className="text-xs text-muted-foreground mb-1 block">Remarks</label>
                            <Input
                                value={advRemarks}
                                onChange={(e) => setAdvRemarks(e.target.value)}
                                placeholder="Optional"
                                className="h-8 text-xs"
                            />
                        </div>
                        <Button onClick={handleAddAdvance} size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700">
                            <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                    </div>

                    {/* Advances Table */}
                    {advances.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No advances recorded</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Staff / Name</TableHead>
                                    <TableHead className="text-xs">Category</TableHead>
                                    <TableHead className="text-right text-xs">Amount</TableHead>
                                    <TableHead className="text-xs">Remarks</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {advances.map((adv) => (
                                    <TableRow key={adv.id}>
                                        <TableCell className="font-semibold text-sm">{adv.staffName}</TableCell>
                                        <TableCell>
                                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
                                                {adv.category}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold">{INR(adv.amount)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{adv.remarks || "—"}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-destructive"
                                                onClick={() => handleRemoveAdvance(adv.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-amber-50/50 border-t-2 font-bold">
                                    <TableCell colSpan={2}>TOTAL ADVANCES</TableCell>
                                    <TableCell className="text-right font-mono text-amber-700">{INR(totalAdvances)}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
