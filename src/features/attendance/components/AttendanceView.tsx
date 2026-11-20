import React, { useState } from 'react'
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  History
} from 'lucide-react'
import { mockUsers, mockAttendanceLogs } from '@/mock/mockData'
import { useAppStore } from '@/stores/useAppStore'
import { formatTime, formatDate } from '@/lib/utils'
import type { AttendanceLog, User } from '@/types'

export const AttendanceView: React.FC = () => {
  const { activeBranch } = useAppStore()
  const [logs, setLogs] = useState<AttendanceLog[]>(mockAttendanceLogs)
  const [selectedUser, setSelectedUser] = useState<User>(mockUsers[2]) // Default Florencia (Empleado)
  const [pinInput, setPinInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Determine if employee is currently clocked in
  const activeShift = logs.find(
    (l) => l.userId === selectedUser.id && !l.clockOut
  )

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 4) {
      setPinInput((prev) => prev + val)
    }
  }

  const handleClearPin = () => {
    setPinInput('')
    setFeedback(null)
  }

  // Handle Clock In (Entrada)
  const handleClockIn = () => {
    if (selectedUser.pin && pinInput !== selectedUser.pin) {
      setFeedback({ type: 'error', message: 'PIN incorrecto. Reintente.' })
      setPinInput('')
      return
    }

    const newLog: AttendanceLog = {
      id: `att-${Date.now()}`,
      userId: selectedUser.id,
      branchId: activeBranch?.id || 'branch-01',
      clockIn: new Date().toISOString(),
      notes: 'Turno iniciado en mostrador principal.',
      createdAt: new Date().toISOString(),
      user: selectedUser,
    }

    setLogs([newLog, ...logs])
    setFeedback({
      type: 'success',
      message: `¡Bienvenido/a, ${selectedUser.fullName}! Entrada registrada a las ${formatTime(
        newLog.clockIn
      )}.`,
    })
    setPinInput('')
  }

  // Handle Clock Out (Salida)
  const handleClockOut = () => {
    if (selectedUser.pin && pinInput !== selectedUser.pin) {
      setFeedback({ type: 'error', message: 'PIN incorrecto. Reintente.' })
      setPinInput('')
      return
    }

    if (!activeShift) return

    const updatedLogs = logs.map((l) => {
      if (l.id === activeShift.id) {
        return {
          ...l,
          clockOut: new Date().toISOString(),
        }
      }
      return l
    })

    setLogs(updatedLogs)
    setFeedback({
      type: 'success',
      message: `¡Buen descanso, ${selectedUser.fullName}! Salida registrada a las ${formatTime(
        new Date().toISOString()
      )}.`,
    })
    setPinInput('')
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-on-surface">
          Terminal de Fichaje y Control Horario
        </h1>
        <p className="text-xs text-outline mt-0.5">
          Registro de Entrada y Salida con PIN rápido para empleados del local ({activeBranch?.name})
        </p>
      </div>

      {/* Main Grid: Dedicated Kiosk Clock-in Panel (6 cols) / History Log (6 cols) */}
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
                const isClockedIn = logs.some((l) => l.userId === u.id && !l.clockOut)

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
                            isClockedIn ? 'bg-emerald-500' : 'bg-slate-400'
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
                Historial de Horarios y Turnos Trabajados
              </h3>
            </div>
            <span className="text-xs font-medium text-outline">
              Hoy: {formatDate(new Date().toISOString())}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {logs.map((log) => {
              const u = log.user || mockUsers.find((usr) => usr.id === log.userId)
              const isOngoing = !log.clockOut

              return (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={u?.avatarUrl}
                      alt={u?.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-on-surface">{u?.fullName}</span>
                      <span className="text-[11px] text-outline font-medium">
                        {u?.role} · {log.notes}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-emerald-700 font-bold">
                        In: {formatTime(log.clockIn)}
                      </span>
                      <span className="text-outline">→</span>
                      {isOngoing ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold animate-pulse">
                          En Turno
                        </span>
                      ) : (
                        <span className="text-slate-700 font-bold">
                          Out: {formatTime(log.clockOut!)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-outline mt-0.5">
                      {formatDate(log.clockIn)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

    </div>
  )
}
