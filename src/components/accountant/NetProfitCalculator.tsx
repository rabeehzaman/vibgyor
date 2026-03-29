"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp, TrendingDown, Calculator, Target,
  Wallet, Receipt, PieChart, StickyNote, CheckCircle2, AlertTriangle,
  ChevronDown, Plus, X,
} from "lucide-react";
import type { ProfitReport, ProfitPeriodType, ProfitLineItem } from "@/lib/types";
import {
  recalcProfitReport,
  calcProfitMargin,
  calcOperatingRatio,
  calcTargetProgress,
  amountToBreakeven,
  createEmptyProfitReport,
  getAvailablePeriods,
  getPeriodFromDate,
} from "@/lib/profit-utils";
import { cn } from "@/lib/utils";

interface NetProfitCalculatorProps {
  allReports: ProfitReport[];
  onUpdate: (report: ProfitReport) => void;
  periodType: ProfitPeriodType;
  onPeriodTypeChange: (pt: ProfitPeriodType) => void;
  entryDate: string;
}

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

const PERIOD_TYPE_OPTIONS: { value: ProfitPeriodType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

interface PeriodRow {
  value: string;
  label: string;
  report: ProfitReport;
  hasData: boolean;
}

export default function NetProfitCalculator({
  allReports, onUpdate, periodType, onPeriodTypeChange, entryDate,
}: NetProfitCalculatorProps) {
  const currentPeriod = useMemo(() => getPeriodFromDate(entryDate, periodType), [entryDate, periodType]);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(currentPeriod);

  const handlePeriodTypeChange = useCallback((pt: ProfitPeriodType) => {
    onPeriodTypeChange(pt);
    setExpandedPeriod(getPeriodFromDate(entryDate, pt));
  }, [onPeriodTypeChange, entryDate]);

  const rows: PeriodRow[] = useMemo(() => {
    const periods = getAvailablePeriods(periodType);
    return periods.map((p) => {
      const existing = allReports.find((r) => r.period === p.value && r.periodType === periodType);
      const report = existing || createEmptyProfitReport(p.value, periodType);
      const hasData = report.totalIncome > 0 || report.totalExpenses > 0;
      return { ...p, report, hasData };
    });
  }, [allReports, periodType]);

  return (
    <div className="space-y-3">
      {/* Period Type Toggle */}
      <div className="flex rounded-lg overflow-hidden border w-fit">
        {PERIOD_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePeriodTypeChange(opt.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              periodType === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Period List */}
      <div className="space-y-2">
        {rows.map((row) => {
          const isCurrent = row.value === currentPeriod;
          const isExpanded = expandedPeriod === row.value;
          const { report } = row;
          const { totalIncome, totalExpenses, netProfit } = report;
          const isAtBreakeven = totalIncome >= totalExpenses;

          return (
            <Card key={row.value} className={cn(isCurrent && "ring-2 ring-primary/30")}>
              <button
                type="button"
                onClick={() => setExpandedPeriod(isExpanded ? null : row.value)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{row.label}</span>
                    {isCurrent && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Current</Badge>}
                  </div>
                  {row.hasData ? (
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-green-600 font-mono">{INR(totalIncome)}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-red-600 font-mono">{INR(totalExpenses)}</span>
                      <span className="text-muted-foreground">=</span>
                      <span className={cn("font-mono font-semibold", netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {INR(netProfit)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">No data entered</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {row.hasData && (
                    isAtBreakeven
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                </div>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 px-4 pb-4">
                  <Separator className="mb-4" />
                  <PeriodDetail report={report} onUpdate={onUpdate} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PeriodDetail — the expanded content for a single period row
   ═══════════════════════════════════════════════════════════════ */

function PeriodDetail({
  report, onUpdate,
}: {
  report: ProfitReport;
  onUpdate: (report: ProfitReport) => void;
}) {
  const { totalIncome, totalExpenses, netProfit } = report;
  const profitMargin = calcProfitMargin(totalIncome, netProfit);
  const operatingRatio = calcOperatingRatio(totalIncome, totalExpenses);
  const breakeven = amountToBreakeven(totalIncome, totalExpenses);
  const isAtBreakeven = totalIncome >= totalExpenses;
  const hasTarget = report.targetProfit != null && report.targetProfit > 0;
  const targetProgress = hasTarget ? calcTargetProgress(netProfit, report.targetProfit!) : 0;

  const save = useCallback((updated: ProfitReport) => {
    onUpdate(recalcProfitReport(updated));
  }, [onUpdate]);

  const handleItemChange = useCallback((
    side: "income" | "expense",
    index: number,
    field: "label" | "amount",
    value: string | number,
  ) => {
    const key = side === "income" ? "incomeBreakdown" : "expenseBreakdown";
    const items = [...report[key]];
    items[index] = { ...items[index], [field]: field === "amount" ? Number(value) : value };
    save({ ...report, [key]: items });
  }, [report, save]);

  const handleAddItem = useCallback((side: "income" | "expense") => {
    const key = side === "income" ? "incomeBreakdown" : "expenseBreakdown";
    const items = [...report[key], { id: `${side[0]}${Date.now()}`, label: "", amount: 0 }];
    save({ ...report, [key]: items });
  }, [report, save]);

  const handleRemoveItem = useCallback((side: "income" | "expense", index: number) => {
    const key = side === "income" ? "incomeBreakdown" : "expenseBreakdown";
    const items = report[key].filter((_, i) => i !== index);
    save({ ...report, [key]: items });
  }, [report, save]);

  const handleTargetChange = useCallback((value: number) => {
    onUpdate({ ...report, targetProfit: value || undefined, updatedAt: new Date().toISOString() });
  }, [report, onUpdate]);

  const handleNotesChange = useCallback((value: string) => {
    onUpdate({ ...report, notes: value || undefined, updatedAt: new Date().toISOString() });
  }, [report, onUpdate]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-green-600 font-mono">{INR(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-red-600 font-mono">{INR(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card className={cn("border-l-4", netProfit >= 0 ? "border-l-emerald-500" : "border-l-rose-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle>
            <Calculator className={cn("h-3.5 w-3.5", netProfit >= 0 ? "text-emerald-500" : "text-rose-500")} />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className={cn("text-xl font-bold font-mono", netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {INR(netProfit)}
            </div>
            {totalIncome > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">Margin: {profitMargin.toFixed(1)}%</p>
            )}
          </CardContent>
        </Card>

        <Card className={cn("border-l-4", isAtBreakeven ? "border-l-green-500" : "border-l-amber-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Breakeven</CardTitle>
            {isAtBreakeven ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {isAtBreakeven ? (
              <div className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Achieved
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold text-amber-600">Not yet</div>
                <p className="text-xs text-muted-foreground mt-0.5">Need {INR(breakeven)} more income</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income & Expense Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Income */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-600" /> Income
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                onClick={() => handleAddItem("income")}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {report.incomeBreakdown.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No income items. Click Add to start.</p>
            )}
            {report.incomeBreakdown.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => handleItemChange("income", idx, "label", e.target.value)}
                  placeholder="Item name"
                  className="flex-1 h-9 text-sm"
                />
                <div className="relative w-32 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">&#8377;</span>
                  <Input
                    type="number"
                    value={item.amount || ""}
                    onChange={(e) => handleItemChange("income", idx, "amount", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="pl-7 font-mono text-right h-9"
                    placeholder="0"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
                  onClick={() => handleRemoveItem("income", idx)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {report.incomeBreakdown.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Income</span>
                  <span className="text-lg font-bold text-green-600 font-mono">{INR(totalIncome)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-red-600" /> Expenses
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                onClick={() => handleAddItem("expense")}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {report.expenseBreakdown.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No expense items. Click Add to start.</p>
            )}
            {report.expenseBreakdown.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => handleItemChange("expense", idx, "label", e.target.value)}
                  placeholder="Item name"
                  className="flex-1 h-9 text-sm"
                />
                <div className="relative w-32 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">&#8377;</span>
                  <Input
                    type="number"
                    value={item.amount || ""}
                    onChange={(e) => handleItemChange("expense", idx, "amount", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="pl-7 font-mono text-right h-9"
                    placeholder="0"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
                  onClick={() => handleRemoveItem("expense", idx)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {report.expenseBreakdown.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Expenses</span>
                  <span className="text-lg font-bold text-red-600 font-mono">{INR(totalExpenses)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target Profit & Progress */}
      <Card className="border-dashed border-emerald-300 bg-emerald-50/30">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" /> Target Profit
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 shrink-0">Set Target</span>
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">&#8377;</span>
              <Input
                type="number"
                value={report.targetProfit || ""}
                onChange={(e) => handleTargetChange(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="pl-7 font-mono text-right h-9"
                placeholder="Enter target profit"
              />
            </div>
          </div>

          {hasTarget && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className={cn(
                    "font-semibold",
                    targetProgress >= 100 ? "text-green-600" : targetProgress >= 50 ? "text-blue-600" : "text-amber-600"
                  )}>
                    {targetProgress.toFixed(1)}%
                  </span>
                </div>
                {(() => {
                  const rangeMin = -totalExpenses;
                  const rangeMax = report.targetProfit!;
                  const rangeTotal = rangeMax - rangeMin;
                  const breakevenPos = rangeTotal > 0 ? ((0 - rangeMin) / rangeTotal) * 100 : 0;
                  const profitPos = rangeTotal > 0 ? Math.min(Math.max(((netProfit - rangeMin) / rangeTotal) * 100, 0), 100) : 0;
                  return (
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            netProfit >= report.targetProfit! ? "bg-green-500" : netProfit >= 0 ? "bg-blue-500" : "bg-red-400"
                          )}
                          style={{ width: `${profitPos}%` }}
                        />
                      </div>
                      {breakevenPos > 2 && breakevenPos < 98 && (
                        <div className="absolute top-0 h-4 w-0.5 bg-gray-600" style={{ left: `${breakevenPos}%` }} title="Breakeven point" />
                      )}
                      <div className="relative h-4 mt-0.5">
                        {breakevenPos > 2 && breakevenPos < 98 && (
                          <span className="absolute text-[10px] text-gray-500 -translate-x-1/2 whitespace-nowrap" style={{ left: `${breakevenPos}%` }}>
                            Breakeven
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Current: <span className={cn("font-mono font-medium", netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>{INR(netProfit)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Target: <span className="font-mono font-medium">{INR(report.targetProfit!)}</span>
                  </span>
                </div>
              </div>

              {netProfit >= report.targetProfit! ? (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">Target Achieved!</p>
                    <p className="text-xs text-green-600">
                      Exceeded by <span className="font-mono font-medium">{INR(netProfit - report.targetProfit!)}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">Keep Going</p>
                    <p className="text-xs text-amber-600">
                      <span className="font-mono font-medium">{INR(report.targetProfit! - netProfit)}</span> remaining to reach target
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Financial Ratios */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieChart className="h-4 w-4 text-blue-600" /> Financial Ratios
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
              <p className={cn("text-2xl font-bold font-mono", netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {INR(netProfit)}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
              <p className={cn("text-2xl font-bold font-mono", profitMargin > 0 ? "text-green-600" : profitMargin < 0 ? "text-red-600" : "text-muted-foreground")}>
                {totalIncome > 0 ? `${profitMargin.toFixed(1)}%` : "\u2014"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Net Profit / Income</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Operating Ratio</p>
              <p className={cn("text-2xl font-bold font-mono", operatingRatio < 100 ? "text-green-600" : operatingRatio > 100 ? "text-red-600" : "text-amber-600")}>
                {totalIncome > 0 ? `${operatingRatio.toFixed(1)}%` : "\u2014"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Expenses / Income — lower is better</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" /> Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <textarea
            value={report.notes || ""}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add notes about this period's financial performance..."
            className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          />
        </CardContent>
      </Card>
    </div>
  );
}
