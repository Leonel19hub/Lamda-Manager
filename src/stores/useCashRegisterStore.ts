import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { CashRegister, CashMovement } from '@/types'
import {
  calculateTotalCounted,
  calculateCashDifference,
  calculateMovementDelta,
  type BillItem,
} from '@/features/cash-register'
import { useAppStore } from '@/stores/useAppStore'
import { safeStorage } from '@/lib/storage'

export type BillCount = BillItem

interface CashRegisterState {
  currentRegister: CashRegister | null
  closedRegisters: CashRegister[]
  movements: CashMovement[]
  billCounts: BillCount[]

  openRegister: (register: CashRegister) => void
  closeRegister: (actualCash: number, notes?: string) => void
  addMovement: (movement: CashMovement) => void
  setBillCount: (denomination: number, count: number) => void
  resetBillCounts: () => void
  totalCounted: () => number
}

const defaultBills: BillCount[] = [
  { denomination: 20000, count: 2 },
  { denomination: 10000, count: 3 },
  { denomination: 5000, count: 2 },
  { denomination: 2000, count: 2 },
  { denomination: 1000, count: 1 },
  { denomination: 500, count: 0 },
  { denomination: 200, count: 1 },
  { denomination: 100, count: 0 },
  { denomination: 50, count: 0 },
]

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

export const useCashRegisterStore = create<CashRegisterState>()(
  persist(
    (set, get) => ({
      currentRegister: {
        id: 'reg-01',
        registerNumber: 'Caja 01',
        branchId: 'branch-01',
        openedBy: 'user-01',
        openedByName: 'María Gómez',
        shiftName: 'Turno Mañana (Caja 01)',
        openingAmount: 15000,
        expectedCash: 85200,
        totalCard: 42300,
        totalTransfer: 35600,
        totalAccount: 12400,
        openedAt: '2026-11-17T08:00:00.000Z',
        isOpen: true,
      },
      closedRegisters: [
        {
          id: 'reg-00-prev',
          registerNumber: 'Caja 01',
          branchId: 'branch-01',
          openedBy: 'user-01',
          openedByName: 'María Gómez',
          closedBy: 'user-01',
          closedByName: 'María Gómez',
          shiftName: 'Turno Tarde Anterior (Caja 01)',
          openingAmount: 15000,
          expectedCash: 72400,
          actualCash: 72400,
          difference: 0,
          totalCard: 31200,
          totalTransfer: 24500,
          totalAccount: 8900,
          openedAt: '2026-11-16T15:00:00.000Z',
          closedAt: '2026-11-16T22:30:00.000Z',
          isOpen: false,
          notes: 'Cierre de turno normal sin discrepancias',
        },
      ],
      movements: [
        {
          id: 'mov-01',
          registerId: 'reg-01',
          type: 'expense',
          amount: 2500,
          description: 'Compra de bolsas camiseta y rollos testigo papel térmico',
          createdAt: '2026-11-17T09:30:00.000Z',
        },
        {
          id: 'mov-02',
          registerId: 'reg-01',
          type: 'income',
          amount: 5000,
          description: 'Cobro efectivo fiado Carlos Méndez',
          createdAt: '2026-11-17T11:15:00.000Z',
        },
      ],
      billCounts: [...defaultBills],

      openRegister: (register) => {
        useAppStore.getState().setCashRegister(register)
        set({
          currentRegister: register,
          movements: [],
          billCounts: defaultBills.map((b) => ({ ...b, count: 0 })),
        })
      },

      closeRegister: (actualCash, notes) =>
        set((s) => {
          if (!s.currentRegister) return s
          const diff = calculateCashDifference(actualCash, s.currentRegister.expectedCash)
          const closed: CashRegister = {
            ...s.currentRegister,
            isOpen: false,
            actualCash,
            difference: diff,
            closedAt: new Date().toISOString(),
            notes,
          }
          useAppStore.getState().setCashRegister(closed)
          return {
            currentRegister: closed,
            closedRegisters: [closed, ...s.closedRegisters],
          }
        }),

      addMovement: (movement) =>
        set((s) => {
          const delta = calculateMovementDelta(movement.type, movement.amount)
          const updatedRegister = s.currentRegister
            ? {
                ...s.currentRegister,
                expectedCash: Math.round((s.currentRegister.expectedCash + delta) * 100) / 100,
              }
            : null
          if (updatedRegister) {
            useAppStore.getState().setCashRegister(updatedRegister)
          }
          return {
            movements: [movement, ...s.movements],
            currentRegister: updatedRegister,
          }
        }),

      setBillCount: (denomination, count) =>
        set((s) => ({
          billCounts: s.billCounts.map((b) =>
            b.denomination === denomination ? { ...b, count: Math.max(0, count) } : b
          ),
        })),

      resetBillCounts: () =>
        set({
          billCounts: defaultBills.map((b) => ({ ...b, count: 0 })),
        }),

      // Delegated to pure calculation
      totalCounted: () => calculateTotalCounted(get().billCounts),
    }),
    {
      name: 'lambda-cash-register-store',
      storage: createJSONStorage(() => safeZustandStorage),
    }
  )
)
