"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";

export type DatePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom";
import {
  CustomerVisit,
  LoanEnquiry,
  LoanBooking,
  LoanRepayment,
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
  DailyCashierState,
  CashTransaction,
  LockerRecord,
  LooseRecord,
  StaffShortage,
  StaffAdvance,
  Ticket,
  TicketReply,
  TicketStatus,
  BankAccount,
  DailyBankBookState,
  ProfitReport,
} from "@/lib/types";
import {
  recalcDayBook,
  calcLockerBundleTotal,
  calcLockerClosing,
  calcNoteTotal,
  calcCoinTotal,
} from "@/lib/cashier-utils";
import * as db from "@/lib/supabase-db";
import { dailyReports as initialReports } from "@/data/daily-reports";

interface AppState {
  isLoading: boolean;
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
  loanBookings: LoanBooking[];
  addLoanBooking: (booking: LoanBooking) => void;
  loanRepayments: LoanRepayment[];
  addLoanRepayment: (repayment: LoanRepayment) => void;
  fundTransfers: FundTransfer[];
  addFundTransfer: (transfer: FundTransfer) => void;
  updateTransferStatus: (id: string, status: FundTransfer["status"]) => void;
  beneficiaries: Beneficiary[];
  addBeneficiary: (beneficiary: Beneficiary) => void;
  cashierRecords: CashierRecord[];
  updateCashierRecord: (record: CashierRecord) => void;
  // Cashier V2
  dailyCashierStates: DailyCashierState[];
  saveDailyCashierState: (state: DailyCashierState) => void;
  getDailyCashierState: (date: string) => DailyCashierState | undefined;
  addCashTransaction: (date: string, txn: CashTransaction) => void;
  removeCashTransaction: (date: string, txnId: string) => void;
  updateLockerRecord: (date: string, locker: LockerRecord) => void;
  updateLooseRecord: (date: string, loose: LooseRecord) => void;
  addStaffShortage: (date: string, shortage: StaffShortage) => void;
  removeStaffShortage: (date: string, shortageId: string) => void;
  addStaffAdvance: (date: string, advance: StaffAdvance) => void;
  removeStaffAdvance: (date: string, advanceId: string) => void;
  closeCashierDay: (date: string, closedBy?: string) => void;
  reopenCashierDay: (date: string) => void;
  deleteCashierDay: (date: string) => void;
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
  // Tickets
  tickets: Ticket[];
  addTicket: (ticket: Ticket) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  assignTicket: (id: string, staffId: string, staffName: string) => void;
  addTicketReply: (ticketId: string, reply: TicketReply) => void;
  getTicketByReference: (ref: string) => Ticket | undefined;
  // Bank Book
  bankAccounts: BankAccount[];
  addBankAccount: (account: BankAccount) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  removeBankAccount: (id: string) => void;
  dailyBankBookStates: DailyBankBookState[];
  saveDailyBankBookState: (state: DailyBankBookState) => void;
  // Net Profit
  profitReports: ProfitReport[];
  saveProfitReport: (report: ProfitReport) => void;
}

const AppContext = createContext<AppState | null>(null);

const DEFAULT_MASTER_LISTS: MasterLists = {
  membershipPlans: ["600", "300"],
  membershipProducts: ["SD", "DD", "RD", "FD", "KUTTI NIDHI"],
  ddTypes: ["Free DD", "DDL", "SDD"],
  collectionAreas: ["KOOTTILANGADI-M", "KONDOTTY", "WANDOOR", "MALAPPURAM"],
  tenureOptions: ["6 months", "12 months", "24 months", "36 months", "60 months"],
  migrationTypes: ["Migration", "KML", "NIDHI"],
  customerNeeds: ["RD Enquiry", "FD Renewal", "Loan Query", "Account Opening", "General Enquiry", "Complaint", "Other"],
  fdTypes: ["FD", "BSFD"],
  loanSchemeCodes: ["BSL", "EMI", "RSL", "PRL", "GOLD PRL"],
};

