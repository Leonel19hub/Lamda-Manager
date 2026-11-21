import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { Product, Category, WasteLog, InventoryTransfer, Result, ValidationError } from '@/types'
import { mockProducts, mockCategories, mockWasteLogs, mockTransfers } from '@/mock/mockData'
import {
  deductStock,
  addStock,
  validateTransfer,
  validateProductForm,
} from '@/features/inventory'
import { safeStorage } from '@/lib/storage'

interface InventoryState {
  products: Product[]
  categories: Category[]
  wasteLogs: WasteLog[]
  transfers: InventoryTransfer[]

  // Product CRUD
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Result<Product, ValidationError>
  updateProduct: (id: string, updates: Partial<Product>) => Result<Product, ValidationError>

  // Stock operations
  deductProductStock: (productId: string, quantity: number, branchId?: string) => Result<number, ValidationError>
  addProductStock: (productId: string, quantity: number, branchId?: string) => Result<number, ValidationError>
  restoreProductStock: (productId: string, previousStock: number, branchId?: string) => void
  restoreProducts: (previousProducts: Product[]) => void

  // Waste (Mermas)
  recordWaste: (params: {
    productId: string
    branchId: string
    quantity: number
    reason: string
    notes?: string
    registeredBy: string
  }) => Result<WasteLog, ValidationError>

  // Transfers
  createTransfer: (params: {
    fromBranchId: string
    toBranchId: string
    productId: string
    quantity: number
    notes?: string
    createdBy: string
  }) => Result<InventoryTransfer, ValidationError>

  receiveTransfer: (transferId: string, receivedBy: string) => Result<InventoryTransfer, ValidationError>
}

