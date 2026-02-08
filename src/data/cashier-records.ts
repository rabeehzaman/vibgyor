import { CashierRecord } from "@/lib/types";

export const cashierRecords: CashierRecord[] = [
  {
    id: "cr01",
    date: "2026-02-02",
    openingBalance: 500000,
    depositReceived: 325000,
    cashOut: 210000,
    closingBalance: 615000,
    denominations: { "500": 800, "200": 250, "100": 450, "50": 300, "20": 200, "10": 150, "5": 50, "2": 25, "1": 10 },
  },
  {
    id: "cr02",
    date: "2026-02-03",
    openingBalance: 615000,
    depositReceived: 280000,
    cashOut: 195000,
    closingBalance: 700000,
    denominations: { "500": 920, "200": 280, "100": 500, "50": 260, "20": 180, "10": 130, "5": 40, "2": 20, "1": 15 },
  },
  {
    id: "cr03",
    date: "2026-02-04",
    openingBalance: 700000,
    depositReceived: 410000,
    cashOut: 350000,
    closingBalance: 760000,
    denominations: { "500": 1050, "200": 300, "100": 550, "50": 280, "20": 220, "10": 160, "5": 60, "2": 30, "1": 20 },
  },
  {
    id: "cr04",
    date: "2026-02-05",
    openingBalance: 760000,
    depositReceived: 295000,
    cashOut: 230000,
    closingBalance: 825000,
    denominations: { "500": 1100, "200": 320, "100": 580, "50": 310, "20": 190, "10": 140, "5": 55, "2": 20, "1": 10 },
  },
  {
    id: "cr05",
    date: "2026-02-08",
    openingBalance: 825000,
    depositReceived: 380000,
    cashOut: 275000,
    closingBalance: 930000,
    denominations: { "500": 1250, "200": 350, "100": 620, "50": 340, "20": 250, "10": 180, "5": 70, "2": 35, "1": 15 },
  },
];
