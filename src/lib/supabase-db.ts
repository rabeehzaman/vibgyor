import { getSupabase } from "./supabase";
import {
  CustomerVisit,
  LoanEnquiry,
  LoanBooking,
  LoanRepayment,
  FundTransfer,
  Beneficiary,
  CashierRecord,
  DailyCashierState,
  CREDailyEntry,
  CustomerMovement,
  RecurringDeposit,
  RDPayment,
  Scheme,
  CustomReferrer,
  CustomerAccount,
  MasterLists,
  Ticket,
  TicketReply,
  BankAccount,
  DailyBankBookState,
  ProfitReport,
} from "./types";
import { customerVisits as seedVisits } from "@/data/customer-visits";
import { loanEnquiries as seedLoans } from "@/data/loan-enquiries";
import { fundTransfers as seedTransfers } from "@/data/fund-transfers";
import { beneficiaries as seedBeneficiaries } from "@/data/beneficiaries";
import { cashierRecords as seedCashier } from "@/data/cashier-records";
import { creDailyEntries as seedCREEntries } from "@/data/cre-daily-entries";
import { customerMovements as seedMovements } from "@/data/customer-movements";
import { rdList as seedRDList } from "@/data/rd-list";
import { schemes as seedSchemes } from "@/data/schemes";
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
} from "./constants";

// ─── CASE CONVERSION ────────────────────────────

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[camelToSnake(k)] = v;
  return out;
}

function toCamel<T>(obj: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[snakeToCamel(k)] = v;
  return out as T;
}

// ─── GENERIC HELPERS ─────────────────────────────

async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await getSupabase().from(table).select("*");
  if (error) {
    console.error(`[supabase] fetch ${table}:`, error.message);
    return [];
  }
  return (data || []).map((row) => toCamel<T>(row));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asRecord(obj: any): Record<string, unknown> { return obj as Record<string, unknown>; }

async function insertOne<T>(table: string, row: T): Promise<void> {
  const { error } = await getSupabase().from(table).insert(toSnake(asRecord(row)));
  if (error) console.error(`[supabase] insert ${table}:`, error.message);
}

async function upsertOne<T>(table: string, row: T): Promise<void> {
  const { error } = await getSupabase().from(table).upsert(toSnake(asRecord(row)));
  if (error) console.error(`[supabase] upsert ${table}:`, error.message);
}

