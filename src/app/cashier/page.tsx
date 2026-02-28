"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Lock, Banknote, Scale, Save,
  CheckCircle, XCircle, AlertTriangle, Users,
} from "lucide-react";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";
import DayBook from "@/components/cashier/DayBook";
import LockerDenomination from "@/components/cashier/LockerDenomination";
import LooseDenomination from "@/components/cashier/LooseDenomination";
import ReconciliationPanel from "@/components/cashier/ReconciliationPanel";
import StaffAdvancesPanel from "@/components/cashier/StaffAdvances";
import type { DailyCashierState } from "@/lib/types";
import {
  createEmptyDailyCashierState,
  calcLockerBundleTotal,
  calcNoteTotal,
  calcCoinTotal,
} from "@/lib/cashier-utils";

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function CashierPage() {
  const {
    selectedDate,
    selectedDateEnd,
    entryDate,
    dailyCashierStates,
    saveDailyCashierState,
  } = useApp();
  const { toast, showToast, hideToast } = useToast();

  // Get or create the daily state for the current entry date
  const currentState: DailyCashierState = useMemo(() => {
    const existing = dailyCashierStates.find((s) => s.date === entryDate);
    if (existing) return existing;

    // Find previous day's closing for carry-forward
    const sorted = [...dailyCashierStates].sort((a, b) => b.date.localeCompare(a.date));
    const previousDay = sorted.find((s) => s.date < entryDate);
    const prevClosing = previousDay?.dayBook.closingBalance ?? 0;
    const prevLockerClosing = previousDay?.locker.closingDenominations;

    return createEmptyDailyCashierState(entryDate, prevClosing, prevLockerClosing);
  }, [dailyCashierStates, entryDate]);

  const handleUpdate = useCallback(
    (updated: DailyCashierState) => {
      saveDailyCashierState(updated);
    },
    [saveDailyCashierState]
  );

  const handleSave = () => {
    saveDailyCashierState(currentState);
    showToast("Cashier record saved successfully");
  };

  // Quick summary values
  const dayBookClosing = currentState.dayBook.closingBalance;
  const lockerTotal = calcLockerBundleTotal(currentState.locker.closingDenominations);
  const looseNotes = calcNoteTotal(currentState.loose.noteDenominations);
  const looseCoins = calcCoinTotal(currentState.loose.coinDenominations);
  const looseTotal = looseNotes + looseCoins;
  const physicalTotal = lockerTotal + looseTotal;
  const isBalanced = physicalTotal === dayBookClosing;

  const displayDate =
    selectedDate === selectedDateEnd
      ? format(parseISO(selectedDate), "dd MMM yyyy")
      : `${format(parseISO(selectedDate), "dd MMM")} – ${format(
        parseISO(selectedDateEnd),
        "dd MMM yyyy"
      )}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Cashier</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cash Management — {displayDate}
          </p>
        </div>
        <Button size="sm" onClick={handleSave}>
          <Save className="mr-1.5 h-3.5 w-3.5" /> Save
        </Button>
      </div>

      {/* Quick Summary Bar */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border">
        <CardContent className="py-2.5 px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-muted-foreground">Day Book:</span>
              <span className="font-bold">{INR(dayBookClosing)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">Locker:</span>
              <span className="font-bold text-blue-600">{INR(lockerTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Loose:</span>
              <span className="font-bold text-emerald-600">{INR(looseTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:ml-auto">
              {dayBookClosing > 0 || physicalTotal > 0 ? (
                isBalanced ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-700">Balanced</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-red-600">
                      Mismatch: {INR(Math.abs(physicalTotal - dayBookClosing))}
                    </span>
                  </>
                )
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Awaiting entries</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="daybook" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto sm:h-10">
          <TabsTrigger value="daybook" className="text-xs gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Day Book</span>
          </TabsTrigger>
          <TabsTrigger value="locker" className="text-xs gap-1">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Locker</span>
          </TabsTrigger>
          <TabsTrigger value="loose" className="text-xs gap-1">
            <Banknote className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Loose</span>
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs gap-1">
            <Scale className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reconciliation</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-xs gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daybook" className="mt-4">
          <DayBook state={currentState} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="locker" className="mt-4">
          <LockerDenomination state={currentState} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="loose" className="mt-4">
          <LooseDenomination state={currentState} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-4">
          <ReconciliationPanel state={currentState} />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <StaffAdvancesPanel state={currentState} onUpdate={handleUpdate} />
        </TabsContent>
      </Tabs>

      <ToastNotification
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}
