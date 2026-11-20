import type { CartItem, Product, PaymentMethod } from '@/types'

/**
 * Calculates the monetary subtotal for a single cart item.
 * Guarantees 2-decimal precision, sanitizes negative/NaN values, and supports optional discount percentage.
 */
export function calculateItemSubtotal(
  quantity: number,
  unitPrice: number,
  discountPercent = 0
): number {
  if (
    isNaN(quantity) ||
    isNaN(unitPrice) ||
    !isFinite(quantity) ||
    !isFinite(unitPrice) ||
    isNaN(discountPercent) ||
    !isFinite(discountPercent)
  ) {
    return 0
  }
  if (quantity <= 0 || unitPrice <= 0) {
    return 0
  }
  const safeDiscount = Math.max(0, Math.min(100, discountPercent))
  const rawSubtotal = quantity * unitPrice * (1 - safeDiscount / 100)
  return Math.round(rawSubtotal * 100) / 100
}

/**
 * Calculates the gross subtotal of all items in the cart.
 */
export function calculateCartSubtotal(items: readonly CartItem[]): number {
  const sum = items.reduce((acc, item) => acc + item.subtotal, 0)
  return Math.round(sum * 100) / 100
}

/**
 * Calculates the total of split payments.
 */
export function calculateSplitPaymentsTotal(
  payments: readonly { amount: number }[]
): number {
  const sum = payments.reduce((acc, p) => {
    if (isNaN(p.amount) || !isFinite(p.amount) || p.amount <= 0) return acc
    return acc + p.amount
  }, 0)
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
 * If the item is sold by unit and already exists, increments quantity in that line
 * preserving any previously applied discount (RF-01.2).
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
      const preservedDiscount = existing.discountPercent || 0
      const mergedSubtotal = calculateItemSubtotal(
        mergedQuantity,
        existing.unitPrice,
        preservedDiscount
      )

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

/**
 * Creates a fully typed and calculated CartItem from a Product and desired quantity.
 */
export function createCartItem(
  product: Readonly<Product>,
  quantity: number,
  discountPercent = 0,
  idGenerator?: () => string
): CartItem {
  const safeQuantity = Math.max(0, isNaN(quantity) || !isFinite(quantity) ? 0 : quantity)
  const safeDiscount = Math.max(0, Math.min(100, isNaN(discountPercent) || !isFinite(discountPercent) ? 0 : discountPercent))
  const subtotal = calculateItemSubtotal(safeQuantity, product.sellPrice, safeDiscount)

  const id = idGenerator
    ? idGenerator()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id,
    productId: product.id,
    productName: product.name,
    productSku: product.sku || product.pluCode || product.barcode || 'SKU-GEN',
    saleType: product.saleType,
    quantity: safeQuantity,
    unitPrice: product.sellPrice,
    costPrice: product.costPrice,
    discountPercent: safeDiscount > 0 ? safeDiscount : undefined,
    subtotal,
    pluCode: product.pluCode,
    barcode: product.barcode,
  }
}

/**
 * Calculates initial 50/50 split defaults for mixed payments.
 */
export function calculateSplitDefaults(
  total: number
): { cash: number; digital: number } {
  if (isNaN(total) || !isFinite(total) || total <= 0) {
    return { cash: 0, digital: 0 }
  }
  const cash = Math.round((total / 2) * 100) / 100
  const digital = Math.round((total - cash) * 100) / 100
  return { cash, digital }
}

/**
 * Calculates final ticket total depending on payment method.
 * Rounds to $10 multiples exclusively for cash (RF-04.2, RF-04.3).
 */
export function calculateCheckoutTotal(
  subtotal: number,
  paymentMethod: PaymentMethod
): number {
  if (isNaN(subtotal) || !isFinite(subtotal) || subtotal <= 0) {
    return 0
  }
  if (paymentMethod === 'efectivo') {
    return calculateCartTotal(subtotal)
  }
  return Math.round(subtotal * 100) / 100
}
