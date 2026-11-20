import { describe, it, expect } from 'vitest'
import {
  calculateCreditUsagePct,
  getCreditStatus,
  applyPayment,
  calculateNewBalanceAfterCharge,
  validateCustomerForm,
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

  describe('calculateNewBalanceAfterCharge', () => {
    it('increases balance by charge amount accurately', () => {
      expect(calculateNewBalanceAfterCharge(10000, 2500)).toBe(12500)
      expect(calculateNewBalanceAfterCharge(0, 5400)).toBe(5400)
    })

    it('returns current balance if charge amount is 0, negative, or NaN', () => {
      expect(calculateNewBalanceAfterCharge(10000, 0)).toBe(10000)
      expect(calculateNewBalanceAfterCharge(10000, -500)).toBe(10000)
      expect(calculateNewBalanceAfterCharge(10000, NaN)).toBe(10000)
    })

    it('handles negative or NaN currentBalance safely', () => {
      expect(calculateNewBalanceAfterCharge(-100, 2000)).toBe(2000)
      expect(calculateNewBalanceAfterCharge(NaN, 3000)).toBe(3000)
      expect(calculateNewBalanceAfterCharge(NaN, 0)).toBe(0)
      expect(calculateNewBalanceAfterCharge(-50, -10)).toBe(0)
    })
  })

  describe('validateCustomerForm', () => {
    it('validates a correct customer input', () => {
      const result = validateCustomerForm({
        fullName: 'Juan Pérez',
        dniCuit: '20-12345678-9',
        phone: '1145678901',
        email: 'juan@gmail.com',
        address: 'Calle Falsa 123',
        creditLimit: 50000,
        type: 'persona',
      })
      expect(result.success).toBe(true)
    })

    it('allows 0 credit limit (fiado deshabilitado)', () => {
      const result = validateCustomerForm({
        fullName: 'Vecino Contado',
        creditLimit: 0,
      })
      expect(result.success).toBe(true)
    })

    it('fails if fullName is missing or too short', () => {
      const emptyRes = validateCustomerForm({
        fullName: '  ',
        creditLimit: 10000,
      })
      expect(emptyRes.success).toBe(false)
      if (!emptyRes.success) {
        expect(emptyRes.error.code).toBe('INVALID_NAME')
      }

      const shortRes = validateCustomerForm({
        fullName: 'A',
        creditLimit: 10000,
      })
      expect(shortRes.success).toBe(false)
    })

    it('fails if creditLimit is negative or NaN', () => {
      const negRes = validateCustomerForm({
        fullName: 'Carlos Méndez',
        creditLimit: -100,
      })
      expect(negRes.success).toBe(false)
      if (!negRes.success) {
        expect(negRes.error.code).toBe('INVALID_CREDIT_LIMIT')
      }

      const nanRes = validateCustomerForm({
        fullName: 'Carlos Méndez',
        creditLimit: NaN,
      })
      expect(nanRes.success).toBe(false)
    })

    it('validates email format if email is provided', () => {
      const invalidEmail = validateCustomerForm({
        fullName: 'Carlos Méndez',
        creditLimit: 10000,
        email: 'invalid-email',
      })
      expect(invalidEmail.success).toBe(false)
      if (!invalidEmail.success) {
        expect(invalidEmail.error.code).toBe('INVALID_EMAIL')
      }

      const validEmail = validateCustomerForm({
        fullName: 'Carlos Méndez',
        creditLimit: 10000,
        email: 'carlos@example.com',
      })
      expect(validEmail.success).toBe(true)
    })
  })
})
