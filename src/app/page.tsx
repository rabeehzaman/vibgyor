"use client";

import { useApp } from "@/context/AppContext";
import { useMemo } from "react";
import { format, parseISO, isToday } from "date-fns";
import { campaigns } from "@/data/campaigns";
import { getPeriodFromDate } from "@/lib/profit-utils";
import { STAFF_MEMBERS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  Users, FileText, Wallet, ArrowLeftRight, Megaphone, MessageSquareText,
  CheckCircle2, XCircle, TrendingUp, TrendingDown,
  Trophy, Medal, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });

export default function DashboardPage() {
  const {
    selectedDate, selectedDateEnd, entryDate, isLoading,
    dailyReports, creEntries, customerVisits,
    loanEnquiries, fundTransfers,
    dailyCashierStates, dailyBankBookStates,
    profitReports, tickets,
  } = useApp();

  // ─── Date display ─────────────────────────────
  const displayDate = selectedDate === selectedDateEnd
    ? format(parseISO(selectedDate), "dd MMM yyyy")
    : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`;

  // ─── CRE metrics ──────────────────────────────
  const cre = useMemo(() => {
    const filtered = creEntries.filter((e) => e.date >= selectedDate && e.date <= selectedDateEnd);
    const visits = customerVisits.filter((v) => v.date >= selectedDate && v.date <= selectedDateEnd);
    return {
      total: filtered.length,
      memberships: filtered.filter((e) => e.category === "NewMembership").length,
      newRDs: filtered.filter((e) => e.category === "NewRD").length,
      newFDs: filtered.filter((e) => e.category === "NewFD").length,
      visits: visits.length,
    };
  }, [creEntries, customerVisits, selectedDate, selectedDateEnd]);

  // ─── LPO metrics ──────────────────────────────
  const lpo = useMemo(() => {
    const filtered = loanEnquiries.filter((e) => e.date >= selectedDate && e.date <= selectedDateEnd);
    return {
      total: filtered.length,
      underProcess: filtered.filter((e) => e.status === "Under Process").length,
      passed: filtered.filter((e) => e.status === "Passed").length,
      rejected: filtered.filter((e) => e.status === "Rejected").length,
    };
  }, [loanEnquiries, selectedDate, selectedDateEnd]);

  // ─── Cashier metrics ──────────────────────────
  const cashier = useMemo(() => {
    const todayState = dailyCashierStates.find((s) => s.date === entryDate);
    if (!todayState) return { closing: 0, locker: 0, status: "no-data" as const };
    const diff = todayState.reconciliation.difference;
    const status = diff === 0 ? "balanced" as const : "mismatch" as const;
    return {
      closing: todayState.dayBook.closingBalance,
      locker: todayState.locker.closingTotal,
      status,
    };
  }, [dailyCashierStates, entryDate]);

  // ─── Accountant metrics ───────────────────────
  const accountant = useMemo(() => {
    const filtered = fundTransfers.filter((t) => t.date >= selectedDate && t.date <= selectedDateEnd);
    const totalOut = filtered.reduce((sum, t) => sum + t.amount, 0);
    const pending = filtered.filter((t) => t.status === "Pending").length;

    const bankBalance = dailyBankBookStates
      .filter((s) => s.date === entryDate)
      .reduce((sum, s) => sum + s.bankBook.closingBalance, 0);

    const period = getPeriodFromDate(entryDate, "monthly");
    const report = profitReports.find((r) => r.period === period && r.periodType === "monthly");
    const netProfit = report?.netProfit ?? 0;

    return { totalOut, pending, bankBalance, netProfit };
  }, [fundTransfers, dailyBankBookStates, profitReports, selectedDate, selectedDateEnd, entryDate]);

  // ─── ABM metrics ──────────────────────────────
  const abm = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "Active").length;
    const planned = campaigns.filter((c) => c.status === "Planned").length;
    const completed = campaigns.filter((c) => c.status === "Completed").length;
    const avgProgress = campaigns.length > 0
      ? Math.round(campaigns.reduce((sum, c) => sum + (c.target > 0 ? (c.achieved / c.target) * 100 : 0), 0) / campaigns.length)
      : 0;
    return { total: campaigns.length, active, planned, completed, avgProgress };
  }, []);

  // ─── Ticket metrics ───────────────────────────
  const ticketStats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "Open").length;
    const inProgress = tickets.filter((t) => t.status === "In Progress").length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    const closed = tickets.filter((t) => t.status === "Closed").length;
    const today = format(new Date(), "yyyy-MM-dd");
    const resolvedToday = tickets.filter(
      (t) => t.status === "Resolved" && t.resolvedAt && t.resolvedAt.startsWith(today)
    ).length;
    return { total: tickets.length, open, inProgress, resolved, closed, resolvedToday };
  }, [tickets]);

  // ─── Staff leaderboard ─────────────────────────
  const staffLeaderboard = useMemo(() => {
    const rows = dailyReports.filter((r) => r.date >= selectedDate && r.date <= selectedDateEnd);

    // Aggregate per staff
    const staffMap = new Map<string, { name: string; total: number; memberships: number; deposits: number; loans: number }>();
    for (const r of rows) {
      const existing = staffMap.get(r.staffId) ?? { name: r.staffName, total: 0, memberships: 0, deposits: 0, loans: 0 };
      const memberships = r.membershipNew + r.membershipRenew;
      const deposits = r.bank + r.fdNew + r.fdRenew + r.rdCountFresh + r.rdNew + r.rdRenew;
      const loans = r.loanRdWithMb + r.loanFdWithMb + r.loanLoan;
      existing.memberships += memberships;
      existing.deposits += deposits;
      existing.loans += loans;
      existing.total += memberships + deposits + loans;
      staffMap.set(r.staffId, existing);
    }

    const sorted = Array.from(staffMap.entries())
      .map(([id, data]) => ({ id, ...data, department: STAFF_MEMBERS.find((s) => s.id === id)?.department ?? "CRE" }))
      .sort((a, b) => b.total - a.total);

    const maxTotal = sorted[0]?.total || 1;
    return { list: sorted, maxTotal };
  }, [dailyReports, selectedDate, selectedDateEnd]);

  // ─── Department activity ──────────────────────
  const deptActivity = useMemo(() => {
    const depts = [
      { key: "CRE", label: "Customer Relations", color: "bg-blue-500", count: STAFF_MEMBERS.filter((s) => s.department === "CRE").length },
      { key: "LPO", label: "Loan Processing", color: "bg-amber-500", count: STAFF_MEMBERS.filter((s) => s.department === "LPO").length },
      { key: "ABM", label: "Marketing", color: "bg-orange-500", count: STAFF_MEMBERS.filter((s) => s.department === "ABM").length },
      { key: "CASHIER", label: "Cash Management", color: "bg-emerald-500", count: STAFF_MEMBERS.filter((s) => s.department === "CASHIER").length },
      { key: "ACCOUNTANT", label: "Finance", color: "bg-violet-500", count: STAFF_MEMBERS.filter((s) => s.department === "ACCOUNTANT").length },
    ];
    const totalStaff = STAFF_MEMBERS.length;
    return { depts, totalStaff };
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ═══ Hero Banner ═══ */}
      <div className="animate-fade-in relative overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.40_0.22_265)] to-[oklch(0.50_0.20_290)] p-6 text-white shadow-lg">
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold">Dashboard Overview</h2>
          <p className="mt-1 text-white/70 text-sm">{displayDate}</p>
        </div>
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 stagger-children">
        <KPICard label="CRE Entries" value={cre.total} icon={Users} iconColor="bg-blue-100 text-blue-600" />
        <KPICard label="Loan Enquiries" value={lpo.total} icon={FileText} iconColor="bg-amber-100 text-amber-600" />
        <KPICard
          label="Cashier Balance"
          value={cashier.closing}
          icon={Wallet}
          iconColor="bg-emerald-100 text-emerald-600"
          formatFn={INR}
        />
        <KPICard label="Pending Transfers" value={accountant.pending} icon={ArrowLeftRight} iconColor="bg-violet-100 text-violet-600" />
        <KPICard label="Active Campaigns" value={abm.active} icon={Megaphone} iconColor="bg-orange-100 text-orange-600" />
        <KPICard
          label="Open Tickets"
          value={ticketStats.open + ticketStats.inProgress}
          icon={MessageSquareText}
          iconColor="bg-rose-100 text-rose-600"
        />
      </div>

      {/* ═══ Department Summary Cards ═══ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* CRE */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              CRE — Customer Relations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Memberships</span>
              <span className="font-semibold">{cre.memberships}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New RDs</span>
              <span className="font-semibold">{cre.newRDs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New FDs</span>
              <span className="font-semibold">{cre.newFDs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer Visits</span>
              <span className="font-semibold">{cre.visits}</span>
            </div>
          </CardContent>
        </Card>

        {/* LPO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              LPO — Loan Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Enquiries</span>
              <span className="font-semibold">{lpo.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Under Process</span>
              <span className="font-semibold text-yellow-600">{lpo.underProcess}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passed</span>
              <span className="font-semibold text-green-600">{lpo.passed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rejected</span>
              <span className="font-semibold text-red-600">{lpo.rejected}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cashier */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Cashier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day Book Closing</span>
              <span className="font-semibold">{INR(cashier.closing)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locker Total</span>
              <span className="font-semibold">{INR(cashier.locker)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Reconciliation</span>
              {cashier.status === "balanced" ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Balanced
                </Badge>
              ) : cashier.status === "mismatch" ? (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <XCircle className="h-3 w-3 mr-1" /> Mismatch
                </Badge>
              ) : (
                <span className="text-muted-foreground text-xs">No data</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accountant */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-violet-500" />
              Accountant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transfers Out</span>
              <span className="font-semibold">{INR(accountant.totalOut)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Transfers</span>
              <span className="font-semibold text-yellow-600">{accountant.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank Balance</span>
              <span className="font-semibold text-blue-600">{INR(accountant.bankBalance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Net Profit</span>
              <span className={cn(
                "font-semibold flex items-center gap-1",
                accountant.netProfit > 0 ? "text-green-600" : accountant.netProfit < 0 ? "text-red-600" : ""
              )}>
                {accountant.netProfit >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {INR(accountant.netProfit)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ABM */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-orange-500" />
              ABM — Marketing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active</span>
              <span className="font-semibold text-green-600">{abm.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planned</span>
              <span className="font-semibold text-blue-600">{abm.planned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold">{abm.completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Progress</span>
              <span className="font-semibold">{abm.avgProgress}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Tickets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-rose-500" />
              Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open</span>
              <span className="font-semibold text-orange-600">{ticketStats.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-semibold text-yellow-600">{ticketStats.inProgress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolved</span>
              <span className="font-semibold text-green-600">{ticketStats.resolved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolved Today</span>
              <span className="font-semibold text-emerald-600">{ticketStats.resolvedToday}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Staff Leaderboard + Department Activity ═══ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Staff Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffLeaderboard.list.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                No staff activity for {displayDate}
              </p>
            ) : (
              <div className="space-y-3">
                {staffLeaderboard.list.map((staff, idx) => {
                  const pct = Math.round((staff.total / staffLeaderboard.maxTotal) * 100);
                  const RankIcon = idx === 0 ? Trophy : idx === 1 ? Medal : idx === 2 ? Award : null;
                  const rankColor = idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "";
                  const deptColors: Record<string, string> = {
                    CRE: "bg-blue-100 text-blue-700 border-blue-200",
                    LPO: "bg-amber-100 text-amber-700 border-amber-200",
                    ABM: "bg-orange-100 text-orange-700 border-orange-200",
                    CASHIER: "bg-emerald-100 text-emerald-700 border-emerald-200",
                    ACCOUNTANT: "bg-violet-100 text-violet-700 border-violet-200",
                  };
                  return (
                    <div key={staff.id} className="flex items-center gap-3">
                      <div className="w-6 text-center shrink-0">
                        {RankIcon ? (
                          <RankIcon className={cn("h-4 w-4 mx-auto", rankColor)} />
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{staff.name}</span>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", deptColors[staff.department])}>
                            {staff.department}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-primary/40"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums w-8 text-right">{staff.total}</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex gap-3 text-[11px] text-muted-foreground shrink-0">
                        <span title="Memberships">MB: {staff.memberships}</span>
                        <span title="Deposits (Bank/FD/RD)">DP: {staff.deposits}</span>
                        <span title="Loans">LN: {staff.loans}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Department Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deptActivity.depts.map((dept) => {
              const pct = Math.round((dept.count / deptActivity.totalStaff) * 100);
              return (
                <div key={dept.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{dept.label}</span>
                    <span className="text-muted-foreground text-xs">{dept.count} staff</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", dept.color)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t flex justify-between text-sm">
              <span className="font-semibold">Total Staff</span>
              <span className="font-bold">{deptActivity.totalStaff}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
