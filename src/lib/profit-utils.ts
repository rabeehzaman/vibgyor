import type {
  IncomeBreakdown,
  ExpenseBreakdown,
  ProfitReport,
  ProfitPeriodType,
} from "./types";

export function calcTotalIncome(breakdown: IncomeBreakdown): number {
  return Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);
}

export function calcTotalExpenses(breakdown: ExpenseBreakdown): number {
  return Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);
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
    incomeBreakdown: {
      interestEarned: 0,
      serviceFees: 0,
      loanIncome: 0,
      investmentIncome: 0,
      otherIncome: 0,
    },
    expenseBreakdown: {
      salariesWages: 0,
      rentUtilities: 0,
      interestPaid: 0,
      operationalCosts: 0,
      marketing: 0,
      depreciation: 0,
      otherExpenses: 0,
    },
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

/** Get month period strings ("YYYY-MM") that fall inside a calendar quarter */
export function getMonthsInQuarter(quarter: string): string[] {
  const match = quarter.match(/^(\d{4})-Q(\d)$/);
  if (!match) return [];
  const year = match[1];
  const q = parseInt(match[2]);
  const startMonth = (q - 1) * 3 + 1;
  return [0, 1, 2].map((i) => `${year}-${String(startMonth + i).padStart(2, "0")}`);
}

/** Get month period strings ("YYYY-MM") that fall inside an Indian FY (Apr–Mar) */
export function getMonthsInFY(fy: string): string[] {
  const match = fy.match(/^(\d{4})-(\d{2})$/);
  if (!match) return [];
  const startYear = parseInt(match[1]);
  const months: string[] = [];
  for (let m = 4; m <= 12; m++) months.push(`${startYear}-${String(m).padStart(2, "0")}`);
  for (let m = 1; m <= 3; m++) months.push(`${startYear + 1}-${String(m).padStart(2, "0")}`);
  return months;
}

/** Sum breakdowns across multiple monthly reports */
export function aggregateMonthlyReports(reports: ProfitReport[]): {
  incomeBreakdown: IncomeBreakdown;
  expenseBreakdown: ExpenseBreakdown;
} {
  const income: IncomeBreakdown = { interestEarned: 0, serviceFees: 0, loanIncome: 0, investmentIncome: 0, otherIncome: 0 };
  const expense: ExpenseBreakdown = { salariesWages: 0, rentUtilities: 0, interestPaid: 0, operationalCosts: 0, marketing: 0, depreciation: 0, otherExpenses: 0 };
  for (const r of reports) {
    for (const k of Object.keys(income) as (keyof IncomeBreakdown)[]) income[k] += r.incomeBreakdown[k] || 0;
    for (const k of Object.keys(expense) as (keyof ExpenseBreakdown)[]) expense[k] += r.expenseBreakdown[k] || 0;
  }
  return { incomeBreakdown: income, expenseBreakdown: expense };
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
