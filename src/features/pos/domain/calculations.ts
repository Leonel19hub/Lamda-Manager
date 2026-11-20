import type { CartItem } from '@/types'

/**
 * Calculates the monetary subtotal for a single cart item.
 * Guarantees 2-decimal precision and sanitizes negative/NaN values.
 */
export function calculateItemSubtotal(quantity: number, unitPrice: number): number {
  if (isNaN(quantity) || isNaN(unitPrice) || !isFinite(quantity) || !isFinite(unitPrice)) {
    return 0
  }
  if (quantity <= 0 || unitPrice <= 0) {
    return 0
  }
  return Math.round(quantity * unitPrice * 100) / 100
}

/**
 * Calculates the gross subtotal of all items in the cart.
 */
export function calculateCartSubtotal(items: readonly CartItem[]): number {
  const sum = items.reduce((acc, item) => acc + item.subtotal, 0)
  return Math.round(sum * 100) / 100
}

/**
 * Calculates the legal rounding difference according to Argentine cash settlement rule (rounded to $10).
 * Returns the rounding delta (can be positive, zero, or negative).
 */
export function calculateLegalRounding(subtotal: number): number {
  if (isNaN(subtotal) || !isFinite(subtotal) || subtotal <= 0) {
    return 0
  }
  const roundedTotal = Math.round(subtotal / 10) * 10
  return Math.round((roundedTotal - subtotal) * 100) / 100
}

/**
 * Calculates the final total to collect after legal rounding.
 * Floor is always 0.
 */
export function calculateCartTotal(subtotal: number): number {
  if (isNaN(subtotal) || !isFinite(subtotal) || subtotal <= 0) {
    return 0
  }
  return Math.max(0, Math.round(subtotal / 10) * 10)
}

/**
 * Calculates the cash change to return to the customer.
 * If amountPaid < total, returns 0.
 */
export function calculateChange(total: number, amountPaid: number): number {
  if (isNaN(total) || isNaN(amountPaid) || !isFinite(total) || !isFinite(amountPaid)) {
    return 0
  }
  if (amountPaid <= total) {
    return 0
  }
  return Math.round((amountPaid - total) * 100) / 100
}

/**
 * Merges a new item into cart:
 * If the item is sold by unit and already exists, increments quantity.
 * Weighed items or distinct items are appended without mutation.
 */
export function mergeOrAddItem(
  items: readonly CartItem[],
  newItem: CartItem
): CartItem[] {
  if (newItem.saleType === 'unit') {
    const existingIndex = items.findIndex(
      (i) => i.productId === newItem.productId && i.saleType === 'unit'
    )

    if (existingIndex !== -1) {
      const existing = items[existingIndex]
      const mergedQuantity = Math.round((existing.quantity + newItem.quantity) * 1000) / 1000
      const mergedSubtotal = calculateItemSubtotal(mergedQuantity, existing.unitPrice)

      const updated = [...items]
      updated[existingIndex] = {
        ...existing,
        quantity: mergedQuantity,
        subtotal: mergedSubtotal,
      }
      return updated
    }
  }

  return [...items, { ...newItem }]
}
