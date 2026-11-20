import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { AttendanceRecord, Result, ValidationError } from '@/types'
import {
  calculateTotalHours,
  validateAttendanceAction,
} from '@/features/attendance'
import { mockUsers, mockAttendanceLogs } from '@/mock/mockData'
import { safeStorage } from '@/lib/storage'

interface AttendanceState {
  records: AttendanceRecord[]
  activeUserId: string

  // Actions
  clockIn: (params: {
    userId: string
    branchId: string
    pin: string
    notes?: string
  }) => Result<AttendanceRecord, ValidationError>

  clockOut: (params: {
    userId: string
    pin: string
    notes?: string
  }) => Result<AttendanceRecord, ValidationError>

  getActiveShift: (userId: string) => AttendanceRecord | undefined
  setActiveUserId: (userId: string) => void
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

const initialRecords: AttendanceRecord[] = mockAttendanceLogs.map((log) => {
  const isCompleted = Boolean(log.clockOut)
  const hours = isCompleted ? calculateTotalHours(log.clockIn, log.clockOut!) : undefined
  return {
    ...log,
    checkIn: log.clockIn,
    checkOut: log.clockOut,
    totalHours: hours,
    status: isCompleted ? 'completed' : 'active',
  }
})

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      records: initialRecords,
      activeUserId: mockUsers[2]?.id || 'user-03', // Default Florencia

      clockIn: (params) => {
        const user = mockUsers.find((u) => u.id === params.userId)
        if (!user) {
          return {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'El empleado seleccionado no existe.',
            },
          }
        }

        const activeShift = get().records.find(
          (r) => r.userId === params.userId && r.status === 'active'
        )

        const validation = validateAttendanceAction({
          userId: params.userId,
          action: 'clockIn',
          activeShift,
          inputPin: params.pin,
          actualPin: user.pin,
        })

        if (!validation.success) {
          return validation
        }

        const now = new Date().toISOString()
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}`,
          userId: user.id,
          branchId: params.branchId,
          checkIn: now,
          clockIn: now,
          status: 'active',
          notes: params.notes || 'Turno iniciado en mostrador principal.',
          createdAt: now,
          user,
        }

        set((state) => ({
          records: [newRecord, ...state.records],
        }))

        return { success: true, data: newRecord }
      },

      clockOut: (params) => {
        const user = mockUsers.find((u) => u.id === params.userId)
        if (!user) {
          return {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'El empleado seleccionado no existe.',
            },
          }
        }

        const activeShift = get().records.find(
          (r) => r.userId === params.userId && r.status === 'active'
        )

        const validation = validateAttendanceAction({
          userId: params.userId,
          action: 'clockOut',
          activeShift,
          inputPin: params.pin,
          actualPin: user.pin,
        })

        if (!validation.success) {
          return validation
        }

        const now = new Date().toISOString()
        const startTime = activeShift!.checkIn || activeShift!.clockIn
        const hours = calculateTotalHours(startTime, now)

        const updatedRecord: AttendanceRecord = {
          ...activeShift!,
          checkOut: now,
          clockOut: now,
          totalHours: hours,
          status: 'completed',
          updatedAt: now,
          notes: params.notes || activeShift!.notes || 'Turno finalizado.',
        }

        set((state) => ({
          records: state.records.map((r) =>
            r.id === activeShift!.id ? updatedRecord : r
          ),
        }))

        return { success: true, data: updatedRecord }
      },

      getActiveShift: (userId) =>
        get().records.find((r) => r.userId === userId && r.status === 'active'),

      setActiveUserId: (userId) => set({ activeUserId: userId }),
    }),
    {
      name: 'lambda-attendance-store',
      storage: createJSONStorage(() => safeZustandStorage),
    }
  )
)
