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

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export const DEPOSIT_TYPES = ["RD", "FD", "Daily", "Saving"] as const;
export const DEPOSIT_ACTIONS = ["New", "Renew"] as const;
export const LOAN_TYPES = ["Secured", "Business", "Property", "Personal", "Vehicle"] as const;
export const LOAN_STATUSES = ["Under Process", "Passed", "Rejected"] as const;
export const TRANSFER_STATUSES = ["Pending", "Processed", "Done"] as const;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/cre", label: "CRE", icon: "Users" },
  { href: "/lpo", label: "LPO", icon: "FileText" },
  { href: "/abm", label: "ABM", icon: "Megaphone" },
  { href: "/cashier", label: "Cashier", icon: "Wallet" },
  { href: "/accountant", label: "Accountant", icon: "ArrowLeftRight" },
] as const;
