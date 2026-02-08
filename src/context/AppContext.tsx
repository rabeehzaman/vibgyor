"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  CustomerVisit,
  LoanEnquiry,
  FundTransfer,
  Beneficiary,
  CashierRecord,
  DailyReportRow,
} from "@/lib/types";
import { dailyReports as initialReports } from "@/data/daily-reports";
import { customerVisits as initialVisits } from "@/data/customer-visits";
import { loanEnquiries as initialLoans } from "@/data/loan-enquiries";
import { fundTransfers as initialTransfers } from "@/data/fund-transfers";
import { beneficiaries as initialBeneficiaries } from "@/data/beneficiaries";
import { cashierRecords as initialCashier } from "@/data/cashier-records";

interface AppState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dailyReports: DailyReportRow[];
  customerVisits: CustomerVisit[];
  addCustomerVisit: (visit: CustomerVisit) => void;
  loanEnquiries: LoanEnquiry[];
  addLoanEnquiry: (enquiry: LoanEnquiry) => void;
  updateLoanStatus: (id: string, status: LoanEnquiry["status"]) => void;
  fundTransfers: FundTransfer[];
  addFundTransfer: (transfer: FundTransfer) => void;
  updateTransferStatus: (id: string, status: FundTransfer["status"]) => void;
  beneficiaries: Beneficiary[];
  addBeneficiary: (beneficiary: Beneficiary) => void;
  cashierRecords: CashierRecord[];
  updateCashierRecord: (record: CashierRecord) => void;
}

const AppContext = createContext<AppState | null>(null);

const DATA_VERSION = "v3"; // bump this to force refresh of mock data

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const storedVersion = localStorage.getItem("vibgyor_data_version");
    if (storedVersion !== DATA_VERSION) {
      // Clear stale data when mock data is updated
      localStorage.removeItem(key);
      return fallback;
    }
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dailyReports] = useState<DailyReportRow[]>(() => loadFromStorage("vibgyor_reports", initialReports));
  const [customerVisits, setCustomerVisits] = useState<CustomerVisit[]>(() => loadFromStorage("vibgyor_visits", initialVisits));
  const [loanEnquiries, setLoanEnquiries] = useState<LoanEnquiry[]>(() => loadFromStorage("vibgyor_loans", initialLoans));
  const [fundTransfers, setFundTransfers] = useState<FundTransfer[]>(() => loadFromStorage("vibgyor_transfers", initialTransfers));
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => loadFromStorage("vibgyor_beneficiaries", initialBeneficiaries));
  const [cashierRecords, setCashierRecords] = useState<CashierRecord[]>(() => loadFromStorage("vibgyor_cashier", initialCashier));

  useEffect(() => { localStorage.setItem("vibgyor_data_version", DATA_VERSION); }, []);
  useEffect(() => { localStorage.setItem("vibgyor_visits", JSON.stringify(customerVisits)); }, [customerVisits]);
  useEffect(() => { localStorage.setItem("vibgyor_loans", JSON.stringify(loanEnquiries)); }, [loanEnquiries]);
  useEffect(() => { localStorage.setItem("vibgyor_transfers", JSON.stringify(fundTransfers)); }, [fundTransfers]);
  useEffect(() => { localStorage.setItem("vibgyor_beneficiaries", JSON.stringify(beneficiaries)); }, [beneficiaries]);
  useEffect(() => { localStorage.setItem("vibgyor_cashier", JSON.stringify(cashierRecords)); }, [cashierRecords]);

  const addCustomerVisit = useCallback((visit: CustomerVisit) => {
    setCustomerVisits((prev) => [...prev, visit]);
  }, []);

  const addLoanEnquiry = useCallback((enquiry: LoanEnquiry) => {
    setLoanEnquiries((prev) => [...prev, enquiry]);
  }, []);

  const updateLoanStatus = useCallback((id: string, status: LoanEnquiry["status"]) => {
    setLoanEnquiries((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }, []);

  const addFundTransfer = useCallback((transfer: FundTransfer) => {
    setFundTransfers((prev) => [...prev, transfer]);
  }, []);

  const updateTransferStatus = useCallback((id: string, status: FundTransfer["status"]) => {
    setFundTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const addBeneficiary = useCallback((beneficiary: Beneficiary) => {
    setBeneficiaries((prev) => [...prev, beneficiary]);
  }, []);

  const updateCashierRecord = useCallback((record: CashierRecord) => {
    setCashierRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === record.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [...prev, record];
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        dailyReports,
        customerVisits,
        addCustomerVisit,
        loanEnquiries,
        addLoanEnquiry,
        updateLoanStatus,
        fundTransfers,
        addFundTransfer,
        updateTransferStatus,
        beneficiaries,
        addBeneficiary,
        cashierRecords,
        updateCashierRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
