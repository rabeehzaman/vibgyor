import { StaffMember } from "./types";

export const STAFF_MEMBERS: StaffMember[] = [
  { id: "s01", name: "SHAJLA", department: "CRE" },
  { id: "s02", name: "SHAMEELA", department: "CRE" },
  { id: "s03", name: "SOUDHA", department: "CRE" },
  { id: "s04", name: "HANI", department: "CRE" },
  { id: "s05", name: "SABIRA", department: "CRE" },
  { id: "s06", name: "SHAKKIRA", department: "CRE" },
  { id: "s07", name: "MUNZILA", department: "CRE" },
  { id: "s08", name: "FALEELA", department: "CRE" },
  { id: "s09", name: "HYRUNNEESA", department: "LPO" },
  { id: "s10", name: "SULAIKHA", department: "LPO" },
  { id: "s11", name: "JAZAR", department: "LPO" },
  { id: "s12", name: "HAMZA", department: "ABM" },
  { id: "s13", name: "RIZWANA", department: "ABM" },
  { id: "s14", name: "RAMEES", department: "CASHIER" },
  { id: "s15", name: "IHSAN", department: "CASHIER" },
  { id: "s16", name: "ANZIL", department: "ACCOUNTANT" },
  { id: "s17", name: "RASEENA", department: "ACCOUNTANT" },
  { id: "s18", name: "NAFEESA", department: "CRE" },
];

export const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

// Cashier V2 constants
export const ALL_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
export const NOTE_DENOMINATIONS = [2000, 500, 200, 100, 50, 20] as const;
export const COIN_DENOMINATIONS = [10, 5, 2, 1] as const;
export const BUNDLE_THRESHOLD = 100; // notes per bundle

export const STAFF_ADVANCE_CATEGORIES = [
  "TEA&SNACKS",
  "PETTY CASH",
  "CONVEYANCE",
  "STATIONERY",
  "SALARY ADVANCE",
  "MISCELLANEOUS",
] as const;

export const DEPOSIT_TYPES = ["RD", "FD", "Daily", "Saving"] as const;
export const DEPOSIT_ACTIONS = ["New", "Renew"] as const;
export const LOAN_TYPES = ["Secured", "Business", "Property", "Personal", "Vehicle"] as const;
export const LOAN_STATUSES = ["Under Process", "Passed", "Rejected"] as const;
export const TRANSFER_STATUSES = ["Pending", "Processed", "Done"] as const;

export const LOAN_SOURCES = ["Online", "Direct to Office", "WhatsApp", "Others"] as const;

export const MEMBERSHIP_PLANS = ["600", "300"] as const;
export const MEMBERSHIP_PRODUCTS = ["SD", "DD", "RD", "FD", "KUTTI NIDHI"] as const;
export const DD_TYPES = ["Free DD", "DDL", "SDD"] as const;
export const COLLECTION_AREAS = ["KOOTTILANGADI-M", "KONDOTTY", "WANDOOR", "MALAPPURAM"] as const;
export const PROFIT_TYPES = ["Flat", "Diminishing"] as const;
export const LOAN_SCHEMES_LIST = ["BSL", "EMI", "RSL", "PRL", "GOLD PRL"] as const;
export const MIGRATION_TYPES = ["Migration", "KML", "NIDHI"] as const;
export const FD_TYPES = ["FD", "BSFD"] as const;
export const BANK_CASH = ["Bank", "Cash"] as const;
export const TENURE_OPTIONS = ["6 months", "12 months", "24 months", "36 months", "60 months"] as const;
export const RD_STATUS_LIST = ["Active", "Completed", "Closed"] as const;
export const CRE_CATEGORIES = [
  "NewMembership",
  "NewDailyDeposit",
  "NewRD",
  "NewFD",
  "AMC",
] as const;
export const CUSTOMER_NEEDS = [
  "RD Enquiry",
  "FD Renewal",
  "Loan Query",
  "Account Opening",
  "General Enquiry",
  "Complaint",
  "Other",
] as const;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/cre", label: "CRE", icon: "Users" },
  { href: "/lpo", label: "LPO", icon: "FileText" },
  { href: "/abm", label: "ABM", icon: "Megaphone" },
  { href: "/cashier", label: "Cashier", icon: "Wallet" },
  { href: "/accountant", label: "Accountant", icon: "ArrowLeftRight" },
] as const;

// ─── TICKET SYSTEM ──────────────────────────
import { TicketType, TicketPriority, Department } from "./types";

export const TICKET_TYPES: TicketType[] = [
  "BalanceEnquiry",
  "TransferRequest",
  "ChequeBookRequest",
  "MobileNumberChange",
  "Complaint",
  "LoanStatusInquiry",
  "FDRDMaturityInquiry",
  "DepositApplication",
  "LoanApplication",
];

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  BalanceEnquiry: "Balance Enquiry",
  TransferRequest: "Fund Transfer",
  ChequeBookRequest: "Cheque Book Request",
  MobileNumberChange: "Mobile Number Change",
  Complaint: "Complaint",
  LoanStatusInquiry: "Loan Status Inquiry",
  FDRDMaturityInquiry: "FD/RD Maturity Inquiry",
  DepositApplication: "Deposit Application",
  LoanApplication: "Loan Application",
};

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
export const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export const TICKET_TYPE_DEFAULT_PRIORITY: Record<TicketType, TicketPriority> = {
  BalanceEnquiry: "Low",
  TransferRequest: "High",
  ChequeBookRequest: "Medium",
  MobileNumberChange: "Medium",
  Complaint: "High",
  LoanStatusInquiry: "Medium",
  FDRDMaturityInquiry: "Medium",
  DepositApplication: "Medium",
  LoanApplication: "High",
};

export const TICKET_TYPE_DEPARTMENT: Record<TicketType, Department> = {
  BalanceEnquiry: "CRE",
  TransferRequest: "ACCOUNTANT",
  ChequeBookRequest: "CRE",
  MobileNumberChange: "ABM",
  Complaint: "ABM",
  LoanStatusInquiry: "LPO",
  FDRDMaturityInquiry: "CRE",
  DepositApplication: "CRE",
  LoanApplication: "LPO",
};
