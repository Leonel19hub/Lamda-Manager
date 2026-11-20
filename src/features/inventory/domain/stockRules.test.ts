import { describe, it, expect } from 'vitest'
import {
  getStockStatus,
  deductStock,
  addStock,
  validateTransfer,
  validateProductForm,
} from './stockRules'

describe('inventory/domain/stockRules', () => {
  describe('getStockStatus', () => {
    it('returns critical when stock is zero, negative, or NaN', () => {
      expect(getStockStatus(0, 10)).toBe('critical')
      expect(getStockStatus(-2, 10)).toBe('critical')
      expect(getStockStatus(NaN, 10)).toBe('critical')
    })

    it('returns low when stock is greater than zero but less than or equal to min', () => {
      expect(getStockStatus(5, 10)).toBe('low')
      expect(getStockStatus(10, 10)).toBe('low')
    })

    it('returns ok when stock is strictly greater than min', () => {
      expect(getStockStatus(11, 10)).toBe('ok')
      expect(getStockStatus(45, 15)).toBe('ok')
    })
  })

  describe('deductStock', () => {
    it('deducts stock correctly with decimal precision', () => {
      const res = deductStock(45.5, 3.2)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(42.3)
      }
    })

    it('floors to 0 if deducted quantity exceeds current stock', () => {
      const res = deductStock(5, 10)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(0)
      }
    })

    it('rejects non-positive or NaN deduction amounts', () => {
      const resZero = deductStock(20, 0)
      expect(resZero.success).toBe(false)
      if (!resZero.success) {
        expect(resZero.error.code).toBe('INVALID_DEDUCT_QUANTITY')
      }

      const resNeg = deductStock(20, -5)
      expect(resNeg.success).toBe(false)
      if (!resNeg.success) {
        expect(resNeg.error.code).toBe('INVALID_DEDUCT_QUANTITY')
      }

      const resNaN = deductStock(20, NaN)
      expect(resNaN.success).toBe(false)
    })

    it('treats negative starting stock as 0 when deducting', () => {
      const res = deductStock(-10, 5)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(0)
      }
    })
  })

  describe('validateTransfer', () => {
    it('accepts valid transfer when quantity is <= currentStock', () => {
      const res = validateTransfer(24, 12)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(12)
      }
    })

    it('rejects transfer when requested quantity exceeds available stock', () => {
      const res = validateTransfer(10, 15)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INSUFFICIENT_STOCK_FOR_TRANSFER')
      }
    })

    it('rejects zero, negative or NaN transfer quantities', () => {
      const resZero = validateTransfer(10, 0)
      expect(resZero.success).toBe(false)
      if (!resZero.success) {
        expect(resZero.error.code).toBe('INVALID_TRANSFER_QUANTITY')
      }

      const resNeg = validateTransfer(10, -3)
      expect(resNeg.success).toBe(false)
    })

    it('treats NaN currentStock as 0 in validateTransfer', () => {
      const res = validateTransfer(NaN, 5)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INSUFFICIENT_STOCK_FOR_TRANSFER')
      }
    })
  })

  describe('addStock', () => {
    it('adds stock correctly with decimal precision', () => {
      const res = addStock(12.5, 7.5)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(20)
      }
    })

    it('treats negative or NaN currentStock as 0', () => {
      const resNeg = addStock(-5, 10)
      expect(resNeg.success).toBe(true)
      if (resNeg.success) expect(resNeg.data).toBe(10)

      const resNaN = addStock(NaN, 10)
      expect(resNaN.success).toBe(true)
      if (resNaN.success) expect(resNaN.data).toBe(10)
    })

    it('rejects zero, negative or NaN quantity to add', () => {
      expect(addStock(10, 0)?.success).toBe(false)
      expect(addStock(10, -5)?.success).toBe(false)
      expect(addStock(10, NaN)?.success).toBe(false)
    })
  })

  describe('validateProductForm', () => {
    it('validates a complete and correct product form', () => {
      const res = validateProductForm({
        name: 'Tomate Perita',
        sku: 'TOM-PER-01',
        costPrice: 900,
        sellPrice: 1800,
        currentStock: 50,
        minStock: 10,
        unitsPerPack: 20,
      })
      expect(res.success).toBe(true)
    })

    it('validates a minimal product form without optional fields', () => {
      const res = validateProductForm({
        name: 'Producto Simple',
        sku: 'SIMPLE-01',
        costPrice: 500,
        sellPrice: 750,
      })
      expect(res.success).toBe(true)
    })

    it('rejects empty or whitespace name', () => {
      const res = validateProductForm({
        name: '   ',
        sku: 'TOM-01',
        costPrice: 100,
        sellPrice: 200,
      })
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error.code).toBe('EMPTY_PRODUCT_NAME')
    })

    it('rejects empty or whitespace SKU', () => {
      const res = validateProductForm({
        name: 'Papa Blanca',
        sku: '',
        costPrice: 100,
        sellPrice: 200,
      })
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error.code).toBe('EMPTY_SKU')
    })

    it('rejects invalid or negative cost and sell prices', () => {
      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: -10,
          sellPrice: 100,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: NaN,
          sellPrice: 100,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: -20,
        })?.success
      ).toBe(false)
    })

    it('rejects negative or NaN currentStock, minStock and unitsPerPack', () => {
      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          currentStock: -1,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          minStock: -5,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          unitsPerPack: 0,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          unitsPerPack: -10,
        })?.success
      ).toBe(false)
    })
  })
})
