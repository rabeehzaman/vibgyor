import { Campaign } from "@/lib/types";

export const campaigns: Campaign[] = [
  { id: "c01", name: "New Year FD Bonanza", type: "Fixed Deposit", status: "Active", startDate: "2026-01-15", endDate: "2026-03-15", target: 200, achieved: 134 },
  { id: "c02", name: "RD Plus Scheme", type: "Recurring Deposit", status: "Active", startDate: "2026-02-01", endDate: "2026-04-30", target: 150, achieved: 42 },
  { id: "c03", name: "Membership Drive Q1", type: "Membership", status: "Completed", startDate: "2026-01-01", endDate: "2026-01-31", target: 100, achieved: 112 },
  { id: "c04", name: "Business Loan Mela", type: "Loan", status: "Planned", startDate: "2026-03-01", endDate: "2026-03-31", target: 50, achieved: 0 },
  { id: "c05", name: "Women Savings Initiative", type: "Saving", status: "Active", startDate: "2026-01-20", endDate: "2026-06-30", target: 300, achieved: 87 },
  { id: "c06", name: "Vehicle Loan Festival", type: "Loan", status: "Planned", startDate: "2026-03-15", endDate: "2026-04-15", target: 75, achieved: 0 },
];
