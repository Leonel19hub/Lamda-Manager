import { ok, fail, type Result, type ValidationError } from '@/types'

/**
 * Validates that an employee PIN consists of exactly 4 numeric digits.
 */
export function validatePinFormat(
  pin: string | null | undefined
): Result<string, ValidationError> {
  if (pin === null || pin === undefined) {
    return fail({
      code: 'EMPTY_PIN',
      message: 'El PIN no puede ser nulo.',
      field: 'pin',
    })
  }

  const clean = pin.trim()

  if (clean.length === 0) {
    return fail({
      code: 'EMPTY_PIN',
      message: 'Por favor ingrese su PIN de 4 dígitos.',
      field: 'pin',
    })
  }

  const isFourDigits = /^\d{4}$/.test(clean)

  if (!isFourDigits) {
    return fail({
      code: 'INVALID_PIN_FORMAT',
      message: 'El PIN debe contener exactamente 4 números.',
      field: 'pin',
    })
  }

  return ok(clean)
}

/**
 * Verifies whether the entered PIN matches the user's registered PIN.
 * If the user has no registered PIN configured, returns true.
 */
export function verifyUserPin(inputPin: string, actualPin?: string): boolean {
  if (!actualPin || actualPin.trim().length === 0) {
    return true
  }
  return inputPin.trim() === actualPin.trim()
}
