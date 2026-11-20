import { describe, it, expect } from 'vitest'
import {
  calculateBillSubtotal,
  calculateTotalCounted,
  calculateCashDifference,
  calculateMovementDelta,
} from './cashCalculations'

describe('cash-register/domain/cashCalculations', () => {
  describe('calculateBillSubtotal', () => {
    it('multiplies denomination by count correctly', () => {
      expect(calculateBillSubtotal(10000, 3)).toBe(30000)
      expect(calculateBillSubtotal(20000, 2)).toBe(40000)
      expect(calculateBillSubtotal(500, 5)).toBe(2500)
    })

    it('returns 0 when count is 0 or negative', () => {
      expect(calculateBillSubtotal(10000, 0)).toBe(0)
      expect(calculateBillSubtotal(10000, -2)).toBe(0)
      expect(calculateBillSubtotal(-500, 5)).toBe(0)
    })

    it('returns 0 for NaN or infinite numbers', () => {
      expect(calculateBillSubtotal(NaN, 5)).toBe(0)
      expect(calculateBillSubtotal(1000, NaN)).toBe(0)
      expect(calculateBillSubtotal(Infinity, 1)).toBe(0)
    })
  })

  describe('calculateTotalCounted', () => {
    it('sums all denominations accurately in Argentine peso bill breakdown', () => {
      const bills = [
        { denomination: 20000, count: 2 }, // 40000
        { denomination: 10000, count: 3 }, // 30000
        { denomination: 5000, count: 2 },  // 10000
        { denomination: 2000, count: 2 },  // 4000
        { denomination: 1000, count: 1 },  // 1000
        { denomination: 200, count: 1 },   // 200
      ]
      expect(calculateTotalCounted(bills)).toBe(85200)
    })

    it('returns 0 for empty array', () => {
      expect(calculateTotalCounted([])).toBe(0)
    })
  })

  describe('calculateCashDifference', () => {
    it('calculates 0 when counted equals expected', () => {
      expect(calculateCashDifference(85200, 85200)).toBe(0)
    })

    it('calculates surplus (positive) when physical cash exceeds expected', () => {
      expect(calculateCashDifference(86000, 85200)).toBe(800)
    })

    it('calculates shortage (negative) when physical cash is less than expected', () => {
      expect(calculateCashDifference(84500, 85200)).toBe(-700)
    })

    it('handles NaN safely', () => {
      expect(calculateCashDifference(NaN, 85200)).toBe(0)
      expect(calculateCashDifference(85200, NaN)).toBe(0)
    })
  })

  describe('calculateMovementDelta', () => {
    it('returns positive delta for income', () => {
      expect(calculateMovementDelta('income', 5000)).toBe(5000)
    })

    it('returns negative delta for expense', () => {
      expect(calculateMovementDelta('expense', 2500)).toBe(-2500)
    })

    it('returns positive delta for adjustment', () => {
      expect(calculateMovementDelta('adjustment', 1200)).toBe(1200)
    })

    it('returns 0 for unrecognized movement type', () => {
      expect(calculateMovementDelta('unknown' as unknown as 'income', 100)).toBe(0)
    })

    it('returns 0 for zero or negative amounts or NaN', () => {
      expect(calculateMovementDelta('income', 0)).toBe(0)
      expect(calculateMovementDelta('income', -100)).toBe(0)
      expect(calculateMovementDelta('expense', NaN)).toBe(0)
    })
  })
})
