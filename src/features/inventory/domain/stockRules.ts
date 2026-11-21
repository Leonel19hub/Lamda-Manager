import {
  ok,
  fail,
  type Result,
  type ValidationError,
  type Product,
  type Branch,
  type Category,
} from '@/types'

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
 * Adds quantity to current stock (e.g. for incoming purchases or transfer arrivals).
 * Rejects non-positive addition quantities.
 */
export function addStock(
  currentStock: number,
  quantityToAdd: number
): Result<number, ValidationError> {
  if (isNaN(quantityToAdd) || !isFinite(quantityToAdd) || quantityToAdd <= 0) {
    return fail({
      code: 'INVALID_ADD_QUANTITY',
      message: 'La cantidad a ingresar debe ser un número mayor a cero.',
      field: 'quantity',
    })
  }

  const safeCurrent = isNaN(currentStock) || currentStock < 0 ? 0 : currentStock
  const newStock = Math.round((safeCurrent + quantityToAdd) * 1000) / 1000
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

export interface ProductFormData {
  name: string
  sku: string
  costPrice: number
  sellPrice: number
  currentStock?: number
  minStock?: number
  unitsPerPack?: number
}

/**
 * Validates product creation and editing form fields according to business rules.
 */
export function validateProductForm(
  data: ProductFormData
): Result<true, ValidationError> {
  const cleanName = data.name?.trim() || ''
  if (!cleanName) {
    return fail({
      code: 'EMPTY_PRODUCT_NAME',
      message: 'El nombre del producto no puede estar vacío.',
      field: 'name',
    })
  }

  const cleanSku = data.sku?.trim() || ''
  if (!cleanSku) {
    return fail({
      code: 'EMPTY_SKU',
      message: 'El código SKU interno no puede estar vacío.',
      field: 'sku',
    })
  }

  if (isNaN(data.costPrice) || !isFinite(data.costPrice) || data.costPrice < 0) {
    return fail({
      code: 'INVALID_COST_PRICE',
      message: 'El costo unitario debe ser un número mayor o igual a cero.',
      field: 'costPrice',
    })
  }

  if (isNaN(data.sellPrice) || !isFinite(data.sellPrice) || data.sellPrice < 0) {
    return fail({
      code: 'INVALID_SELL_PRICE',
      message: 'El precio de venta debe ser un número mayor o igual a cero.',
      field: 'sellPrice',
    })
  }

  if (data.currentStock !== undefined) {
    if (isNaN(data.currentStock) || !isFinite(data.currentStock) || data.currentStock < 0) {
      return fail({
        code: 'INVALID_CURRENT_STOCK',
        message: 'El stock actual debe ser un número mayor o igual a cero.',
        field: 'currentStock',
      })
    }
  }

  if (data.minStock !== undefined) {
    if (isNaN(data.minStock) || !isFinite(data.minStock) || data.minStock < 0) {
      return fail({
        code: 'INVALID_MIN_STOCK',
        message: 'El stock mínimo debe ser un número mayor o igual a cero.',
        field: 'minStock',
      })
    }
  }

  if (data.unitsPerPack !== undefined) {
    if (isNaN(data.unitsPerPack) || !isFinite(data.unitsPerPack) || data.unitsPerPack <= 0) {
      return fail({
        code: 'INVALID_UNITS_PER_PACK',
        message: 'Las unidades por bulto/cajón deben ser un número mayor a cero.',
        field: 'unitsPerPack',
      })
    }
  }

  return ok(true)
}

export interface ProductFilters {
  searchQuery?: string
  categoryId?: string | null
  stockFilter?: 'all' | 'critical'
}

/**
 * Filters the product catalog by search query (name, sku, barcode, pluCode),
 * category (or all if null or 'all'), and stock status.
 */
export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const query = filters.searchQuery?.trim().toLowerCase() || ''
  const cat = filters.categoryId
  const stockFilter = filters.stockFilter || 'all'

  return products.filter((p) => {
    // 1. Category match
    const matchesCat = !cat || cat === 'all' || p.categoryId === cat

    // 2. Search match
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.pluCode?.toLowerCase().includes(query) ?? false) ||
      (p.barcode?.toLowerCase().includes(query) ?? false) ||
      (p.sku?.toLowerCase().includes(query) ?? false)

    // 3. Stock status match
    const matchesStock =
      stockFilter === 'all' ||
      getStockStatus(p.stock?.currentStock ?? 0, p.stock?.minStock ?? 0) !== 'ok'

    return matchesCat && matchesSearch && matchesStock
  })
}

/**
 * Counts the number of products with critical or low stock status.
 */
export function countCriticalProducts(products: Product[]): number {
  return products.filter(
    (p) => getStockStatus(p.stock?.currentStock ?? 0, p.stock?.minStock ?? 0) !== 'ok'
  ).length
}

/**
 * Returns available destination branches for transfers, excluding active branch.
 */
export function getAvailableDestinationBranches(
  branches: Branch[],
  activeBranchId?: string
): Branch[] {
  if (!activeBranchId) return branches
  return branches.filter((b) => b.id !== activeBranchId)
}

/**
 * Returns the default category id for new product creation (first available category).
 */
export function getDefaultCategoryId(categories: Category[]): string | undefined {
  return categories[0]?.id
}
