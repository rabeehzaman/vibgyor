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

export interface LoanEnquiry {
  id: string;
  date: string;
  customerName: string;
  loanType: LoanType;
  amount: number;
  staffId: string;
  staffName: string;
  status: LoanStatus;
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
