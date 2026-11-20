import { describe, it, expect, beforeEach, vi } from 'vitest'
import { executePosCheckout, type CheckoutContext } from './checkoutService'
import { usePosStore } from '@/stores/usePosStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useCustomerStore } from '@/stores/useCustomerStore'
import { useCashRegisterStore } from '@/stores/useCashRegisterStore'
import type { CashRegister, Customer, Product, CartItem } from '@/types'

describe('pos/application/checkoutService', () => {
  const mockOpenRegister: CashRegister = {
    id: 'reg-test-01',
    registerNumber: 'Caja 01',
    branchId: 'branch-01',
    openedBy: 'user-01',
    openingAmount: 10000,
    expectedCash: 10000,
    totalCard: 0,
    totalTransfer: 0,
    totalAccount: 0,
    openedAt: '2026-03-01T08:00:00Z',
    isOpen: true,
  }

  const mockCustomer: Customer = {
    id: 'cust-test-01',
    fullName: 'Roberto Gómez',
    creditLimit: 50000,
    currentBalance: 10000,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }

  const mockProduct: Product = {
    id: 'prod-test-01',
    name: 'Aceite de Girasol 1.5L',
    saleType: 'unit',
    costPrice: 1200,
    sellPrice: 2000,
    unitsPerPack: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    stock: {
      id: 'stk-01',
      productId: 'prod-test-01',
      branchId: 'branch-01',
      currentStock: 25,
      minStock: 5,
      updatedAt: '2026-01-01T00:00:00Z',
    },
  }

  const mockCartItem: CartItem = {
    id: 'item-01',
    productId: 'prod-test-01',
    productName: 'Aceite de Girasol 1.5L',
    saleType: 'unit',
    quantity: 2,
    unitPrice: 2000,
    costPrice: 1200,
    subtotal: 4000,
  }

  const defaultContext: CheckoutContext = {
    cashierId: 'user-01',
    cashierName: 'Martina Cajera',
    cashierRole: 'EMPLEADO',
    activeRegister: mockOpenRegister,
    activeBranch: { id: 'branch-01', name: 'Casa Central' },
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Reset stores to safe predictable baseline
    usePosStore.setState({
      items: [{ ...mockCartItem }],
      selectedCustomer: null,
      paymentMethod: 'efectivo',
      splitPayments: [],
      amountPaid: 5000,
      ticketNumber: '0001-00000099',
      recentSales: [],
    })

    useInventoryStore.setState({
      products: [{ ...mockProduct, stock: { ...mockProduct.stock! } }],
    })

    useCustomerStore.setState({
      customers: [{ ...mockCustomer }],
      movements: [],
    })

    useCashRegisterStore.setState({
      currentRegister: { ...mockOpenRegister },
      closedRegisters: [],
      movements: [],
    })
  })

  describe('Pre-validation phase', () => {
    it('returns fail without mutating stores if active register is closed', () => {
      const res = executePosCheckout({
        ...defaultContext,
        activeRegister: { ...mockOpenRegister, isOpen: false },
      })

      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('REGISTER_CLOSED')
      }
      // Verifies stores remain untouched
      expect(useInventoryStore.getState().products[0].stock?.currentStock).toBe(25)
      expect(usePosStore.getState().items.length).toBe(1)
    })

    it('returns fail if cart has no items', () => {
      usePosStore.setState({ items: [] })
      const res = executePosCheckout(defaultContext)

      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('EMPTY_CART')
      }
    })

    it('returns fail if payment in cash is insufficient', () => {
      usePosStore.setState({ amountPaid: 2000 }) // total is 4000
      const res = executePosCheckout(defaultContext)

      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('INSUFFICIENT_CASH')
      }
    })

    it('returns fail if cuenta corriente is selected without customer', () => {
      usePosStore.setState({ paymentMethod: 'cuenta_corriente', selectedCustomer: null })
      const res = executePosCheckout(defaultContext)

      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('CUSTOMER_REQUIRED_FOR_CREDIT')
      }
    })
  })

  describe('Successful checkout execution', () => {
    it('processes cash checkout: deducts inventory, records cash drawer and clears cart', () => {
      const res = executePosCheckout(defaultContext)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.paymentMethod).toBe('efectivo')
        expect(res.data.total).toBe(4000)
        expect(res.data.items?.length).toBe(1)
      }

      // Inventory stock deducted by 2 (25 - 2 = 23)
      expect(useInventoryStore.getState().products[0].stock?.currentStock).toBe(23)

      // Cash register drawer accumulated 4000 (10000 + 4000 = 14000)
      expect(useCashRegisterStore.getState().currentRegister?.expectedCash).toBe(14000)

      // POS cart committed and cleared
      expect(usePosStore.getState().items.length).toBe(0)
      expect(usePosStore.getState().recentSales.length).toBe(1)
    })

    it('processes cuenta_corriente checkout: charges customer debt and updates drawer totalAccount', () => {
      usePosStore.setState({
        paymentMethod: 'cuenta_corriente',
        selectedCustomer: { ...mockCustomer },
      })

      const res = executePosCheckout(defaultContext)
      expect(res.success).toBe(true)

      // Inventory deducted
      expect(useInventoryStore.getState().products[0].stock?.currentStock).toBe(23)

      // Customer debt increased by 4000 (10000 + 4000 = 14000)
      const updatedCustomer = useCustomerStore.getState().customers.find((c) => c.id === mockCustomer.id)
      expect(updatedCustomer?.currentBalance).toBe(14000)

      // Register totalAccount increased
      expect(useCashRegisterStore.getState().currentRegister?.totalAccount).toBe(4000)

      // Cart cleared
      expect(usePosStore.getState().items.length).toBe(0)
    })

    it('processes mixed payment: imputes partial debt to customer and partial amounts to drawer', () => {
      usePosStore.setState({
        paymentMethod: 'mixto',
        selectedCustomer: { ...mockCustomer },
        splitPayments: [
          { id: 'sp-1', method: 'efectivo', amount: 1500 },
          { id: 'sp-2', method: 'debito', amount: 1500 },
          { id: 'sp-3', method: 'cuenta_corriente', amount: 1000 },
        ],
      })

      const res = executePosCheckout(defaultContext)
      expect(res.success).toBe(true)

      // Customer charged only the 1000 partial on credit (10000 + 1000 = 11000)
      const updatedCustomer = useCustomerStore.getState().customers.find((c) => c.id === mockCustomer.id)
      expect(updatedCustomer?.currentBalance).toBe(11000)

      // Drawer accumulated each partial method
      const reg = useCashRegisterStore.getState().currentRegister
      expect(reg?.expectedCash).toBe(11500) // 10000 + 1500
      expect(reg?.totalCard).toBe(1500)
      expect(reg?.totalAccount).toBe(1000)
      expect(usePosStore.getState().items.length).toBe(0)
    })
  })

  describe('Rollback guarantee upon unexpected transaction failures', () => {
    it('simulates failure in Step 3 (recordSale in cash register) during mixed payment with cuenta_corriente: simultaneously rolls back inventory and customer debt, leaving cart intact', () => {
      usePosStore.setState({
        paymentMethod: 'mixto',
        selectedCustomer: { ...mockCustomer },
        splitPayments: [
          { id: 'sp-1', method: 'efectivo', amount: 2500 },
          { id: 'sp-2', method: 'cuenta_corriente', amount: 1500 },
        ],
      })

      // Simulate unexpected hardware or persistence crash in Step 3 (useCashRegisterStore.recordSale)
      vi.spyOn(useCashRegisterStore.getState(), 'recordSale').mockImplementation(() => {
        throw new Error('Fallo crítico simulado al escribir en la gaveta de caja.')
      })

      const res = executePosCheckout(defaultContext)

      // 1. Transaction failed with controlled error
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('CHECKOUT_TRANSACTION_FAILED')
        expect(res.error.message).toContain('Fallo crítico simulado')
      }

      // 2. Inventory stock was restored to initial snapshot (25, not 23)
      expect(useInventoryStore.getState().products[0].stock?.currentStock).toBe(25)

      // 3. Customer balance was restored to initial snapshot (10000, not 11500)
      const rolledBackCustomer = useCustomerStore.getState().customers.find((c) => c.id === mockCustomer.id)
      expect(rolledBackCustomer?.currentBalance).toBe(10000)

      // 4. Cash register expected totals remain identical to initial snapshot
      const reg = useCashRegisterStore.getState().currentRegister
      expect(reg?.expectedCash).toBe(10000)
      expect(reg?.totalAccount).toBe(0)

      // 5. Cart in usePosStore was NOT cleared: items remain intact on screen for cashier to retry
      expect(usePosStore.getState().items.length).toBe(1)
      expect(usePosStore.getState().items[0].productId).toBe('prod-test-01')
      expect(usePosStore.getState().selectedCustomer?.id).toBe(mockCustomer.id)
      expect(usePosStore.getState().recentSales.length).toBe(0)
    })

    it('rolls back cleanly if inventory deduction fails during execution', () => {
      vi.spyOn(useInventoryStore.getState(), 'deductProductStock').mockReturnValue({
        success: false,
        error: { code: 'STOCK_ERROR', message: 'Error de persistencia en stock' },
      })

      const res = executePosCheckout(defaultContext)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.code).toBe('CHECKOUT_TRANSACTION_FAILED')
        expect(res.error.message).toContain('Error de persistencia en stock')
      }

      // Cash register drawer was never modified
      expect(useCashRegisterStore.getState().currentRegister?.expectedCash).toBe(10000)
      // Cart remains intact
      expect(usePosStore.getState().items.length).toBe(1)
    })
  })
})
