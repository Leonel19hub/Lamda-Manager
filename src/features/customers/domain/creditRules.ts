import { ok, fail, type Result, type ValidationError } from '@/types'

export type CreditStatus = 'ok' | 'warning' | 'critical'

/**
 * Calculates percentage of credit limit used by the customer.
 */
export function calculateCreditUsagePct(
  currentBalance: number,
  creditLimit: number
): number {
  if (
    isNaN(currentBalance) ||
    isNaN(creditLimit) ||
    !isFinite(currentBalance) ||
    !isFinite(creditLimit) ||
    creditLimit <= 0 ||
    currentBalance <= 0
  ) {
    return 0
  }
  const pct = (currentBalance / creditLimit) * 100
  return Math.min(100, Math.round(pct * 10) / 10)
}

/**
 * Returns credit health status:
 * - 'ok': balance is 0 or credit not consumed
 * - 'critical': >= 85% of limit consumed
 * - 'warning': has active debt below critical threshold
 */
export function getCreditStatus(
  currentBalance: number,
  creditLimit: number
): CreditStatus {
  if (isNaN(currentBalance) || currentBalance <= 0) {
    return 'ok'
  }
  if (creditLimit > 0 && currentBalance >= creditLimit * 0.85) {
    return 'critical'
  }
  return 'warning'
}

/**
 * Applies a cash or digital payment to settle or reduce customer debt ("fiado").
 * Rejects non-positive or invalid payment amounts.
 */
export function applyPayment(
  currentBalance: number,
  paymentAmount: number
): Result<number, ValidationError> {
  if (
    isNaN(paymentAmount) ||
    !isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    return fail({
      code: 'INVALID_PAYMENT_AMOUNT',
      message: 'El importe del abono debe ser mayor a cero.',
      field: 'paymentAmount',
    })
  }

  const safeBalance = isNaN(currentBalance) || currentBalance < 0 ? 0 : currentBalance
  const newBalance = Math.max(0, Math.round((safeBalance - paymentAmount) * 100) / 100)

  return ok(newBalance)
}
