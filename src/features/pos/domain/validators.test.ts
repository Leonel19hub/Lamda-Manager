import { describe, it, expect } from 'vitest'
import { validateWeightInput, validateBarcode } from './validators'

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
})
