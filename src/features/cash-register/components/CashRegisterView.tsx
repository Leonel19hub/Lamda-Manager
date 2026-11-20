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
  Lock
} from 'lucide-react'
import { useCashRegisterStore } from '@/stores/useCashRegisterStore'
import { useAppStore } from '@/stores/useAppStore'
import { formatCurrency, formatTime } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'

export const CashRegisterView: React.FC = () => {
  const {
    currentRegister,
    movements,
    billCounts,
    setBillCount,
    resetBillCounts,
    totalCounted,
    addMovement,
    closeRegister,
    openRegister,
  } = useCashRegisterStore()

  const { activeBranch } = useAppStore()

  // Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [movementType, setMovementType] = useState<'income' | 'expense'>('expense')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')

  // Arqueo confirmation
  const [closureConfirmModal, setClosureConfirmModal] = useState(false)
  const [closureNotes, setClosureNotes] = useState('')

  const countedCash = totalCounted()
  const expectedCash = currentRegister?.expectedCash || 0
  const cashDifference = countedCash - expectedCash

  // Handle new cash movement
  const handleAddMovement = () => {
    const amt = parseFloat(movementAmount) || 0
    if (amt <= 0 || !movementDescription.trim()) return

    addMovement({
      id: `mov-${Date.now()}`,
      registerId: currentRegister?.id || 'reg-01',
      type: movementType,
      amount: amt,
      description: movementDescription,
      createdAt: new Date().toISOString(),
    })

    setMovementModalOpen(false)
    setMovementAmount('')
    setMovementDescription('')
  }

  // Handle Register Closure
  const handleConfirmClose = () => {
    closeRegister(countedCash, closureNotes)
    setClosureConfirmModal(false)
  }

  // Handle Re-open register
  const handleReopen = () => {
    openRegister({
      id: `reg-${Date.now()}`,
      registerNumber: 'Caja 01',
      branchId: activeBranch?.id || 'branch-01',
      openedBy: 'user-01',
      shiftName: 'Turno Tarde (Caja 01)',
      openingAmount: 15000,
      expectedCash: 15000,
      totalCard: 0,
      totalTransfer: 0,
      totalAccount: 0,
      openedAt: new Date().toISOString(),
      isOpen: true,
    })
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
            {activeBranch?.name} · {currentRegister?.shiftName || 'Turno Activo'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentRegister?.isOpen ? (
            <>
              <button
                type="button"
                onClick={() => setMovementModalOpen(true)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Movimiento de Caja (Gasto/Ingreso)</span>
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
              onClick={handleReopen}
              className="px-4 py-2 rounded-lg bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Abrir Nueva Caja</span>
            </button>
          )}
        </div>
      </div>

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
            Apertura: {formatCurrency(currentRegister?.openingAmount || 0)}
          </span>
        </div>

        {/* Digital Transfer / QR */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-outline text-xs">
            <span className="uppercase font-bold text-[10px]">QR / Mercado Pago</span>
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
          <span className="text-[10px] text-outline">Terminal POSnet</span>
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
          <span className="text-[10px] text-outline">A cobrar en turno</span>
        </div>
      </div>

      {/* Main Grid: Denomination Bill Counter (60%) / Movements & Arqueo Difference (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Bill Denomination Counter (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-on-surface">
                Arqueo de Billetes en Cajón (Pesos Argentinos)
              </h2>
              <p className="text-xs text-outline">
                Cuenta física de billetes de curso legal en gaveta
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
                  <span>Faltante de caja. Verificar cobros manuales o vuelto erróneo.</span>
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
                  Sin gastos ni retiros en este turno
                </span>
              ) : (
                movements.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-surface border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {m.type === 'income' ? (
                        <ArrowUpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-on-surface truncate">
                          {m.description}
                        </span>
                        <span className="font-mono text-[10px] text-outline">
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-mono font-bold shrink-0 ${
                        m.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {m.type === 'income' ? '+' : '-'} {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ================= MODAL: Nuevo Movimiento de Caja ================= */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title="Registrar Movimiento de Efectivo"
        subtitle="Ingreso manual o egreso/gasto menor del turno actual"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMovementType('expense')}
              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                movementType === 'expense'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Egreso / Gasto Menor
            </button>
            <button
              type="button"
              onClick={() => setMovementType('income')}
              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                movementType === 'income'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Ingreso Extraordinario
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Monto en Efectivo ($):
            </label>
            <input
              type="number"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="Ej: 2500"
              className="w-full h-11 px-3 bg-white font-mono text-sm font-bold rounded-lg border border-slate-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Motivo / Justificación:
            </label>
            <input
              type="text"
              value={movementDescription}
              onChange={(e) => setMovementDescription(e.target.value)}
              placeholder="Ej: Bolsas camiseta 40x50, rollo de papel térmico..."
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none"
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
        subtitle="Se asentará el balance final en el historial y se imprimirá el ticket Z"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-outline">Efectivo Recontado en Gaveta:</span>
              <span className="font-mono font-bold">{formatCurrency(countedCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline">Diferencia Final:</span>
              <span className={`font-mono font-bold ${cashDifference === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
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
              placeholder="Comentarios sobre el turno, faltantes o cheques..."
              className="w-full p-2.5 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none"
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
