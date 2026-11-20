import { describe, it, expect } from 'vitest'
import {
  validateWeightInput,
  validateBarcode,
  parseScaleBarcode,
  validateSaleEligibility,
} from './validators'
import type { CartItem, Customer, CashRegister } from '@/types'

describe('pos/domain/validators', () => {
  describe('validateWeightInput', () => {
    it('accepts valid positive numbers', () => {
      const res = validateWeightInput(0.85)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(0.85)
      }
    })

    it('accepts valid strings with dots or commas', () => {
      const res1 = validateWeightInput('1.350')
      expect(res1.success).toBe(true)
      if (res1.success) expect(res1.data).toBe(1.35)

      const res2 = validateWeightInput(' 2,500 ')
      expect(res2.success).toBe(true)
      if (res2.success) expect(res2.data).toBe(2.5)
    })

    it('rejects zero or negative weights', () => {
      const resZero = validateWeightInput(0)
      expect(resZero.success).toBe(false)
      if (!resZero.success) {
        expect(resZero.error.code).toBe('WEIGHT_MUST_BE_POSITIVE')
      }

      const resNeg = validateWeightInput(-0.5)
      expect(resNeg.success).toBe(false)
      if (!resNeg.success) {
        expect(resNeg.error.code).toBe('WEIGHT_MUST_BE_POSITIVE')
      }
    })

    it('rejects empty strings, NaN, or non-numeric strings', () => {
      const emptyRes = validateWeightInput('')
      expect(emptyRes.success).toBe(false)
      if (!emptyRes.success) {
        expect(emptyRes.error.code).toBe('EMPTY_WEIGHT')
      }

      const nanRes = validateWeightInput('abc')
      expect(nanRes.success).toBe(false)
      if (!nanRes.success) {
        expect(nanRes.error.code).toBe('INVALID_WEIGHT_FORMAT')
      }

      const infRes = validateWeightInput(Infinity)
      expect(infRes.success).toBe(false)
      if (!infRes.success) {
        expect(infRes.error.code).toBe('INVALID_WEIGHT_FORMAT')
      }
    })
  })

  describe('validateBarcode', () => {
    it('accepts valid barcodes and trims whitespace', () => {
      const res = validateBarcode('  7790012345678  ')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe('7790012345678')
      }
    })

    it('rejects empty or whitespace-only barcodes', () => {
      const resEmpty = validateBarcode('')
      expect(resEmpty.success).toBe(false)
      if (!resEmpty.success) {
        expect(resEmpty.error.code).toBe('EMPTY_BARCODE')
      }

      const resSpaces = validateBarcode('    ')
      expect(resSpaces.success).toBe(false)
      if (!resSpaces.success) {
        expect(resSpaces.error.code).toBe('EMPTY_BARCODE')
      }
    })

    it('rejects null or undefined', () => {
      const resNull = validateBarcode(null)
      expect(resNull.success).toBe(false)
      if (!resNull.success) {
        expect(resNull.error.code).toBe('EMPTY_BARCODE')
      }

      const resUndef = validateBarcode(undefined)
      expect(resUndef.success).toBe(false)
      if (!resUndef.success) {
        expect(resUndef.error.code).toBe('EMPTY_BARCODE')
      }
    })
  })

  describe('parseScaleBarcode', () => {
    it('successfully parses valid Argentine scale barcode (20 + PLU + Grams + C)', () => {
      // 20 + 00101 (PLU 101) + 01350 (1350g = 1.35kg) + 4
      const res = parseScaleBarcode('2000101013504')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.plu).toBe('101')
        expect(res.data.weight).toBe(1.35)
      }
    })

    it('rejects empty, non-13-digit, or barcodes not starting with 20', () => {
      expect(parseScaleBarcode('')?.success).toBe(false)
      expect(parseScaleBarcode('7790012345678')?.success).toBe(false)
      expect(parseScaleBarcode('20123')?.success).toBe(false)
      expect(parseScaleBarcode('200010101350A')?.success).toBe(false)
    })

    it('rejects barcode if extracted weight is 0', () => {
      // Weight 00000g
      const res = parseScaleBarcode('2000101000000')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_SCALE_WEIGHT')
      }
    })
  })

  describe('validateSaleEligibility', () => {
    const mockOpenRegister: CashRegister = {
      id: 'reg-1',
      registerNumber: 'Caja 01',
      branchId: 'b-1',
      openedBy: 'u-1',
      openingAmount: 10000,
      expectedCash: 10000,
      totalCard: 0,
      totalTransfer: 0,
      totalAccount: 0,
      openedAt: new Date().toISOString(),
      isOpen: true,
    }

    const mockClosedRegister: CashRegister = {
      ...mockOpenRegister,
      isOpen: false,
    }

    const mockCartItem: CartItem = {
      id: 'i-1',
      productId: 'p-1',
      productName: 'Tomate',
      saleType: 'unit',
      quantity: 1,
      unitPrice: 1000,
      costPrice: 500,
      subtotal: 1000,
    }

    const mockCustomer: Customer = {
      id: 'c-1',
      fullName: 'Juan Perez',
      creditLimit: 50000,
      currentBalance: 10000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('approves a valid cash sale with sufficient payment and open register', () => {
      const res = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'efectivo',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 1000,
        amountPaid: 1500,
      })
      expect(res.success).toBe(true)
    })

    it('rejects sale when cash register is missing or closed', () => {
      const resNull = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'efectivo',
        selectedCustomer: null,
        activeRegister: null,
        total: 1000,
      })
      expect(resNull.success).toBe(false)
      if (!resNull.success) expect(resNull.error.code).toBe('REGISTER_CLOSED')

      const resClosed = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'efectivo',
        selectedCustomer: null,
        activeRegister: mockClosedRegister,
        total: 1000,
      })
      expect(resClosed.success).toBe(false)
    })

    it('rejects sale with empty cart or zero total', () => {
      const resEmpty = validateSaleEligibility({
        items: [],
        paymentMethod: 'efectivo',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 0,
      })
      expect(resEmpty.success).toBe(false)
      if (!resEmpty.success) expect(resEmpty.error.code).toBe('EMPTY_CART')

      const resZero = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'efectivo',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 0,
      })
      expect(resZero.success).toBe(false)
      if (!resZero.success) expect(resZero.error.code).toBe('INVALID_TOTAL')
    })

    it('rejects cash sale when amountPaid is insufficient', () => {
      const res = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'efectivo',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 1000,
        amountPaid: 800,
      })
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error.code).toBe('INSUFFICIENT_CASH')

      // Test 'cash' alias with default amountPaid (0 < total)
      const resCashDefault = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'cash',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 1000,
      })
      expect(resCashDefault.success).toBe(false)
    })

    it('validates customer and credit limit for cuenta corriente (fiado)', () => {
      // Missing customer
      const resNoCust = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'cuenta_corriente',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 1000,
      })
      expect(resNoCust.success).toBe(false)
      if (!resNoCust.success) expect(resNoCust.error.code).toBe('CUSTOMER_REQUIRED_FOR_CREDIT')

      // Account alias with missing customer
      const resNoCustAlias = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'account',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 1000,
      })
      expect(resNoCustAlias.success).toBe(false)

      // Exceeds credit limit
      const resOverLimit = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'cuenta_corriente',
        selectedCustomer: {
          ...mockCustomer,
          currentBalance: 49500,
          creditLimit: 50000,
        },
        activeRegister: mockOpenRegister,
        total: 1000, // 49500 + 1000 = 50500 > 50000
      })
      expect(resOverLimit.success).toBe(false)
      if (!resOverLimit.success) expect(resOverLimit.error.code).toBe('CREDIT_LIMIT_EXCEEDED')

      // Within limit
      const resOk = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'cuenta_corriente',
        selectedCustomer: mockCustomer,
        activeRegister: mockOpenRegister,
        total: 1000,
      })
      expect(resOk.success).toBe(true)

      // Zero credit limit (unlimited) and zero/falsy balance
      const resUnlimited = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'cuenta_corriente',
        selectedCustomer: {
          ...mockCustomer,
          currentBalance: 0,
          creditLimit: 0,
        },
        activeRegister: mockOpenRegister,
        total: 1000,
      })
      expect(resUnlimited.success).toBe(true)
    })

    it('validates split payments match total for payment method mixto', () => {
      const resMismatch = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'mixto',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 1000,
        splitPayments: [{ amount: 400 }, { amount: 400 }], // 800 != 1000
      })
      expect(resMismatch.success).toBe(false)
      if (!resMismatch.success) expect(resMismatch.error.code).toBe('SPLIT_PAYMENTS_MISMATCH')

      const resMatch = validateSaleEligibility({
        items: [mockCartItem],
        paymentMethod: 'mixto',
        selectedCustomer: null,
        activeRegister: mockOpenRegister,
        total: 1000,
        splitPayments: [{ amount: 600 }, { amount: 400 }],
      })
      expect(resMatch.success).toBe(true)
    })
  })
})
