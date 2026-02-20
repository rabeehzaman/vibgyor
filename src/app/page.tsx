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

export default function DashboardPage() {
  const { selectedDate, selectedDateEnd, dailyReports } = useApp();

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

  const displayDate = selectedDate === selectedDateEnd
    ? format(parseISO(selectedDate), "dd MMM yyyy")
    : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Report</h2>
          <p className="text-sm text-muted-foreground">{displayDate}</p>
        </div>
      </div>

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
                      <TableRow key={r.staffId} className="hover:bg-muted/50">
                        <TableCell className="border-r text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="border-r font-medium">{r.staffName}</TableCell>
                        <TableCell className="border-r text-center">{r.membershipNew || "-"}</TableCell>
                        <TableCell className="border-r text-center">{r.membershipRenew || "-"}</TableCell>
                        <TableCell className="border-r text-center">{r.bank || "-"}</TableCell>
                        <TableCell className="border-r text-center">{r.fdNew || "-"}</TableCell>
                        <TableCell className="border-r text-center">{r.fdRenew || "-"}</TableCell>
                        <TableCell className="border-r text-center">{r.rdCountFresh || "-"}</TableCell>
                        <TableCell className="border-r text-center">{r.rdNew || "-"}</TableCell>
                        <TableCell className="border-r text-center">{r.rdRenew || "-"}</TableCell>
                        <TableCell className="text-center">{r.loanRdWithMb || "-"}</TableCell>
                        <TableCell className="text-center">{r.loanFdWithMb || "-"}</TableCell>
                        <TableCell className="text-center">{r.loanLoan || "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/10 font-bold border-t-2">
                      <TableCell className="border-r text-center" />
                      <TableCell className="border-r">TOTAL</TableCell>
                      <TableCell className="border-r text-center">{totals.membershipNew}</TableCell>
                      <TableCell className="border-r text-center">{totals.membershipRenew}</TableCell>
                      <TableCell className="border-r text-center">{totals.bank}</TableCell>
                      <TableCell className="border-r text-center">{totals.fdNew}</TableCell>
                      <TableCell className="border-r text-center">{totals.fdRenew}</TableCell>
                      <TableCell className="border-r text-center">{totals.rdCountFresh}</TableCell>
                      <TableCell className="border-r text-center">{totals.rdNew}</TableCell>
                      <TableCell className="border-r text-center">{totals.rdRenew}</TableCell>
                      <TableCell className="text-center">{totals.loanRdWithMb}</TableCell>
                      <TableCell className="text-center">{totals.loanFdWithMb}</TableCell>
                      <TableCell className="text-center">{totals.loanLoan}</TableCell>
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
