import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { CartItem, PaymentMethod, Customer } from '@/types'
import {
  calculateItemSubtotal,
  calculateCartSubtotal,
  calculateLegalRounding,
  calculateCartTotal,
  calculateChange,
  mergeOrAddItem,
} from '@/features/pos'
import { safeStorage } from '@/lib/storage'

interface PosState {
  items: CartItem[]
  selectedCustomer: Customer | null
  paymentMethod: PaymentMethod
  amountPaid: number
  ticketNumber: string
  searchQuery: string
  selectedCategory: string | null

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateItemQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setCustomer: (customer: Customer | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setAmountPaid: (amount: number) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (categoryId: string | null) => void

  // Delegated queries
  subtotal: () => number
  rounding: () => number
  total: () => number
  change: () => number
  itemCount: () => number
}

let ticketCounter = 892

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

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      items: [
        {
          id: 'item-init-1',
          productId: 'prod-01',
          productName: 'Tomate Redondo Especial',
          saleType: 'weight',
          quantity: 1.35,
          unitPrice: 1890,
          costPrice: 950,
          subtotal: 2551.5,
          pluCode: '101',
        },
        {
          id: 'item-init-2',
          productId: 'prod-05',
          productName: 'Aceite de Girasol Natura 1.5L',
          saleType: 'unit',
          quantity: 2,
          unitPrice: 2350,
          costPrice: 1650,
          subtotal: 4700,
          barcode: '7790012345678',
        },
        {
          id: 'item-init-3',
          productId: 'prod-02',
          productName: 'Banana Cavendish Ecuador',
          saleType: 'weight',
          quantity: 0.82,
          unitPrice: 2100,
          costPrice: 1200,
          subtotal: 1722,
          pluCode: '104',
        },
        {
          id: 'item-init-4',
          productId: 'prod-07',
          productName: 'Yerba Mate Playadito 1kg',
          saleType: 'unit',
          quantity: 1,
          unitPrice: 3890,
          costPrice: 2750,
          subtotal: 3890,
          barcode: '7792123450987',
        },
      ],
      selectedCustomer: null,
      paymentMethod: 'cash',
      amountPaid: 15000,
      ticketNumber: `0004-${String(ticketCounter).padStart(6, '0')}`,
      searchQuery: '',
      selectedCategory: null,

      addItem: (item) =>
        set((state) => ({
          items: mergeOrAddItem(state.items, item),
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateItemQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  quantity,
                  subtotal: calculateItemSubtotal(quantity, i.unitPrice),
                }
              : i
          ),
        })),

      clearCart: () => {
        ticketCounter++
        set({
          items: [],
          selectedCustomer: null,
          paymentMethod: 'cash',
          amountPaid: 0,
          ticketNumber: `0004-${String(ticketCounter).padStart(6, '0')}`,
        })
      },

      setCustomer: (customer) => set({ selectedCustomer: customer }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setAmountPaid: (amount) => set({ amountPaid: amount }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),

      // Delegated to pure calculations
      subtotal: () => calculateCartSubtotal(get().items),
      rounding: () => calculateLegalRounding(calculateCartSubtotal(get().items)),
      total: () => calculateCartTotal(calculateCartSubtotal(get().items)),
      change: () => calculateChange(calculateCartTotal(calculateCartSubtotal(get().items)), get().amountPaid),
      itemCount: () => get().items.length,
    }),
    {
      name: 'lambda-pos-store',
      storage: createJSONStorage(() => safeZustandStorage),
    }
  )
)
