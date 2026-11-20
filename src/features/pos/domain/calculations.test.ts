import { describe, it, expect } from 'vitest'
import {
  calculateItemSubtotal,
  calculateCartSubtotal,
  calculateSplitPaymentsTotal,
  calculateLegalRounding,
  calculateCartTotal,
  calculateChange,
  mergeOrAddItem,
} from './calculations'
import type { CartItem } from '@/types'

describe('pos/domain/calculations', () => {
  describe('calculateItemSubtotal', () => {
    it('calculates subtotal for weighed items with decimals', () => {
      // 1.350 kg * 1890 $/kg = 2551.5
      expect(calculateItemSubtotal(1.35, 1890)).toBe(2551.5)
    })

    it('calculates subtotal for unit items', () => {
      expect(calculateItemSubtotal(3, 1420)).toBe(4260)
    })

    it('handles floating point precision gracefully', () => {
      // 0.1 * 0.2 = 0.02
      expect(calculateItemSubtotal(0.1, 0.2)).toBe(0.02)
    })

    it('returns 0 for zero or negative values', () => {
      expect(calculateItemSubtotal(0, 1000)).toBe(0)
      expect(calculateItemSubtotal(1, 0)).toBe(0)
      expect(calculateItemSubtotal(-2, 500)).toBe(0)
      expect(calculateItemSubtotal(2, -500)).toBe(0)
    })

    it('returns 0 for NaN or infinite inputs', () => {
      expect(calculateItemSubtotal(NaN, 100)).toBe(0)
      expect(calculateItemSubtotal(2, Infinity)).toBe(0)
      expect(calculateItemSubtotal(2, 100, NaN)).toBe(0)
    })

    it('applies discount percentage correctly', () => {
      // 2 units * $1000 = $2000, 10% off = $1800
      expect(calculateItemSubtotal(2, 1000, 10)).toBe(1800)
      // Clamps discount between 0 and 100
      expect(calculateItemSubtotal(2, 1000, -10)).toBe(2000)
      expect(calculateItemSubtotal(2, 1000, 150)).toBe(0)
    })
  })

  describe('calculateSplitPaymentsTotal', () => {
    it('sums positive amounts of split payments accurately', () => {
      expect(
        calculateSplitPaymentsTotal([
          { amount: 5000 },
          { amount: 3500.5 },
          { amount: 1200 },
        ])
      ).toBe(9700.5)
    })

    it('ignores negative or NaN amounts and returns 0 for empty array', () => {
      expect(calculateSplitPaymentsTotal([])).toBe(0)
      expect(
        calculateSplitPaymentsTotal([
          { amount: 1000 },
          { amount: -500 },
          { amount: NaN },
        ])
      ).toBe(1000)
    })
  })

  describe('calculateCartSubtotal', () => {
    it('sums subtotals of all cart items accurately', () => {
      const items: CartItem[] = [
        {
          id: '1',
          productId: 'p1',
          productName: 'Tomate',
          saleType: 'weight',
          quantity: 1.35,
          unitPrice: 1890,
          costPrice: 950,
          subtotal: 2551.5,
        },
        {
          id: '2',
          productId: 'p2',
          productName: 'Aceite',
          saleType: 'unit',
          quantity: 2,
          unitPrice: 2350,
          costPrice: 1650,
          subtotal: 4700,
        },
      ]
      expect(calculateCartSubtotal(items)).toBe(7251.5)
    })

    it('returns 0 for an empty cart', () => {
      expect(calculateCartSubtotal([])).toBe(0)
    })
  })

  describe('calculateLegalRounding and calculateCartTotal', () => {
    it('rounds subtotal to nearest multiple of 10 pesos (Argentine cash rounding)', () => {
      // 12863.50 -> rounds to 12860.00 (difference = -3.50)
      expect(calculateCartTotal(12863.5)).toBe(12860)
      expect(calculateLegalRounding(12863.5)).toBe(-3.5)

      // 12866.00 -> rounds to 12870.00 (difference = +4.00)
      expect(calculateCartTotal(12866)).toBe(12870)
      expect(calculateLegalRounding(12866)).toBe(4)

      // 12860.00 -> rounds to 12860.00 (difference = 0)
      expect(calculateCartTotal(12860)).toBe(12860)
      expect(calculateLegalRounding(12860)).toBe(0)
    })

    it('returns 0 for non-positive or invalid subtotal', () => {
      expect(calculateCartTotal(0)).toBe(0)
      expect(calculateCartTotal(-50)).toBe(0)
      expect(calculateCartTotal(NaN)).toBe(0)

      expect(calculateLegalRounding(0)).toBe(0)
      expect(calculateLegalRounding(-10)).toBe(0)
      expect(calculateLegalRounding(NaN)).toBe(0)
    })
  })

  describe('calculateChange', () => {
    it('calculates correct change when amountPaid > total', () => {
      expect(calculateChange(12860, 15000)).toBe(2140)
    })

    it('returns 0 when amountPaid equals total', () => {
      expect(calculateChange(12860, 12860)).toBe(0)
    })

    it('returns 0 when amountPaid is insufficient', () => {
      expect(calculateChange(12860, 10000)).toBe(0)
    })

    it('returns 0 when inputs are NaN or invalid', () => {
      expect(calculateChange(NaN, 1000)).toBe(0)
      expect(calculateChange(1000, NaN)).toBe(0)
    })
  })

  describe('mergeOrAddItem', () => {
    const baseItems: CartItem[] = [
      {
        id: 'item-1',
        productId: 'prod-unit',
        productName: 'Leche',
        saleType: 'unit',
        quantity: 1,
        unitPrice: 1400,
        costPrice: 1000,
        subtotal: 1400,
      },
    ]

    it('increments quantity and updates subtotal for existing unit product', () => {
      const newItem: CartItem = {
        id: 'item-new',
        productId: 'prod-unit',
        productName: 'Leche',
        saleType: 'unit',
        quantity: 2,
        unitPrice: 1400,
        costPrice: 1000,
        subtotal: 2800,
      }

      const result = mergeOrAddItem(baseItems, newItem)
      expect(result.length).toBe(1)
      expect(result[0].quantity).toBe(3)
      expect(result[0].subtotal).toBe(4200)
    })

    it('appends as new item if unit product does not exist in cart', () => {
      const newItem: CartItem = {
        id: 'item-other',
        productId: 'prod-other',
        productName: 'Yerba',
        saleType: 'unit',
        quantity: 1,
        unitPrice: 3800,
        costPrice: 2800,
        subtotal: 3800,
      }

      const result = mergeOrAddItem(baseItems, newItem)
      expect(result.length).toBe(2)
      expect(result[1].productId).toBe('prod-other')
    })

    it('always appends weighed products as distinct line items', () => {
      const weighedItem: CartItem = {
        id: 'item-weight-1',
        productId: 'prod-weight',
        productName: 'Tomate',
        saleType: 'weight',
        quantity: 1.2,
        unitPrice: 1800,
        costPrice: 1000,
        subtotal: 2160,
      }

      const secondWeighed: CartItem = {
        id: 'item-weight-2',
        productId: 'prod-weight',
        productName: 'Tomate',
        saleType: 'weight',
        quantity: 0.8,
        unitPrice: 1800,
        costPrice: 1000,
        subtotal: 1440,
      }

      const step1 = mergeOrAddItem([], weighedItem)
      const step2 = mergeOrAddItem(step1, secondWeighed)

      expect(step2.length).toBe(2)
      expect(step2[0].quantity).toBe(1.2)
      expect(step2[1].quantity).toBe(0.8)
    })
  })
})
