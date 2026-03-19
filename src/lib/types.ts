export interface StaffMember {
  id: string;
  name: string;
  department: Department;
}

export type Department = "CRE" | "LPO" | "ABM" | "CASHIER" | "ACCOUNTANT";

export interface DailyReportRow {
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  membershipNew: number;
  membershipRenew: number;
  bank: number;
  fdNew: number;
  fdRenew: number;
  rdCountFresh: number;
  rdNew: number;
  rdRenew: number;
  loanRdWithMb: number;
  loanFdWithMb: number;
  loanLoan: number;
}

export type DepositType = "RD" | "FD" | "Daily" | "Saving";
export type DepositAction = "New" | "Renew";

export interface CustomerVisit {
  id: string;
  date: string;
  customerName: string;
  staffId: string;
  staffName: string;
  depositType: DepositType;
  action: DepositAction;
  amount: number;
}

export type LoanType = "Secured" | "Business" | "Property" | "Personal" | "Vehicle";
export type LoanStatus = "Under Process" | "Passed" | "Rejected";
export type ProfitMethod = "Flat" | "Diminishing";
export type LoanSource = "Online" | "Direct to Office" | "WhatsApp" | "Others";

export interface LoanEnquiry {
  id: string;
  date: string;
  customerName: string;
  entryCode: string;
  source: LoanSource;
  purpose: string;
  loanType: LoanType;
  amount: number;
  durationMonths: number;
  profitMethod: ProfitMethod;
  profitRatio: number;
  loanScheme: string;
  staffId: string;
  staffName: string;
  status: LoanStatus;
}

export interface LoanBooking {
  id: string;
  date: string;
  customerName: string;
  startDate: string;
  endDate: string;
  fullLoanAmount: number;
  emiAmount: number;
  tenure: string;
  loanScheme: string;
  careOfId: string;
  careOfName: string;
  status: "Active" | "Closed";
}

export interface LoanRepayment {
  id: string;
  loanBookingId: string;
  period: string; // "YYYY-MM"
  amountPaid: number;
  paidDate: string;
  collectedBy: string;
  collectedByName: string;
  remarks?: string;
}

// ─── LEGACY (kept for backward compat) ─────
export interface CashierRecord {
  id: string;
  date: string;
  openingBalance: number;
  depositReceived: number;
  cashOut: number;
  closingBalance: number;
  denominations: DenominationBreakdown;
}

export interface DenominationBreakdown {
  [key: string]: number; // denomination -> count
}

// ─── CASHIER V2: FULL CASH MANAGEMENT ───────
export type DenominationValue = 2000 | 500 | 200 | 100 | 50 | 20 | 10 | 5 | 2 | 1;

export interface DenominationCount {
  denomination: DenominationValue;
  noteCount: number;
  coinCount: number; // relevant for 10, 5, 2, 1
}

export interface CashTransaction {
  id: string;
  date: string;
  type: "receipt" | "payment";
  amount: number;
  description?: string;
  timestamp: string;
}

export interface DayBookRecord {
  id: string;
  date: string;
  openingBalance: number;
  transactions: CashTransaction[];
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  systemClosingBalance?: number;
}

export interface LockerRecord {
  id: string;
  date: string;
  openingDenominations: DenominationCount[];
  deposited: DenominationCount[];
  withdrawn: DenominationCount[];
  closingDenominations: DenominationCount[];
  openingTotal: number;
  depositedTotal: number;
  withdrawnTotal: number;
  closingTotal: number;
}

export interface LooseRecord {
  id: string;
  date: string;
  noteDenominations: DenominationCount[];
  coinDenominations: DenominationCount[];
  notesTotal: number;
  coinsTotal: number;
  grandTotal: number;
}

export interface ReconciliationRecord {
  id: string;
  date: string;
  dayBookClosing: number;
  lockerTotal: number;
  looseTotal: number;
  physicalTotal: number;
  systemClosing: number;
  difference: number;
  excessAmount: number;
  shortAmount: number;
  staffShortages: StaffShortage[];
  isReconciled: boolean;
}

export interface StaffShortage {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason?: string;
}

export interface StaffAdvance {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  category: string;
  amount: number;
  remarks?: string;
}

export interface DailyCashierState {
  id: string;
  date: string;
  dayBook: DayBookRecord;
  locker: LockerRecord;
  loose: LooseRecord;
  reconciliation: ReconciliationRecord;
  staffAdvances: StaffAdvance[];
  status: "draft" | "reconciled" | "closed";
}

// ─── BANK BOOK (Accountant) ─────────────────
export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
}

