import React, { useState } from 'react'
import {
  Banknote,
  CreditCard,
  QrCode,
  BookOpen,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  History,
  ShieldAlert,
  Calendar,
  UserCheck,
} from 'lucide-react'
import { useCashRegisterStore } from '@/stores/useCashRegisterStore'
import { useAppStore } from '@/stores/useAppStore'
import { formatCurrency, formatTime, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import {
  validateShiftOpening,
  validateCashMovement,
} from '@/features/cash-register'
import type { CashMovementType } from '@/types'

export const CashRegisterView: React.FC = () => {
  const {
    currentRegister,
    closedRegisters,
    movements,
    billCounts,
    setBillCount,
    resetBillCounts,
    totalCounted,
    addMovement,
    closeRegister,
    openRegister,
  } = useCashRegisterStore()

  const { activeBranch, currentUser } = useAppStore()

  // Tab State
  const [activeTab, setActiveTab] = useState<'shift' | 'history'>('shift')

  // Open Shift Modal
  const [openModalOpen, setOpenModalOpen] = useState(false)
  const [openRegisterNumber, setOpenRegisterNumber] = useState('Caja 01')
  const [openShiftName, setOpenShiftName] = useState('Turno Tarde')
  const [openAmount, setOpenAmount] = useState('15000')
  const [openError, setOpenError] = useState<string | null>(null)

  // Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [movementType, setMovementType] = useState<CashMovementType>('egreso')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')
  const [movementError, setMovementError] = useState<string | null>(null)

  // Arqueo confirmation
  const [closureConfirmModal, setClosureConfirmModal] = useState(false)
  const [closureNotes, setClosureNotes] = useState('')

  const countedCash = totalCounted()
  const expectedCash = currentRegister?.expectedCash || 0
  const cashDifference = countedCash - expectedCash

  // Handle Opening Register
  const handleConfirmOpen = () => {
    setOpenError(null)
    const amountNum = parseFloat(openAmount) || 0
    const validation = validateShiftOpening({
      registerNumber: openRegisterNumber,
      shiftName: openShiftName,
      openingAmount: amountNum,
      openedBy: currentUser?.fullName || 'Responsable de Caja',
    })

    if (!validation.success) {
      setOpenError(validation.error.message)
      return
    }

    openRegister({
      id: `reg-${Date.now()}`,
      registerNumber: openRegisterNumber.trim(),
      branchId: activeBranch?.id || 'branch-01',
      openedBy: currentUser?.id || 'user-01',
      openedByName: currentUser?.fullName || 'María Gómez',
      shiftName: `${openShiftName.trim()} (${openRegisterNumber.trim()})`,
      openingAmount: amountNum,
      expectedCash: amountNum,
      totalCard: 0,
      totalTransfer: 0,
      totalAccount: 0,
      openedAt: new Date().toISOString(),
      isOpen: true,
    })

    setOpenModalOpen(false)
  }

  // Handle new cash movement
  const handleAddMovement = () => {
    setMovementError(null)
    const amt = parseFloat(movementAmount) || 0

    const validation = validateCashMovement({
      amount: amt,
      description: movementDescription,
      type: movementType,
      expectedCash,
    })

    if (!validation.success) {
      setMovementError(validation.error.message)
      return
    }

    addMovement({
      id: `mov-${Date.now()}`,
      registerId: currentRegister?.id || 'reg-01',
      type: movementType,
      amount: amt,
      description: movementDescription.trim(),
      createdBy: currentUser?.fullName || 'Cajero',
      createdAt: new Date().toISOString(),
    })

    setMovementModalOpen(false)
    setMovementAmount('')
    setMovementDescription('')
    setMovementError(null)
  }

  // Handle Register Closure
  const handleConfirmClose = () => {
    closeRegister(countedCash, closureNotes.trim() || undefined)
    setClosureConfirmModal(false)
    setClosureNotes('')
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">
            Control de Caja y Arqueo de Billetes
          </h1>
          <p className="text-xs text-outline mt-0.5">
            {activeBranch?.name} · {currentRegister?.isOpen ? currentRegister.shiftName : 'Caja Cerrada'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentRegister?.isOpen ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMovementError(null)
                  setMovementModalOpen(true)
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Movimiento de Caja</span>
              </button>
              <button
                type="button"
                onClick={() => setClosureConfirmModal(true)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>Cerrar Turno y Arqueo</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpenError(null)
                setOpenModalOpen(true)
              }}
              className="px-4 py-2 rounded-lg bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Abrir Nueva Caja / Turno</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('shift')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'shift'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>Turno Activo y Arqueo</span>
          {currentRegister?.isOpen ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Cierres de Turno</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
            {closedRegisters.length}
          </span>
        </button>
      </div>

      {activeTab === 'shift' && (
        <>
          {/* Register Status Banner when Closed */}
          {!currentRegister?.isOpen && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-xs text-amber-900">
                    Caja Cerrada actualmente
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    No hay un turno de ventas activo en esta terminal. Abrí una caja para operar en el Punto de Venta.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenError(null)
                  setOpenModalOpen(true)
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
              >
                Abrir Caja Ahora
              </button>
            </div>
          )}

          {/* 4 Financial Totals Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Expected Cash */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-outline text-xs">
                <span className="uppercase font-bold text-[10px]">Efectivo Esperado</span>
                <Banknote className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="font-mono text-xl font-bold text-on-surface">
                {formatCurrency(currentRegister?.expectedCash || 0)}
              </span>
              <span className="text-[10px] text-outline font-mono">
                Fondo apertura: {formatCurrency(currentRegister?.openingAmount || 0)}
              </span>
            </div>

            {/* Digital Transfer / QR */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-outline text-xs">
                <span className="uppercase font-bold text-[10px]">QR / Transferencia</span>
                <QrCode className="w-4 h-4 text-sky-600" />
              </div>
              <span className="font-mono text-xl font-bold text-on-surface">
                {formatCurrency(currentRegister?.totalTransfer || 0)}
              </span>
              <span className="text-[10px] text-sky-700 font-medium">Liquidación directa</span>
            </div>

            {/* Card Debit / Credit */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-outline text-xs">
                <span className="uppercase font-bold text-[10px]">Tarjetas Débito / Crédito</span>
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <span className="font-mono text-xl font-bold text-on-surface">
                {formatCurrency(currentRegister?.totalCard || 0)}
              </span>
              <span className="text-[10px] text-outline">Terminal POS</span>
            </div>

            {/* Account / Fiado */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-outline text-xs">
                <span className="uppercase font-bold text-[10px]">Fiado en Cta. Cte.</span>
                <BookOpen className="w-4 h-4 text-amber-600" />
              </div>
              <span className="font-mono text-xl font-bold text-amber-700">
                {formatCurrency(currentRegister?.totalAccount || 0)}
              </span>
              <span className="text-[10px] text-outline">Pendiente de cobro</span>
            </div>
          </div>

          {/* Main Grid: Denomination Bill Counter (60%) / Movements & Arqueo Difference (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Bill Denomination Counter (7 cols) */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-sm text-on-surface">
                    Arqueo de Billetes en Gaveta (Pesos Argentinos)
                  </h2>
                  <p className="text-xs text-outline">
                    Conteo físico de billetes de curso legal en caja
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetBillCounts}
                  className="px-2.5 py-1 rounded border border-slate-200 text-[11px] font-semibold text-outline hover:text-on-surface hover:bg-slate-50 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpiar conteo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {billCounts.map((bill) => {
                  const sub = bill.denomination * bill.count
                  return (
                    <div
                      key={bill.denomination}
                      className="p-3 rounded-lg bg-surface border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-sm text-on-surface">
                          $ {bill.denomination.toLocaleString('es-AR')}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                          = {formatCurrency(sub)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBillCount(bill.denomination, bill.count - 1)}
                          className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 font-mono font-bold text-xs flex items-center justify-center text-slate-700"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={bill.count || ''}
                          onChange={(e) =>
                            setBillCount(bill.denomination, parseInt(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="w-12 h-7 text-center font-mono text-xs font-bold bg-white rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setBillCount(bill.denomination, bill.count + 1)}
                          className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 font-mono font-bold text-xs flex items-center justify-center text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Counted Total footer */}
              <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900 uppercase tracking-wider">
                  Total Físico Recontado:
                </span>
                <span className="font-mono text-xl font-bold text-emerald-800">
                  {formatCurrency(countedCash)}
                </span>
              </div>
            </div>

            {/* Arqueo Comparison & Movements Feed (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Comparison summary card */}
              <div className="bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-outline">
                  Cuadre y Diferencia de Caja
                </h3>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-outline">Efectivo Sistema (Esperado):</span>
                    <span className="font-mono font-bold text-on-surface">
                      {formatCurrency(expectedCash)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-outline">Efectivo Físico (Contado):</span>
                    <span className="font-mono font-bold text-on-surface">
                      {formatCurrency(countedCash)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-on-surface">Diferencia:</span>
                    <span
                      className={`font-mono text-base font-bold ${
                        cashDifference === 0
                          ? 'text-emerald-700'
                          : cashDifference > 0
                          ? 'text-blue-700'
                          : 'text-red-600'
                      }`}
                    >
                      {cashDifference > 0 ? '+' : ''}
                      {formatCurrency(cashDifference)}
                    </span>
                  </div>

                  {cashDifference === 0 ? (
                    <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 mt-1 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Caja cuadrada a la perfección. Sin sobrante ni faltante.</span>
                    </div>
                  ) : cashDifference < 0 ? (
                    <div className="p-2 rounded bg-red-50 text-red-800 text-[11px] font-semibold flex items-center gap-1.5 mt-1 border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Faltante de caja. Verificar cobros manuales o vuelto entregado.</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-blue-50 text-blue-800 text-[11px] font-semibold flex items-center gap-1.5 mt-1 border border-blue-200">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Sobrante de caja a favor del turno.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Movements Log in shift */}
              <div className="bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-outline">
                    Movimientos del Turno ({movements.length})
                  </h3>
                </div>

                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {movements.length === 0 ? (
                    <span className="text-xs text-outline py-4 text-center">
                      Sin gastos, retiros ni ingresos manuales en este turno
                    </span>
                  ) : (
                    movements.map((m) => {
                      const isIncome = m.type === 'income' || m.type === 'ingreso' || m.type === 'apertura'
                      const isRetiro = m.type === 'retiro'
                      return (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-surface border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isIncome ? (
                              <ArrowUpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : isRetiro ? (
                              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <ArrowDownCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-on-surface truncate">
                                {m.description}
                              </span>
                              <span className="font-mono text-[10px] text-outline">
                                {formatTime(m.createdAt)} {isRetiro ? '· Retiro de Seguridad' : ''}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`font-mono font-bold shrink-0 ${
                              isIncome ? 'text-emerald-700' : isRetiro ? 'text-amber-700' : 'text-red-600'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatCurrency(m.amount)}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab: Historial de Cierres de Turno */}
      {activeTab === 'history' && (
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-on-surface">
                Historial de Sesiones de Caja Cerradas
              </h2>
              <p className="text-xs text-outline">
                Registro inmutable de turnos finalizados, arqueos ciegos y diferencias
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface text-outline border-b border-slate-200">
                  <th className="p-3 font-semibold">Fecha y Turno</th>
                  <th className="p-3 font-semibold">Caja</th>
                  <th className="p-3 font-semibold">Responsable</th>
                  <th className="p-3 font-semibold text-right">Fondo Inicial</th>
                  <th className="p-3 font-semibold text-right">Efectivo Esperado</th>
                  <th className="p-3 font-semibold text-right">Arqueo Real</th>
                  <th className="p-3 font-semibold text-right">Diferencia</th>
                  <th className="p-3 font-semibold text-right">Medios Digitales</th>
                  <th className="p-3 font-semibold">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closedRegisters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-outline">
                      No hay turnos cerrados en el historial todavía.
                    </td>
                  </tr>
                ) : (
                  closedRegisters.map((reg) => {
                    const diff = reg.difference ?? (reg.actualCash !== undefined ? reg.actualCash - reg.expectedCash : 0)
                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-medium text-on-surface whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-outline" />
                              {formatDate(reg.closedAt || reg.openedAt)}
                            </span>
                            <span className="text-[11px] text-outline">
                              {reg.shiftName || 'Turno'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-800">
                            {reg.registerNumber}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-on-surface">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{reg.closedByName || reg.openedByName || 'Cajero'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-medium whitespace-nowrap">
                          {formatCurrency(reg.openingAmount)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold whitespace-nowrap text-slate-700">
                          {formatCurrency(reg.expectedCash)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold whitespace-nowrap text-emerald-800">
                          {reg.actualCash !== undefined ? formatCurrency(reg.actualCash) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              diff === 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : diff > 0
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {diff > 0 ? '+' : ''}
                            {formatCurrency(diff)}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono whitespace-nowrap text-slate-600">
                          <div className="flex flex-col items-end text-[10px]">
                            <span>Tarjetas: {formatCurrency(reg.totalCard || 0)}</span>
                            <span>QR: {formatCurrency(reg.totalTransfer || 0)}</span>
                          </div>
                        </td>
                        <td className="p-3 text-outline max-w-xs truncate" title={reg.notes}>
                          {reg.notes || <span className="text-slate-300 italic">Sin observaciones</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: Apertura de Caja ================= */}
      <Modal
        isOpen={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Apertura de Caja y Turno"
        subtitle="Habilita la terminal de cobro con fondo inicial de cambio"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {openError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{openError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Número de Caja:
              </label>
              <input
                type="text"
                value={openRegisterNumber}
                onChange={(e) => setOpenRegisterNumber(e.target.value)}
                placeholder="Ej: Caja 01"
                className="w-full h-10 px-3 bg-white text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Nombre de Turno:
              </label>
              <select
                value={openShiftName}
                onChange={(e) => setOpenShiftName(e.target.value)}
                className="w-full h-10 px-3 bg-white text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Turno Mañana">Turno Mañana</option>
                <option value="Turno Tarde">Turno Tarde</option>
                <option value="Turno Corrido">Turno Corrido</option>
                <option value="Turno Noche">Turno Noche</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Fondo de Cambio Inicial en Efectivo ($):
            </label>
            <input
              type="number"
              min="0"
              value={openAmount}
              onChange={(e) => setOpenAmount(e.target.value)}
              placeholder="Ej: 15000"
              className="w-full h-11 px-3 bg-white font-mono text-base font-bold text-emerald-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-outline mt-1">
              Dinero en billetes y monedas dejado en la gaveta como base de cambio.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center">
            <span className="text-outline">Cajero Responsable:</span>
            <span className="font-bold text-on-surface">{currentUser?.fullName || 'María Gómez'}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmOpen}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Confirmar Apertura
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Nuevo Movimiento de Caja ================= */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title="Registrar Movimiento de Efectivo"
        subtitle="Ingreso manual, retiro de seguridad o gasto menor del turno"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {movementError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{movementError}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setMovementType('egreso')
                setMovementError(null)
              }}
              className={`py-2 px-1 text-center rounded-lg text-[11px] font-bold border transition-colors ${
                movementType === 'egreso'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Egreso / Gasto Menor
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('retiro')
                setMovementError(null)
              }}
              className={`py-2 px-1 text-center rounded-lg text-[11px] font-bold border transition-colors ${
                movementType === 'retiro'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Retiro de Seguridad
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('ingreso')
                setMovementError(null)
              }}
              className={`py-2 px-1 text-center rounded-lg text-[11px] font-bold border transition-colors ${
                movementType === 'ingreso'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Ingreso Extra
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-on-surface uppercase">
                Monto en Efectivo ($):
              </label>
              <span className="text-[11px] text-outline font-mono">
                Disponible en gaveta: {formatCurrency(expectedCash)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              value={movementAmount}
              onChange={(e) => {
                setMovementAmount(e.target.value)
                setMovementError(null)
              }}
              placeholder="Ej: 2500"
              className="w-full h-11 px-3 bg-white font-mono text-sm font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Motivo / Justificación:
            </label>
            <input
              type="text"
              value={movementDescription}
              onChange={(e) => {
                setMovementDescription(e.target.value)
                setMovementError(null)
              }}
              placeholder={
                movementType === 'retiro'
                  ? 'Ej: Retiro a caja fuerte por exceso de efectivo...'
                  : movementType === 'egreso'
                  ? 'Ej: Bolsas camiseta 40x50, rollo testigo térmico...'
                  : 'Ej: Cobro manual de fiado fuera de POS...'
              }
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMovementModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddMovement}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Confirmar Movimiento
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Cierre de Turno y Arqueo ================= */}
      <Modal
        isOpen={closureConfirmModal}
        onClose={() => setClosureConfirmModal(false)}
        title="Confirmar Cierre de Turno y Arqueo"
        subtitle="Se asentará el balance final en el historial y se imprimirá el ticket de cierre"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-outline">Efectivo Recontado en Gaveta:</span>
              <span className="font-mono font-bold text-emerald-800">{formatCurrency(countedCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline">Efectivo Sistema (Esperado):</span>
              <span className="font-mono font-bold text-slate-700">{formatCurrency(expectedCash)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="font-bold text-on-surface">Diferencia Final:</span>
              <span
                className={`font-mono font-bold ${
                  cashDifference === 0 ? 'text-emerald-700' : cashDifference > 0 ? 'text-blue-700' : 'text-red-600'
                }`}
              >
                {cashDifference > 0 ? '+' : ''}
                {formatCurrency(cashDifference)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Observaciones de Cierre (opcional):
            </label>
            <textarea
              rows={2}
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              placeholder="Comentarios sobre el turno, faltantes justificados o incidencias..."
              className="w-full p-2.5 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setClosureConfirmModal(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleConfirmClose}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Cerrar Caja Definitivamente
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
