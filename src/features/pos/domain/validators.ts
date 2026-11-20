import { ok, fail, type Result, type ValidationError } from '@/types'

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