export type PendingItemStatus = "pending" | "verified" | "suspense";

export interface BankBookTransaction {
  id: string;
  date: string;
  type: "receipt" | "payment";
  amount: number;
  description?: string;
  timestamp: string;
}

export interface PendingItem {
  id: string;
  date: string;
  amount: number;
  narration: string;
  status: PendingItemStatus;
  verifiedDate?: string;
  suspenseDate?: string;
  timestamp: string;
}

export interface BankBookRecord {
  id: string;
  date: string;
  openingBalance: number;
  transactions: BankBookTransaction[];
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  settlementBalance?: number;
}

export interface DailyBankBookState {
  id: string;
  date: string;
  bankAccountId: string;
  bankBook: BankBookRecord;
  pendingItems: PendingItem[];
  status: "draft" | "reconciled" | "closed";
}

export type TransferStatus = "Pending" | "Processed" | "Done";

export interface FundTransfer {
  id: string;
  date: string;
  beneficiaryId: string;
  beneficiaryName: string;
  amount: number;
  purpose: string;
  status: TransferStatus;
  staffId: string;
  staffName: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  ifscCode: string;
  accountNumber: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Planned" | "Completed";
  startDate: string;
  endDate: string;
  target: number;
  achieved: number;
}

export interface RDPayment {
  id: string;
  rdId: string;
  period: string;           // "YYYY-MM" e.g. "2026-02"
  amount: number;
  paidDate: string;         // "YYYY-MM-DD"
  collectedBy: string;      // staffId
  collectedByName: string;
  remarks?: string;
}

export interface CREDailyEntry {
  id: string;
  date: string;
  category: "NewMembership" | "NewDailyDeposit" | "NewRD" | "NewFD" | "AMC";
  accountNumber: string;
  referredBy: string;
  // NewMembership
  plan?: "600" | "300";
  product?: "SD" | "DD" | "RD" | "FD" | "KUTTI NIDHI";
  // NewDailyDeposit
  ddType?: string;
  collectionArea?: string;
  // RD / FD / Loan shared
  amount?: number;
  tenure?: string;
  freshRenewal?: "Fresh" | "Renewal";
  scheme?: string;
  // FD-specific
  bankCash?: "Bank" | "Cash";
  fdType?: "FD" | "BSFD";
  // Loan-specific
  profitType?: "Flat" | "Diminishing";
  profitRate?: number;
  loanScheme?: string;
  migration?: string;
  // NewRD sync fields (used to auto-create a RecurringDeposit)
  customerName?: string;
  mobileNumber?: string;
  staffId?: string;
  staffName?: string;
}

export interface CustomerMovement {
  id: string;
  date: string;
  customerName: string;
  mobileNumber: string;
  need: string;
  treatedBy: string;
  remarks: string;
  verifiedBy: string;
}

export interface RecurringDeposit {
  id: string;
  accountNumber: string;
  customerName: string;
  mobileNumber: string;
  amount: number;
  tenure: string;
  freshRenewal: "Fresh" | "Renewal";
  scheme: string;
  startDate: string;
  staffId: string;
  staffName: string;
  status: "Active" | "Completed" | "Closed";
}

export interface Scheme {
  id: string;
  name: string;
  type: "RD" | "FD" | "Loan" | "Membership";
}

export interface CustomReferrer {
  id: string;
  name: string;
}

export interface CustomerAccount {
  id: string;
  accountNumber: string;
  customerName: string;
}

export interface MasterLists {
  membershipPlans: string[];
  membershipProducts: string[];
  ddTypes: string[];
  collectionAreas: string[];
  tenureOptions: string[];
  migrationTypes: string[];
  customerNeeds: string[];
  fdTypes: string[];
  loanSchemeCodes: string[];
}

// ─── TICKET SYSTEM ──────────────────────────
export type TicketType =
  | "BalanceEnquiry"
  | "TransferRequest"
  | "ChequeBookRequest"
  | "PassbookRequest"
  | "DDBookRequest"
  | "MobileNumberChange"
  | "AccountDetails"
  | "CurrentMobileNumber"
  | "Complaint"
  | "LoanStatusInquiry"
  | "FDRDMaturityInquiry";

export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export interface TicketReply {
  id: string;
  ticketId: string;
  message: string;
  author: "customer" | "staff";
  authorName: string;
  authorId?: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  referenceNumber: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  customerName: string;
  customerMobile: string;
  accountNumber: string;
  details: Record<string, string | number>;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedToName?: string;
  replies: TicketReply[];
  resolvedAt?: string;
  closedAt?: string;
}
