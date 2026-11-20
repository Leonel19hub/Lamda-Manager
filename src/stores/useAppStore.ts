import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole, Branch, User, CashRegister } from '@/types'

interface AppState {
  currentRole: UserRole
  currentUser: User | null
  activeBranch: Branch | null
  branches: Branch[]
  activeCashRegister: CashRegister | null
  sidebarOpen: boolean
  setRole: (role: UserRole) => void
  setUser: (user: User) => void
  setBranch: (branch: Branch) => void
  setBranches: (branches: Branch[]) => void
  addBranch: (branch: Branch) => void
  setCashRegister: (register: CashRegister | null) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentRole: 'DUEÑO',
      currentUser: {
        id: 'user-01',
        fullName: 'María Gómez',
        role: 'DUEÑO',
        email: 'maria@lambdamanager.com',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      activeBranch: {
        id: 'branch-01',
        name: 'Sucursal Central',
        address: 'Av. Rivadavia 4520, CABA',
        phone: '+54 11 4982-1100',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      branches: [
        {
          id: 'branch-01',
          name: 'Sucursal Central',
          address: 'Av. Rivadavia 4520, CABA',
          phone: '+54 11 4982-1100',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'branch-02',
          name: 'Sucursal Norte',
          address: 'Av. Cabildo 2240, CABA',
          phone: '+54 11 4781-9920',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      activeCashRegister: {
        id: 'reg-01',
        registerNumber: 'Caja 01',
        branchId: 'branch-01',
        openedBy: 'user-01',
        shiftName: 'Turno Mañana (Caja 01)',
        openingAmount: 15000,
        expectedCash: 85200,
        totalCard: 42300,
        totalTransfer: 35600,
        totalAccount: 12400,
        openedAt: new Date().toISOString(),
        isOpen: true,
      },
      sidebarOpen: true,
      setRole: (role) => set({ currentRole: role }),
      setUser: (user) => set({ currentUser: user }),
      setBranch: (branch) => set({ activeBranch: branch }),
      setBranches: (branches) => set({ branches }),
      addBranch: (branch) => set((state) => ({ branches: [...state.branches, branch] })),
      setCashRegister: (register) => set({ activeCashRegister: register }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'lambda-app-store' }
  )
)
