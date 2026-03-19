"use client";

import { useApp } from "@/context/AppContext";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/KPICard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Users, Landmark, PiggyBank, MessageSquareText } from "lucide-react";

export default function DashboardPage() {
  const { selectedDate, selectedDateEnd, dailyReports, tickets, isLoading } = useApp();

  const rows = useMemo(
    () => dailyReports.filter((r) => r.date >= selectedDate && r.date <= selectedDateEnd),
    [dailyReports, selectedDate, selectedDateEnd]
  );

  const totals = useMemo(() => {
    const t = {
      membershipNew: 0,
      membershipRenew: 0,
      bank: 0,
      fdNew: 0,
      fdRenew: 0,
      rdCountFresh: 0,
      rdNew: 0,
      rdRenew: 0,
      loanRdWithMb: 0,
      loanFdWithMb: 0,
      loanLoan: 0,
    };
    for (const r of rows) {
      t.membershipNew += r.membershipNew;
      t.membershipRenew += r.membershipRenew;
      t.bank += r.bank;
      t.fdNew += r.fdNew;
      t.fdRenew += r.fdRenew;
      t.rdCountFresh += r.rdCountFresh;
      t.rdNew += r.rdNew;
      t.rdRenew += r.rdRenew;
      t.loanRdWithMb += r.loanRdWithMb;
      t.loanFdWithMb += r.loanFdWithMb;
      t.loanLoan += r.loanLoan;
    }
    return t;
  }, [rows]);

  const kpis = useMemo(() => {
    const openTickets = tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;
    return {
      memberships: totals.membershipNew + totals.membershipRenew,
      fdRd: totals.fdNew + totals.fdRenew + totals.rdNew + totals.rdRenew + totals.rdCountFresh,
      loans: totals.loanRdWithMb + totals.loanFdWithMb + totals.loanLoan,
      openTickets,
    };
  }, [totals, tickets]);

  const displayDate = selectedDate === selectedDateEnd
    ? format(parseISO(selectedDate), "dd MMM yyyy")
    : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Gradient hero summary */}
      <div className="animate-fade-in relative overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.40_0.22_265)] to-[oklch(0.50_0.20_290)] p-6 text-white shadow-lg">
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold">Daily Report</h2>
          <p className="mt-1 text-white/70 text-sm">{displayDate}</p>
          <p className="mt-3 text-white/90 text-sm">
            {rows.length} staff {rows.length === 1 ? "entry" : "entries"} recorded
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-children">
        <KPICard
          label="Memberships"
          value={kpis.memberships}
          icon={Users}
          iconColor="bg-blue-100 text-blue-600"
        />
        <KPICard
          label="FD / RD"
          value={kpis.fdRd}
          icon={PiggyBank}
          iconColor="bg-purple-100 text-purple-600"
        />
        <KPICard
          label="Loan Bookings"
          value={kpis.loans}
          icon={Landmark}
          iconColor="bg-amber-100 text-amber-600"
        />
        <KPICard
          label="Open Tickets"
          value={kpis.openTickets}
          icon={MessageSquareText}
          iconColor="bg-rose-100 text-rose-600"
        />
      </div>

      {/* Staff Performance Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Staff Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead rowSpan={2} className="border-r font-bold text-center align-bottom w-12">
                    #
                  </TableHead>
                  <TableHead rowSpan={2} className="border-r font-bold align-bottom min-w-[120px]">
                    Staff Name
                  </TableHead>
                  <TableHead colSpan={2} className="border-r text-center font-bold bg-blue-50">
                    MEMBERSHIP
                  </TableHead>
                  <TableHead rowSpan={2} className="border-r text-center font-bold bg-green-50 align-bottom">
                    BANK
                  </TableHead>
                  <TableHead colSpan={2} className="border-r text-center font-bold bg-amber-50">
                    FIXED DEPOSIT
                  </TableHead>
                  <TableHead colSpan={3} className="border-r text-center font-bold bg-purple-50">
                    RECURRING DEPOSIT
                  </TableHead>
                  <TableHead colSpan={3} className="text-center font-bold bg-rose-50">
                    LOAN BOOKING
                  </TableHead>
                </TableRow>
                <TableRow className="bg-primary/5">
                  <TableHead className="border-r text-center text-xs bg-blue-50">New</TableHead>
                  <TableHead className="border-r text-center text-xs bg-blue-50">Renew</TableHead>
                  <TableHead className="border-r text-center text-xs bg-amber-50">New</TableHead>
                  <TableHead className="border-r text-center text-xs bg-amber-50">Renew</TableHead>
                  <TableHead className="border-r text-center text-xs bg-purple-50">Fresh</TableHead>
                  <TableHead className="border-r text-center text-xs bg-purple-50">New</TableHead>
                  <TableHead className="border-r text-center text-xs bg-purple-50">Renew</TableHead>
                  <TableHead className="text-center text-xs bg-rose-50">RD+MB</TableHead>
                  <TableHead className="text-center text-xs bg-rose-50">FD+MB</TableHead>
                  <TableHead className="text-center text-xs bg-rose-50">Loan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      No data available for {displayDate}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((r, idx) => (
                      <TableRow key={`${r.staffId}-${r.date}`} className="hover:bg-muted/50">
                        <TableCell className="border-r text-center text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                        <TableCell className="border-r font-medium">{r.staffName}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.membershipNew || "-"}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.membershipRenew || "-"}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.bank || "-"}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.fdNew || "-"}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.fdRenew || "-"}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.rdCountFresh || "-"}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.rdNew || "-"}</TableCell>
                        <TableCell className="border-r text-center tabular-nums">{r.rdRenew || "-"}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.loanRdWithMb || "-"}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.loanFdWithMb || "-"}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.loanLoan || "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/10 font-bold border-t-2">
                      <TableCell className="border-r text-center" />
                      <TableCell className="border-r">TOTAL</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.membershipNew}</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.membershipRenew}</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.bank}</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.fdNew}</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.fdRenew}</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.rdCountFresh}</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.rdNew}</TableCell>
                      <TableCell className="border-r text-center tabular-nums">{totals.rdRenew}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.loanRdWithMb}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.loanFdWithMb}</TableCell>
                      <TableCell className="text-center tabular-nums">{totals.loanLoan}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
