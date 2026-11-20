import { ok, fail, type Result, type ValidationError, type AttendanceRecord } from '@/types'

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

/**
 * Calculates the total hours between checkIn and checkOut.
 * Returns decimal hours rounded to 2 decimals (e.g. 8.25 hs).
 * Returns 0 if timestamps are invalid or checkOut is prior to checkIn.
 */
export function calculateTotalHours(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0

  const inTime = new Date(checkIn).getTime()
  const outTime = new Date(checkOut).getTime()

  if (isNaN(inTime) || isNaN(outTime) || outTime <= inTime) {
    return 0
  }

  const diffMs = outTime - inTime
  const hours = diffMs / (1000 * 60 * 60)
  return Math.round(hours * 100) / 100
}

export interface AttendanceActionParams {
  userId: string
  action: 'clockIn' | 'clockOut'
  activeShift?: AttendanceRecord
  inputPin: string
  actualPin?: string
}

/**
 * Validates a clock-in or clock-out attempt against employee state and PIN.
 */
export function validateAttendanceAction(params: AttendanceActionParams): Result<true, ValidationError> {
  const pinValidation = validatePinFormat(params.inputPin)
  if (!pinValidation.success) {
    return pinValidation
  }

  const isPinValid = verifyUserPin(params.inputPin, params.actualPin)
  if (!isPinValid) {
    return fail({
      code: 'INCORRECT_PIN',
      message: 'PIN incorrecto. Reintente.',
      field: 'pin',
    })
  }

  if (params.action === 'clockIn') {
    if (params.activeShift && params.activeShift.status === 'active') {
      return fail({
        code: 'ALREADY_CLOCKED_IN',
        message: 'El empleado ya tiene un turno activo en curso.',
      })
    }
  }

  if (params.action === 'clockOut') {
    if (!params.activeShift || params.activeShift.status !== 'active') {
      return fail({
        code: 'NO_ACTIVE_SHIFT',
        message: 'No se encontró un turno activo para registrar la salida.',
      })
    }
  }

  return ok(true)
}
