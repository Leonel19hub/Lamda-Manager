import { ok, fail, type Result, type ValidationError } from '@/types'

export interface PackConversionResult {
  packs: number
  units: number
}

export interface SupplierInput {
  name: string
  cuit?: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface PurchaseItemInput {
  productId: string
  productName?: string
  packsReceived?: number
  unitsPerPack?: number
  unitsReceived: number
  unitCost: number
  totalCost: number
  oldCost?: number
  newCost?: number
  oldSellPrice?: number
  newSellPrice?: number
}

export interface PurchaseOrderInput {
  supplierId: string
  branchId: string
  orderNumber?: string
  receivedBy?: string
  notes?: string
  items: PurchaseItemInput[]
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

/**
 * Validates supplier form data.
 */
export function validateSupplierForm(input: SupplierInput): Result<true, ValidationError> {
  if (!input.name || !input.name.trim() || input.name.trim().length < 2) {
    return fail({
      code: 'INVALID_NAME',
      message: 'El nombre o razón social del proveedor es requerido (mínimo 2 caracteres).',
      field: 'name',
    })
  }

  const cleanEmail = input.email ? input.email.trim() : ''
  if (cleanEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return fail({
        code: 'INVALID_EMAIL',
        message: 'El formato del correo electrónico es inválido.',
        field: 'email',
      })
    }
  }

  return ok(true)
}

/**
 * Validates purchase order data and its item lines.
 */
export function validatePurchaseOrder(input: PurchaseOrderInput): Result<true, ValidationError> {
  if (!input.supplierId || !input.supplierId.trim()) {
    return fail({
      code: 'INVALID_SUPPLIER_ID',
      message: 'Debe seleccionar un proveedor válido.',
      field: 'supplierId',
    })
  }

  if (!input.branchId || !input.branchId.trim()) {
    return fail({
      code: 'INVALID_BRANCH_ID',
      message: 'Debe indicar la sucursal o depósito de destino.',
      field: 'branchId',
    })
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return fail({
      code: 'EMPTY_PURCHASE_ITEMS',
      message: 'La orden de compra debe contener al menos un producto recibido.',
      field: 'items',
    })
  }

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i]
    if (!item.productId || !item.productId.trim()) {
      return fail({
        code: 'INVALID_PRODUCT_ID',
        message: `El producto en la línea ${i + 1} es requerido.`,
        field: `items[${i}].productId`,
      })
    }

    if (isNaN(item.unitsReceived) || !isFinite(item.unitsReceived) || item.unitsReceived <= 0) {
      return fail({
        code: 'INVALID_UNITS_RECEIVED',
        message: `La cantidad de unidades ingresadas en la línea ${i + 1} debe ser mayor a cero.`,
        field: `items[${i}].unitsReceived`,
      })
    }

    if (isNaN(item.unitCost) || !isFinite(item.unitCost) || item.unitCost < 0) {
      return fail({
        code: 'INVALID_UNIT_COST',
        message: `El costo unitario en la línea ${i + 1} no puede ser negativo.`,
        field: `items[${i}].unitCost`,
      })
    }
  }

  return ok(true)
}
