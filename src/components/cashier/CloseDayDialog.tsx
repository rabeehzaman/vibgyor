"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Lock, Unlock } from "lucide-react";
import type { DailyCashierState } from "@/lib/types";
import { format, parseISO } from "date-fns";

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

// ─── Close Day Dialog ───────────────────────

interface CloseDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: DailyCashierState;
  isReconciled: boolean;
  dayBookClosing: number;
  physicalTotal: number;
  onConfirm: () => void;
}

export function CloseDayDialog({
  open,
  onOpenChange,
  state,
  isReconciled,
  dayBookClosing,
  physicalTotal,
  onConfirm,
}: CloseDayDialogProps) {
  const hasTransactions = state.dayBook.transactions.length > 0;
  const canClose = isReconciled && hasTransactions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Close Day — {format(parseISO(state.date), "dd MMM yyyy")}
          </DialogTitle>
          <DialogDescription>
            Closing the day locks all entries and carries forward balances to the next day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Check: Reconciliation */}
          <div className="flex items-start gap-3">
            {isReconciled ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isReconciled
                  ? physicalTotal === dayBookClosing
                    ? "Reconciled — Balanced"
                    : "Reconciled — Accounted for via shortages/advances"
                  : "Not Reconciled"}
              </p>
              <p className="text-xs text-muted-foreground">
                Day Book: {INR(dayBookClosing)} | Physical: {INR(physicalTotal)}
                {!isReconciled && (
                  <span className="text-red-600 ml-1">
                    (Unaccounted: {INR(Math.abs(dayBookClosing - physicalTotal - (state.reconciliation.staffShortages.reduce((s, sh) => s + sh.amount, 0) + state.staffAdvances.reduce((s, a) => s + a.amount, 0))))})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Check: Has transactions */}
          <div className="flex items-start gap-3">
            {hasTransactions ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {hasTransactions
                  ? `${state.dayBook.transactions.length} transaction(s) recorded`
                  : "No transactions recorded"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasTransactions
                  ? "Day book has entries."
                  : "At least one transaction is required to close the day."}
              </p>
            </div>
          </div>

          {/* Warning: Opening balance zero */}
          {state.dayBook.openingBalance === 0 && (
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700">Opening balance is zero</p>
                <p className="text-xs text-muted-foreground">
                  This may be expected for the first day of operations.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!canClose}>
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Confirm Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reopen Day Dialog ──────────────────────

interface ReopenDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: DailyCashierState;
  onConfirm: () => void;
}

export function ReopenDayDialog({
  open,
  onOpenChange,
  state,
  onConfirm,
}: ReopenDayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Reopen Day — {format(parseISO(state.date), "dd MMM yyyy")}
          </DialogTitle>
          <DialogDescription>
            Reopening allows further edits to this day&apos;s entries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700">Are you sure?</p>
              <p className="text-xs text-muted-foreground">
                Reopening this day will unlock it for edits. If the next day&apos;s
                opening balance was carried from this day, it may need to be
                re-verified after changes.
              </p>
            </div>
          </div>
          {state.closedAt && (
            <p className="text-xs text-muted-foreground pl-8">
              Closed on {format(parseISO(state.closedAt), "dd MMM yyyy, hh:mm a")}
              {state.closedBy && ` by ${state.closedBy}`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Unlock className="h-3.5 w-3.5 mr-1.5" />
            Reopen Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
