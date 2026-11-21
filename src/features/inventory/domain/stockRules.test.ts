import { describe, it, expect } from 'vitest'
import {
  getStockStatus,
  deductStock,
  addStock,
  validateTransfer,
  validateProductForm,
  filterProducts,
  countCriticalProducts,
  getAvailableDestinationBranches,
  getDefaultCategoryId,
} from './stockRules'
import type { Product, Branch, Category } from '@/types'

describe('inventory/domain/stockRules', () => {
  describe('getStockStatus', () => {
    it('returns critical when stock is zero, negative, or NaN', () => {
      expect(getStockStatus(0, 10)).toBe('critical')
      expect(getStockStatus(-2, 10)).toBe('critical')
      expect(getStockStatus(NaN, 10)).toBe('critical')
    })

    it('returns low when stock is greater than zero but less than or equal to min', () => {
      expect(getStockStatus(5, 10)).toBe('low')
      expect(getStockStatus(10, 10)).toBe('low')
    })

    it('returns ok when stock is strictly greater than min', () => {
      expect(getStockStatus(11, 10)).toBe('ok')
      expect(getStockStatus(45, 15)).toBe('ok')
    })
  })

  describe('deductStock', () => {
    it('deducts stock correctly with decimal precision', () => {
      const res = deductStock(45.5, 3.2)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(42.3)
      }
    })

    it('floors to 0 if deducted quantity exceeds current stock', () => {
      const res = deductStock(5, 10)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(0)
      }
    })

    it('rejects non-positive or NaN deduction amounts', () => {
      const resZero = deductStock(20, 0)
      expect(resZero.success).toBe(false)
      if (!resZero.success) {
        expect(resZero.error.code).toBe('INVALID_DEDUCT_QUANTITY')
      }

      const resNeg = deductStock(20, -5)
      expect(resNeg.success).toBe(false)
      if (!resNeg.success) {
        expect(resNeg.error.code).toBe('INVALID_DEDUCT_QUANTITY')
      }

      const resNaN = deductStock(20, NaN)
      expect(resNaN.success).toBe(false)
    })

    it('treats negative starting stock as 0 when deducting', () => {
      const res = deductStock(-10, 5)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(0)
      }
    })
  })

  describe('validateTransfer', () => {
    it('accepts valid transfer when quantity is <= currentStock', () => {
      const res = validateTransfer(24, 12)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(12)
      }
    })

    it('rejects transfer when requested quantity exceeds available stock', () => {
      const res = validateTransfer(10, 15)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INSUFFICIENT_STOCK_FOR_TRANSFER')
      }
    })

    it('rejects zero, negative or NaN transfer quantities', () => {
      const resZero = validateTransfer(10, 0)
      expect(resZero.success).toBe(false)
      if (!resZero.success) {
        expect(resZero.error.code).toBe('INVALID_TRANSFER_QUANTITY')
      }

      const resNeg = validateTransfer(10, -3)
      expect(resNeg.success).toBe(false)
    })

    it('treats NaN currentStock as 0 in validateTransfer', () => {
      const res = validateTransfer(NaN, 5)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INSUFFICIENT_STOCK_FOR_TRANSFER')
      }
    })
  })

  describe('addStock', () => {
    it('adds stock correctly with decimal precision', () => {
      const res = addStock(12.5, 7.5)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(20)
      }
    })

    it('treats negative or NaN currentStock as 0', () => {
      const resNeg = addStock(-5, 10)
      expect(resNeg.success).toBe(true)
      if (resNeg.success) expect(resNeg.data).toBe(10)

      const resNaN = addStock(NaN, 10)
      expect(resNaN.success).toBe(true)
      if (resNaN.success) expect(resNaN.data).toBe(10)
    })

    it('rejects zero, negative or NaN quantity to add', () => {
      expect(addStock(10, 0)?.success).toBe(false)
      expect(addStock(10, -5)?.success).toBe(false)
      expect(addStock(10, NaN)?.success).toBe(false)
    })
  })

  describe('validateProductForm', () => {
    it('validates a complete and correct product form', () => {
      const res = validateProductForm({
        name: 'Tomate Perita',
        sku: 'TOM-PER-01',
        costPrice: 900,
        sellPrice: 1800,
        currentStock: 50,
        minStock: 10,
        unitsPerPack: 20,
      })
      expect(res.success).toBe(true)
    })

    it('validates a minimal product form without optional fields', () => {
      const res = validateProductForm({
        name: 'Producto Simple',
        sku: 'SIMPLE-01',
        costPrice: 500,
        sellPrice: 750,
      })
      expect(res.success).toBe(true)
    })

    it('rejects empty or whitespace name', () => {
      const res = validateProductForm({
        name: '   ',
        sku: 'TOM-01',
        costPrice: 100,
        sellPrice: 200,
      })
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error.code).toBe('EMPTY_PRODUCT_NAME')
    })

    it('rejects empty or whitespace SKU', () => {
      const res = validateProductForm({
        name: 'Papa Blanca',
        sku: '',
        costPrice: 100,
        sellPrice: 200,
      })
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error.code).toBe('EMPTY_SKU')
    })

    it('rejects invalid or negative cost and sell prices', () => {
      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: -10,
          sellPrice: 100,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: NaN,
          sellPrice: 100,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: -20,
        })?.success
      ).toBe(false)
    })

    it('rejects negative or NaN currentStock, minStock and unitsPerPack', () => {
      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          currentStock: -1,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          minStock: -5,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          unitsPerPack: 0,
        })?.success
      ).toBe(false)

      expect(
        validateProductForm({
          name: 'P',
          sku: 'S',
          costPrice: 100,
          sellPrice: 200,
          unitsPerPack: -10,
        })?.success
      ).toBe(false)
    })
  })

  describe('filterProducts', () => {
    const mockProductsList: Product[] = [
      {
        id: 'p1',
        name: 'Tomate Redondo',
        sku: 'TOM-01',
        barcode: '7791234567890',
        pluCode: '4011',
        categoryId: 'cat-veg',
        saleType: 'weight',
        costPrice: 500,
        sellPrice: 900,
        unitsPerPack: 1,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        stock: {
          id: 's1',
          productId: 'p1',
          branchId: 'b1',
          currentStock: 25,
          minStock: 10,
          updatedAt: '2026-01-01',
        },
      },
      {
        id: 'p2',
        name: 'Manzana Gala',
        sku: 'MANZ-02',
        barcode: '7799876543210',
        pluCode: '4131',
        categoryId: 'cat-fruit',
        saleType: 'weight',
        costPrice: 800,
        sellPrice: 1400,
        unitsPerPack: 1,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        stock: {
          id: 's2',
          productId: 'p2',
          branchId: 'b1',
          currentStock: 5,
          minStock: 10,
          updatedAt: '2026-01-01',
        },
      },
      {
        id: 'p3',
        name: 'Leche Entera 1L',
        sku: 'LECH-03',
        barcode: '7791111222233',
        categoryId: 'cat-dairy',
        saleType: 'unit',
        costPrice: 1000,
        sellPrice: 1500,
        unitsPerPack: 12,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        stock: {
          id: 's3',
          productId: 'p3',
          branchId: 'b1',
          currentStock: 0,
          minStock: 15,
          updatedAt: '2026-01-01',
        },
      },
      {
        id: 'p4',
        name: 'Aceite de Girasol 900ml',
        sku: 'ACE-04',
        categoryId: 'cat-almacen',
        saleType: 'unit',
        costPrice: 1200,
        sellPrice: 1800,
        unitsPerPack: 6,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'p5',
        name: 'Producto Sin Codigos',
        categoryId: 'cat-almacen',
        saleType: 'unit',
        costPrice: 100,
        sellPrice: 200,
        unitsPerPack: 1,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]

    it('returns empty array when product list is empty', () => {
      expect(filterProducts([], {})).toEqual([])
    })

    it('returns all products when no filters or empty filters are passed', () => {
      expect(filterProducts(mockProductsList, {})).toHaveLength(5)
      expect(filterProducts(mockProductsList, { searchQuery: '  ' })).toHaveLength(5)
    })

    it('filters by searchQuery matching name case-insensitively', () => {
      const result = filterProducts(mockProductsList, { searchQuery: 'tomate' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })

    it('filters by searchQuery matching SKU', () => {
      const result = filterProducts(mockProductsList, { searchQuery: 'MANZ-02' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p2')
    })

    it('filters by searchQuery matching barcode', () => {
      const result = filterProducts(mockProductsList, { searchQuery: '7791111222233' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p3')
    })

    it('filters by searchQuery matching pluCode', () => {
      const result = filterProducts(mockProductsList, { searchQuery: '4131' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p2')
    })

    it('returns empty array when search query matches nothing', () => {
      const result = filterProducts(mockProductsList, { searchQuery: 'inexistente' })
      expect(result).toHaveLength(0)
    })

    it('filters by categoryId (null or "all" matches all categories)', () => {
      expect(filterProducts(mockProductsList, { categoryId: null })).toHaveLength(5)
      expect(filterProducts(mockProductsList, { categoryId: 'all' })).toHaveLength(5)

      const result = filterProducts(mockProductsList, { categoryId: 'cat-veg' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })

    it('filters by stockFilter ("critical" returns low and critical items)', () => {
      expect(filterProducts(mockProductsList, { stockFilter: 'all' })).toHaveLength(5)

      const result = filterProducts(mockProductsList, { stockFilter: 'critical' })
      // p1 is ok (25 > 10)
      // p2 is low (5 <= 10) -> critical filter match
      // p3 is critical (0 <= 0) -> critical filter match
      // p4 has no stock (treated as 0 <= 0 -> critical) -> critical filter match
      // p5 has no stock (treated as 0 <= 0 -> critical) -> critical filter match
      expect(result).toHaveLength(4)
      expect(result.map((p) => p.id)).toEqual(['p2', 'p3', 'p4', 'p5'])
    })

    it('combines searchQuery, categoryId, and stockFilter accurately', () => {
      const result = filterProducts(mockProductsList, {
        searchQuery: 'Manzana',
        categoryId: 'cat-fruit',
        stockFilter: 'critical',
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p2')

      const noResult = filterProducts(mockProductsList, {
        searchQuery: 'Tomate',
        categoryId: 'cat-veg',
        stockFilter: 'critical', // Tomate has stock 25/10 (ok), so should be excluded
      })
      expect(noResult).toHaveLength(0)
    })
  })

  describe('countCriticalProducts', () => {
    it('returns 0 for empty product list', () => {
      expect(countCriticalProducts([])).toBe(0)
    })

    it('returns 0 when all products have ok stock', () => {
      const products: Product[] = [
        {
          id: 'p1',
          name: 'P1',
          saleType: 'unit',
          costPrice: 10,
          sellPrice: 20,
          unitsPerPack: 1,
          isActive: true,
          createdAt: '',
          updatedAt: '',
          stock: { id: 's1', productId: 'p1', branchId: 'b1', currentStock: 50, minStock: 10, updatedAt: '' },
        },
      ]
      expect(countCriticalProducts(products)).toBe(0)
    })

    it('correctly counts products with low, zero, or missing stock', () => {
      const products: Product[] = [
        {
          id: 'p1',
          name: 'Ok',
          saleType: 'unit',
          costPrice: 10,
          sellPrice: 20,
          unitsPerPack: 1,
          isActive: true,
          createdAt: '',
          updatedAt: '',
          stock: { id: 's1', productId: 'p1', branchId: 'b1', currentStock: 50, minStock: 10, updatedAt: '' },
        },
        {
          id: 'p2',
          name: 'Low',
          saleType: 'unit',
          costPrice: 10,
          sellPrice: 20,
          unitsPerPack: 1,
          isActive: true,
          createdAt: '',
          updatedAt: '',
          stock: { id: 's2', productId: 'p2', branchId: 'b1', currentStock: 5, minStock: 10, updatedAt: '' },
        },
        {
          id: 'p3',
          name: 'Zero',
          saleType: 'unit',
          costPrice: 10,
          sellPrice: 20,
          unitsPerPack: 1,
          isActive: true,
          createdAt: '',
          updatedAt: '',
          stock: { id: 's3', productId: 'p3', branchId: 'b1', currentStock: 0, minStock: 5, updatedAt: '' },
        },
        {
          id: 'p4',
          name: 'No stock obj',
          saleType: 'unit',
          costPrice: 10,
          sellPrice: 20,
          unitsPerPack: 1,
          isActive: true,
          createdAt: '',
          updatedAt: '',
        },
      ]
      expect(countCriticalProducts(products)).toBe(3)
    })
  })

  describe('getAvailableDestinationBranches', () => {
    const branches: Branch[] = [
      { id: 'b1', name: 'Sucursal Centro', isActive: true, createdAt: '', updatedAt: '' },
      { id: 'b2', name: 'Sucursal Norte', isActive: true, createdAt: '', updatedAt: '' },
      { id: 'b3', name: 'Sucursal Sur', isActive: true, createdAt: '', updatedAt: '' },
    ]

    it('returns all other branches excluding the active branch', () => {
      const result = getAvailableDestinationBranches(branches, 'b1')
      expect(result).toHaveLength(2)
      expect(result.map((b) => b.id)).toEqual(['b2', 'b3'])
    })

    it('returns all branches if activeBranchId is undefined', () => {
      const result = getAvailableDestinationBranches(branches, undefined)
      expect(result).toHaveLength(3)
    })

    it('returns empty array if only the active branch exists in branches', () => {
      const singleBranch: Branch[] = [
        { id: 'b1', name: 'Sucursal Unica', isActive: true, createdAt: '', updatedAt: '' },
      ]
      const result = getAvailableDestinationBranches(singleBranch, 'b1')
      expect(result).toEqual([])
    })

    it('returns empty array if branches array is empty', () => {
      expect(getAvailableDestinationBranches([], 'b1')).toEqual([])
    })
  })

  describe('getDefaultCategoryId', () => {
    it('returns the id of the first category in array', () => {
      const categories: Category[] = [
        { id: 'cat-veg', name: 'Verdulería', sortOrder: 1, isActive: true },
        { id: 'cat-fruit', name: 'Frutería', sortOrder: 2, isActive: true },
      ]
      expect(getDefaultCategoryId(categories)).toBe('cat-veg')
    })

    it('returns undefined if categories array is empty', () => {
      expect(getDefaultCategoryId([])).toBeUndefined()
    })
  })
})
