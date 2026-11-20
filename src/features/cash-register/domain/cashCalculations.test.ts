import { describe, it, expect } from 'vitest'
import {
  calculateBillSubtotal,
  calculateTotalCounted,
  calculateCashDifference,
  calculateMovementDelta,
  validateShiftOpening,
  validateCashMovement,
  applySaleToRegister,
} from './cashCalculations'
import type { CashRegister, Sale, PaymentMethod } from '@/types'

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

  describe('applySaleToRegister', () => {
    const baseRegister: CashRegister = {
      id: 'reg-01',
      registerNumber: 'Caja 1',
      branchId: 'branch-01',
      openedBy: 'user-01',
      openingAmount: 10000,
      expectedCash: 10000,
      totalCard: 0,
      totalTransfer: 0,
      totalAccount: 0,
      openedAt: '2026-03-01T08:00:00Z',
      isOpen: true,
    }

    const createSale = (overrides: Partial<Sale> = {}): Sale => ({
      id: 'sale-01',
      ticketNumber: '0001-00000001',
      registerId: 'reg-01',
      subtotal: 1500,
      total: 1500,
      paymentMethod: 'efectivo',
      createdAt: '2026-03-01T10:00:00Z',
      ...overrides,
    })

    it('accumulates cash sales into expectedCash and preserves inmutability', () => {
      const sale = createSale({ total: 1500, paymentMethod: 'efectivo' })
      const updated = applySaleToRegister(baseRegister, sale)

      expect(updated.expectedCash).toBe(11500)
      expect(updated.totalCard).toBe(0)
      expect(updated.totalTransfer).toBe(0)
      expect(updated.totalAccount).toBe(0)
      // Pure function: original register unmodified
      expect(baseRegister.expectedCash).toBe(10000)
    })

    it('accumulates debit and credit card sales into totalCard', () => {
      const debitSale = createSale({ total: 2500.5, paymentMethod: 'debito' })
      const regAfterDebit = applySaleToRegister(baseRegister, debitSale)
      expect(regAfterDebit.totalCard).toBe(2500.5)
      expect(regAfterDebit.expectedCash).toBe(10000)

      const creditSale = createSale({ total: 3200, paymentMethod: 'credito' })
      const regAfterCredit = applySaleToRegister(regAfterDebit, creditSale)
      expect(regAfterCredit.totalCard).toBe(5700.5)
    })

    it('accumulates QR and bank transfer sales into totalTransfer', () => {
      const qrSale = createSale({ total: 4200.75, paymentMethod: 'transferencia_qr' })
      const updated = applySaleToRegister(baseRegister, qrSale)
      expect(updated.totalTransfer).toBe(4200.75)
      expect(updated.expectedCash).toBe(10000)
    })

    it('accumulates on-account (fiado) sales into totalAccount', () => {
      const accountSale = createSale({ total: 6000, paymentMethod: 'cuenta_corriente' })
      const updated = applySaleToRegister(baseRegister, accountSale)
      expect(updated.totalAccount).toBe(6000)
      expect(updated.expectedCash).toBe(10000)
    })

    it('correctly allocates each split payment in a mixed payment', () => {
      const mixedSale = createSale({
        total: 10000,
        paymentMethod: 'mixto',
        splitPayments: [
          { id: 'sp-1', method: 'efectivo', amount: 3000 },
          { id: 'sp-2', method: 'debito', amount: 2500 },
          { id: 'sp-3', method: 'transferencia_qr', amount: 2000 },
          { id: 'sp-4', method: 'cuenta_corriente', amount: 2500 },
        ],
      })

      const updated = applySaleToRegister(baseRegister, mixedSale)
      expect(updated.expectedCash).toBe(13000)
      expect(updated.totalCard).toBe(2500)
      expect(updated.totalTransfer).toBe(2000)
      expect(updated.totalAccount).toBe(2500)
    })

    it('handles decimal precision and rounding to 2 decimals accurately', () => {
      const sale1 = createSale({ total: 0.1, paymentMethod: 'efectivo' })
      const sale2 = createSale({ total: 0.2, paymentMethod: 'efectivo' })
      const reg1 = applySaleToRegister(baseRegister, sale1)
      const reg2 = applySaleToRegister(reg1, sale2)
      expect(reg2.expectedCash).toBe(10000.3)
    })

    it('returns unmodified register if sale total is zero or negative', () => {
      const zeroSale = createSale({ total: 0, paymentMethod: 'efectivo' })
      const updatedZero = applySaleToRegister(baseRegister, zeroSale)
      expect(updatedZero).toEqual(baseRegister)

      const negativeSale = createSale({ total: -500, paymentMethod: 'efectivo' })
      const updatedNeg = applySaleToRegister(baseRegister, negativeSale)
      expect(updatedNeg).toEqual(baseRegister)
    })

    it('handles mixed payment with missing, empty, or invalid splitPayments without throwing', () => {
      const brokenMixed = createSale({ total: 5000, paymentMethod: 'mixto', splitPayments: [] })
      const updated = applySaleToRegister(baseRegister, brokenMixed)
      expect(updated).toEqual(baseRegister)

      const invalidAmounts = createSale({
        total: 5000,
        paymentMethod: 'mixto',
        splitPayments: [
          { id: 'sp-invalid-1', method: 'efectivo', amount: -500 },
          { id: 'sp-invalid-2', method: 'efectivo', amount: NaN },
          { id: 'sp-invalid-3', method: 'credito', amount: 3000 },
          { id: 'sp-invalid-4', method: 'other' as unknown as PaymentMethod, amount: 2000 }, // unhandled method
        ],
      })
      const regInvalid = applySaleToRegister(baseRegister, invalidAmounts)
      expect(regInvalid.totalCard).toBe(3000)
      expect(regInvalid.expectedCash).toBe(10000)
    })
  })
})