async function updateById(table: string, id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabase().from(table).update(toSnake(updates)).eq("id", id);
  if (error) console.error(`[supabase] update ${table}:`, error.message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function bulkInsert(table: string, rows: any[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await getSupabase().from(table).upsert(
    rows.map((r) => toSnake(asRecord(r))),
    { ignoreDuplicates: true }
  );
  if (error) console.error(`[supabase] bulk ${table}:`, error.message);
}

// ─── ENTITY OPERATIONS ──────────────────────────

// Customer Visits
export const insertCustomerVisit = (v: CustomerVisit) => insertOne("customer_visits", v);

// Loan Enquiries
export const insertLoanEnquiry = (e: LoanEnquiry) => insertOne("loan_enquiries", e);
export const updateLoanEnquiry = (id: string, u: Partial<LoanEnquiry>) => updateById("loan_enquiries", id, asRecord(u));

// Loan Bookings
export const insertLoanBooking = (b: LoanBooking) => insertOne("loan_bookings", b);

// Loan Repayments — upsert by (loanBookingId, period)
export async function upsertLoanRepayment(payment: LoanRepayment) {
  await getSupabase()
    .from("loan_repayments")
    .delete()
    .match({ loan_booking_id: payment.loanBookingId, period: payment.period });
  await insertOne("loan_repayments", payment);
}

// Fund Transfers
export const insertFundTransfer = (t: FundTransfer) => insertOne("fund_transfers", t);
export const updateFundTransfer = (id: string, u: Partial<FundTransfer>) => updateById("fund_transfers", id, asRecord(u));

// Beneficiaries
export const insertBeneficiary = (b: Beneficiary) => insertOne("beneficiaries", b);

// Cashier Records (legacy)
export const upsertCashierRecord = (r: CashierRecord) => upsertOne("cashier_records", r);

// Daily Cashier States
export const upsertDailyCashierState = (s: DailyCashierState) => upsertOne("daily_cashier_states", s);
export async function deleteDailyCashierState(id: string) {
  const { error } = await getSupabase().from("daily_cashier_states").delete().eq("id", id);
  if (error) console.error("[supabase] delete daily_cashier_states:", error.message);
}

// CRE Entries
export const insertCREEntry = (e: CREDailyEntry) => insertOne("cre_entries", e);

// Customer Movements
export const insertCustomerMovement = (m: CustomerMovement) => insertOne("customer_movements", m);

// Recurring Deposits
export const insertRD = (rd: RecurringDeposit) => insertOne("recurring_deposits", rd);
export const updateRD = (id: string, u: Partial<RecurringDeposit>) => updateById("recurring_deposits", id, asRecord(u));

// RD Payments — upsert by (rdId, period)
export async function upsertRDPayment(payment: RDPayment) {
  await getSupabase()
    .from("rd_payments")
    .delete()
    .match({ rd_id: payment.rdId, period: payment.period });
  await insertOne("rd_payments", payment);
}

// Schemes
export const insertScheme = (s: Scheme) => insertOne("schemes", s);

// Custom Referrers
export const insertCustomReferrer = (r: CustomReferrer) => insertOne("custom_referrers", r);

// Customer Accounts
export const insertCustomerAccount = (a: CustomerAccount) => insertOne("customer_accounts", a);

// Master Lists (single-row table, id=1)
export async function fetchMasterLists(): Promise<MasterLists | null> {
  const { data, error } = await getSupabase().from("master_lists").select("*").eq("id", 1).single();
  if (error || !data) return null;
  const camelData = toCamel<Record<string, unknown>>(data);
  // Remove the 'id' column — not part of MasterLists
  delete camelData.id;
  return camelData as unknown as MasterLists;
}

export async function upsertMasterLists(lists: MasterLists) {
  const row = { id: 1, ...toSnake(asRecord(lists)) };
  const { error } = await getSupabase().from("master_lists").upsert(row);
  if (error) console.error("[supabase] upsert master_lists:", error.message);
}

// Tickets (replies in separate table)
export async function fetchTickets(): Promise<Ticket[]> {
  const [ticketRes, replyRes] = await Promise.all([
    getSupabase().from("tickets").select("*"),
    getSupabase().from("ticket_replies").select("*"),
  ]);
  if (ticketRes.error) {
    console.error("[supabase] fetch tickets:", ticketRes.error.message);
    return [];
  }
  const replies = (replyRes.data || []).map((r) => toCamel<TicketReply>(r));
  const repliesByTicket = new Map<string, TicketReply[]>();
  for (const r of replies) {
    const list = repliesByTicket.get(r.ticketId) || [];
    list.push(r);
    repliesByTicket.set(r.ticketId, list);
  }
  return (ticketRes.data || []).map((row) => {
    const t = toCamel<Ticket>(row);
    t.replies = repliesByTicket.get(t.id) || [];
    return t;
  });
}

export async function insertTicket(ticket: Ticket) {
  const { replies: _replies, ...data } = ticket;
  void _replies;
  await insertOne("tickets", data);
}

export const insertTicketReply = (r: TicketReply) => insertOne("ticket_replies", r);
export const updateTicket = (id: string, u: Record<string, unknown>) => updateById("tickets", id, u);

// Bank Accounts
export const insertBankAccount = (a: BankAccount) => insertOne("bank_accounts", a);
export const updateBankAccount = (id: string, u: Partial<BankAccount>) => updateById("bank_accounts", id, asRecord(u));
export async function deleteBankAccount(id: string) {
  const { error } = await getSupabase().from("bank_accounts").delete().eq("id", id);
  if (error) console.error("[supabase] delete bank_accounts:", error.message);
}

// Daily Bank Book States
export const upsertDailyBankBookState = (s: DailyBankBookState) => upsertOne("daily_bank_book_states", s);

// Profit Reports
export const upsertProfitReport = (r: ProfitReport) => upsertOne("profit_reports", r);

// ─── DEFAULT MASTER LISTS ────────────────────────

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

// ─── SEED + LOAD ALL ─────────────────────────────

async function seedIfEmpty(): Promise<boolean> {
  const { count } = await getSupabase()
    .from("schemes")
    .select("*", { count: "exact", head: true });
  if (count && count > 0) return false;

  await Promise.all([
    bulkInsert("customer_visits", seedVisits),
    bulkInsert("loan_enquiries", seedLoans),
    bulkInsert("fund_transfers", seedTransfers),
    bulkInsert("beneficiaries", seedBeneficiaries),
    bulkInsert("cashier_records", seedCashier),
    bulkInsert("cre_entries", seedCREEntries),
    bulkInsert("customer_movements", seedMovements),
    bulkInsert("recurring_deposits", seedRDList),
    bulkInsert("schemes", seedSchemes),
    upsertMasterLists(DEFAULT_MASTER_LISTS),
  ]);
  return true;
}

export async function loadAllData() {
  await seedIfEmpty();

  const [
    customerVisits,
    loanEnquiries,
    loanBookings,
    loanRepayments,
    fundTransfers,
    beneficiaries,
    cashierRecords,
    dailyCashierStates,
    creEntries,
    customerMovements,
    rdList,
    rdPayments,
    schemes,
    customReferrers,
    customerAccounts,
    masterListsRow,
    tickets,
    bankAccounts,
    dailyBankBookStates,
    profitReports,
  ] = await Promise.all([
    fetchAll<CustomerVisit>("customer_visits"),
    fetchAll<LoanEnquiry>("loan_enquiries"),
    fetchAll<LoanBooking>("loan_bookings"),
    fetchAll<LoanRepayment>("loan_repayments"),
    fetchAll<FundTransfer>("fund_transfers"),
    fetchAll<Beneficiary>("beneficiaries"),
    fetchAll<CashierRecord>("cashier_records"),
    fetchAll<DailyCashierState>("daily_cashier_states"),
    fetchAll<CREDailyEntry>("cre_entries"),
    fetchAll<CustomerMovement>("customer_movements"),
    fetchAll<RecurringDeposit>("recurring_deposits"),
    fetchAll<RDPayment>("rd_payments"),
    fetchAll<Scheme>("schemes"),
    fetchAll<CustomReferrer>("custom_referrers"),
    fetchAll<CustomerAccount>("customer_accounts"),
    fetchMasterLists(),
    fetchTickets(),
    fetchAll<BankAccount>("bank_accounts"),
    fetchAll<DailyBankBookState>("daily_bank_book_states"),
    fetchAll<ProfitReport>("profit_reports"),
  ]);

  return {
    customerVisits,
    loanEnquiries,
    loanBookings,
    loanRepayments,
    fundTransfers,
    beneficiaries,
    cashierRecords,
    dailyCashierStates,
    creEntries,
    customerMovements,
    rdList,
    rdPayments,
    schemes,
    customReferrers,
    customerAccounts,
    masterLists: masterListsRow || DEFAULT_MASTER_LISTS,
    tickets,
    bankAccounts,
    dailyBankBookStates,
    profitReports,
  };
}