function todayStr() { return format(new Date(), "yyyy-MM-dd"); }
function monthStartStr() { return format(startOfMonth(new Date()), "yyyy-MM-dd"); }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(monthStartStr);
  const [selectedDateEnd, setSelectedDateEnd] = useState(todayStr);
  const [datePreset, setDatePresetState] = useState<DatePreset>("this-month");
  const [entryDate, setEntryDate] = useState(todayStr);
  const [dailyReports] = useState<DailyReportRow[]>(initialReports);
  const [customerVisits, setCustomerVisits] = useState<CustomerVisit[]>([]);
  const [loanEnquiries, setLoanEnquiries] = useState<LoanEnquiry[]>([]);
  const [loanBookings, setLoanBookings] = useState<LoanBooking[]>([]);
  const [loanRepayments, setLoanRepayments] = useState<LoanRepayment[]>([]);
  const [fundTransfers, setFundTransfers] = useState<FundTransfer[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [cashierRecords, setCashierRecords] = useState<CashierRecord[]>([]);
  const [dailyCashierStates, setDailyCashierStates] = useState<DailyCashierState[]>([]);
  const [creEntries, setCREEntries] = useState<CREDailyEntry[]>([]);
  const [customerMovements, setCustomerMovements] = useState<CustomerMovement[]>([]);
  const [rdList, setRDList] = useState<RecurringDeposit[]>([]);
  const [rdPayments, setRDPayments] = useState<RDPayment[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [customReferrers, setCustomReferrers] = useState<CustomReferrer[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);
  const [masterLists, setMasterLists] = useState<MasterLists>(DEFAULT_MASTER_LISTS);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [dailyBankBookStates, setDailyBankBookStates] = useState<DailyBankBookState[]>([]);
  const [profitReports, setProfitReports] = useState<ProfitReport[]>([]);

  // ─── Load all data from Supabase on mount ─────
  useEffect(() => {
    db.loadAllData()
      .then((data) => {
        setCustomerVisits(data.customerVisits);
        setLoanEnquiries(data.loanEnquiries);
        setLoanBookings(data.loanBookings);
        setLoanRepayments(data.loanRepayments);
        setFundTransfers(data.fundTransfers);
        setBeneficiaries(data.beneficiaries);
        setCashierRecords(data.cashierRecords);
        setDailyCashierStates(data.dailyCashierStates);
        setCREEntries(data.creEntries);
        setCustomerMovements(data.customerMovements);
        setRDList(data.rdList);
        setRDPayments(data.rdPayments);
        setSchemes(data.schemes);
        setCustomReferrers(data.customReferrers);
        setCustomerAccounts(data.customerAccounts);
        setMasterLists(data.masterLists);
        setTickets(data.tickets);
        setBankAccounts(data.bankAccounts);
        setDailyBankBookStates(data.dailyBankBookStates);
        setProfitReports(data.profitReports);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[supabase] Failed to load data:", err);
        setIsLoading(false);
      });
  }, []);

  // ─── Mutations (update local state + persist to Supabase) ─────

  const addCustomerVisit = useCallback((visit: CustomerVisit) => {
    setCustomerVisits((prev) => [...prev, visit]);
    db.insertCustomerVisit(visit);
  }, []);

  const addLoanEnquiry = useCallback((enquiry: LoanEnquiry) => {
    setLoanEnquiries((prev) => [...prev, enquiry]);
    db.insertLoanEnquiry(enquiry);
  }, []);

  const updateLoanStatus = useCallback((id: string, status: LoanEnquiry["status"]) => {
    setLoanEnquiries((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    db.updateLoanEnquiry(id, { status });
  }, []);

  const addLoanBooking = useCallback((booking: LoanBooking) => {
    setLoanBookings((prev) => [...prev, booking]);
    db.insertLoanBooking(booking);
  }, []);

  const addLoanRepayment = useCallback((payment: LoanRepayment) => {
    setLoanRepayments((prev) => {
      const idx = prev.findIndex((p) => p.loanBookingId === payment.loanBookingId && p.period === payment.period);
      if (idx >= 0) { const next = [...prev]; next[idx] = payment; return next; }
      return [...prev, payment];
    });
    db.upsertLoanRepayment(payment);
  }, []);

  const addFundTransfer = useCallback((transfer: FundTransfer) => {
    setFundTransfers((prev) => [...prev, transfer]);
    db.insertFundTransfer(transfer);
  }, []);

  const updateTransferStatus = useCallback((id: string, status: FundTransfer["status"]) => {
    setFundTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    db.updateFundTransfer(id, { status });
  }, []);

  const addBeneficiary = useCallback((beneficiary: Beneficiary) => {
    setBeneficiaries((prev) => [...prev, beneficiary]);
    db.insertBeneficiary(beneficiary);
  }, []);

  const updateCashierRecord = useCallback((record: CashierRecord) => {
    setCashierRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === record.date);
      if (idx >= 0) { const next = [...prev]; next[idx] = record; return next; }
      return [...prev, record];
    });
    db.upsertCashierRecord(record);
  }, []);

  // ─── Cashier V2 Actions ─────────────────────
  const saveDailyCashierState = useCallback((state: DailyCashierState) => {
    setDailyCashierStates((prev) => {
      const idx = prev.findIndex((s) => s.date === state.date);
      if (idx >= 0) { const next = [...prev]; next[idx] = state; return next; }
      return [...prev, state];
    });
    db.upsertDailyCashierState(state);
  }, []);

  const getDailyCashierState = useCallback((date: string): DailyCashierState | undefined => {
    return dailyCashierStates.find((s) => s.date === date);
  }, [dailyCashierStates]);

  const addCashTransaction = useCallback((date: string, txn: CashTransaction) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, dayBook: recalcDayBook({ ...s.dayBook, transactions: [...s.dayBook.transactions, txn] }) };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const removeCashTransaction = useCallback((date: string, txnId: string) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, dayBook: recalcDayBook({ ...s.dayBook, transactions: s.dayBook.transactions.filter((t) => t.id !== txnId) }) };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const updateLockerRecord = useCallback((date: string, locker: LockerRecord) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        const closing = calcLockerClosing(locker.openingDenominations, locker.deposited, locker.withdrawn);
        const updatedLocker: LockerRecord = {
          ...locker,
          closingDenominations: closing,
          openingTotal: calcLockerBundleTotal(locker.openingDenominations),
          depositedTotal: calcLockerBundleTotal(locker.deposited),
          withdrawnTotal: calcLockerBundleTotal(locker.withdrawn),
          closingTotal: calcLockerBundleTotal(closing),
        };
        return { ...s, locker: updatedLocker };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const updateLooseRecord = useCallback((date: string, loose: LooseRecord) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        const updatedLoose: LooseRecord = {
          ...loose,
          notesTotal: calcNoteTotal(loose.noteDenominations),
          coinsTotal: calcCoinTotal(loose.coinDenominations),
          grandTotal: calcNoteTotal(loose.noteDenominations) + calcCoinTotal(loose.coinDenominations),
        };
        return { ...s, loose: updatedLoose };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const addStaffShortage = useCallback((date: string, shortage: StaffShortage) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, reconciliation: { ...s.reconciliation, staffShortages: [...s.reconciliation.staffShortages, shortage] } };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const removeStaffShortage = useCallback((date: string, shortageId: string) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, reconciliation: { ...s.reconciliation, staffShortages: s.reconciliation.staffShortages.filter((sh) => sh.id !== shortageId) } };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const addStaffAdvance = useCallback((date: string, advance: StaffAdvance) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, staffAdvances: [...s.staffAdvances, advance] };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const removeStaffAdvance = useCallback((date: string, advanceId: string) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, staffAdvances: s.staffAdvances.filter((a) => a.id !== advanceId) };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const closeCashierDay = useCallback((date: string, closedBy?: string) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, status: "closed" as const, closedAt: new Date().toISOString(), closedBy: closedBy ?? "CASHIER" };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const reopenCashierDay = useCallback((date: string) => {
    setDailyCashierStates((prev) => {
      const next = prev.map((s) => {
        if (s.date !== date) return s;
        return { ...s, status: "draft" as const, reopenedAt: new Date().toISOString() };
      });
      const changed = next.find((s) => s.date === date);
      if (changed) db.upsertDailyCashierState(changed);
      return next;
    });
  }, []);

  const deleteCashierDay = useCallback((date: string) => {
    setDailyCashierStates((prev) => {
      const target = prev.find((s) => s.date === date);
      if (target) db.deleteDailyCashierState(target.id);
      return prev.filter((s) => s.date !== date);
    });
  }, []);

  const addCREEntry = useCallback((entry: CREDailyEntry) => {
    setCREEntries((prev) => [...prev, entry]);
    db.insertCREEntry(entry);
    if (entry.category === "NewRD" && entry.customerName) {
      const newRD: RecurringDeposit = {
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
      };
      setRDList((prev) => [...prev, newRD]);
      db.insertRD(newRD);
    }
  }, []);

  const addCustomerMovement = useCallback((m: CustomerMovement) => {
    setCustomerMovements((prev) => [...prev, m]);
    db.insertCustomerMovement(m);
  }, []);

  const addRD = useCallback((rd: RecurringDeposit) => {
    setRDList((prev) => [...prev, rd]);
    db.insertRD(rd);
  }, []);

  const updateRDStatus = useCallback((id: string, status: RecurringDeposit["status"]) => {
    setRDList((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    db.updateRD(id, { status });
  }, []);

  const addRDPayment = useCallback((payment: RDPayment) => {
    setRDPayments((prev) => {
      const idx = prev.findIndex((p) => p.rdId === payment.rdId && p.period === payment.period);
      if (idx >= 0) { const next = [...prev]; next[idx] = payment; return next; }
      return [...prev, payment];
    });
    db.upsertRDPayment(payment);
  }, []);

  const addScheme = useCallback((scheme: Scheme) => {
    setSchemes((prev) => [...prev, scheme]);
    db.insertScheme(scheme);
  }, []);

  const addCustomReferrer = useCallback((r: CustomReferrer) => {
    setCustomReferrers((prev) => [...prev, r]);
    db.insertCustomReferrer(r);
  }, []);

  const addCustomerAccount = useCallback((a: CustomerAccount) => {
    setCustomerAccounts((prev) => [...prev, a]);
    db.insertCustomerAccount(a);
  }, []);

  const addToMasterList = useCallback((key: keyof MasterLists, value: string) => {
    setMasterLists((prev) => {
      const next = { ...prev, [key]: [...prev[key], value] };
      db.upsertMasterLists(next);
      return next;
    });
  }, []);

  // ─── Bank Book Actions ────────────────────────
  const addBankAccount = useCallback((account: BankAccount) => {
    setBankAccounts((prev) => [...prev, account]);
    db.insertBankAccount(account);
  }, []);

  const updateBankAccountFn = useCallback((id: string, updates: Partial<BankAccount>) => {
    setBankAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    db.updateBankAccount(id, updates);
  }, []);

  const removeBankAccount = useCallback((id: string) => {
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
    db.deleteBankAccount(id);
  }, []);

  const saveDailyBankBookState = useCallback((state: DailyBankBookState) => {
    setDailyBankBookStates((prev) => {
      const idx = prev.findIndex((s) => s.date === state.date && s.bankAccountId === state.bankAccountId);
      if (idx >= 0) { const next = [...prev]; next[idx] = state; return next; }
      return [...prev, state];
    });
    db.upsertDailyBankBookState(state);
  }, []);

  const saveProfitReport = useCallback((report: ProfitReport) => {
    setProfitReports((prev) => {
      const idx = prev.findIndex((r) => r.period === report.period && r.periodType === report.periodType);
      if (idx >= 0) { const next = [...prev]; next[idx] = report; return next; }
      return [...prev, report];
    });
    db.upsertProfitReport(report);
  }, []);

  // ─── Auto-refresh tickets every 15s ────────────
  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await db.fetchTickets();
        setTickets(fresh);
      } catch (err) {
        console.error("[supabase] ticket poll error:", err);
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // ─── Ticket Actions ───────────────────────────
  const addTicket = useCallback((ticket: Ticket) => {
    setTickets((prev) => [...prev, ticket]);
    db.insertTicket(ticket);
  }, []);

  const updateTicketStatus = useCallback((id: string, status: TicketStatus) => {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status, updatedAt: now };
    if (status === "Resolved") updates.resolvedAt = now;
    if (status === "Closed") updates.closedAt = now;
    setTickets((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      return { ...t, ...updates } as Ticket;
    }));
    db.updateTicket(id, updates);
  }, []);

  const assignTicket = useCallback((id: string, staffId: string, staffName: string) => {
    const now = new Date().toISOString();
    setTickets((prev) => prev.map((t) =>
      t.id === id ? { ...t, assignedTo: staffId, assignedToName: staffName, updatedAt: now } : t
    ));
    db.updateTicket(id, { assignedTo: staffId, assignedToName: staffName, updatedAt: now });
  }, []);

  const addTicketReply = useCallback((ticketId: string, reply: TicketReply) => {
    const now = new Date().toISOString();
    setTickets((prev) => prev.map((t) =>
      t.id === ticketId ? { ...t, replies: [...t.replies, reply], updatedAt: now } : t
    ));
    db.insertTicketReply(reply);
    db.updateTicket(ticketId, { updatedAt: now });
  }, []);

  const getTicketByReference = useCallback((ref: string): Ticket | undefined => {
    return tickets.find((t) => t.referenceNumber === ref);
  }, [tickets]);

  const setDatePreset = useCallback((p: Exclude<DatePreset, "custom">) => {
    const t = todayStr();
    if (p === "today") {
      setSelectedDate(t); setSelectedDateEnd(t); setEntryDate(t);
    } else if (p === "yesterday") {
      const y = format(subDays(new Date(), 1), "yyyy-MM-dd");
      setSelectedDate(y); setSelectedDateEnd(y); setEntryDate(y);
    } else if (p === "this-week") {
      setSelectedDate(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
      setSelectedDateEnd(t); setEntryDate(t);
    } else if (p === "this-month") {
      setSelectedDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
      setSelectedDateEnd(t); setEntryDate(t);
    }
    setDatePresetState(p);
  }, []);

  const setCustomDate = useCallback((date: string) => {
    setSelectedDate(date); setSelectedDateEnd(date); setEntryDate(date);
    setDatePresetState("custom");
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        selectedDate, selectedDateEnd, datePreset, entryDate,
        setDatePreset, setCustomDate,
        dailyReports, customerVisits, addCustomerVisit,
        loanEnquiries, addLoanEnquiry, updateLoanStatus,
        loanBookings, addLoanBooking,
        loanRepayments, addLoanRepayment,
        fundTransfers, addFundTransfer, updateTransferStatus,
        beneficiaries, addBeneficiary,
        cashierRecords, updateCashierRecord,
        dailyCashierStates, saveDailyCashierState, getDailyCashierState,
        addCashTransaction, removeCashTransaction,
        updateLockerRecord, updateLooseRecord,
        addStaffShortage, removeStaffShortage,
        addStaffAdvance, removeStaffAdvance, closeCashierDay, reopenCashierDay, deleteCashierDay,
        creEntries, addCREEntry,
        customerMovements, addCustomerMovement,
        rdList, addRD, updateRDStatus,
        rdPayments, addRDPayment,
        schemes, addScheme,
        customReferrers, addCustomReferrer,
        customerAccounts, addCustomerAccount,
        masterLists, addToMasterList,
        tickets, addTicket, updateTicketStatus, assignTicket, addTicketReply, getTicketByReference,
        bankAccounts, addBankAccount, updateBankAccount: updateBankAccountFn, removeBankAccount,
        dailyBankBookStates, saveDailyBankBookState,
        profitReports, saveProfitReport,
      }}
    >
      {isLoading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
