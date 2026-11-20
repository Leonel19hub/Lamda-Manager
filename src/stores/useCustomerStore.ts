import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type {
  Customer,
  CustomerAccountMovement,
  CustomerPayment,
  ValidationError,
  Result,
} from '@/types'
import {
  applyPayment,
  calculateNewBalanceAfterCharge,
  validateCustomerForm,
  type CustomerInput,
} from '@/features/customers/domain/creditRules'
import { mockCustomers } from '@/mock/mockData'
import { useCashRegisterStore } from '@/stores/useCashRegisterStore'
import { safeStorage } from '@/lib/storage'

interface CustomerState {
  customers: Customer[]
  movements: CustomerAccountMovement[]
  selectedCustomerId: string | null

  // Actions
  addCustomer: (data: CustomerInput) => Result<Customer, ValidationError>
  updateCustomer: (id: string, data: Partial<CustomerInput>) => Result<Customer, ValidationError>
  recordPayment: (params: {
    customerId: string
    amount: number
    notes?: string
    userName?: string
  }) => Result<CustomerPayment, ValidationError>
  chargeAccount: (
    customerId: string,
    amount: number,
    ticketNumber: string,
    notes?: string
  ) => void
  setSelectedCustomerId: (id: string | null) => void
  getCustomerById: (id: string) => Customer | undefined
  getCustomerMovements: (customerId: string) => CustomerAccountMovement[]
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

const initialMovements: CustomerAccountMovement[] = [
  {
    id: 'mov-acc-01',
    customerId: 'cust-01',
    date: '2026-11-15T18:20:00.000Z',
    type: 'VENTA',
    doc: '0001-00004901',
    debit: 18450,
    credit: 0,
    notes: 'Compra fiado almacén y verdulería',
  },
  {
    id: 'mov-acc-02',
    customerId: 'cust-02',
    date: '2026-11-14T11:45:00.000Z',
    type: 'VENTA',
    doc: '0001-00004880',
    debit: 32600,
    credit: 0,
    notes: 'Compra fiado artículos de despensa',
  },
  {
    id: 'mov-acc-03',
    customerId: 'cust-03',
    date: '2026-11-10T19:00:00.000Z',
    type: 'VENTA',
    doc: '0001-00004812',
    debit: 20000,
    credit: 0,
    notes: 'Insumos rotisería',
  },
  {
    id: 'mov-acc-04',
    customerId: 'cust-03',
    date: '2026-11-13T10:30:00.000Z',
    type: 'COBRO',
    doc: 'REC-00048120',
    debit: 0,
    credit: 20000,
    notes: 'Abono total en efectivo',
  },
]

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: mockCustomers.map((c) => ({
        ...c,
        totalSpent: c.totalSpent || c.currentBalance * 2,
        purchaseCount: c.purchaseCount || 3,
        lastPurchaseAt: c.lastPurchaseAt || c.updatedAt,
      })),
      movements: initialMovements,
      selectedCustomerId: mockCustomers[0]?.id || null,

