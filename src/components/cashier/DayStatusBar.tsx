"use client";

import { format, parseISO, addDays, subDays, isToday, isFuture } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, CalendarDays, Lock, Unlock,
  AlertTriangle, ArrowRight,
} from "lucide-react";
import type { DailyCashierState } from "@/lib/types";

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

interface DayStatusBarProps {
  currentDate: string;
  currentState: DailyCashierState;
  allStates: DailyCashierState[];
  isReconciled: boolean;
  onNavigate: (date: string) => void;
  onCloseDay: () => void;
  onReopenDay: () => void;
}

export default function DayStatusBar({
  currentDate,
  currentState,
  allStates,
  isReconciled,
  onNavigate,
  onCloseDay,
  onReopenDay,
}: DayStatusBarProps) {
  const dateObj = parseISO(currentDate);
  const today = isToday(dateObj);
  const nextDate = format(addDays(dateObj, 1), "yyyy-MM-dd");
  const prevDate = format(subDays(dateObj, 1), "yyyy-MM-dd");
  const nextDisabled = isFuture(addDays(dateObj, 1));
  const isClosed = currentState.status === "closed";

  // Count draft days before this date
  const draftDaysBefore = allStates.filter(
    (s) => s.date < currentDate && s.status === "draft"
  ).length;

  // Opening balance provenance
  const source = currentState.openingBalanceSource;

  return (
    <div className="space-y-2">
      {/* Main bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Navigation */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onNavigate(prevDate)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center px-2">
            <div className="text-lg font-bold leading-tight">
              {format(dateObj, "dd MMMM yyyy")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(dateObj, "EEEE")}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onNavigate(nextDate)}
            disabled={nextDisabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!today && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs ml-1"
              onClick={() => onNavigate(format(new Date(), "yyyy-MM-dd"))}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              Today
            </Button>
          )}
        </div>

        {/* Center: Status */}
        <Badge
          variant={isClosed ? "statusResolved" : "statusInProgress"}
          className="text-sm px-3 py-1"
        >
          {isClosed ? "CLOSED" : "DRAFT"}
        </Badge>

        {/* Right: Action */}
        <div>
          {isClosed ? (
            <Button variant="outline" size="sm" onClick={onReopenDay}>
              <Unlock className="h-3.5 w-3.5 mr-1.5" />
              Reopen Day
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onCloseDay}
              disabled={!isReconciled}
              title={!isReconciled ? "Day must be reconciled before closing" : "Close this day"}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Close Day
            </Button>
          )}
        </div>
      </div>

      {/* Opening balance provenance */}
      {source && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
          <span>Opening Balance: <span className="font-medium text-foreground">{INR(source.amount)}</span></span>
          {source.type === "carry-forward" && source.fromDate && (
            <>
              <ArrowRight className="h-3 w-3" />
              <span>Carried from {format(parseISO(source.fromDate), "dd MMM yyyy")}</span>
            </>
          )}
          {source.type === "manual-override" && source.amount === 0 && (
            <span className="text-muted-foreground/60">(first day or no previous record)</span>
          )}
        </div>
      )}

      {/* Warning banners */}
      {isClosed && (
        <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 text-green-700 rounded-md px-3 py-2">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          This day is closed. Entries are read-only.
        </div>
      )}
      {!isClosed && !today && (
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          This past day has not been closed yet. Finalize it to lock entries and carry forward balances.
        </div>
      )}
      {draftDaysBefore > 0 && today && (
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {draftDaysBefore} previous {draftDaysBefore === 1 ? "day has" : "days have"} not been finalized.
        </div>
      )}
    </div>
  );
}
