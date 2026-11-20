import { describe, it, expect } from 'vitest'
import {
  cn,
  formatCurrency,
  formatNumber,
  formatWeight,
  formatDate,
  formatTime,
  formatDateTime,
  generateId,
} from './utils'

describe('src/lib/utils', () => {
  describe('cn (classNames helper)', () => {
    it('combines string classes correctly', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
    })

    it('filters out falsy and null values', () => {
      expect(cn('btn', false, null, undefined, '', 'active')).toBe('btn active')
    })
  })

  describe('formatCurrency', () => {
    it('formats valid positive numbers in Argentine Peso currency format', () => {
      const formatted = formatCurrency(1890)
      expect(formatted).toContain('$')
      expect(formatted).toContain('1.890,00')
    })

    it('formats zero correctly', () => {
      const formatted = formatCurrency(0)
      expect(formatted).toContain('$')
      expect(formatted).toContain('0,00')
    })

    it('handles NaN and non-finite values safely', () => {
      expect(formatCurrency(NaN)).toBe('$ 0,00')
      expect(formatCurrency(Infinity)).toBe('$ 0,00')
      expect(formatCurrency(-Infinity)).toBe('$ 0,00')
    })
  })

  describe('formatNumber', () => {
    it('formats number with default 2 decimals', () => {
      expect(formatNumber(1250.5)).toBe('1.250,50')
    })

    it('formats number with custom decimals', () => {
      expect(formatNumber(1250.555, 3)).toBe('1.250,555')
    })

    it('returns "0" for NaN and non-finite values', () => {
      expect(formatNumber(NaN)).toBe('0')
      expect(formatNumber(Infinity)).toBe('0')
    })
  })

  describe('formatWeight', () => {
    it('formats weight in kilograms with 3 decimals', () => {
      expect(formatWeight(1.35)).toBe('1,350 kg')
      expect(formatWeight(0.5)).toBe('0,500 kg')
    })
  })

  describe('formatDate', () => {
    it('formats valid ISO date string to DD/MM/YYYY', () => {
      const date = '2026-11-18T12:00:00.000Z'
      const formatted = formatDate(date)
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('returns empty string for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('')
    })
  })

  describe('formatTime', () => {
    it('formats valid ISO date string to HH:mm', () => {
      const date = '2026-11-18T15:30:00.000Z'
      const formatted = formatTime(date)
      expect(formatted).toMatch(/\d{2}:\d{2}/)
    })

    it('returns empty string for invalid time', () => {
      expect(formatTime('invalid-time')).toBe('')
    })
  })

  describe('formatDateTime', () => {
    it('formats combined date and time', () => {
      const date = '2026-11-18T15:30:00.000Z'
      const formatted = formatDateTime(date)
      expect(formatted).toContain('/')
      expect(formatted).toContain(':')
    })

    it('returns empty string if date is invalid', () => {
      expect(formatDateTime('invalid')).toBe('')
    })
  })

  describe('generateId', () => {
    it('generates a valid UUID string', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(10)
    })
  })
})