// Safe LocalStorage adapter for Zustand with corruption recovery
const safeZustandStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return safeStorage.getItem(name, { fallback: null, version: 1 })
  },
  setItem: (name: string, value: string): void => {
    safeStorage.setItem(name, value, 1)
  },
  removeItem: (name: string): void => {
    safeStorage.removeItem(name)
  },
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: mockProducts,
      categories: mockCategories.filter((c) => c.id !== 'cat-01'),
      wasteLogs: mockWasteLogs,
      transfers: mockTransfers,

      addProduct: (productData) => {
        const validation = validateProductForm({
          name: productData.name,
          sku: productData.sku || productData.pluCode || productData.barcode || 'SKU-NEW',
          costPrice: productData.costPrice,
          sellPrice: productData.sellPrice,
          currentStock: productData.stock?.currentStock,
          minStock: productData.stock?.minStock,
          unitsPerPack: productData.unitsPerPack,
        })

        if (!validation.success) {
          return validation
        }

        const now = new Date().toISOString()
        const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const newProduct: Product = {
          ...productData,
          id: productId,
          sku: productData.sku || productData.pluCode || productData.barcode || `SKU-${Date.now()}`,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          stock: productData.stock
            ? {
                ...productData.stock,
                productId,
              }
            : undefined,
        }

        set((state) => ({ products: [newProduct, ...state.products] }))
        return { success: true, data: newProduct }
      },

      updateProduct: (id, updates) => {
        const product = get().products.find((p) => p.id === id)
        if (!product) {
          return {
            success: false,
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'El producto a actualizar no existe.',
              field: 'id',
            },
          }
        }

        const updatedProduct: Product = {
          ...product,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
        }))

        return { success: true, data: updatedProduct }
      },

      deductProductStock: (productId, quantity, branchId) => {
        const product = get().products.find((p) => p.id === productId)
        if (!product) {
          return {
            success: false,
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'Producto no encontrado.',
              field: 'productId',
            },
          }
        }

        const currentStock = product.stock?.currentStock || 0
        const deduction = deductStock(currentStock, quantity)
        if (!deduction.success) {
          return deduction
        }

        const newStock = deduction.data
        const now = new Date().toISOString()

        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              return {
                ...p,
                updatedAt: now,
                stock: p.stock
                  ? {
                      ...p.stock,
                      currentStock: newStock,
                      updatedAt: now,
                    }
                  : {
                      id: `stk-${Date.now()}`,
                      productId,
                      branchId: branchId || 'branch-01',
                      currentStock: newStock,
                      minStock: 10,
                      updatedAt: now,
                    },
              }
            }
            return p
          }),
        }))

        return { success: true, data: newStock }
      },

      addProductStock: (productId, quantity, branchId) => {
        const product = get().products.find((p) => p.id === productId)
        if (!product) {
          return {
            success: false,
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'Producto no encontrado.',
              field: 'productId',
            },
          }
        }

        const currentStock = product.stock?.currentStock || 0
        const addition = addStock(currentStock, quantity)
        if (!addition.success) {
          return addition
        }

        const newStock = addition.data
        const now = new Date().toISOString()

        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              return {
                ...p,
                updatedAt: now,
                stock: p.stock
                  ? {
                      ...p.stock,
                      currentStock: newStock,
                      updatedAt: now,
                    }
                  : {
                      id: `stk-${Date.now()}`,
                      productId,
                      branchId: branchId || 'branch-01',
                      currentStock: newStock,
                      minStock: 10,
                      updatedAt: now,
                    },
              }
            }
            return p
          }),
        }))

        return { success: true, data: newStock }
      },

      restoreProductStock: (productId, previousStock) => {
        const now = new Date().toISOString()
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId && p.stock) {
              return {
                ...p,
                updatedAt: now,
                stock: {
                  ...p.stock,
                  currentStock: previousStock,
                  updatedAt: now,
                },
              }
            }
            return p
          }),
        }))
      },

      restoreProducts: (previousProducts) => {
        set({ products: [...previousProducts] })
      },

      recordWaste: (params) => {
        const { productId, branchId, quantity, reason, notes, registeredBy } = params
        const product = get().products.find((p) => p.id === productId)
        if (!product) {
          return {
            success: false,
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'Producto no encontrado.',
              field: 'productId',
            },
          }
        }

        const deductResult = get().deductProductStock(productId, quantity, branchId)
        if (!deductResult.success) {
          return deductResult
        }

        const newWasteLog: WasteLog = {
          id: `wst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          productId,
          branchId,
          quantity,
          reason,
          notes,
          registeredBy,
          createdAt: new Date().toISOString(),
          product,
        }

        set((state) => ({
          wasteLogs: [newWasteLog, ...state.wasteLogs],
        }))

        return { success: true, data: newWasteLog }
      },

      createTransfer: (params) => {
        const { fromBranchId, toBranchId, productId, quantity, notes, createdBy } = params
        const product = get().products.find((p) => p.id === productId)
        if (!product) {
          return {
            success: false,
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'Producto no encontrado.',
              field: 'productId',
            },
          }
        }

        const currentStock = product.stock?.currentStock || 0
        const transferValidation = validateTransfer(currentStock, quantity)
        if (!transferValidation.success) {
          return transferValidation
        }

        const deductResult = get().deductProductStock(productId, quantity, fromBranchId)
        if (!deductResult.success) {
          return deductResult
        }

        const transferId = `trf-${Date.now()}`
        const newTransfer: InventoryTransfer = {
          id: transferId,
          transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
          fromBranchId,
          toBranchId,
          status: 'in_transit',
          createdBy,
          notes: notes || 'Remito de traslado entre sucursales',
          createdAt: new Date().toISOString(),
          items: [
            {
              id: `trf-item-${Date.now()}`,
              transferId,
              productId,
              quantitySent: quantity,
              product,
            },
          ],
        }

        set((state) => ({
          transfers: [newTransfer, ...state.transfers],
        }))

        return { success: true, data: newTransfer }
      },

      receiveTransfer: (transferId, receivedBy) => {
        const transfer = get().transfers.find((t) => t.id === transferId)
        if (!transfer) {
          return {
            success: false,
            error: {
              code: 'TRANSFER_NOT_FOUND',
              message: 'Traslado no encontrado.',
              field: 'transferId',
            },
          }
        }

        if (transfer.status === 'received') {
          return {
            success: false,
            error: {
              code: 'ALREADY_RECEIVED',
              message: 'El traslado ya fue recibido previamente.',
              field: 'transferId',
            },
          }
        }

        // Add stock to destination branch for all items
        const now = new Date().toISOString()
        transfer.items?.forEach((item) => {
          get().addProductStock(item.productId, item.quantitySent, transfer.toBranchId)
        })

        const updatedTransfer: InventoryTransfer = {
          ...transfer,
          status: 'received',
          receivedBy,
          receivedAt: now,
          items: transfer.items?.map((item) => ({
            ...item,
            quantityReceived: item.quantitySent,
          })),
        }

        set((state) => ({
          transfers: state.transfers.map((t) => (t.id === transferId ? updatedTransfer : t)),
        }))

        return { success: true, data: updatedTransfer }
      },
    }),
    {
      name: 'lambda-inventory-store',
      storage: createJSONStorage(() => safeZustandStorage),
    }
  )
)
