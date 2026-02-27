import {
    ALL_DENOMINATIONS,
    NOTE_DENOMINATIONS,
    COIN_DENOMINATIONS,
    BUNDLE_THRESHOLD,
} from "./constants";
import type {
    DenominationValue,
    DenominationCount,
    DayBookRecord,
    LockerRecord,
    LooseRecord,
    ReconciliationRecord,
    DailyCashierState,
    CashTransaction,
} from "./types";

// ─── DENOMINATION HELPERS ────────────────────

/** Create an empty DenominationCount array for all denominations */
export function emptyDenominations(): DenominationCount[] {
    return ALL_DENOMINATIONS.map((d) => ({
        denomination: d as DenominationValue,
        noteCount: 0,
        coinCount: 0,
    }));
}

/** Create note-only denominations (for locker – no coins) */
export function emptyNoteDenominations(): DenominationCount[] {
    return ALL_DENOMINATIONS.map((d) => ({
        denomination: d as DenominationValue,
        noteCount: 0,
        coinCount: 0,
    }));
}

/** Create coin-only denominations */
export function emptyCoinDenominations(): DenominationCount[] {
    return COIN_DENOMINATIONS.map((d) => ({
        denomination: d as DenominationValue,
        noteCount: 0,
        coinCount: 0,
    }));
}

/** Check if a denomination value is a coin denomination */
export function isCoinDenomination(d: number): boolean {
    return (COIN_DENOMINATIONS as readonly number[]).includes(d);
}

/** Check if a denomination value is a note denomination */
export function isNoteDenomination(d: number): boolean {
    return (NOTE_DENOMINATIONS as readonly number[]).includes(d);
}

// ─── TOTAL CALCULATIONS ─────────────────────

/** Calculate the total value of denomination counts (notes + coins) */
export function calcDenomTotal(denoms: DenominationCount[]): number {
    return denoms.reduce(
        (sum, d) => sum + d.denomination * (d.noteCount + d.coinCount),
        0
    );
}

/** Calculate total from note counts only */
export function calcNoteTotal(denoms: DenominationCount[]): number {
    return denoms.reduce(
        (sum, d) => sum + d.denomination * d.noteCount,
        0
    );
}

/** Calculate total from coin counts only */
export function calcCoinTotal(denoms: DenominationCount[]): number {
    return denoms.reduce(
        (sum, d) => sum + d.denomination * d.coinCount,
        0
    );
}

/** Calculate locker total (bundles × 100 × denomination) */
export function calcLockerBundleTotal(denoms: DenominationCount[]): number {
    // In locker, noteCount = number of bundles, each bundle = 100 notes
    return denoms.reduce(
        (sum, d) => sum + d.denomination * d.noteCount * BUNDLE_THRESHOLD,
        0
    );
}

// ─── 100-NOTE BUNDLING LOGIC ─────────────────

export interface BundleResult {
    denomination: DenominationValue;
    bundles: number;
    remainder: number;
    totalBundled: number; // value moved to locker
}

/** Calculate how many bundles can be made from a note count */
export function calculateBundles(noteCount: number): {
    bundles: number;
    remainder: number;
} {
    return {
        bundles: Math.floor(noteCount / BUNDLE_THRESHOLD),
        remainder: noteCount % BUNDLE_THRESHOLD,
    };
}

/** Process auto-bundling: find all loose denominations with ≥100 notes */
export function detectBundleable(
    looseDenoms: DenominationCount[]
): BundleResult[] {
    const results: BundleResult[] = [];
    for (const d of looseDenoms) {
        if (d.noteCount >= BUNDLE_THRESHOLD) {
            const { bundles, remainder } = calculateBundles(d.noteCount);
            results.push({
                denomination: d.denomination,
                bundles,
                remainder,
                totalBundled: bundles * BUNDLE_THRESHOLD * d.denomination,
            });
        }
    }
    return results;
}

/** Execute bundling: returns updated loose and locker deposit arrays */
export function executeBundling(
    looseDenoms: DenominationCount[],
    lockerDeposited: DenominationCount[]
): {
    updatedLoose: DenominationCount[];
    updatedLockerDeposits: DenominationCount[];
    bundledItems: BundleResult[];
} {
    const bundledItems: BundleResult[] = [];
    const updatedLoose = looseDenoms.map((d) => {
        if (d.noteCount >= BUNDLE_THRESHOLD) {
            const { bundles, remainder } = calculateBundles(d.noteCount);
            bundledItems.push({
                denomination: d.denomination,
                bundles,
                remainder,
                totalBundled: bundles * BUNDLE_THRESHOLD * d.denomination,
            });
            return { ...d, noteCount: remainder };
        }
        return { ...d };
    });

    const updatedLockerDeposits = lockerDeposited.map((d) => {
        const bundled = bundledItems.find((b) => b.denomination === d.denomination);
        if (bundled) {
            return { ...d, noteCount: d.noteCount + bundled.bundles };
        }
        return { ...d };
    });

    return { updatedLoose, updatedLockerDeposits, bundledItems };
}

