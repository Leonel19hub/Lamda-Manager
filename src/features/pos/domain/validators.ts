import {
  ok,
  fail,
  type Result,
  type ValidationError,
  type CartItem,
  type PaymentMethod,
  type Customer,
  type CashRegister,
} from '@/types'
import { calculateSplitPaymentsTotal } from './calculations'

/**
 * Validates a weight value (in kg) coming from scales or manual user input.
 * Rejects non-numeric, zero, negative, or infinite values.
 */
export function validateWeightInput(
  input: number | string
): Result<number, ValidationError> {
  let parsed: number

  if (typeof input === 'string') {
    const sanitized = input.trim().replace(',', '.')
    if (!sanitized) {
      return fail({
        code: 'EMPTY_WEIGHT',
        message: 'El peso no puede estar vacío.',
        field: 'weight',
      })
    }
    parsed = Number(sanitized)
  } else {
    parsed = input
  }

  if (isNaN(parsed) || !isFinite(parsed)) {
    return fail({
      code: 'INVALID_WEIGHT_FORMAT',
      message: 'El peso ingresado no es un número válido.',
      field: 'weight',
    })
  }

  if (parsed <= 0) {
    return fail({
      code: 'WEIGHT_MUST_BE_POSITIVE',
      message: 'El peso debe ser mayor a 0 kg.',
      field: 'weight',
    })
  }

  // Round to 3 decimal places (grams precision)
  const normalized = Math.round(parsed * 1000) / 1000
  return ok(normalized)
}

/**
 * Validates a barcode or PLU code string.
 * Trims whitespace and rejects empty values.
 */
export function validateBarcode(
  code: string | null | undefined
): Result<string, ValidationError> {
  if (code === null || code === undefined) {
    return fail({
      code: 'EMPTY_BARCODE',
      message: 'El código de barras no puede ser nulo.',
      field: 'barcode',
    })
  }

  const clean = code.trim()

  if (clean.length === 0) {
    return fail({
      code: 'EMPTY_BARCODE',
      message: 'El código de barras no puede estar vacío.',
      field: 'barcode',
    })
  }

  return ok(clean)
}

export interface ScaleBarcodeData {
  plu: string
  weight: number
}

/**
 * Parses an Argentine scale barcode (EAN-13 starting with '20').
 * Standard format: 20 + PPPPP (5 digits PLU) + WWWWW (5 digits grams) + C (1 digit checksum).
 * Example: "2000101013504" -> PLU: "101", Weight: 1.350 kg.
 */
export function parseScaleBarcode(
  code: string | null | undefined
): Result<ScaleBarcodeData, ValidationError> {
  if (!code) {
    return fail({
      code: 'EMPTY_BARCODE',
      message: 'El código de barras no puede estar vacío.',
      field: 'barcode',
    })
  }
  const clean = code.trim()
  if (!clean.startsWith('20') || clean.length !== 13 || !/^\d{13}$/.test(clean)) {
    return fail({
      code: 'INVALID_SCALE_BARCODE',
      message: 'El código no tiene el formato estándar de balanza EAN-13 (inicia con 20 y tiene 13 dígitos).',
      field: 'barcode',
    })
  }

  const rawPlu = clean.slice(2, 7)
  const plu = String(parseInt(rawPlu, 10))
  const rawWeight = parseInt(clean.slice(7, 12), 10)
  const weight = Math.round((rawWeight / 1000) * 1000) / 1000

  if (weight <= 0) {
    return fail({
      code: 'INVALID_SCALE_WEIGHT',
      message: 'El peso extraído de la etiqueta de balanza debe ser mayor a 0 kg.',
      field: 'weight',
    })
  }

  return ok({ plu, weight })
}

export interface SaleEligibilityParams {
  items: readonly CartItem[]
  paymentMethod: PaymentMethod
  selectedCustomer: Customer | null
  activeRegister: CashRegister | null
  total: number
  amountPaid?: number
  splitPayments?: readonly { amount: number }[]
}

/**
 * Validates operational preconditions before finalizing a ticket.
 */
export function validateSaleEligibility(
  params: SaleEligibilityParams
): Result<true, ValidationError> {
  const {
    items,
    paymentMethod,
    selectedCustomer,
    activeRegister,
    total,
    amountPaid = 0,
    splitPayments = [],
  } = params

  if (!activeRegister || !activeRegister.isOpen) {
    return fail({
      code: 'REGISTER_CLOSED',
      message: 'No hay un turno de caja abierto para registrar ventas.',
      field: 'activeRegister',
    })
  }

  if (items.length === 0) {
    return fail({
      code: 'EMPTY_CART',
      message: 'El ticket no tiene productos.',
      field: 'items',
    })
  }

  if (total <= 0) {
    return fail({
      code: 'INVALID_TOTAL',
      message: 'El importe total del ticket debe ser mayor a cero.',
      field: 'total',
    })
  }

  if (paymentMethod === 'cuenta_corriente' || paymentMethod === 'account') {
    if (!selectedCustomer) {
      return fail({
        code: 'CUSTOMER_REQUIRED_FOR_CREDIT',
        message: 'Debe seleccionar un cliente registrado para vender a cuenta corriente (fiado).',
        field: 'selectedCustomer',
      })
    }
    const currentBalance = selectedCustomer.currentBalance || 0
    const creditLimit = selectedCustomer.creditLimit || 0
    if (creditLimit > 0 && currentBalance + total > creditLimit) {
      return fail({
        code: 'CREDIT_LIMIT_EXCEEDED',
        message: `El cliente excede su límite de fiado disponible. Límite: $${creditLimit}, Deuda actual: $${currentBalance}, Total: $${total}.`,
        field: 'selectedCustomer',
      })
    }
  }

  if (paymentMethod === 'efectivo' || paymentMethod === 'cash') {
    if (amountPaid < total) {
      return fail({
        code: 'INSUFFICIENT_CASH',
        message: 'El monto entregado en efectivo es menor al total a cobrar.',
        field: 'amountPaid',
      })
    }
  }

  if (paymentMethod === 'mixto') {
    const splitSum = calculateSplitPaymentsTotal(splitPayments)
    if (Math.abs(splitSum - total) > 0.01) {
      return fail({
        code: 'SPLIT_PAYMENTS_MISMATCH',
        message: `La suma de los pagos divididos ($${splitSum}) no coincide con el total del ticket ($${total}).`,
        field: 'splitPayments',
      })
    }
  }

  return ok(true)
}
