import { ok, fail, type Result, type ValidationError } from '@/types'

export interface PackConversionResult {
  packs: number
  units: number
}

/**
 * Converts bulk pack / box quantity to individual units (or kg).
 */
export function convertPacksToUnits(packs: number, unitsPerPack: number): number {
  if (
    isNaN(packs) ||
    isNaN(unitsPerPack) ||
    !isFinite(packs) ||
    !isFinite(unitsPerPack) ||
    packs <= 0 ||
    unitsPerPack <= 0
  ) {
    return 0
  }
  return Math.round(packs * unitsPerPack * 1000) / 1000
}

/**
 * Converts loose units (or kg) to bulk pack / box equivalent.
 */
export function convertUnitsToPacks(units: number, unitsPerPack: number): number {
  if (
    isNaN(units) ||
    isNaN(unitsPerPack) ||
    !isFinite(units) ||
    !isFinite(unitsPerPack) ||
    units <= 0 ||
    unitsPerPack <= 0
  ) {
    return 0
  }
  return Math.round((units / unitsPerPack) * 100) / 100
}

/**
 * Validates a bulk purchase reception entry.
 */
export function validatePackInput(
  packs: number,
  unitsPerPack: number
): Result<PackConversionResult, ValidationError> {
  if (isNaN(packs) || !isFinite(packs) || packs <= 0) {
    return fail({
      code: 'INVALID_PACKS_QUANTITY',
      message: 'La cantidad de bultos debe ser un número mayor a cero.',
      field: 'packs',
    })
  }

  if (isNaN(unitsPerPack) || !isFinite(unitsPerPack) || unitsPerPack <= 0) {
    return fail({
      code: 'INVALID_UNITS_PER_PACK',
      message: 'La equivalencia de unidades por bulto debe ser mayor a cero.',
      field: 'unitsPerPack',
    })
  }

  const normalizedPacks = Math.round(packs * 100) / 100
  const normalizedUnits = convertPacksToUnits(normalizedPacks, unitsPerPack)

  return ok({
    packs: normalizedPacks,
    units: normalizedUnits,
  })
}
