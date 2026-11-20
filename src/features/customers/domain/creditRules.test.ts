import { describe, it, expect } from 'vitest'
import {
  calculateCreditUsagePct,
  getCreditStatus,
  applyPayment,
} from './creditRules'

describe('customers/domain/creditRules', () => {
  describe('calculateCreditUsagePct', () => {
    it('calculates credit limit usage percentage accurately', () => {
      // 18450 / 50000 = 36.9%
      expect(calculateCreditUsagePct(18450, 50000)).toBe(36.9)
      // 32600 / 40000 = 81.5%
      expect(calculateCreditUsagePct(32600, 40000)).toBe(81.5)
    })

    it('caps at 100% if debt exceeds limit', () => {
      expect(calculateCreditUsagePct(60000, 50000)).toBe(100)
    })

    it('returns 0 for zero or negative balance, or zero/invalid limit', () => {
      expect(calculateCreditUsagePct(0, 50000)).toBe(0)
      expect(calculateCreditUsagePct(-100, 50000)).toBe(0)
      expect(calculateCreditUsagePct(10000, 0)).toBe(0)
      expect(calculateCreditUsagePct(NaN, 50000)).toBe(0)
      expect(calculateCreditUsagePct(10000, NaN)).toBe(0)
    })
  })

  describe('getCreditStatus', () => {
    it('returns ok when debt is zero or negative', () => {
      expect(getCreditStatus(0, 50000)).toBe('ok')
      expect(getCreditStatus(-50, 50000)).toBe('ok')
      expect(getCreditStatus(NaN, 50000)).toBe('ok')
    })

    it('returns critical when debt reaches or exceeds 85% of limit', () => {
      // 85% of 50000 is 42500
      expect(getCreditStatus(42500, 50000)).toBe('critical')
      expect(getCreditStatus(48000, 50000)).toBe('critical')
    })

    it('returns warning when debt is active but below 85%', () => {
      expect(getCreditStatus(10000, 50000)).toBe('warning')
      expect(getCreditStatus(40000, 50000)).toBe('warning')
    })
  })

  describe('applyPayment', () => {
    it('reduces customer balance correctly', () => {
      const res = applyPayment(18450, 5000)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(13450)
      }
    })

    it('floors to 0 if payment covers or exceeds total debt', () => {
      const resFull = applyPayment(18450, 18450)
      expect(resFull.success).toBe(true)
      if (resFull.success) expect(resFull.data).toBe(0)

      const resExcess = applyPayment(18450, 20000)
      expect(resExcess.success).toBe(true)
      if (resExcess.success) expect(resExcess.data).toBe(0)
    })

    it('rejects zero or negative payment amounts', () => {
      const resZero = applyPayment(10000, 0)
      expect(resZero.success).toBe(false)
      if (!resZero.success) {
        expect(resZero.error.code).toBe('INVALID_PAYMENT_AMOUNT')
      }

      const resNeg = applyPayment(10000, -500)
      expect(resNeg.success).toBe(false)
    })

    it('rejects NaN payment amounts', () => {
      const resNaN = applyPayment(10000, NaN)
      expect(resNaN.success).toBe(false)
    })

    it('treats negative starting balance as 0', () => {
      const res = applyPayment(-50, 100)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(0)
      }
    })
  })
})
