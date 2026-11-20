import type { CashMovementType } from '@/types'

export interface BillItem {
  denomination: number
  count: number
}

/**
 * Calculates subtotal for a single bill denomination count.
 * Returns 0 if count or denomination is negative or invalid.
 */
export function calculateBillSubtotal(denomination: number, count: number): number {
  if (
    isNaN(denomination) ||
    isNaN(count) ||
    !isFinite(denomination) ||
    !isFinite(count) ||
    denomination <= 0 ||
    count <= 0
  ) {
    return 0
  }
  return Math.round(denomination * count * 100) / 100
}

/**
 * Calculates total counted physical cash from an array of bill items.
 */
export function calculateTotalCounted(bills: readonly BillItem[]): number {
  return bills.reduce((acc, bill) => acc + calculateBillSubtotal(bill.denomination, bill.count), 0)
}

/**
 * Calculates difference between physical counted cash and system expected cash.
 * Positive = surplus, Negative = shortage, 0 = balanced.
 */
export function calculateCashDifference(countedCash: number, expectedCash: number): number {
  if (isNaN(countedCash) || isNaN(expectedCash) || !isFinite(countedCash) || !isFinite(expectedCash)) {
    return 0
  }
  return Math.round((countedCash - expectedCash) * 100) / 100
}

/**
 * Calculates the cash register delta resulting from a manual cash movement.
 */
export function calculateMovementDelta(type: CashMovementType, amount: number): number {
  if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
    return 0
  }
  const cleanAmount = Math.round(amount * 100) / 100
  switch (type) {
    case 'income':
      return cleanAmount
    case 'expense':
      return -cleanAmount
    case 'adjustment':
      return cleanAmount
    default:
      return 0
  }
}
