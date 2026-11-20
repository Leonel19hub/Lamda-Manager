import { describe, it, expect } from 'vitest'
import {
  validatePinFormat,
  verifyUserPin,
  calculateTotalHours,
  validateAttendanceAction,
} from './pinValidator'
import type { AttendanceRecord } from '@/types'

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

  describe('calculateTotalHours', () => {
    it('calculates hours between checkIn and checkOut accurately', () => {
      const inTime = '2026-11-20T08:00:00.000Z'
      const outTime = '2026-11-20T16:30:00.000Z'
      expect(calculateTotalHours(inTime, outTime)).toBe(8.5)
    })

    it('returns 0 if checkOut is before or equal to checkIn', () => {
      const inTime = '2026-11-20T16:00:00.000Z'
      const outTime = '2026-11-20T08:00:00.000Z'
      expect(calculateTotalHours(inTime, outTime)).toBe(0)
      expect(calculateTotalHours(inTime, inTime)).toBe(0)
    })

    it('returns 0 for missing or invalid dates', () => {
      expect(calculateTotalHours('', '2026-11-20T16:00:00.000Z')).toBe(0)
      expect(calculateTotalHours('2026-11-20T08:00:00.000Z', '')).toBe(0)
      expect(calculateTotalHours('invalid-date', '2026-11-20T16:00:00.000Z')).toBe(0)
      expect(calculateTotalHours('2026-11-20T08:00:00.000Z', 'invalid-date')).toBe(0)
    })
  })

  describe('validateAttendanceAction', () => {
    const mockActiveRecord: AttendanceRecord = {
      id: 'att-01',
      userId: 'user-02',
      branchId: 'branch-01',
      checkIn: '2026-11-20T08:00:00.000Z',
      clockIn: '2026-11-20T08:00:00.000Z',
      status: 'active',
      createdAt: '2026-11-20T08:00:00.000Z',
    }

    it('accepts valid clock-in when employee has no active shift and PIN is correct', () => {
      const res = validateAttendanceAction({
        userId: 'user-02',
        action: 'clockIn',
        activeShift: undefined,
        inputPin: '1234',
        actualPin: '1234',
      })
      expect(res.success).toBe(true)
    })

    it('fails clock-in if employee already has an active shift', () => {
      const res = validateAttendanceAction({
        userId: 'user-02',
        action: 'clockIn',
        activeShift: mockActiveRecord,
        inputPin: '1234',
        actualPin: '1234',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('ALREADY_CLOCKED_IN')
      }
    })

    it('fails if PIN format is invalid', () => {
      const res = validateAttendanceAction({
        userId: 'user-02',
        action: 'clockIn',
        inputPin: '12',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_PIN_FORMAT')
      }
    })

    it('fails if PIN does not match', () => {
      const res = validateAttendanceAction({
        userId: 'user-02',
        action: 'clockIn',
        inputPin: '9999',
        actualPin: '1234',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INCORRECT_PIN')
      }
    })

    it('accepts valid clock-out when active shift exists and PIN is correct', () => {
      const res = validateAttendanceAction({
        userId: 'user-02',
        action: 'clockOut',
        activeShift: mockActiveRecord,
        inputPin: '1234',
        actualPin: '1234',
      })
      expect(res.success).toBe(true)
    })

    it('fails clock-out if there is no active shift', () => {
      const res = validateAttendanceAction({
        userId: 'user-02',
        action: 'clockOut',
        activeShift: undefined,
        inputPin: '1234',
        actualPin: '1234',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('NO_ACTIVE_SHIFT')
      }
    })
  })
})
