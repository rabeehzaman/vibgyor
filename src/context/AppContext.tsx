"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";

export type DatePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom";
import {
  CustomerVisit,
  LoanEnquiry,
  FundTransfer,
  Beneficiary,
  CashierRecord,
  DailyReportRow,
  CREDailyEntry,
  CustomerMovement,
  RecurringDeposit,
  RDPayment,
  Scheme,
  CustomReferrer,
  CustomerAccount,
  MasterLists,
} from "@/lib/types";
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_PRODUCTS,
  DD_TYPES,
  COLLECTION_AREAS,
  TENURE_OPTIONS,
  MIGRATION_TYPES,
  CUSTOMER_NEEDS,
  FD_TYPES,
  LOAN_SCHEMES_LIST,
} from "@/lib/constants";
import { dailyReports as initialReports } from "@/data/daily-reports";
import { customerVisits as initialVisits } from "@/data/customer-visits";
import { loanEnquiries as initialLoans } from "@/data/loan-enquiries";
import { fundTransfers as initialTransfers } from "@/data/fund-transfers";
import { beneficiaries as initialBeneficiaries } from "@/data/beneficiaries";
import { cashierRecords as initialCashier } from "@/data/cashier-records";
import { creDailyEntries as initialCREEntries } from "@/data/cre-daily-entries";
import { customerMovements as initialMovements } from "@/data/customer-movements";
import { rdList as initialRDList } from "@/data/rd-list";
import { schemes as initialSchemes } from "@/data/schemes";

