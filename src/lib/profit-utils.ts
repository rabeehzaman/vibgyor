import type {
  ProfitLineItem,
  ProfitReport,
  ProfitPeriodType,
} from "./types";

export function calcTotalIncome(items: ProfitLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function calcTotalExpenses(items: ProfitLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function recalcProfitReport(report: ProfitReport): ProfitReport {
  const totalIncome = calcTotalIncome(report.incomeBreakdown);
  const totalExpenses = calcTotalExpenses(report.expenseBreakdown);
  return {
    ...report,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    updatedAt: new Date().toISOString(),
  };
}

export function calcProfitMargin(totalIncome: number, netProfit: number): number {
  if (totalIncome === 0) return 0;
  return (netProfit / totalIncome) * 100;
}

export function calcOperatingRatio(totalIncome: number, totalExpenses: number): number {
  if (totalIncome === 0) return 0;
  return (totalExpenses / totalIncome) * 100;
}

export function calcTargetProgress(netProfit: number, targetProfit: number): number {
  if (targetProfit <= 0) return 0;
  return (netProfit / targetProfit) * 100;
}

export function amountToBreakeven(totalIncome: number, totalExpenses: number): number {
  return Math.max(0, totalExpenses - totalIncome);
}

export function createEmptyProfitReport(
  period: string,
  periodType: ProfitPeriodType
): ProfitReport {
  const now = new Date().toISOString();
  return {
    id: `pr-${periodType}-${period}-${Date.now()}`,
    period,
    periodType,
    incomeBreakdown: [],
    expenseBreakdown: [],
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function formatPeriodLabel(period: string, periodType: ProfitPeriodType): string {
  if (periodType === "monthly") {
    const [year, month] = period.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  if (periodType === "quarterly") {
    return period.replace(/^(\d{4})-(Q\d)/, "$2 $1");
  }
  return `FY ${period}`;
}

export function getCurrentPeriod(periodType: ProfitPeriodType): string {
  const now = new Date();
  if (periodType === "monthly") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  if (periodType === "quarterly") {
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${q}`;
  }
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${fy}-${String((fy + 1) % 100).padStart(2, "0")}`;
}

/** Derive period string from a YYYY-MM-DD date */
export function getPeriodFromDate(date: string, periodType: ProfitPeriodType): string {
  const d = new Date(date);
  if (periodType === "monthly") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (periodType === "quarterly") {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `${d.getFullYear()}-Q${q}`;
  }
  const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${fy}-${String((fy + 1) % 100).padStart(2, "0")}`;
}

export function getAvailablePeriods(periodType: ProfitPeriodType): { value: string; label: string }[] {
  const now = new Date();
  if (periodType === "monthly") {
    const periods: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      periods.push({ value, label });
    }
    return periods;
  }
  if (periodType === "quarterly") {
    const periods: { value: string; label: string }[] = [];
    const currentQ = Math.ceil((now.getMonth() + 1) / 3);
    let year = now.getFullYear();
    let q = currentQ;
    for (let i = 0; i < 8; i++) {
      periods.push({ value: `${year}-Q${q}`, label: `Q${q} ${year}` });
      q--;
      if (q === 0) { q = 4; year--; }
    }
    return periods;
  }
  // Yearly — Indian FY (April–March)
  const periods: { value: string; label: string }[] = [];
  const startFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  for (let i = 0; i < 5; i++) {
    const fy = startFY - i;
    const value = `${fy}-${String((fy + 1) % 100).padStart(2, "0")}`;
    periods.push({ value, label: `FY ${value}` });
  }
  return periods;
}
