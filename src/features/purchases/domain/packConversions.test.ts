import { describe, it, expect } from 'vitest'
import {
  convertPacksToUnits,
  convertUnitsToPacks,
  validatePackInput,
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
})
