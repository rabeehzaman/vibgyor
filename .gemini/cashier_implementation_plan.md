# 🏦 Cashier Tab — Complete Implementation Plan

> **Goal:** Replace the current simple cashier page with a fully-featured Cash Management system consisting of three interconnected modules: **Day Book**, **Locker Denomination**, and **Loose Denomination**, plus supporting features for reconciliation, transaction tracking, and employee shortage management.

---

## 📋 Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 1 — Data Model & Types](#phase-1--data-model--types)
4. [Phase 2 — State Management (AppContext)](#phase-2--state-management-appcontext)
5. [Phase 3 — Day Book Module](#phase-3--day-book-module)
6. [Phase 4 — Locker Denomination Module](#phase-4--locker-denomination-module)
7. [Phase 5 — Loose Denomination Module](#phase-5--loose-denomination-module)
8. [Phase 6 — Auto-Bundling Logic (100-Note Rule)](#phase-6--auto-bundling-logic-100-note-rule)
9. [Phase 7 — Reconciliation & Variance](#phase-7--reconciliation--variance)
10. [Phase 8 — Staff Advances & Shortages](#phase-8--staff-advances--shortages)
11. [Phase 9 — UI Layout & Tab Structure](#phase-9--ui-layout--tab-structure)
12. [Phase 10 — Polish & Edge Cases](#phase-10--polish--edge-cases)

---

## 1. Current State Analysis

### What exists today:
- **Single page:** `src/app/cashier/page.tsx` (191 lines)
- **Simple model:** `CashierRecord` with `openingBalance`, `depositReceived`, `cashOut`, `closingBalance`, and a flat `denominations` map
- **No separation** between locker vs loose cash
- **No individual transaction tracking** — only daily totals
- **No reconciliation** against system closing
- **No staff shortage/advance tracking**
- **No coin vs. note distinction**
- **No 100-note bundling logic**

### What needs to change:
- Complete overhaul of the data model
- New tab-based UI with 3 core modules + reconciliation panel
- Individual transaction entry (line-item receipts/payments)
- Locker ↔ Loose transfer logic with 100-note auto-bundling
- System vs. physical cash reconciliation
- Staff advance & shortage attribution

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CASHIER TAB                              │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ Day Book │  │ Locker Denom.    │  │ Loose Denom.         │   │
│  │ (Cash    │  │ (Bundled/Secured │  │ (Counter/Unbundled   │   │
│  │  Book)   │  │  Cash)           │  │  Cash + Coins)       │   │
│  └────┬─────┘  └────────┬─────────┘  └──────────┬───────────┘   │
│       │                 │                        │               │
│       └────────────┬────┴────────────────────────┘               │
│                    ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              RECONCILIATION PANEL                         │   │
│  │  Day Book Closing = Locker Total + Loose Total            │   │
│  │  System Closing vs Physical Closing → Difference          │   │
│  │  Excess / Short → Staff Shortage Attribution              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Data Model & Types

**File:** `src/lib/types.ts`

### New / Modified Types:

```typescript
// ─── DENOMINATIONS ──────────────────────────
export const ALL_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
export type DenominationValue = typeof ALL_DENOMINATIONS[number];

export interface DenominationCount {
  denomination: DenominationValue;
  noteCount: number;   // number of paper notes
  coinCount: number;   // number of coins (relevant for 10, 5, 2, 1)
}

// ─── DAY BOOK (CASH BOOK) ──────────────────
export interface CashTransaction {
  id: string;
  date: string;           // YYYY-MM-DD
  type: "receipt" | "payment";  // cash-in or cash-out
  amount: number;
  description?: string;
  timestamp: string;      // ISO string for ordering
}

export interface DayBookRecord {
  id: string;
  date: string;
  openingBalance: number;
  transactions: CashTransaction[];    // individual line items
  totalReceipts: number;              // auto-calculated sum of receipts
  totalPayments: number;              // auto-calculated sum of payments
  closingBalance: number;             // opening + receipts - payments
  systemClosingBalance?: number;      // from ERP/billing software (manual input)
}

// ─── LOCKER DENOMINATION ────────────────────
export interface LockerRecord {
  id: string;
  date: string;
  openingDenominations: DenominationCount[];  // start of day
  deposited: DenominationCount[];              // bundles added during day
  withdrawn: DenominationCount[];              // bundles removed during day
  closingDenominations: DenominationCount[];   // auto-calculated
  openingTotal: number;
  depositedTotal: number;
  withdrawnTotal: number;
  closingTotal: number;
}

// ─── LOOSE DENOMINATION ─────────────────────
export interface LooseRecord {
  id: string;
  date: string;
  noteDenominations: DenominationCount[];   // paper notes (count < 100 per denom)
  coinDenominations: DenominationCount[];   // coins separately tracked
  notesTotal: number;
  coinsTotal: number;
  grandTotal: number;                       // notes + coins
}

// ─── RECONCILIATION ─────────────────────────
export interface ReconciliationRecord {
  id: string;
  date: string;
  dayBookClosing: number;
  lockerTotal: number;
  looseTotal: number;
  physicalTotal: number;         // locker + loose
  systemClosing: number;         // from ERP
  difference: number;            // physical - system
  excessAmount: number;          // if difference > 0
  shortAmount: number;           // if difference < 0
  staffShortages: StaffShortage[];
  isReconciled: boolean;         // true if difference === 0
}

// ─── STAFF SHORTAGE / ADVANCES ──────────────
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
  category: string;   // e.g., "TEA&SNACKS", "PETTY CASH", etc.
  amount: number;
  remarks?: string;
}

// ─── COMPLETE DAILY CASHIER STATE ───────────
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
```

### Update Constants (`src/lib/constants.ts`):

```typescript
// Add these new constants:
export const ALL_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
// (Update existing DENOMINATIONS to include 2000)

export const COIN_DENOMINATIONS = [10, 5, 2, 1] as const;
export const NOTE_DENOMINATIONS = [2000, 500, 200, 100, 50, 20] as const;
export const BUNDLE_THRESHOLD = 100; // notes per bundle

export const STAFF_ADVANCE_CATEGORIES = [
  "TEA&SNACKS",
  "PETTY CASH",
  "CONVEYANCE",
  "STATIONERY",
  "MISCELLANEOUS",
] as const;

export const CASHIER_STAFF = STAFF_MEMBERS.filter(s => s.department === "CASHIER");
```

### Files to create/modify:
| File | Action |
|------|--------|
| `src/lib/types.ts` | Add all new interfaces above |
| `src/lib/constants.ts` | Add `2000` to denominations, add new constants |

---

## Phase 2 — State Management (AppContext)

**File:** `src/context/AppContext.tsx`

### New state and actions to add:

```typescript
// New state slices:
dailyCashierStates: DailyCashierState[];

// New actions:
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
closeDailyRecord: (date: string) => void;
```

### localStorage key:
```
vibgyor_cashier_v2   // new key to avoid conflicts with old data
```

### Files to create/modify:
| File | Action |
|------|--------|
| `src/context/AppContext.tsx` | Add new state, actions, persistence |
| `src/data/cashier-records.ts` | Replace with seed data matching new schema |

---

## Phase 3 — Day Book Module

**Component:** `src/components/cashier/DayBook.tsx`

### UI Sections:

#### 3A. Summary Cards Row (top)
- **Opening Balance** — Editable input (auto-carries from previous day's closing)
- **Total Receipts** — Auto-calculated (sum of all receipt transactions)
- **Total Payments** — Auto-calculated (sum of all payment transactions)
- **Closing Balance** — Auto-calculated (Opening + Receipts − Payments)

#### 3B. Transaction Entry Form
- Continuous input form (not a modal) with:
  - **Type** toggle: Receipt / Payment
  - **Amount** — Number input
  - **Description** — Optional text
  - **Add** button
- On submit → appends to the transaction list, auto-recalculates totals

#### 3C. Transaction Ledger Table
| # | Type | Amount | Description | Time | Action |
|---|------|--------|-------------|------|--------|
| 1 | Receipt | ₹1,000 | Counter deposit | 10:15 AM | 🗑️ |
| 2 | Receipt | ₹5,000 | Walk-in | 10:32 AM | 🗑️ |
| 3 | Payment | ₹14,500 | Withdrawal | 11:05 AM | 🗑️ |
| ... | ... | ... | ... | ... | ... |
| **TOTAL** | | **Receipts: ₹6,000 / Payments: ₹14,500** | | | |

#### 3D. System Closing Input
- **System Closing Balance** — Manual input field for entering the value from ERP/billing software
- Display: `System: ₹X,XX,XXX | Physical: ₹X,XX,XXX | Variance: ±₹XX,XXX`

### Files to create:
| File | Action |
|------|--------|
| `src/components/cashier/DayBook.tsx` | New component |

---

## Phase 4 — Locker Denomination Module

**Component:** `src/components/cashier/LockerDenomination.tsx`

### UI Sections:

#### 4A. Locker Summary Cards
- **Opening Total** — Calculated from opening denominations
- **Deposited Today** — Total value of bundles deposited
- **Withdrawn Today** — Total value of bundles withdrawn
- **Closing Total** — Opening + Deposited − Withdrawn

#### 4B. Denomination Table (Locker)
| Denomination | Opening (Bundles) | Deposited | Withdrawn | Closing (Bundles) | Value |
|-------------|-------------------|-----------|-----------|-------------------|-------|
| ₹2,000 | 5 | 2 | 0 | 7 | ₹14,00,000 |
| ₹500 | 12 | 3 | 1 | 14 | ₹7,00,000 |
| ₹200 | 8 | 0 | 2 | 6 | ₹1,20,000 |
| ₹100 | 15 | 1 | 0 | 16 | ₹1,60,000 |
| ₹50 | 10 | 0 | 0 | 10 | ₹50,000 |
| ₹20 | 5 | 0 | 0 | 5 | ₹10,000 |
| ... | ... | ... | ... | ... | ... |
| **TOTAL** | | | | | **₹24,40,000** |

> **Note:** Each "bundle" = 100 notes. So Locker stores the **number of bundles**, and the value = bundles × 100 × denomination.

#### 4C. Quick Actions
- "Bundle from Loose" button → triggers the auto-bundling logic (Phase 6)
- "Withdraw from Locker" → Opens a mini form to select denomination + number of bundles

### Files to create:
| File | Action |
|------|--------|
| `src/components/cashier/LockerDenomination.tsx` | New component |

---

## Phase 5 — Loose Denomination Module

**Component:** `src/components/cashier/LooseDenomination.tsx`

### UI Sections:

#### 5A. Notes Section
| Denomination | Count | Total |
|-------------|-------|-------|
| ₹2,000 | 45 | ₹90,000 |
| ₹500 | 82 | ₹41,000 |
| ₹200 | 33 | ₹6,600 |
| ... | ... | ... |
| **Notes Total** | | **₹X,XX,XXX** |

> Each denomination count must be **< 100**. If ≥ 100, the auto-bundling rule kicks in (Phase 6).

#### 5B. Coins Section (separate)
| Denomination | Count | Total |
|-------------|-------|-------|
| ₹10 | 150 | ₹1,500 |
| ₹5 | 80 | ₹400 |
| ₹2 | 45 | ₹90 |
| ₹1 | 120 | ₹120 |
| **Coins Total** | | **₹2,110** |

#### 5C. Loose Summary
- **Notes Total:** ₹X,XX,XXX
- **Coins Total:** ₹X,XXX
- **Grand Total (Loose):** ₹X,XX,XXX

#### 5D. Auto-Bundle Alert
- If any denomination count ≥ 100 → show a yellow alert:
  > ⚠️ "₹500 notes: 132 count → 1 bundle (100) ready for locker, 32 remain loose"
- Button: **"Move to Locker"** → executes the bundle transfer

### Files to create:
| File | Action |
|------|--------|
| `src/components/cashier/LooseDenomination.tsx` | New component |

---

## Phase 6 — Auto-Bundling Logic (100-Note Rule)

**File:** `src/lib/cashier-utils.ts`

### Core Logic:

```typescript
export function calculateBundles(noteCount: number): { 
  bundles: number; 
  remainder: number; 
} {
  return {
    bundles: Math.floor(noteCount / BUNDLE_THRESHOLD),
    remainder: noteCount % BUNDLE_THRESHOLD,
  };
}

export function processAutoBundling(
  looseDenoms: DenominationCount[],
  lockerDenoms: DenominationCount[],
): {
  updatedLoose: DenominationCount[];
  updatedLockerDeposits: DenominationCount[];
  bundledSummary: { denomination: number; bundles: number }[];
} {
  // For each denomination in loose:
  //   if noteCount >= 100:
  //     bundles = floor(noteCount / 100)
  //     remainder = noteCount % 100
  //     loose denomination count = remainder
  //     locker deposited += bundles
  // Return updated arrays + summary for UI toast
}
```

### Workflow:
1. Cashier enters note counts in Loose section
2. System detects counts ≥ 100
3. Shows alert with bundle breakdown
4. On confirmation → moves bundles to Locker, updates Loose remainder
5. Toast notification: "Moved 2 bundles of ₹500 (200 notes) to Locker"

### Files to create:
| File | Action |
|------|--------|
| `src/lib/cashier-utils.ts` | New utility file |

---

## Phase 7 — Reconciliation & Variance

**Component:** `src/components/cashier/ReconciliationPanel.tsx`

### UI Layout:

```
┌──────────────────────────────────────────────────────────┐
│                    RECONCILIATION                         │
├──────────────────┬───────────────────────────────────────┤
│ Day Book Closing │  ₹8,25,000                           │
├──────────────────┼───────────────────────────────────────┤
│ Locker Total     │  ₹7,00,000                           │
│ Loose Total      │  ₹1,25,000                           │
│ Physical Total   │  ₹8,25,000  (Locker + Loose)         │
├──────────────────┼───────────────────────────────────────┤
│ Match Status     │  ✅ BALANCED  (or ❌ MISMATCH: ₹XXX) │
├──────────────────┼───────────────────────────────────────┤
│ System Closing   │  ₹8,22,000  (from ERP input)         │
│ Physical Closing │  ₹8,25,000                           │
│ DIFFERENCE       │  ₹3,000                              │
│ EXCESS AMOUNT    │  ₹3,000                              │
├──────────────────┴───────────────────────────────────────┤
│ SHORT AMOUNTS (attributed to staff)                      │
│ ┌──────────┬──────────┬──────────┐                       │
│ │ JASAR    │ ₹18,640  │ 🗑️       │                       │
│ │ HANI     │ ₹3,462   │ 🗑️       │                       │
│ │ + Add shortage...    │          │                       │
│ └──────────┴──────────┴──────────┘                       │
└──────────────────────────────────────────────────────────┘
```

### Auto-calculations:
- `physicalTotal = lockerTotal + looseTotal`
- `dayBookMatch = physicalTotal === dayBookClosing`
- `difference = physicalTotal - systemClosing`
- `excessAmount = max(0, difference)`
- `shortAmount = max(0, -difference)`

### Files to create:
| File | Action |
|------|--------|
| `src/components/cashier/ReconciliationPanel.tsx` | New component |

---

## Phase 8 — Staff Advances & Shortages

**Component:** `src/components/cashier/StaffAdvances.tsx`

### UI Sections:

#### 8A. Shortage Attribution Table
| Staff | Amount | Reason | Action |
|-------|--------|--------|--------|
| JASAR | ₹18,640 | Counter shortage | 🗑️ |
| HANI | ₹3,462 | Miscounted | 🗑️ |
| **Total Shortages** | **₹22,102** | | |

#### 8B. Petty Cash / Staff Advances Table
| Staff/Category | Amount | Remarks | Action |
|---------------|--------|---------|--------|
| TEA&SNACKS | ₹500 | Daily tea | 🗑️ |
| SHAMLA | ₹1,200 | Advance | 🗑️ |
| SAOUDHA | ₹800 | Transport | 🗑️ |
| IHSAN | ₹2,000 | Salary advance | 🗑️ |
| **Total Advances** | **₹4,500** | | |

#### 8C. Add Form
- Staff select (dropdown from STAFF_MEMBERS) or free text for categories
- Amount input
- Reason/remarks input
- Add button

### Files to create:
| File | Action |
|------|--------|
| `src/components/cashier/StaffAdvances.tsx` | New component |

---

## Phase 9 — UI Layout & Tab Structure

**File:** `src/app/cashier/page.tsx` (major rewrite)

### Tab Layout:

```
┌───────────────────────────────────────────────────────────────┐
│  Cashier — Cash Management                    📅 27 Feb 2026  │
│  ─────────────────────────────────────────────────────────────│
│  [📖 Day Book] [🔒 Locker] [💵 Loose] [⚖️ Reconciliation]    │
│  ─────────────────────────────────────────────────────────────│
│                                                               │
│   (Active tab content renders here)                           │
│                                                               │
│  ─────────────────────────────────────────────────────────────│
│  QUICK SUMMARY BAR (always visible):                          │
│  Day Book: ₹8,25,000 | Locker: ₹7,00,000 | Loose: ₹1,25,000 │
│  Status: ✅ Balanced                                          │
└───────────────────────────────────────────────────────────────┘
```

### Component Hierarchy:
```
CashierPage (page.tsx)
├── Header (date display + save button)
├── Quick Summary Bar (sticky/always visible)
├── Tabs
│   ├── Tab: Day Book
│   │   └── <DayBook />
│   ├── Tab: Locker
│   │   └── <LockerDenomination />
│   ├── Tab: Loose
│   │   └── <LooseDenomination />
│   └── Tab: Reconciliation
│       ├── <ReconciliationPanel />
│       └── <StaffAdvances />
└── Toast Notification
```

### Files to create/modify:
| File | Action |
|------|--------|
| `src/app/cashier/page.tsx` | Major rewrite — tabbed layout |

---

## Phase 10 — Polish & Edge Cases

### 10A. Data Flow Validations
- [ ] Opening balance auto-populates from previous day's closing
- [ ] Cannot close day if locker + loose ≠ day book closing
- [ ] Warning if variance > configurable threshold
- [ ] Prevent negative counts in denominations

### 10B. UX Enhancements
- [ ] Number inputs auto-select on focus
- [ ] INR formatting everywhere (en-IN locale)
- [ ] Color-coded status badges (green = balanced, red = mismatch, yellow = pending)
- [ ] Smooth tab transitions
- [ ] Print-friendly view for daily report

### 10C. Edge Cases
- [ ] First day of operation (no previous closing balance)
- [ ] Partial data entry (save as draft)
- [ ] Re-opening a closed day for corrections
- [ ] Handle zero-value denominations gracefully

---

## 📁 Complete File Map

### New Files:
| # | File | Description |
|---|------|-------------|
| 1 | `src/components/cashier/DayBook.tsx` | Day Book (Cash Book) module |
| 2 | `src/components/cashier/LockerDenomination.tsx` | Locker denomination tracking |
| 3 | `src/components/cashier/LooseDenomination.tsx` | Loose denomination + coins |
| 4 | `src/components/cashier/ReconciliationPanel.tsx` | Reconciliation & variance |
| 5 | `src/components/cashier/StaffAdvances.tsx` | Staff shortages & advances |
| 6 | `src/lib/cashier-utils.ts` | Bundling logic & calculation helpers |

### Modified Files:
| # | File | Changes |
|---|------|---------|
| 7 | `src/lib/types.ts` | Add ~10 new interfaces |
| 8 | `src/lib/constants.ts` | Add `2000` denom, new constants |
| 9 | `src/context/AppContext.tsx` | Add new state slices + actions |
| 10 | `src/data/cashier-records.ts` | New seed data structure |
| 11 | `src/app/cashier/page.tsx` | Complete rewrite — tabbed layout |

---

## 🔄 Implementation Order

```
Phase 1 (Types)           ← Foundation, no UI changes
    ↓
Phase 2 (AppContext)      ← State management scaffold
    ↓
Phase 6 (Utils)           ← Pure logic, testable independently
    ↓
Phase 9 (Page Layout)     ← Tab structure skeleton
    ↓
Phase 3 (Day Book)        ← First functional module
    ↓
Phase 4 (Locker)          ← Second module, feeds from Day Book
    ↓
Phase 5 (Loose)           ← Third module, feeds bundling logic
    ↓
Phase 7 (Reconciliation)  ← Ties everything together
    ↓
Phase 8 (Staff Advances)  ← Final data module
    ↓
Phase 10 (Polish)         ← Edge cases & UX refinement
```

---

## ⏱️ Estimated Effort Per Phase

| Phase | Description | Est. Complexity |
|-------|-------------|----------------|
| 1 | Data Model & Types | Low |
| 2 | State Management | Medium |
| 3 | Day Book Module | High |
| 4 | Locker Denomination | Medium |
| 5 | Loose Denomination | Medium |
| 6 | Auto-Bundling Logic | Medium |
| 7 | Reconciliation | Medium |
| 8 | Staff Advances | Low-Medium |
| 9 | UI Layout & Tabs | Medium |
| 10 | Polish & Edge Cases | Medium |

---

## ✅ Acceptance Criteria (Definition of Done)

- [ ] All 4 tabs render and switch correctly
- [ ] Day Book supports adding/removing individual transactions with auto-sum
- [ ] Closing balance auto-calculates: `Opening + Receipts − Payments`
- [ ] Locker tracks bundles with opening/deposited/withdrawn/closing
- [ ] Loose tracks notes (< 100) and coins separately
- [ ] 100-note auto-bundling detection and transfer to locker works
- [ ] Reconciliation correctly matches: `Locker + Loose = Day Book Closing`
- [ ] System vs. Physical variance auto-calculated with excess/short display
- [ ] Staff shortages can be attributed to specific employees
- [ ] Staff advances/petty cash can be logged with categories
- [ ] All data persists to localStorage
- [ ] INR formatting throughout
- [ ] Responsive design maintains usability on tablet screens
