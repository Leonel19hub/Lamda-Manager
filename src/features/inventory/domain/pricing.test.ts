import { describe, it, expect } from 'vitest'
import {
  calculateMargin,
  calculateSellPrice,
  calculateCostFromPack,
} from './pricing'

describe('inventory/domain/pricing', () => {
  describe('calculateMargin', () => {
    it('calculates commercial margin percentage correctly', () => {
      // cost 950, sell 1890 -> ((1890 - 950) / 1890) * 100 = 49.7%
      expect(calculateMargin(950, 1890)).toBe(49.7)
      // cost 1200, sell 2100 -> ((2100 - 1200) / 2100) * 100 = 42.9%
      expect(calculateMargin(1200, 2100)).toBe(42.9)
    })

    it('returns 0 when cost equals sell price (zero margin)', () => {
      expect(calculateMargin(1000, 1000)).toBe(0)
    })

    it('returns 0 for non-positive sell price or negative cost', () => {
      expect(calculateMargin(1000, 0)).toBe(0)
      expect(calculateMargin(1000, -500)).toBe(0)
      expect(calculateMargin(-100, 1000)).toBe(0)
    })

    it('returns 0 for NaN or infinite inputs', () => {
      expect(calculateMargin(NaN, 1000)).toBe(0)
      expect(calculateMargin(1000, Infinity)).toBe(0)
    })
  })

  describe('calculateSellPrice', () => {
    it('calculates suggested sell price from cost and margin %', () => {
      // cost 1000, margin 35% -> 1000 / (1 - 0.35) = 1538.46
      expect(calculateSellPrice(1000, 35)).toBe(1538.46)
    })

    it('returns cost when margin is 0%', () => {
      expect(calculateSellPrice(2000, 0)).toBe(2000)
    })

    it('returns 0 when margin is >= 100% or negative', () => {
      expect(calculateSellPrice(1000, 100)).toBe(0)
      expect(calculateSellPrice(1000, 120)).toBe(0)
      expect(calculateSellPrice(1000, -10)).toBe(0)
    })

    it('returns 0 for negative cost, zero cost or NaN', () => {
      expect(calculateSellPrice(0, 30)).toBe(0)
      expect(calculateSellPrice(-500, 30)).toBe(0)
      expect(calculateSellPrice(NaN, 30)).toBe(0)
      expect(calculateSellPrice(1000, NaN)).toBe(0)
    })
  })

  describe('calculateCostFromPack', () => {
    it('calculates unit cost from pack price and units per pack', () => {
      // Cajón $19,000 / 20 kg = $950/kg
      expect(calculateCostFromPack(19000, 20)).toBe(950)
      // Pack de 6 aceites a $9,900 = $1650/un
      expect(calculateCostFromPack(9900, 6)).toBe(1650)
    })

    it('returns 0 for non-positive or invalid inputs', () => {
      expect(calculateCostFromPack(0, 10)).toBe(0)
      expect(calculateCostFromPack(1000, 0)).toBe(0)
      expect(calculateCostFromPack(-1000, 5)).toBe(0)
      expect(calculateCostFromPack(1000, -5)).toBe(0)
      expect(calculateCostFromPack(NaN, 5)).toBe(0)
      expect(calculateCostFromPack(1000, NaN)).toBe(0)
      expect(calculateCostFromPack(Infinity, 5)).toBe(0)
      expect(calculateCostFromPack(1000, Infinity)).toBe(0)
    })
  })
})
