import { describe, it, expect } from 'vitest'
import { validatePinFormat, verifyUserPin } from './pinValidator'

describe('attendance/domain/pinValidator', () => {
  describe('validatePinFormat', () => {
    it('accepts valid 4-digit numeric PINs', () => {
      const res = validatePinFormat('1234')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe('1234')
      }
    })

    it('trims whitespace and accepts valid PIN', () => {
      const res = validatePinFormat('  5678  ')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe('5678')
      }
    })

    it('rejects PINs that are not 4 digits', () => {
      expect(validatePinFormat('123').success).toBe(false)
      expect(validatePinFormat('12345').success).toBe(false)
    })

    it('rejects PINs with letters or special characters', () => {
      const res = validatePinFormat('12a4')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_PIN_FORMAT')
      }

      expect(validatePinFormat('12.4').success).toBe(false)
      expect(validatePinFormat('-123').success).toBe(false)
    })

    it('rejects empty, null or undefined PINs', () => {
      expect(validatePinFormat('').success).toBe(false)
      expect(validatePinFormat('   ').success).toBe(false)
      expect(validatePinFormat(null).success).toBe(false)
      expect(validatePinFormat(undefined).success).toBe(false)
    })
  })

  describe('verifyUserPin', () => {
    it('returns true when input PIN matches registered PIN', () => {
      expect(verifyUserPin('1234', '1234')).toBe(true)
    })

    it('returns false when PIN does not match', () => {
      expect(verifyUserPin('1234', '9999')).toBe(false)
    })

    it('returns true when user has no registered PIN', () => {
      expect(verifyUserPin('1234', undefined)).toBe(true)
      expect(verifyUserPin('1234', '')).toBe(true)
    })
  })
})
