import { describe, it, expect } from 'vitest'
import {
  calculateBillSubtotal,
  calculateTotalCounted,
  calculateCashDifference,
  calculateMovementDelta,
  validateShiftOpening,
  validateCashMovement,
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
    it('returns positive delta for income, ingreso, apertura, adjustment, ajuste', () => {
      expect(calculateMovementDelta('income', 5000)).toBe(5000)
      expect(calculateMovementDelta('ingreso', 5000)).toBe(5000)
      expect(calculateMovementDelta('apertura', 15000)).toBe(15000)
      expect(calculateMovementDelta('adjustment', 1200)).toBe(1200)
      expect(calculateMovementDelta('ajuste', 800)).toBe(800)
    })

    it('returns negative delta for expense, egreso, retiro', () => {
      expect(calculateMovementDelta('expense', 2500)).toBe(-2500)
      expect(calculateMovementDelta('egreso', 1000)).toBe(-1000)
      expect(calculateMovementDelta('retiro', 20000)).toBe(-20000)
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

  describe('validateShiftOpening', () => {
    it('validates successful opening parameters', () => {
      const result = validateShiftOpening({
        registerNumber: 'Caja 01',
        shiftName: 'Turno Mañana',
        openedBy: 'user-01',
        openingAmount: 15000,
      })
      expect(result.success).toBe(true)
    })

    it('allows 0 opening amount (caja vacía)', () => {
      const result = validateShiftOpening({
        registerNumber: 'Caja 01',
        shiftName: 'Turno Mañana',
        openedBy: 'user-01',
        openingAmount: 0,
      })
      expect(result.success).toBe(true)
    })

    it('fails if registerNumber is missing or whitespace', () => {
      const result = validateShiftOpening({
        registerNumber: '   ',
        shiftName: 'Turno Mañana',
        openedBy: 'user-01',
        openingAmount: 15000,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_REGISTER_NUMBER')
      }
    })

    it('fails if shiftName is missing or whitespace', () => {
      const result = validateShiftOpening({
        registerNumber: 'Caja 01',
        shiftName: '',
        openedBy: 'user-01',
        openingAmount: 15000,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_SHIFT_NAME')
      }
    })

    it('fails if openedBy is missing or whitespace', () => {
      const result = validateShiftOpening({
        registerNumber: 'Caja 01',
        shiftName: 'Turno Mañana',
        openedBy: '',
        openingAmount: 15000,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_OPENED_BY')
      }
    })

    it('fails if openingAmount is negative or NaN', () => {
      const negativeResult = validateShiftOpening({
        registerNumber: 'Caja 01',
        shiftName: 'Turno Mañana',
        openedBy: 'user-01',
        openingAmount: -500,
      })
      expect(negativeResult.success).toBe(false)
      if (!negativeResult.success) {
        expect(negativeResult.error.code).toBe('INVALID_OPENING_AMOUNT')
      }

      const nanResult = validateShiftOpening({
        registerNumber: 'Caja 01',
        shiftName: 'Turno Mañana',
        openedBy: 'user-01',
        openingAmount: NaN,
      })
      expect(nanResult.success).toBe(false)
      if (!nanResult.success) {
        expect(nanResult.error.code).toBe('INVALID_OPENING_AMOUNT')
      }
    })
  })

  describe('validateCashMovement', () => {
    it('validates valid income movement', () => {
      const result = validateCashMovement({
        amount: 2500,
        description: 'Cobro de fiado cliente',
        type: 'ingreso',
        expectedCash: 10000,
      })
      expect(result.success).toBe(true)
    })

    it('validates valid withdrawal when funds are sufficient', () => {
      const result = validateCashMovement({
        amount: 5000,
        description: 'Retiro de seguridad a caja fuerte',
        type: 'retiro',
        expectedCash: 15000,
      })
      expect(result.success).toBe(true)
    })

    it('fails if amount is 0, negative, or NaN', () => {
      const zeroResult = validateCashMovement({
        amount: 0,
        description: 'Test',
        type: 'egreso',
        expectedCash: 10000,
      })
      expect(zeroResult.success).toBe(false)
      if (!zeroResult.success) {
        expect(zeroResult.error.code).toBe('INVALID_AMOUNT')
      }

      const negativeResult = validateCashMovement({
        amount: -100,
        description: 'Test',
        type: 'egreso',
        expectedCash: 10000,
      })
      expect(negativeResult.success).toBe(false)
    })

    it('fails if description is too short or empty', () => {
      const emptyResult = validateCashMovement({
        amount: 1000,
        description: '  ',
        type: 'ingreso',
        expectedCash: 10000,
      })
      expect(emptyResult.success).toBe(false)
      if (!emptyResult.success) {
        expect(emptyResult.error.code).toBe('INVALID_DESCRIPTION')
      }

      const shortResult = validateCashMovement({
        amount: 1000,
        description: 'ab',
        type: 'ingreso',
        expectedCash: 10000,
      })
      expect(shortResult.success).toBe(false)
    })

    it('fails if withdrawal or expense exceeds expected cash in drawer', () => {
      const expenseFail = validateCashMovement({
        amount: 12000,
        description: 'Pago a proveedor de sodas',
        type: 'expense',
        expectedCash: 10000,
      })
      expect(expenseFail.success).toBe(false)
      if (!expenseFail.success) {
        expect(expenseFail.error.code).toBe('INSUFFICIENT_FUNDS')
      }

      const retiroFail = validateCashMovement({
        amount: 15000,
        description: 'Retiro de seguridad',
        type: 'retiro',
        expectedCash: 10000,
      })
      expect(retiroFail.success).toBe(false)
      if (!retiroFail.success) {
        expect(retiroFail.error.code).toBe('INSUFFICIENT_FUNDS')
      }
    })
  })
})
