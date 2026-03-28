"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Banknote } from "lucide-react";
import type { DailyCashierState } from "@/lib/types";
import LockerDenomination from "@/components/cashier/LockerDenomination";
import LooseDenomination from "@/components/cashier/LooseDenomination";
import ReconciliationPanel from "@/components/cashier/ReconciliationPanel";

interface CashCountPanelProps {
    state: DailyCashierState;
    onUpdate: (state: DailyCashierState) => void;
    readOnly?: boolean;
}

export default function CashCountPanel({ state, onUpdate, readOnly }: CashCountPanelProps) {
    return (
        <div className="space-y-4">
            {/* Live Internal Reconciliation — always visible at top */}
            <ReconciliationPanel state={state} section="internal" />

            {/* Locker / Loose sub-tabs */}
            <Tabs defaultValue="locker" className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-auto sm:h-9">
                    <TabsTrigger value="locker" className="text-xs gap-1">
                        <Lock className="h-3.5 w-3.5" />
                        Locker (Bundled)
                    </TabsTrigger>
                    <TabsTrigger value="loose" className="text-xs gap-1">
                        <Banknote className="h-3.5 w-3.5" />
                        Loose Cash
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="locker" className="mt-4">
                    <LockerDenomination state={state} onUpdate={onUpdate} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="loose" className="mt-4">
                    <LooseDenomination state={state} onUpdate={onUpdate} readOnly={readOnly} />
                </TabsContent>
            </Tabs>

            {/* External Reconciliation + Shortages detail + Overall status */}
            <ReconciliationPanel state={state} section="external" />
        </div>
    );
}
