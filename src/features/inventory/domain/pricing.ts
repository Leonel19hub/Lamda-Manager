/**
 * Pricing and profit margin business calculations for retail.
 */

export function calculateMargin(cost: number, sell: number): number {
  if (
    isNaN(cost) ||
    isNaN(sell) ||
    !isFinite(cost) ||
    !isFinite(sell) ||
    sell <= 0 ||
    cost < 0
  ) {
    return 0
  }
  const margin = ((sell - cost) / sell) * 100
  return Math.round(margin * 10) / 10
}

export function calculateSellPrice(cost: number, marginPct: number): number {
  if (
    isNaN(cost) ||
    isNaN(marginPct) ||
    !isFinite(cost) ||
    !isFinite(marginPct) ||
    cost <= 0 ||
    marginPct >= 100 ||
    marginPct < 0
  ) {
    return 0
  }
  const sell = cost / (1 - marginPct / 100)
  return Math.round(sell * 100) / 100
}
