import { describe, it, expect } from 'vitest'
import {
  calculateItemSubtotal,
  calculateCartSubtotal,
  calculateSplitPaymentsTotal,
  calculateLegalRounding,
  calculateCartTotal,
  calculateChange,
  mergeOrAddItem,
  createCartItem,
  calculateSplitDefaults,
  calculateCheckoutTotal,
} from './calculations'
import type { CartItem, Product } from '@/types'

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

    it('merges unit items and preserves already applied discount on the existing line (RF-01.2)', () => {
      const existingItem: CartItem = {
        id: 'item-unit-1',
        productId: 'prod-milk',
        productName: 'Leche La Serenísima',
        saleType: 'unit',
        quantity: 1,
        unitPrice: 1500,
        costPrice: 1000,
        discountPercent: 10,
        subtotal: 1350, // 1 * 1500 * 0.9
      }

      const scannedAgain: CartItem = {
        id: 'item-unit-2',
        productId: 'prod-milk',
        productName: 'Leche La Serenísima',
        saleType: 'unit',
        quantity: 1,
        unitPrice: 1500,
        costPrice: 1000,
        subtotal: 1500,
      }

      const merged = mergeOrAddItem([existingItem], scannedAgain)
      expect(merged.length).toBe(1)
      expect(merged[0].quantity).toBe(2)
      expect(merged[0].discountPercent).toBe(10)
      expect(merged[0].subtotal).toBe(2700) // 2 * 1500 * 0.9 = 2700
    })
  })

  describe('createCartItem', () => {
    const mockProduct: Product = {
      id: 'prod-01',
      name: 'Fideos Guiseros',
      saleType: 'unit',
      costPrice: 600,
      sellPrice: 950,
      marginPct: 36.8,
      sku: 'SKU-FID-01',
      barcode: '7791234567890',
      unitsPerPack: 1,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }

    it('creates a unit cart item with correct values and default ID', () => {
      const item = createCartItem(mockProduct, 2)
      expect(item.productId).toBe('prod-01')
      expect(item.productName).toBe('Fideos Guiseros')
      expect(item.quantity).toBe(2)
      expect(item.unitPrice).toBe(950)
      expect(item.subtotal).toBe(1900)
      expect(item.productSku).toBe('SKU-FID-01')
      expect(item.id).toMatch(/^item-/)
    })

    it('creates a weight cart item with gram precision', () => {
      const weightProduct: Product = {
        ...mockProduct,
        id: 'prod-weigh',
        name: 'Papas Blancas',
        saleType: 'weight',
        pluCode: '102',
        sellPrice: 800,
      }
      const item = createCartItem(weightProduct, 1.455)
      expect(item.saleType).toBe('weight')
      expect(item.quantity).toBe(1.455)
      expect(item.subtotal).toBe(1164)
      expect(item.pluCode).toBe('102')
    })

    it('applies discount and calculates subtotal accordingly', () => {
      const item = createCartItem(mockProduct, 3, 10)
      expect(item.discountPercent).toBe(10)
      // 3 * 950 = 2850, 10% off = 2565
      expect(item.subtotal).toBe(2565)
    })

    it('uses custom idGenerator when provided', () => {
      const item = createCartItem(mockProduct, 1, 0, () => 'custom-id-123')
      expect(item.id).toBe('custom-id-123')
    })

    it('sanitizes negative or NaN quantities to 0', () => {
      const itemNeg = createCartItem(mockProduct, -5)
      expect(itemNeg.quantity).toBe(0)
      expect(itemNeg.subtotal).toBe(0)

      const itemNaN = createCartItem(mockProduct, NaN, NaN)
      expect(itemNaN.quantity).toBe(0)
      expect(itemNaN.subtotal).toBe(0)
    })

    it('falls back to pluCode, barcode or SKU-GEN when product sku is missing', () => {
      const prodNoSku: Product = {
        ...mockProduct,
        sku: undefined,
        pluCode: 'PLU-123',
      }
      expect(createCartItem(prodNoSku, 1).productSku).toBe('PLU-123')

      const prodBarcodeOnly: Product = {
        ...mockProduct,
        sku: undefined,
        pluCode: undefined,
        barcode: 'BAR-789',
      }
      expect(createCartItem(prodBarcodeOnly, 1).productSku).toBe('BAR-789')

      const prodNothing: Product = {
        ...mockProduct,
        sku: undefined,
        pluCode: undefined,
        barcode: undefined,
      }
      expect(createCartItem(prodNothing, 1).productSku).toBe('SKU-GEN')
    })
  })

  describe('calculateSplitDefaults', () => {
    it('splits total into 50% cash and 50% digital', () => {
      const split1 = calculateSplitDefaults(10000)
      expect(split1.cash).toBe(5000)
      expect(split1.digital).toBe(5000)
      expect(split1.cash + split1.digital).toBe(10000)
    })

    it('handles odd cents accurately without rounding loss', () => {
      const split = calculateSplitDefaults(1550.75)
      expect(split.cash).toBe(775.38)
      expect(split.digital).toBe(775.37)
      expect(split.cash + split.digital).toBe(1550.75)
    })

    it('returns zeroes for zero, negative or NaN totals', () => {
      expect(calculateSplitDefaults(0)).toEqual({ cash: 0, digital: 0 })
      expect(calculateSplitDefaults(-500)).toEqual({ cash: 0, digital: 0 })
      expect(calculateSplitDefaults(NaN)).toEqual({ cash: 0, digital: 0 })
    })
  })

  describe('calculateCheckoutTotal', () => {
    it('rounds to $10 multiples exclusively for cash payments (RF-04.3)', () => {
      // Multiple of 10 rounding (round to nearest)
      expect(calculateCheckoutTotal(1895, 'efectivo')).toBe(1900)
      expect(calculateCheckoutTotal(1894.99, 'efectivo')).toBe(1890)
      expect(calculateCheckoutTotal(1890, 'efectivo')).toBe(1890)
    })

    it('keeps exact cents for digital, debit, credit and on-account methods (RF-04.2)', () => {
      expect(calculateCheckoutTotal(1895.4, 'debito')).toBe(1895.4)
      expect(calculateCheckoutTotal(1895.4, 'credito')).toBe(1895.4)
      expect(calculateCheckoutTotal(1895.4, 'transferencia_qr')).toBe(1895.4)
      expect(calculateCheckoutTotal(1895.4, 'cuenta_corriente')).toBe(1895.4)
      expect(calculateCheckoutTotal(1895.4, 'mixto')).toBe(1895.4)
    })

    it('returns 0 for zero, negative, or NaN subtotal', () => {
      expect(calculateCheckoutTotal(0, 'efectivo')).toBe(0)
      expect(calculateCheckoutTotal(-100, 'debito')).toBe(0)
      expect(calculateCheckoutTotal(NaN, 'efectivo')).toBe(0)
    })
  })
})
