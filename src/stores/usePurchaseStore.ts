import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type {
  Supplier,
  PurchaseOrder,
  PurchaseItem,
  Result,
  ValidationError,
} from '@/types'
import {
  validateSupplierForm,
  validatePurchaseOrder,
  type SupplierInput,
  type PurchaseOrderInput,
} from '@/features/purchases'
import { mockSuppliers } from '@/mock/mockData'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { safeStorage } from '@/lib/storage'

interface PurchaseState {
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  selectedSupplierId: string | null

  // Supplier Actions
  addSupplier: (data: SupplierInput) => Result<Supplier, ValidationError>
  updateSupplier: (id: string, data: Partial<SupplierInput>) => Result<Supplier, ValidationError>
  setSelectedSupplierId: (id: string | null) => void

  // Purchase Order Actions
  createPurchaseOrder: (input: PurchaseOrderInput) => Result<PurchaseOrder, ValidationError>
}

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

let orderCounter = 18

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-01',
    orderNumber: 'OC-2026-0018',
    supplierId: 'sup-01',
    branchId: 'branch-01',
    receivedBy: 'María Gómez',
    subtotal: 125000,
    total: 125000,
    notes: 'Frutas y verduras frescas de estación (Mercado Central)',
    receivedAt: '2026-11-18T07:30:00.000Z',
    createdAt: '2026-11-18T07:30:00.000Z',
    items: [
      {
        id: 'poi-01',
        purchaseId: 'po-01',
        productId: 'prod-02',
        productName: 'Tomate Redondo Especial',
        packsReceived: 5,
        unitsPerPack: 20,
        unitsReceived: 100,
        unitCost: 1250,
        totalCost: 125000,
        oldCost: 1100,
        newCost: 1250,
        oldSellPrice: 1950,
        newSellPrice: 2200,
      },
    ],
  },
  {
    id: 'po-02',
    orderNumber: 'OC-2026-0017',
    supplierId: 'sup-02',
    branchId: 'branch-01',
    receivedBy: 'María Gómez',
    subtotal: 184000,
    total: 184000,
    notes: 'Galletitas y comestibles secos reposición semanal',
    receivedAt: '2026-11-15T14:15:00.000Z',
    createdAt: '2026-11-15T14:15:00.000Z',
    items: [
      {
        id: 'poi-02',
        purchaseId: 'po-02',
        productId: 'prod-01',
        productName: 'Yerba Mate Playadito 1kg',
        packsReceived: 8,
        unitsPerPack: 10,
        unitsReceived: 80,
        unitCost: 2300,
        totalCost: 184000,
        oldCost: 2200,
        newCost: 2300,
        oldSellPrice: 3890,
        newSellPrice: 4100,
      },
    ],
  },
]

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      suppliers: [...mockSuppliers],
      purchaseOrders: initialPurchaseOrders,
      selectedSupplierId: mockSuppliers[0]?.id || null,

      addSupplier: (data) => {
        const validation = validateSupplierForm(data)
        if (!validation.success) {
          return validation
        }

        const newSupplier: Supplier = {
          id: `sup-${Date.now()}`,
          name: data.name.trim(),
          cuit: data.cuit?.trim() || undefined,
          contactName: data.contactName?.trim() || undefined,
          phone: data.phone?.trim() || undefined,
          email: data.email?.trim() || undefined,
          address: data.address?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          suppliers: [newSupplier, ...state.suppliers],
          selectedSupplierId: newSupplier.id,
        }))

        return { success: true, data: newSupplier }
      },

      updateSupplier: (id, data) => {
        const existing = get().suppliers.find((s) => s.id === id)
        if (!existing) {
          return {
            success: false,
            error: {
              code: 'SUPPLIER_NOT_FOUND',
              message: 'El proveedor seleccionado no existe.',
            },
          }
        }

        const mergedInput: SupplierInput = {
          name: data.name !== undefined ? data.name : existing.name,
          cuit: data.cuit !== undefined ? data.cuit : existing.cuit,
          contactName: data.contactName !== undefined ? data.contactName : existing.contactName,
          phone: data.phone !== undefined ? data.phone : existing.phone,
          email: data.email !== undefined ? data.email : existing.email,
          address: data.address !== undefined ? data.address : existing.address,
          notes: data.notes !== undefined ? data.notes : existing.notes,
        }

        const validation = validateSupplierForm(mergedInput)
        if (!validation.success) {
          return validation
        }

        const updatedSupplier: Supplier = {
          ...existing,
          name: mergedInput.name.trim(),
          cuit: mergedInput.cuit?.trim() || undefined,
          contactName: mergedInput.contactName?.trim() || undefined,
          phone: mergedInput.phone?.trim() || undefined,
          email: mergedInput.email?.trim() || undefined,
          address: mergedInput.address?.trim() || undefined,
          notes: mergedInput.notes?.trim() || undefined,
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === id ? updatedSupplier : s)),
        }))

        return { success: true, data: updatedSupplier }
      },

      setSelectedSupplierId: (id) => set({ selectedSupplierId: id }),

      createPurchaseOrder: (input) => {
        const validation = validatePurchaseOrder(input)
        if (!validation.success) {
          return validation
        }

        const now = new Date().toISOString()
        orderCounter++
        const orderId = `po-${Date.now()}`
        const orderNumber = input.orderNumber?.trim() || `OC-2026-${String(orderCounter).padStart(4, '0')}`

        const subtotal = input.items.reduce((acc, item) => acc + item.totalCost, 0)
        const total = subtotal

        const items: PurchaseItem[] = input.items.map((item, idx) => ({
          id: `poi-${Date.now()}-${idx}`,
          purchaseId: orderId,
          productId: item.productId,
          productName: item.productName,
          packsReceived: item.packsReceived,
          unitsPerPack: item.unitsPerPack,
          unitsReceived: item.unitsReceived,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          oldCost: item.oldCost,
          newCost: item.newCost,
          oldSellPrice: item.oldSellPrice,
          newSellPrice: item.newSellPrice,
        }))

        const newOrder: PurchaseOrder = {
          id: orderId,
          orderNumber,
          supplierId: input.supplierId,
          branchId: input.branchId,
          receivedBy: input.receivedBy || 'Responsable de Depósito',
          subtotal,
          total,
          notes: input.notes,
          receivedAt: now,
          createdAt: now,
          items,
        }

        // Orchestrate stock addition and price update in useInventoryStore
        const inventoryStore = useInventoryStore.getState()
        items.forEach((item) => {
          // Add units received to stock
          inventoryStore.addProductStock(item.productId, item.unitsReceived, input.branchId)

          // Update cost and sell price if provided
          if (item.newCost !== undefined || item.newSellPrice !== undefined) {
            inventoryStore.updateProduct(item.productId, {
              ...(item.newCost !== undefined ? { costPrice: item.newCost } : {}),
              ...(item.newSellPrice !== undefined ? { sellPrice: item.newSellPrice } : {}),
            })
          }
        })

        set((state) => ({
          purchaseOrders: [newOrder, ...state.purchaseOrders],
        }))

        return { success: true, data: newOrder }
      },
    }),
    {
      name: 'lambda-purchases-store',
      storage: createJSONStorage(() => safeZustandStorage),
    }
  )
)