// ─── LOCKER CALCULATIONS ─────────────────────

/** Calculate locker closing denominations from opening + deposited - withdrawn */
export function calcLockerClosing(
    opening: DenominationCount[],
    deposited: DenominationCount[],
    withdrawn: DenominationCount[]
): DenominationCount[] {
    return opening.map((o) => {
        const dep = deposited.find((d) => d.denomination === o.denomination);
        const wit = withdrawn.find((w) => w.denomination === o.denomination);
        return {
            denomination: o.denomination,
            noteCount:
                o.noteCount +
                (dep?.noteCount || 0) -
                (wit?.noteCount || 0),
            coinCount: 0,
        };
    });
}

// ─── DAY BOOK CALCULATIONS ───────────────────

/** Recalculate day book totals from transactions */
export function recalcDayBook(dayBook: DayBookRecord): DayBookRecord {
    const totalReceipts = dayBook.transactions
        .filter((t) => t.type === "receipt")
        .reduce((s, t) => s + t.amount, 0);
    const totalPayments = dayBook.transactions
        .filter((t) => t.type === "payment")
        .reduce((s, t) => s + t.amount, 0);
    const closingBalance = dayBook.openingBalance + totalReceipts - totalPayments;
    return { ...dayBook, totalReceipts, totalPayments, closingBalance };
}

// ─── RECONCILIATION ──────────────────────────

/** Compute reconciliation based on current state */
export function computeReconciliation(
    dayBookClosing: number,
    lockerTotal: number,
    looseTotal: number,
    systemClosing: number,
    existingShortages: DailyCashierState["reconciliation"]["staffShortages"]
): ReconciliationRecord {
    const physicalTotal = lockerTotal + looseTotal;
    const difference = physicalTotal - systemClosing;
    return {
        id: `recon-${Date.now()}`,
        date: "",
        dayBookClosing,
        lockerTotal,
        looseTotal,
        physicalTotal,
        systemClosing,
        difference,
        excessAmount: Math.max(0, difference),
        shortAmount: Math.max(0, -difference),
        staffShortages: existingShortages,
        isReconciled: physicalTotal === dayBookClosing,
    };
}

// ─── FACTORY: EMPTY DAILY STATE ──────────────

export function createEmptyDailyCashierState(
    date: string,
    previousClosingBalance: number = 0,
    previousLockerClosing?: DenominationCount[]
): DailyCashierState {
    const lockerOpening = previousLockerClosing || emptyDenominations();

    return {
        id: `dcs-${date}-${Date.now()}`,
        date,
        dayBook: {
            id: `db-${date}`,
            date,
            openingBalance: previousClosingBalance,
            transactions: [],
            totalReceipts: 0,
            totalPayments: 0,
            closingBalance: previousClosingBalance,
            systemClosingBalance: undefined,
        },
        locker: {
            id: `lk-${date}`,
            date,
            openingDenominations: lockerOpening,
            deposited: emptyDenominations(),
            withdrawn: emptyDenominations(),
            closingDenominations: [...lockerOpening.map((d) => ({ ...d }))],
            openingTotal: calcLockerBundleTotal(lockerOpening),
            depositedTotal: 0,
            withdrawnTotal: 0,
            closingTotal: calcLockerBundleTotal(lockerOpening),
        },
        loose: {
            id: `ls-${date}`,
            date,
            noteDenominations: emptyDenominations(),
            coinDenominations: emptyCoinDenominations(),
            notesTotal: 0,
            coinsTotal: 0,
            grandTotal: 0,
        },
        reconciliation: {
            id: `recon-${date}`,
            date,
            dayBookClosing: previousClosingBalance,
            lockerTotal: calcLockerBundleTotal(lockerOpening),
            looseTotal: 0,
            physicalTotal: calcLockerBundleTotal(lockerOpening),
            systemClosing: 0,
            difference: 0,
            excessAmount: 0,
            shortAmount: 0,
            staffShortages: [],
            isReconciled: false,
        },
        staffAdvances: [],
        status: "draft",
    };
}