interface AppState {
  selectedDate: string;
  selectedDateEnd: string;
  datePreset: DatePreset;
  entryDate: string;
  setDatePreset: (p: Exclude<DatePreset, "custom">) => void;
  setCustomDate: (date: string) => void;
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
  creEntries: CREDailyEntry[];
  addCREEntry: (entry: CREDailyEntry) => void;
  customerMovements: CustomerMovement[];
  addCustomerMovement: (m: CustomerMovement) => void;
  rdList: RecurringDeposit[];
  addRD: (rd: RecurringDeposit) => void;
  updateRDStatus: (id: string, status: RecurringDeposit["status"]) => void;
  rdPayments: RDPayment[];
  addRDPayment: (payment: RDPayment) => void;
  schemes: Scheme[];
  addScheme: (scheme: Scheme) => void;
  customReferrers: CustomReferrer[];
  addCustomReferrer: (r: CustomReferrer) => void;
  customerAccounts: CustomerAccount[];
  addCustomerAccount: (a: CustomerAccount) => void;
  masterLists: MasterLists;
  addToMasterList: (key: keyof MasterLists, value: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const DATA_VERSION = "v7"; // bump this to force refresh of mock data

const DEFAULT_MASTER_LISTS: MasterLists = {
  membershipPlans: [...MEMBERSHIP_PLANS],
  membershipProducts: [...MEMBERSHIP_PRODUCTS],
  ddTypes: [...DD_TYPES],
  collectionAreas: [...COLLECTION_AREAS],
  tenureOptions: [...TENURE_OPTIONS],
  migrationTypes: [...MIGRATION_TYPES],
  customerNeeds: [...CUSTOMER_NEEDS],
  fdTypes: [...FD_TYPES],
  loanSchemeCodes: [...LOAN_SCHEMES_LIST],
};

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

function todayStr() { return format(new Date(), "yyyy-MM-dd"); }
function monthStartStr() { return format(startOfMonth(new Date()), "yyyy-MM-dd"); }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(monthStartStr);
  const [selectedDateEnd, setSelectedDateEnd] = useState(todayStr);
  const [datePreset, setDatePresetState] = useState<DatePreset>("this-month");
  const [entryDate, setEntryDate] = useState(todayStr);
  const [dailyReports] = useState<DailyReportRow[]>(initialReports);
  const [customerVisits, setCustomerVisits] = useState<CustomerVisit[]>(initialVisits);
  const [loanEnquiries, setLoanEnquiries] = useState<LoanEnquiry[]>(initialLoans);
  const [fundTransfers, setFundTransfers] = useState<FundTransfer[]>(initialTransfers);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(initialBeneficiaries);
  const [cashierRecords, setCashierRecords] = useState<CashierRecord[]>(initialCashier);
  const [creEntries, setCREEntries] = useState<CREDailyEntry[]>(initialCREEntries);
  const [customerMovements, setCustomerMovements] = useState<CustomerMovement[]>(initialMovements);
  const [rdList, setRDList] = useState<RecurringDeposit[]>(initialRDList);
  const [rdPayments, setRDPayments] = useState<RDPayment[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>(initialSchemes);
  const [customReferrers, setCustomReferrers] = useState<CustomReferrer[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);
  const [masterLists, setMasterLists] = useState<MasterLists>(DEFAULT_MASTER_LISTS);

  // Load persisted data from localStorage after mount (avoids SSR/client hydration mismatch)
  useEffect(() => {
    setCustomerVisits(loadFromStorage("vibgyor_visits", initialVisits));
    setLoanEnquiries(loadFromStorage("vibgyor_loans", initialLoans));
    setFundTransfers(loadFromStorage("vibgyor_transfers", initialTransfers));
    setBeneficiaries(loadFromStorage("vibgyor_beneficiaries", initialBeneficiaries));
    setCashierRecords(loadFromStorage("vibgyor_cashier", initialCashier));
    setCREEntries(loadFromStorage("vibgyor_cre_entries", initialCREEntries));
    setCustomerMovements(loadFromStorage("vibgyor_movements", initialMovements));
    setRDList(loadFromStorage("vibgyor_rdlist", initialRDList));
    setRDPayments(loadFromStorage("vibgyor_rdpayments", []));
    setSchemes(loadFromStorage("vibgyor_schemes", initialSchemes));
    setCustomReferrers(loadFromStorage("vibgyor_referrers", []));
    setCustomerAccounts(loadFromStorage("vibgyor_accounts", []));
    setMasterLists(loadFromStorage("vibgyor_master_lists", DEFAULT_MASTER_LISTS));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { localStorage.setItem("vibgyor_data_version", DATA_VERSION); }, []);
  useEffect(() => { localStorage.setItem("vibgyor_visits", JSON.stringify(customerVisits)); }, [customerVisits]);
  useEffect(() => { localStorage.setItem("vibgyor_loans", JSON.stringify(loanEnquiries)); }, [loanEnquiries]);
  useEffect(() => { localStorage.setItem("vibgyor_transfers", JSON.stringify(fundTransfers)); }, [fundTransfers]);
  useEffect(() => { localStorage.setItem("vibgyor_beneficiaries", JSON.stringify(beneficiaries)); }, [beneficiaries]);
  useEffect(() => { localStorage.setItem("vibgyor_cashier", JSON.stringify(cashierRecords)); }, [cashierRecords]);
  useEffect(() => { localStorage.setItem("vibgyor_cre_entries", JSON.stringify(creEntries)); }, [creEntries]);
  useEffect(() => { localStorage.setItem("vibgyor_movements", JSON.stringify(customerMovements)); }, [customerMovements]);
  useEffect(() => { localStorage.setItem("vibgyor_rdlist", JSON.stringify(rdList)); }, [rdList]);
  useEffect(() => { localStorage.setItem("vibgyor_rdpayments", JSON.stringify(rdPayments)); }, [rdPayments]);
  useEffect(() => { localStorage.setItem("vibgyor_schemes", JSON.stringify(schemes)); }, [schemes]);
  useEffect(() => { localStorage.setItem("vibgyor_referrers", JSON.stringify(customReferrers)); }, [customReferrers]);
  useEffect(() => { localStorage.setItem("vibgyor_accounts", JSON.stringify(customerAccounts)); }, [customerAccounts]);
  useEffect(() => { localStorage.setItem("vibgyor_master_lists", JSON.stringify(masterLists)); }, [masterLists]);

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

  const addCREEntry = useCallback((entry: CREDailyEntry) => {
    setCREEntries((prev) => [...prev, entry]);
    if (entry.category === "NewRD" && entry.customerName) {
      setRDList((prev) => [
        ...prev,
        {
          id: `rd${Date.now()}`,
          accountNumber: entry.accountNumber,
          customerName: entry.customerName!,
          mobileNumber: entry.mobileNumber ?? "",
          amount: entry.amount ?? 0,
          tenure: entry.tenure ?? "",
          freshRenewal: entry.freshRenewal ?? "Fresh",
          scheme: entry.scheme ?? "",
          startDate: entry.date,
          staffId: entry.staffId ?? "",
          staffName: entry.staffName ?? "",
          status: "Active",
        },
      ]);
    }
  }, []);

  const addCustomerMovement = useCallback((m: CustomerMovement) => {
    setCustomerMovements((prev) => [...prev, m]);
  }, []);

  const addRD = useCallback((rd: RecurringDeposit) => {
    setRDList((prev) => [...prev, rd]);
  }, []);

  const updateRDStatus = useCallback((id: string, status: RecurringDeposit["status"]) => {
    setRDList((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const addRDPayment = useCallback((payment: RDPayment) => {
    setRDPayments((prev) => {
      const idx = prev.findIndex((p) => p.rdId === payment.rdId && p.period === payment.period);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payment;
        return next;
      }
      return [...prev, payment];
    });
  }, []);

  const addScheme = useCallback((scheme: Scheme) => {
    setSchemes((prev) => [...prev, scheme]);
  }, []);

  const addCustomReferrer = useCallback((r: CustomReferrer) => {
    setCustomReferrers((prev) => [...prev, r]);
  }, []);

  const addCustomerAccount = useCallback((a: CustomerAccount) => {
    setCustomerAccounts((prev) => [...prev, a]);
  }, []);

  const addToMasterList = useCallback((key: keyof MasterLists, value: string) => {
    setMasterLists((prev) => ({ ...prev, [key]: [...prev[key], value] }));
  }, []);

  const setDatePreset = useCallback((p: Exclude<DatePreset, "custom">) => {
    const t = todayStr();
    if (p === "today") {
      setSelectedDate(t);
      setSelectedDateEnd(t);
      setEntryDate(t);
    } else if (p === "yesterday") {
      const y = format(subDays(new Date(), 1), "yyyy-MM-dd");
      setSelectedDate(y);
      setSelectedDateEnd(y);
      setEntryDate(y);
    } else if (p === "this-week") {
      const ws = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      setSelectedDate(ws);
      setSelectedDateEnd(t);
      setEntryDate(t);
    } else if (p === "this-month") {
      const ms = format(startOfMonth(new Date()), "yyyy-MM-dd");
      setSelectedDate(ms);
      setSelectedDateEnd(t);
      setEntryDate(t);
    }
    setDatePresetState(p);
  }, []);

  const setCustomDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedDateEnd(date);
    setEntryDate(date);
    setDatePresetState("custom");
  }, []);

  return (
    <AppContext.Provider
      value={{
        selectedDate,
        selectedDateEnd,
        datePreset,
        entryDate,
        setDatePreset,
        setCustomDate,
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
        creEntries,
        addCREEntry,
        customerMovements,
        addCustomerMovement,
        rdList,
        addRD,
        updateRDStatus,
        rdPayments,
        addRDPayment,
        schemes,
        addScheme,
        customReferrers,
        addCustomReferrer,
        customerAccounts,
        addCustomerAccount,
        masterLists,
        addToMasterList,
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
