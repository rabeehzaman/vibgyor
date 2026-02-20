"use client";

import { useApp } from "@/context/AppContext";
import { useMemo, useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { DENOMINATIONS } from "@/lib/constants";
import { CashierRecord, DenominationBreakdown } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Scale, Save } from "lucide-react";
import { ToastNotification, useToast } from "@/components/ui/toast-notification";

export default function CashierPage() {
  const { selectedDate, selectedDateEnd, entryDate, cashierRecords, updateCashierRecord } = useApp();
  const { toast, showToast, hideToast } = useToast();

  const record = useMemo(() => {
    const inRange = cashierRecords.filter((r) => r.date >= selectedDate && r.date <= selectedDateEnd);
    return inRange.sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [cashierRecords, selectedDate, selectedDateEnd]);

  const [openingBalance, setOpeningBalance] = useState(0);
  const [depositReceived, setDepositReceived] = useState(0);
  const [cashOut, setCashOut] = useState(0);
  const [denoms, setDenoms] = useState<DenominationBreakdown>({});

  useEffect(() => {
    if (record) {
      setOpeningBalance(record.openingBalance);
      setDepositReceived(record.depositReceived);
      setCashOut(record.cashOut);
      setDenoms(record.denominations);
    } else {
      setOpeningBalance(0);
      setDepositReceived(0);
      setCashOut(0);
      setDenoms({});
    }
  }, [record]);

  const closingBalance = openingBalance + depositReceived - cashOut;

  const denomTotal = useMemo(
    () => DENOMINATIONS.reduce((sum, d) => sum + d * (denoms[String(d)] || 0), 0),
    [denoms]
  );

  const handleSave = () => {
    const updated: CashierRecord = {
      id: record?.id ?? `cr${Date.now()}`,
      date: entryDate,
      openingBalance,
      depositReceived,
      cashOut,
      closingBalance,
      denominations: denoms,
    };
    updateCashierRecord(updated);
    showToast("Cashier record saved successfully");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cashier</h2>
          <p className="text-sm text-muted-foreground">
            Cash Management -{" "}
            {selectedDate === selectedDateEnd
              ? format(parseISO(selectedDate), "dd MMM yyyy")
              : `${format(parseISO(selectedDate), "dd MMM")} – ${format(parseISO(selectedDateEnd), "dd MMM yyyy")}`}
          </p>
        </div>
        <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Save</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              className="text-lg font-bold"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deposit Received</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={depositReceived}
              onChange={(e) => setDepositReceived(Number(e.target.value))}
              className="text-lg font-bold"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash Out</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={cashOut}
              onChange={(e) => setCashOut(Number(e.target.value))}
              className="text-lg font-bold"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
            <Scale className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {closingBalance.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Currency Denomination Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Denomination</TableHead>
                  <TableHead className="w-32">Count</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DENOMINATIONS.map((d) => {
                  const count = denoms[String(d)] || 0;
                  const total = d * count;
                  return (
                    <TableRow key={d}>
                      <TableCell className="font-bold">{d.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 })}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={count}
                          onChange={(e) =>
                            setDenoms({ ...denoms, [String(d)]: Number(e.target.value) })
                          }
                          className="w-24 h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-primary/10 font-bold border-t-2">
                  <TableCell colSpan={2}>Grand Total</TableCell>
                  <TableCell className="text-right font-mono text-lg">
                    {denomTotal.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ToastNotification message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
