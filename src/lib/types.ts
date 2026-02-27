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
