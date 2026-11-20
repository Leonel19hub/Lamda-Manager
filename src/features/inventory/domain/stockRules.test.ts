import { describe, it, expect } from 'vitest'
import { getStockStatus, deductStock, validateTransfer } from './stockRules'

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
})
