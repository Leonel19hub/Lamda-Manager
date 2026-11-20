import { ok, fail, type Result, type ValidationError } from '@/types'

export type StockStatus = 'ok' | 'low' | 'critical'

/**
 * Returns the stock health status based on current stock vs minimum threshold.
 */
export function getStockStatus(current: number, min: number): StockStatus {
  if (isNaN(current) || current <= 0) return 'critical'
  if (current <= min) return 'low'
  return 'ok'
}

/**
 * Deducts quantity from current stock (e.g. for write-off/merma or sale).
 * Prevents negative stock (floors to 0) and rejects non-positive deduction quantities.
 */
export function deductStock(
  currentStock: number,
  quantityToDeduct: number
): Result<number, ValidationError> {
  if (isNaN(quantityToDeduct) || !isFinite(quantityToDeduct) || quantityToDeduct <= 0) {
    return fail({
      code: 'INVALID_DEDUCT_QUANTITY',
      message: 'La cantidad a descontar debe ser un número mayor a cero.',
      field: 'quantity',
    })
  }

  const safeCurrent = isNaN(currentStock) || currentStock < 0 ? 0 : currentStock
  const newStock = Math.max(0, Math.round((safeCurrent - quantityToDeduct) * 1000) / 1000)
  return ok(newStock)
}

/**
 * Validates an inter-branch inventory transfer.
 * Rejects if requested transfer quantity exceeds available stock or is non-positive.
 */
export function validateTransfer(
  currentStock: number,
  quantity: number
): Result<number, ValidationError> {
  if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0) {
    return fail({
      code: 'INVALID_TRANSFER_QUANTITY',
      message: 'La cantidad a transferir debe ser mayor a cero.',
      field: 'quantity',
    })
  }

  const safeStock = isNaN(currentStock) ? 0 : currentStock

  if (quantity > safeStock) {
    return fail({
      code: 'INSUFFICIENT_STOCK_FOR_TRANSFER',
      message: `Stock insuficiente en sucursal origen. Disponible: ${safeStock}, Solicitado: ${quantity}`,
      field: 'quantity',
    })
  }

  return ok(Math.round(quantity * 1000) / 1000)
}
