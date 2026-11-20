import { ok, fail, type Result, type ValidationError, type CustomerType } from '@/types'

export type CreditStatus = 'ok' | 'warning' | 'critical'

export interface CustomerInput {
  fullName: string
  dniCuit?: string
  phone?: string
  email?: string
  address?: string
  creditLimit: number
  type?: CustomerType
}

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

/**
 * Calculates the new positive balance (debt) after adding a credit charge ("fiado").
 */
export function calculateNewBalanceAfterCharge(
  currentBalance: number,
  chargeAmount: number
): number {
  if (
    isNaN(chargeAmount) ||
    !isFinite(chargeAmount) ||
    chargeAmount <= 0
  ) {
    return isNaN(currentBalance) || !isFinite(currentBalance) || currentBalance < 0 ? 0 : currentBalance
  }

  const safeBalance = isNaN(currentBalance) || !isFinite(currentBalance) || currentBalance < 0 ? 0 : currentBalance
  return Math.round((safeBalance + chargeAmount) * 100) / 100
}

/**
 * Validates customer creation or update form data.
 */
export function validateCustomerForm(input: CustomerInput): Result<true, ValidationError> {
  if (!input.fullName || !input.fullName.trim() || input.fullName.trim().length < 2) {
    return fail({
      code: 'INVALID_NAME',
      message: 'El nombre completo del cliente es requerido (mínimo 2 caracteres).',
      field: 'fullName',
    })
  }

  if (isNaN(input.creditLimit) || !isFinite(input.creditLimit) || input.creditLimit < 0) {
    return fail({
      code: 'INVALID_CREDIT_LIMIT',
      message: 'El límite de crédito no puede ser negativo.',
      field: 'creditLimit',
    })
  }

  if (input.email && input.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.email.trim())) {
      return fail({
        code: 'INVALID_EMAIL',
        message: 'El formato del correo electrónico es inválido.',
        field: 'email',
      })
    }
  }

  return ok(true)
}
