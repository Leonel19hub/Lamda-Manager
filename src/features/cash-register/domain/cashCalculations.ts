import type { CashMovementType, Result, ValidationError } from '@/types'
import { ok, fail } from '@/types'

export interface BillItem {
  denomination: number
  count: number
}

export interface ShiftOpeningInput {
  registerNumber: string
  shiftName: string
  openingAmount: number
  openedBy: string
}

export interface CashMovementInput {
  amount: number
  description: string
  type: CashMovementType
  expectedCash: number
}

/**
 * Calculates subtotal for a single bill denomination count.
 * Returns 0 if count or denomination is negative or invalid.
 */
export function calculateBillSubtotal(denomination: number, count: number): number {
  if (
    isNaN(denomination) ||
    isNaN(count) ||
    !isFinite(denomination) ||
    !isFinite(count) ||
    denomination <= 0 ||
    count <= 0
  ) {
    return 0
  }
  return Math.round(denomination * count * 100) / 100
}

/**
 * Calculates total counted physical cash from an array of bill items.
 */
export function calculateTotalCounted(bills: readonly BillItem[]): number {
  return bills.reduce((acc, bill) => acc + calculateBillSubtotal(bill.denomination, bill.count), 0)
}

/**
 * Calculates difference between physical counted cash and system expected cash.
 * Positive = surplus, Negative = shortage, 0 = balanced.
 */
export function calculateCashDifference(countedCash: number, expectedCash: number): number {
  if (isNaN(countedCash) || isNaN(expectedCash) || !isFinite(countedCash) || !isFinite(expectedCash)) {
    return 0
  }
  return Math.round((countedCash - expectedCash) * 100) / 100
}

/**
 * Calculates the cash register delta resulting from a manual cash movement.
 */
export function calculateMovementDelta(type: CashMovementType, amount: number): number {
  if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
    return 0
  }
  const cleanAmount = Math.round(amount * 100) / 100
  switch (type) {
    case 'income':
    case 'ingreso':
    case 'apertura':
    case 'adjustment':
    case 'ajuste':
      return cleanAmount
    case 'expense':
    case 'egreso':
    case 'retiro':
      return -cleanAmount
    default:
      return 0
  }
}

/**
 * Validates parameters for opening a new cash register shift.
 */
export function validateShiftOpening(input: ShiftOpeningInput): Result<true, ValidationError> {
  if (!input.registerNumber || !input.registerNumber.trim()) {
    return fail({
      code: 'INVALID_REGISTER_NUMBER',
      message: 'El número de caja es requerido',
      field: 'registerNumber',
    })
  }

  if (!input.shiftName || !input.shiftName.trim()) {
    return fail({
      code: 'INVALID_SHIFT_NAME',
      message: 'El nombre del turno es requerido',
      field: 'shiftName',
    })
  }

  if (!input.openedBy || !input.openedBy.trim()) {
    return fail({
      code: 'INVALID_OPENED_BY',
      message: 'El responsable de apertura es requerido',
      field: 'openedBy',
    })
  }

  if (isNaN(input.openingAmount) || !isFinite(input.openingAmount) || input.openingAmount < 0) {
    return fail({
      code: 'INVALID_OPENING_AMOUNT',
      message: 'El fondo inicial de caja no puede ser negativo',
      field: 'openingAmount',
    })
  }

  return ok(true)
}

/**
 * Validates a manual cash movement (expense, income, withdrawal).
 * Enforces that cash withdrawals or expenses do not exceed the expected cash in the drawer.
 */
export function validateCashMovement(input: CashMovementInput): Result<true, ValidationError> {
  if (isNaN(input.amount) || !isFinite(input.amount) || input.amount <= 0) {
    return fail({
      code: 'INVALID_AMOUNT',
      message: 'El monto debe ser mayor a cero',
      field: 'amount',
    })
  }

  if (!input.description || !input.description.trim() || input.description.trim().length < 3) {
    return fail({
      code: 'INVALID_DESCRIPTION',
      message: 'El motivo debe tener al menos 3 caracteres',
      field: 'description',
    })
  }

  const isWithdrawal = input.type === 'expense' || input.type === 'egreso' || input.type === 'retiro'
  if (isWithdrawal && input.amount > input.expectedCash) {
    return fail({
      code: 'INSUFFICIENT_FUNDS',
      message: `El monto a retirar ($${input.amount}) supera el efectivo disponible en caja ($${input.expectedCash})`,
      field: 'amount',
    })
  }

  return ok(true)
}
