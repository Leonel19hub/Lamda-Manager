import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type {
  CartItem,
  PaymentMethod,
  Customer,
  Sale,
  SaleItem,
  SplitPaymentItem,
  Result,
  ValidationError,
  UserRole,
  CashRegister,
} from '@/types'
import {
  calculateItemSubtotal,
  calculateCartSubtotal,
  calculateLegalRounding,
  calculateCartTotal,
  calculateChange,
  mergeOrAddItem,
  validateSaleEligibility,
} from '@/features/pos'
import { safeStorage } from '@/lib/storage'
import { useInventoryStore } from './useInventoryStore'
import { useCustomerStore } from './useCustomerStore'

export interface CheckoutContext {
  cashierId: string
  cashierName: string
  cashierRole: UserRole
  warehouseId?: string
  warehouseName: string
  activeRegister: CashRegister | null
}

interface PosState {
  items: CartItem[]
  selectedCustomer: Customer | null
  paymentMethod: PaymentMethod
  splitPayments: SplitPaymentItem[]
  amountPaid: number
  ticketNumber: string
  searchQuery: string
  selectedCategory: string | null
  recentSales: Sale[]

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateItemQuantity: (id: string, quantity: number) => void
  setItemDiscount: (id: string, discountPercent: number) => void
  clearCart: () => void
  setCustomer: (customer: Customer | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setSplitPayments: (payments: SplitPaymentItem[]) => void
  addSplitPayment: (payment: SplitPaymentItem) => void
  removeSplitPayment: (id: string) => void
  setAmountPaid: (amount: number) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (categoryId: string | null) => void
  commitSale: (sale: Sale) => void
  checkoutTicket: (ctx: CheckoutContext) => Result<Sale, ValidationError>

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
          productSku: 'TOM-01',
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
          productSku: 'ACE-NAT-1.5',
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
          productSku: 'BAN-ECU',
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
          productSku: 'YER-PLAY-1K',
          saleType: 'unit',
          quantity: 1,
          unitPrice: 3890,
          costPrice: 2750,
          subtotal: 3890,
          barcode: '7792123450987',
        },
      ],
      selectedCustomer: null,
      paymentMethod: 'efectivo',
      splitPayments: [],
      amountPaid: 15000,
      ticketNumber: `0001-${String(ticketCounter).padStart(8, '0')}`,
      searchQuery: '',
      selectedCategory: null,
      recentSales: [],

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
                  subtotal: calculateItemSubtotal(quantity, i.unitPrice, i.discountPercent || 0),
                }
              : i
          ),
        })),

      setItemDiscount: (id, discountPercent) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  discountPercent,
                  subtotal: calculateItemSubtotal(i.quantity, i.unitPrice, discountPercent),
                }
              : i
          ),
        })),

      clearCart: () => {
        ticketCounter++
        set({
          items: [],
          selectedCustomer: null,
          paymentMethod: 'efectivo',
          splitPayments: [],
          amountPaid: 0,
          ticketNumber: `0001-${String(ticketCounter).padStart(8, '0')}`,
        })
      },

      setCustomer: (customer) => set({ selectedCustomer: customer }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setSplitPayments: (payments) => set({ splitPayments: payments }),
      addSplitPayment: (payment) =>
        set((s) => ({ splitPayments: [...s.splitPayments, payment] })),
      removeSplitPayment: (id) =>
        set((s) => ({ splitPayments: s.splitPayments.filter((p) => p.id !== id) })),
      setAmountPaid: (amount) => set({ amountPaid: amount }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),

      commitSale: (sale) => {
        ticketCounter++
        set((s) => ({
          recentSales: [sale, ...s.recentSales].slice(0, 50),
          items: [],
          selectedCustomer: null,
          paymentMethod: 'efectivo',
          splitPayments: [],
          amountPaid: 0,
          ticketNumber: `0001-${String(ticketCounter).padStart(8, '0')}`,
        }))
      },

      checkoutTicket: (ctx) => {
        const state = get()
        const currentTotal = state.total()
        const currentSubtotal = state.subtotal()

        const eligibility = validateSaleEligibility({
          items: state.items,
          paymentMethod: state.paymentMethod,
          selectedCustomer: state.selectedCustomer,
          activeRegister: ctx.activeRegister,
          total: currentTotal,
          amountPaid: state.amountPaid,
          splitPayments: state.splitPayments,
        })

        if (!eligibility.success) {
          return eligibility
        }

        const saleItems: SaleItem[] = state.items.map((i) => ({
          id: `item-${Date.now()}-${Math.random()}`,
          saleId: `sale-${Date.now()}`,
          productId: i.productId,
          productSku: i.productSku || i.pluCode || i.barcode || 'SKU-GEN',
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent || 0,
          costPrice: i.costPrice,
          subtotal: i.subtotal,
          total: i.subtotal,
          saleType: i.saleType,
        }))

        const finalSale: Sale = {
          id: `sale-${Date.now()}-${Math.random()}`,
          ticketNumber: state.ticketNumber,
          registerId: ctx.activeRegister?.id || 'reg-01',
          warehouseId: ctx.warehouseId,
          warehouseName: ctx.warehouseName,
          customerId: state.selectedCustomer?.id,
          customerName: state.selectedCustomer?.fullName || 'Consumidor Final',
          customerDni: state.selectedCustomer?.dni || state.selectedCustomer?.dniCuit,
          cashierId: ctx.cashierId,
          cashierName: ctx.cashierName,
          cashierRole: ctx.cashierRole,
          subtotal: currentSubtotal,
          discountTotal: 0,
          rounding: currentTotal - currentSubtotal,
          total: currentTotal,
          paymentMethod: state.paymentMethod,
          splitPayments: state.paymentMethod === 'mixto' ? state.splitPayments : undefined,
          cashReceived: state.paymentMethod === 'efectivo' ? state.amountPaid : undefined,
          cashChange: state.paymentMethod === 'efectivo' ? state.change() : undefined,
          status: 'completed',
          createdAt: new Date().toISOString(),
          items: saleItems,
        }

        // Deduct inventory stock for each sold item
        const inventoryStore = useInventoryStore.getState()
        state.items.forEach((item) => {
          inventoryStore.deductProductStock(item.productId, item.quantity, ctx.warehouseId)
        })

        // If sale is on account (fiado), charge customer account
        if (state.paymentMethod === 'cuenta_corriente' && state.selectedCustomer) {
          useCustomerStore.getState().chargeAccount(
            state.selectedCustomer.id,
            currentTotal,
            state.ticketNumber,
            'Venta fiado almacén y verdulería'
          )
        }

        ticketCounter++
        set((s) => ({
          recentSales: [finalSale, ...s.recentSales].slice(0, 50),
          items: [],
          selectedCustomer: null,
          paymentMethod: 'efectivo',
          splitPayments: [],
          amountPaid: 0,
          ticketNumber: `0001-${String(ticketCounter).padStart(8, '0')}`,
        }))

        return { success: true, data: finalSale }
      },

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