      addCustomer: (data) => {
        const validation = validateCustomerForm(data)
        if (!validation.success) {
          return validation
        }

        const newCustomer: Customer = {
          id: `cust-${Date.now()}`,
          fullName: data.fullName.trim(),
          name: data.fullName.trim(),
          type: data.type || 'persona',
          dni: data.dniCuit?.trim(),
          dniCuit: data.dniCuit?.trim(),
          phone: data.phone?.trim(),
          email: data.email?.trim(),
          address: data.address?.trim(),
          creditLimit: data.creditLimit,
          currentBalance: 0,
          balance: 0,
          totalSpent: 0,
          purchaseCount: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          customers: [newCustomer, ...state.customers],
          selectedCustomerId: newCustomer.id,
        }))

        return { success: true, data: newCustomer }
      },

      updateCustomer: (id, data) => {
        const existing = get().customers.find((c) => c.id === id)
        if (!existing) {
          return {
            success: false,
            error: {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'El cliente no existe.',
            },
          }
        }

        const mergedInput: CustomerInput = {
          fullName: data.fullName !== undefined ? data.fullName : existing.fullName,
          creditLimit: data.creditLimit !== undefined ? data.creditLimit : existing.creditLimit,
          dniCuit: data.dniCuit !== undefined ? data.dniCuit : (existing.dniCuit || existing.dni),
          phone: data.phone !== undefined ? data.phone : existing.phone,
          email: data.email !== undefined ? data.email : existing.email,
          address: data.address !== undefined ? data.address : existing.address,
          type: data.type !== undefined ? data.type : existing.type,
        }

        const validation = validateCustomerForm(mergedInput)
        if (!validation.success) {
          return validation
        }

        const updatedCustomer: Customer = {
          ...existing,
          fullName: mergedInput.fullName.trim(),
          name: mergedInput.fullName.trim(),
          creditLimit: mergedInput.creditLimit,
          dni: mergedInput.dniCuit?.trim(),
          dniCuit: mergedInput.dniCuit?.trim(),
          phone: mergedInput.phone?.trim(),
          email: mergedInput.email?.trim(),
          address: mergedInput.address?.trim(),
          type: mergedInput.type || 'persona',
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? updatedCustomer : c)),
        }))

        return { success: true, data: updatedCustomer }
      },

      recordPayment: (params) => {
        const state = get()
        const customer = state.customers.find((c) => c.id === params.customerId)
        if (!customer) {
          return {
            success: false,
            error: {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Cliente no encontrado para registrar cobro.',
            },
          }
        }

        const paymentResult = applyPayment(customer.currentBalance, params.amount)
        if (!paymentResult.success) {
          return paymentResult
        }

        const newBalance = paymentResult.data
        const now = new Date().toISOString()
        const paymentId = `pay-${Date.now()}`
        const receiptDoc = `REC-${String(Date.now()).slice(-8)}`

        const payment: CustomerPayment = {
          id: paymentId,
          customerId: customer.id,
          amount: params.amount,
          notes: params.notes || 'Abono a cuenta corriente de fiado',
          userName: params.userName || 'Cajero',
          paidAt: now,
          createdAt: now,
        }

        const newMovement: CustomerAccountMovement = {
          id: `mov-${Date.now()}`,
          customerId: customer.id,
          date: now,
          type: 'COBRO',
          doc: receiptDoc,
          debit: 0,
          credit: params.amount,
          notes: params.notes || 'Abono en efectivo a cuenta corriente',
        }

        // Also add movement to cash register
        const cashRegisterStore = useCashRegisterStore.getState()
        if (cashRegisterStore.currentRegister?.isOpen) {
          cashRegisterStore.addMovement({
            id: `mov-reg-${Date.now()}`,
            registerId: cashRegisterStore.currentRegister.id,
            type: 'ingreso',
            amount: params.amount,
            description: `Cobro fiado Cta. Cte.: ${customer.fullName}`,
            createdAt: now,
          })
        }

        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === customer.id
              ? {
                  ...c,
                  currentBalance: newBalance,
                  balance: -newBalance,
                  updatedAt: now,
                }
              : c
          ),
          movements: [newMovement, ...s.movements],
        }))

        return { success: true, data: payment }
      },

      chargeAccount: (customerId, amount, ticketNumber, notes) => {
        const now = new Date().toISOString()
        set((s) => {
          const target = s.customers.find((c) => c.id === customerId)
          if (!target) return s

          const newBalance = calculateNewBalanceAfterCharge(target.currentBalance, amount)
          const newMovement: CustomerAccountMovement = {
            id: `mov-chg-${Date.now()}`,
            customerId,
            date: now,
            type: 'VENTA',
            doc: ticketNumber,
            debit: amount,
            credit: 0,
            notes: notes || 'Compra a cuenta corriente en POS',
          }

          return {
            customers: s.customers.map((c) =>
              c.id === customerId
                ? {
                    ...c,
                    currentBalance: newBalance,
                    balance: -newBalance,
                    totalSpent: (c.totalSpent || 0) + amount,
                    purchaseCount: (c.purchaseCount || 0) + 1,
                    lastPurchaseAt: now,
                    updatedAt: now,
                  }
                : c
            ),
            movements: [newMovement, ...s.movements],
          }
        })
      },

      setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),

      getCustomerById: (id) => get().customers.find((c) => c.id === id),

      getCustomerMovements: (customerId) =>
        get()
          .movements.filter((m) => m.customerId === customerId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }),
    {
      name: 'lambda-customers-store',
      storage: createJSONStorage(() => safeZustandStorage),
    }
  )
)
