import { describe, it, expect } from 'vitest'
import {
  convertPacksToUnits,
  convertUnitsToPacks,
  validatePackInput,
  validateSupplierForm,
  validatePurchaseOrder,
} from './packConversions'

describe('purchases/domain/packConversions', () => {
  describe('convertPacksToUnits', () => {
    it('converts packs to individual units correctly', () => {
      // 5 cajones x 8 botellas = 40 unidades
      expect(convertPacksToUnits(5, 8)).toBe(40)
      // 3.5 cajones x 20 kg = 70 kg
      expect(convertPacksToUnits(3.5, 20)).toBe(70)
    })

    it('returns 0 for negative, zero or NaN values', () => {
      expect(convertPacksToUnits(0, 8)).toBe(0)
      expect(convertPacksToUnits(-5, 8)).toBe(0)
      expect(convertPacksToUnits(5, 0)).toBe(0)
      expect(convertPacksToUnits(5, -8)).toBe(0)
      expect(convertPacksToUnits(NaN, 8)).toBe(0)
      expect(convertPacksToUnits(5, Infinity)).toBe(0)
    })
  })

  describe('convertUnitsToPacks', () => {
    it('converts units to packs equivalent with 2 decimals', () => {
      // 40 units / 8 per pack = 5 packs
      expect(convertUnitsToPacks(40, 8)).toBe(5)
      // 15 units / 6 per pack = 2.5 packs
      expect(convertUnitsToPacks(15, 6)).toBe(2.5)
      // 10 units / 3 per pack = 3.33 packs
      expect(convertUnitsToPacks(10, 3)).toBe(3.33)
    })

    it('returns 0 for negative, zero or NaN values', () => {
      expect(convertUnitsToPacks(0, 8)).toBe(0)
      expect(convertUnitsToPacks(-10, 8)).toBe(0)
      expect(convertUnitsToPacks(10, 0)).toBe(0)
      expect(convertUnitsToPacks(NaN, 8)).toBe(0)
    })
  })

  describe('validatePackInput', () => {
    it('accepts valid packs input and returns normalized packs and units', () => {
      const res = validatePackInput(5, 8)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.packs).toBe(5)
        expect(res.data.units).toBe(40)
      }
    })

    it('rejects zero or negative packs', () => {
      const resZero = validatePackInput(0, 8)
      expect(resZero.success).toBe(false)
      if (!resZero.success) {
        expect(resZero.error.code).toBe('INVALID_PACKS_QUANTITY')
      }

      const resNeg = validatePackInput(-2, 8)
      expect(resNeg.success).toBe(false)
      if (!resNeg.success) {
        expect(resNeg.error.code).toBe('INVALID_PACKS_QUANTITY')
      }
    })

    it('rejects invalid unitsPerPack', () => {
      const res = validatePackInput(5, 0)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_UNITS_PER_PACK')
      }
    })
  })

  describe('validateSupplierForm', () => {
    it('accepts valid supplier input', () => {
      const res = validateSupplierForm({
        name: 'Distribuidora Arcor',
        cuit: '30-50279317-2',
        contactName: 'Esteban Rossi',
        phone: '1152824000',
        email: 'ventas@distribuidora.com',
        address: 'Av. Amancio Alcorta 2400',
      })
      expect(res.success).toBe(true)
    })

    it('fails if name is missing or whitespace or less than 2 characters', () => {
      const emptyRes = validateSupplierForm({ name: '   ' })
      expect(emptyRes.success).toBe(false)
      if (!emptyRes.success) {
        expect(emptyRes.error.code).toBe('INVALID_NAME')
      }

      const shortRes = validateSupplierForm({ name: 'A' })
      expect(shortRes.success).toBe(false)
    })

    it('validates email format if provided', () => {
      const invalidEmail = validateSupplierForm({
        name: 'Mercado Central',
        email: 'correo-invalido',
      })
      expect(invalidEmail.success).toBe(false)
      if (!invalidEmail.success) {
        expect(invalidEmail.error.code).toBe('INVALID_EMAIL')
      }

      const validEmail = validateSupplierForm({
        name: 'Mercado Central',
        email: 'central@mercado.com.ar',
      })
      expect(validEmail.success).toBe(true)

      const whitespaceEmail = validateSupplierForm({
        name: 'Mercado Central',
        email: '   ',
      })
      expect(whitespaceEmail.success).toBe(true)

      const emptyEmail = validateSupplierForm({
        name: 'Mercado Central',
        email: '',
      })
      expect(emptyEmail.success).toBe(true)
    })
  })

  describe('validatePurchaseOrder', () => {
    it('accepts valid purchase order with valid items', () => {
      const res = validatePurchaseOrder({
        supplierId: 'sup-01',
        branchId: 'branch-01',
        items: [
          {
            productId: 'prod-01',
            unitsReceived: 40,
            unitCost: 1500,
            totalCost: 60000,
          },
        ],
      })
      expect(res.success).toBe(true)
    })

    it('fails if supplierId is missing', () => {
      const res = validatePurchaseOrder({
        supplierId: '  ',
        branchId: 'branch-01',
        items: [
          {
            productId: 'prod-01',
            unitsReceived: 10,
            unitCost: 100,
            totalCost: 1000,
          },
        ],
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_SUPPLIER_ID')
      }
    })

    it('fails if branchId is missing', () => {
      const res = validatePurchaseOrder({
        supplierId: 'sup-01',
        branchId: '',
        items: [
          {
            productId: 'prod-01',
            unitsReceived: 10,
            unitCost: 100,
            totalCost: 1000,
          },
        ],
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_BRANCH_ID')
      }
    })

    it('fails if items array is empty or not an array', () => {
      const res = validatePurchaseOrder({
        supplierId: 'sup-01',
        branchId: 'branch-01',
        items: [],
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('EMPTY_PURCHASE_ITEMS')
      }

      const notArrayRes = validatePurchaseOrder({
        supplierId: 'sup-01',
        branchId: 'branch-01',
        items: null as unknown as [],
      })
      expect(notArrayRes.success).toBe(false)
      if (!notArrayRes.success) {
        expect(notArrayRes.error.code).toBe('EMPTY_PURCHASE_ITEMS')
      }
    })

    it('fails if any item has missing productId', () => {
      const res = validatePurchaseOrder({
        supplierId: 'sup-01',
        branchId: 'branch-01',
        items: [
          {
            productId: '',
            unitsReceived: 10,
            unitCost: 100,
            totalCost: 1000,
          },
        ],
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_PRODUCT_ID')
      }
    })

    it('fails if any item has invalid unitsReceived or unitCost', () => {
      const invalidUnits = validatePurchaseOrder({
        supplierId: 'sup-01',
        branchId: 'branch-01',
        items: [
          {
            productId: 'prod-01',
            unitsReceived: 0,
            unitCost: 100,
            totalCost: 0,
          },
        ],
      })
      expect(invalidUnits.success).toBe(false)
      if (!invalidUnits.success) {
        expect(invalidUnits.error.code).toBe('INVALID_UNITS_RECEIVED')
      }

      const invalidCost = validatePurchaseOrder({
        supplierId: 'sup-01',
        branchId: 'branch-01',
        items: [
          {
            productId: 'prod-01',
            unitsReceived: 10,
            unitCost: -50,
            totalCost: -500,
          },
        ],
      })
      expect(invalidCost.success).toBe(false)
      if (!invalidCost.success) {
        expect(invalidCost.error.code).toBe('INVALID_UNIT_COST')
      }
    })
  })
})
