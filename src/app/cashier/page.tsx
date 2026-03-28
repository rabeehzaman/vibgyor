"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Lock, Banknote,
  CheckCircle, XCircle, AlertTriangle, Users, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";
import DayBook from "@/components/cashier/DayBook";
import CashCountPanel from "@/components/cashier/CashCountPanel";
import StaffAdvancesPanel from "@/components/cashier/StaffAdvances";
import DayHistoryPanel from "@/components/cashier/DayHistoryPanel";
import DayStatusBar from "@/components/cashier/DayStatusBar";
import { CloseDayDialog, ReopenDayDialog } from "@/components/cashier/CloseDayDialog";
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
    entryDate,
    setCustomDate,
    dailyCashierStates,
    saveDailyCashierState,
    closeCashierDay,
    reopenCashierDay,
    deleteCashierDay,
  } = useApp();
  const { toast, showToast, hideToast } = useToast();

  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [closeDayOpen, setCloseDayOpen] = useState(false);
  const [reopenDayOpen, setReopenDayOpen] = useState(false);

  // Get or create the daily state for the current entry date
  const currentState: DailyCashierState = useMemo(() => {
    const existing = dailyCashierStates.find((s) => s.date === entryDate);
    if (existing) return existing;

    // Find previous day's closing for carry-forward
    const sorted = [...dailyCashierStates].sort((a, b) => b.date.localeCompare(a.date));
    const previousDay = sorted.find((s) => s.date < entryDate);
    const prevClosing = previousDay?.dayBook.closingBalance ?? 0;
    const prevLockerClosing = previousDay?.locker.closingDenominations;

    return createEmptyDailyCashierState(entryDate, prevClosing, prevLockerClosing, {
      type: previousDay ? "carry-forward" : "manual-override",
      fromDate: previousDay?.date,
      amount: prevClosing,
    });
  }, [dailyCashierStates, entryDate]);

  const handleUpdate = useCallback(
    (updated: DailyCashierState) => {
      saveDailyCashierState(updated);
    },
    [saveDailyCashierState]
  );

  // Quick summary values
  const dayBookClosing = currentState.dayBook.closingBalance;
  const lockerTotal = calcLockerBundleTotal(currentState.locker.closingDenominations);
  const looseNotes = calcNoteTotal(currentState.loose.noteDenominations);
  const looseCoins = calcCoinTotal(currentState.loose.coinDenominations);
  const looseTotal = looseNotes + looseCoins;
  const physicalTotal = lockerTotal + looseTotal;
  const totalShortages = currentState.reconciliation.staffShortages.reduce((s, sh) => s + sh.amount, 0);
  const totalAdvances = currentState.staffAdvances.reduce((s, a) => s + a.amount, 0);
  const totalExplained = totalShortages + totalAdvances;
  const isBalanced = physicalTotal === dayBookClosing;
  const isFullyExplained = physicalTotal + totalExplained === dayBookClosing;
  const isReconciled = (isBalanced || isFullyExplained) && dayBookClosing > 0;
  const isClosed = currentState.status === "closed";

  const handleNavigate = useCallback((date: string) => {
    setCustomDate(date);
  }, [setCustomDate]);

  const handleCloseDay = useCallback(() => {
    closeCashierDay(entryDate);
    setCloseDayOpen(false);
    showToast(`Day closed successfully — ${format(parseISO(entryDate), "dd MMM yyyy")}`);
  }, [closeCashierDay, entryDate, showToast]);

  const handleReopenDay = useCallback(() => {
    reopenCashierDay(entryDate);
    setReopenDayOpen(false);
    showToast(`Day reopened — ${format(parseISO(entryDate), "dd MMM yyyy")}`);
  }, [reopenCashierDay, entryDate, showToast]);

  const handleDeleteDay = useCallback((date: string) => {
    deleteCashierDay(date);
    if (date === entryDate) {
      setCustomDate(format(new Date(), "yyyy-MM-dd"));
    }
    showToast(`Day record deleted — ${format(parseISO(date), "dd MMM yyyy")}`);
  }, [deleteCashierDay, entryDate, setCustomDate, showToast]);

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Day History Panel */}
      <Card className={`shrink-0 hidden md:flex ${historyCollapsed ? "w-12" : "w-64"} transition-all duration-200 overflow-hidden`}>
        <DayHistoryPanel
          states={dailyCashierStates}
          currentDate={entryDate}
          onSelectDate={handleNavigate}
          onDeleteDay={handleDeleteDay}
          collapsed={historyCollapsed}
          onToggleCollapse={() => setHistoryCollapsed(!historyCollapsed)}
        />
      </Card>

      {/* Right: Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Mobile: Toggle history */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryCollapsed(!historyCollapsed)}
          >
            {historyCollapsed ? <PanelLeft className="h-4 w-4 mr-1" /> : <PanelLeftClose className="h-4 w-4 mr-1" />}
            History
          </Button>
        </div>
        {!historyCollapsed && (
          <Card className="md:hidden max-h-48 overflow-hidden">
            <DayHistoryPanel
              states={dailyCashierStates}
              currentDate={entryDate}
              onSelectDate={handleNavigate}
              onDeleteDay={handleDeleteDay}
              collapsed={false}
              onToggleCollapse={() => setHistoryCollapsed(true)}
            />
          </Card>
        )}

        {/* Day Status Bar */}
        <DayStatusBar
          currentDate={entryDate}
          currentState={currentState}
          allStates={dailyCashierStates}
          isReconciled={isReconciled}
          onNavigate={handleNavigate}
          onCloseDay={() => setCloseDayOpen(true)}
          onReopenDay={() => setReopenDayOpen(true)}
        />

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
                  ) : isFullyExplained ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-700">Accounted</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-red-600">
                        Mismatch: {INR(Math.abs(physicalTotal + totalExplained - dayBookClosing))}
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
          <TabsList className="w-full grid grid-cols-3 h-auto sm:h-10">
            <TabsTrigger value="daybook" className="text-xs gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Day Book</span>
            </TabsTrigger>
            <TabsTrigger value="cashcount" className="text-xs gap-1">
              <Banknote className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cash Count</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="text-xs gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daybook" className="mt-4">
            <DayBook state={currentState} onUpdate={handleUpdate} readOnly={isClosed} />
          </TabsContent>

          <TabsContent value="cashcount" className="mt-4">
            <CashCountPanel state={currentState} onUpdate={handleUpdate} readOnly={isClosed} />
          </TabsContent>

          <TabsContent value="staff" className="mt-4">
            <StaffAdvancesPanel state={currentState} onUpdate={handleUpdate} readOnly={isClosed} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CloseDayDialog
        open={closeDayOpen}
        onOpenChange={setCloseDayOpen}
        state={currentState}
        isReconciled={isReconciled}
        dayBookClosing={dayBookClosing}
        physicalTotal={physicalTotal}
        onConfirm={handleCloseDay}
      />
      <ReopenDayDialog
        open={reopenDayOpen}
        onOpenChange={setReopenDayOpen}
        state={currentState}
        onConfirm={handleReopenDay}
      />

      <ToastNotification
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}
