"use client";

import { useState } from "react";
import { format, parseISO, isToday } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle, XCircle, ChevronLeft, ChevronRight, Calendar, Trash2, AlertTriangle,
} from "lucide-react";
import type { DailyCashierState } from "@/lib/types";
import { calcLockerBundleTotal, calcNoteTotal, calcCoinTotal } from "@/lib/cashier-utils";

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

interface DayHistoryPanelProps {
  states: DailyCashierState[];
  currentDate: string;
  onSelectDate: (date: string) => void;
  onDeleteDay: (date: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function isReconciled(state: DailyCashierState): boolean {
  const lockerTotal = calcLockerBundleTotal(state.locker.closingDenominations);
  const looseTotal =
    calcNoteTotal(state.loose.noteDenominations) +
    calcCoinTotal(state.loose.coinDenominations);
  const physicalTotal = lockerTotal + looseTotal;
  return physicalTotal === state.dayBook.closingBalance && state.dayBook.closingBalance > 0;
}

export default function DayHistoryPanel({
  states,
  currentDate,
  onSelectDate,
  onDeleteDay,
  collapsed,
  onToggleCollapse,
}: DayHistoryPanelProps) {
  const sorted = [...states].sort((a, b) => b.date.localeCompare(a.date));
  const [deleteTarget, setDeleteTarget] = useState<DailyCashierState | null>(null);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
          title="Expand history"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180">
          Day History
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h3 className="text-sm font-semibold">Day History</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-7 w-7 p-0"
            title="Collapse"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Day List */}
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">No records yet.</p>
          )}
          {sorted.map((state) => {
            const dateObj = parseISO(state.date);
            const isCurrent = state.date === currentDate;
            const today = isToday(dateObj);
            const balanced = isReconciled(state);

            return (
              <div
                key={state.date}
                className={`relative group w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-accent/50 cursor-pointer ${
                  isCurrent ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                }`}
                onClick={() => onSelectDate(state.date)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-medium ${isCurrent ? "text-primary" : ""}`}>
                        {format(dateObj, "dd MMM")}
                      </span>
                      {today && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          TODAY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(dateObj, "EEEE")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge
                        variant={state.status === "closed" ? "statusResolved" : "statusInProgress"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {state.status === "closed" ? "Closed" : "Draft"}
                      </Badge>
                      {balanced ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                    {/* Delete button — visible on hover */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete this day"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(state);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Closing: {INR(state.dayBook.closingBalance)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Day Record
            </DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>Delete all data for <strong>{format(parseISO(deleteTarget.date), "dd MMM yyyy")}</strong>? This includes all transactions, denominations, and staff entries for this day.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-2 py-1">
              <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>This action cannot be undone. The next day&apos;s opening balance may need to be re-verified.</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 px-1">
                <div>Transactions: {deleteTarget.dayBook.transactions.length}</div>
                <div>Closing Balance: {INR(deleteTarget.dayBook.closingBalance)}</div>
                <div>Status: {deleteTarget.status}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteDay(deleteTarget.date);
                  setDeleteTarget(null);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
