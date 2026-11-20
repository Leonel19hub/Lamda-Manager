import React, { useState } from 'react'
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  History,
  Users,
  Timer,
  UserCheck,
} from 'lucide-react'
import { mockUsers } from '@/mock/mockData'
import { useAppStore } from '@/stores/useAppStore'
import { useAttendanceStore } from '@/stores/useAttendanceStore'
import { formatTime, formatDate } from '@/lib/utils'
import type { User } from '@/types'

export const AttendanceView: React.FC = () => {
  const { activeBranch } = useAppStore()
  const { records, clockIn, clockOut, getActiveShift } = useAttendanceStore()

  const [selectedUser, setSelectedUser] = useState<User>(mockUsers[2]) // Default Florencia (Empleado)
  const [pinInput, setPinInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Determine if employee is currently clocked in
  const activeShift = getActiveShift(selectedUser.id)

  // Dynamic KPI Stats
  const employeesOnShiftCount = records.filter((r) => r.status === 'active').length
  const todayDateStr = new Date().toDateString()
  const todayRecords = records.filter((r) => new Date(r.checkIn || r.clockIn).toDateString() === todayDateStr)
  const todayTotalHours = todayRecords.reduce((acc, r) => acc + (r.totalHours || 0), 0)

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 4) {
      setPinInput((prev) => prev + val)
      setFeedback(null)
    }
  }

  const handleClearPin = () => {
    setPinInput('')
    setFeedback(null)
  }

  // Handle Clock In (Entrada)
  const handleClockIn = () => {
    const res = clockIn({
      userId: selectedUser.id,
      branchId: activeBranch?.id || 'branch-01',
      pin: pinInput,
      notes: 'Turno iniciado en mostrador principal.',
    })

    if (!res.success) {
      setFeedback({ type: 'error', message: res.error.message })
      setPinInput('')
      return
    }

    setFeedback({
      type: 'success',
      message: `¡Bienvenido/a, ${selectedUser.fullName}! Entrada registrada a las ${formatTime(
        res.data.checkIn || res.data.clockIn
      )}.`,
    })
    setPinInput('')
  }

  // Handle Clock Out (Salida)
  const handleClockOut = () => {
    const res = clockOut({
      userId: selectedUser.id,
      pin: pinInput,
      notes: 'Turno finalizado.',
    })

    if (!res.success) {
      setFeedback({ type: 'error', message: res.error.message })
      setPinInput('')
      return
    }

    setFeedback({
      type: 'success',
      message: `¡Buen descanso, ${selectedUser.fullName}! Salida registrada a las ${formatTime(
        res.data.checkOut || res.data.clockOut!
      )}. Total trabajado: ${res.data.totalHours || 0} hs.`,
    })
    setPinInput('')
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">
            Terminal de Fichaje y Control Horario
          </h1>
          <p className="text-xs text-outline mt-0.5">
            Registro de entrada y salida con PIN de 4 dígitos para empleados de {activeBranch?.name}
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Personal en Turno Ahora</span>
            <span className="font-mono text-xl font-bold text-emerald-700">{employeesOnShiftCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Fichajes de Hoy</span>
            <span className="font-mono text-xl font-bold text-on-surface">{todayRecords.length}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Timer className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Horas Trabajadas Hoy</span>
            <span className="font-mono text-xl font-bold text-on-surface">
              {todayTotalHours.toFixed(1)} hs
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Dedicated Kiosk Clock-in Panel (5 cols) / History Log (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KIOSK CLOCK-IN PAD (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              <span className="font-bold text-base text-on-surface">
                Reloj de Asistencia
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {new Date().toLocaleTimeString('es-AR')}
            </span>
          </div>

          {/* User selection cards */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">
              1. Selecciona tu Usuario:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {mockUsers.map((u) => {
                const isSelected = selectedUser.id === u.id
                const isClockedIn = Boolean(getActiveShift(u.id))

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u)
                      setPinInput('')
                      setFeedback(null)
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs'
                        : 'border-slate-200 bg-surface hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <img
                      src={u.avatarUrl}
                      alt={u.fullName}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate leading-tight">
                        {u.fullName}
                      </span>
                      <span className="text-[10px] text-outline flex items-center gap-1 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        {isClockedIn ? 'En Turno' : 'Fuera'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* PIN Display & Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">
              2. Ingresa tu PIN de 4 dígitos:
            </label>
            <div className="flex items-center justify-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-10 h-12 rounded-lg border flex items-center justify-center font-mono text-xl font-bold ${
                    pinInput[i]
                      ? 'bg-white border-emerald-500 text-emerald-900 shadow-xs'
                      : 'bg-white/50 border-slate-300 text-transparent'
                  }`}
                >
                  {pinInput[i] ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') handleClearPin()
                    else if (btn === '←') setPinInput((p) => p.slice(0, -1))
                    else handleKeypadPress(btn)
                  }}
                  className="h-11 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 active:bg-slate-200 font-mono text-sm font-bold text-slate-800 transition-colors shadow-2xs"
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback message banner */}
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action buttons (Entrada vs Salida) */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={Boolean(activeShift)}
              onClick={handleClockIn}
              className="py-3 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            >
              <LogIn className="w-4 h-4" />
              <span>Registrar ENTRADA</span>
            </button>

            <button
              type="button"
              disabled={!activeShift}
              onClick={handleClockOut}
              className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            >
              <LogOut className="w-4 h-4" />
              <span>Registrar SALIDA</span>
            </button>
          </div>
        </div>

        {/* ATTENDANCE HISTORY LOGS (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-surface-container-low/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-outline" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-outline">
                Historial de Horarios y Turnos Fichados
              </h3>
            </div>
            <span className="text-xs font-medium text-outline">
              Hoy: {formatDate(new Date().toISOString())}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {records.length === 0 ? (
              <div className="p-8 text-center text-outline">
                No hay registros de fichaje aún.
              </div>
            ) : (
              records.map((log) => {
                const u = log.user || mockUsers.find((usr) => usr.id === log.userId)
                const isOngoing = log.status === 'active'

                return (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u?.avatarUrl}
                        alt={u?.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-on-surface truncate">
                          {u?.fullName}
                        </span>
                        <span className="text-[11px] text-outline font-medium truncate">
                          {u?.role} · {log.notes}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-emerald-700 font-bold">
                          Entrada: {formatTime(log.checkIn || log.clockIn)}
                        </span>
                        <span className="text-outline">→</span>
                        {isOngoing ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold animate-pulse">
                            En Turno
                          </span>
                        ) : (
                          <span className="text-slate-700 font-bold">
                            Salida: {formatTime(log.checkOut || log.clockOut!)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-outline mt-0.5">
                        {log.totalHours !== undefined && (
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded">
                            {log.totalHours} hs
                          </span>
                        )}
                        <span>{formatDate(log.checkIn || log.clockIn)}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
