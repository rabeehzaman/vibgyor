import type {
  BankBookRecord,
  BankBookTransaction,
  PendingItem,
  DailyBankBookState,
} from "./types";

/** Recalculate bank book totals from transactions */
export function recalcBankBook(bankBook: BankBookRecord): BankBookRecord {
  const totalReceipts = bankBook.transactions
    .filter((t) => t.type === "receipt")
    .reduce((s, t) => s + t.amount, 0);
  const totalPayments = bankBook.transactions
    .filter((t) => t.type === "payment")
    .reduce((s, t) => s + t.amount, 0);
  const closingBalance = bankBook.openingBalance + totalReceipts - totalPayments;
  return { ...bankBook, totalReceipts, totalPayments, closingBalance };
}

/** Create an empty daily bank book state for a given date and bank account */
export function createEmptyDailyBankBookState(
  date: string,
  bankAccountId: string,
  prevClosing: number = 0
): DailyBankBookState {
  return {
    id: `dbbs-${bankAccountId}-${date}-${Date.now()}`,
    date,
    bankAccountId,
    bankBook: {
      id: `bb-${bankAccountId}-${date}`,
      date,
      openingBalance: prevClosing,
      transactions: [],
      totalReceipts: 0,
      totalPayments: 0,
      closingBalance: prevClosing,
      settlementBalance: undefined,
    },
    pendingItems: [],
    status: "draft",
  };
}

/** Sum of amounts where status === "pending" */
export function getPendingTotal(pendingItems: PendingItem[]): number {
  return pendingItems
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);
}

/** Reconciliation summary for bank book vs statement */
export function getReconciliationSummary(
  bankBook: BankBookRecord,
  pendingItems: PendingItem[]
) {
  const pendingTotal = getPendingTotal(pendingItems);
  const expectedStatement = bankBook.closingBalance + pendingTotal;
  const actualStatement = bankBook.settlementBalance ?? 0;
  const variance = actualStatement - expectedStatement;
  return {
    closing: bankBook.closingBalance,
    pendingTotal,
    expectedStatement,
    actualStatement,
    variance,
  };
}
