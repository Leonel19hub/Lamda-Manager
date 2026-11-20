import React, { useState, useEffect } from 'react'
import {
  Banknote,
  CreditCard,
  QrCode,
  BookOpen,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { formatCurrency } from '@/lib/utils'
import { calculateSplitDefaults } from '../domain/calculations'
import { isCustomerOverCreditLimit } from '../domain/validators'
import type { PaymentMethod } from '@/types'

export interface CheckoutPanelProps {
  isRegisterOpen: boolean
  checkoutSuccess: boolean
  checkoutError: string | null
  onCheckout: () => void
  onClearCart: () => void
}

const PAYMENT_METHODS: {
  id: PaymentMethod
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'debito', label: 'Débito', icon: CreditCard },
  { id: 'credito', label: 'Crédito', icon: CreditCard },
  { id: 'transferencia_qr', label: 'QR / MP', icon: QrCode },
  { id: 'cuenta_corriente', label: 'Fiado / Cta.', icon: BookOpen },
  { id: 'mixto', label: 'Mixto', icon: Layers },
]

/**
 * Checkout controls panel:
 * - Payment method selection grid (6 canonical methods).
 * - Split payment controls for mixed settlements.
 * - Cash tender input & return change calculator.
 * - Validation banners and final checkout action button [F12].
 */
export const CheckoutPanel: React.FC<CheckoutPanelProps> = ({
  isRegisterOpen,
  checkoutSuccess,
  checkoutError,
  onCheckout,
  onClearCart,
}) => {
  const items = usePosStore((s) => s.items)
  const paymentMethod = usePosStore((s) => s.paymentMethod)
  const setPaymentMethod = usePosStore((s) => s.setPaymentMethod)
  const splitPayments = usePosStore((s) => s.splitPayments)
  const setSplitPayments = usePosStore((s) => s.setSplitPayments)
  const amountPaid = usePosStore((s) => s.amountPaid)
  const setAmountPaid = usePosStore((s) => s.setAmountPaid)
  const selectedCustomer = usePosStore((s) => s.selectedCustomer)
  const total = usePosStore((s) => s.total)
  const change = usePosStore((s) => s.change)

  const currentTotal = total()

  // Local split values for smooth typing
  const [splitCash, setSplitCash] = useState<number>(0)
  const [splitDigital, setSplitDigital] = useState<number>(0)

  // Sync split defaults when method changes to 'mixto'
  useEffect(() => {
    if (paymentMethod === 'mixto') {
      const { cash, digital } = calculateSplitDefaults(currentTotal)
      setSplitCash(cash)
      setSplitDigital(digital)
      setSplitPayments([
        { id: 'sp-1', method: 'efectivo', amount: cash },
        { id: 'sp-2', method: 'debito', amount: digital },
      ])
    }
  }, [paymentMethod, currentTotal, setSplitPayments])

  const handleSplitChange = (cashVal: number, digitalVal: number) => {
    setSplitCash(cashVal)
    setSplitDigital(digitalVal)
    setSplitPayments([
      { id: 'sp-1', method: 'efectivo', amount: cashVal },
      { id: 'sp-2', method: 'debito', amount: digitalVal },
    ])
  }

  // Credit limit evaluation
  const creditCheck = isCustomerOverCreditLimit(
    paymentMethod,
    selectedCustomer,
    currentTotal,
    splitPayments
  )
  const isCreditOverLimit = creditCheck.isOver

  const splitDifference = Math.round((currentTotal - (splitCash + splitDigital)) * 100) / 100

  return (
    <div className="flex flex-col">
      {/* Cash register closed operational warning */}
      {!isRegisterOpen && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Turno de caja cerrado. Para cobrar tickets debe abrir la caja en <strong>Caja y Roles</strong>.
          </span>
        </div>
      )}

      {/* Checkout error banner */}
      {checkoutError && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Payment Method Selection Grid */}
      <div className="mt-3 flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-bold text-outline">
          Forma de Pago
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {PAYMENT_METHODS.map((pm) => {
            const Icon = pm.icon
            const active = paymentMethod === pm.id
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id)}
                className={`h-11 px-2 rounded-lg flex items-center justify-center gap-1.5 text-center text-xs font-semibold border transition-all ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'bg-surface hover:bg-surface-container text-on-surface border-slate-200'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    active ? 'text-emerald-700' : 'text-secondary'
                  }`}
                />
                <span className="truncate">{pm.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Fiado validations */}
      {paymentMethod === 'cuenta_corriente' && (
        <div className="mt-2.5">
          {!selectedCustomer ? (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Seleccione un cliente registrado para autorizar el fiado.</span>
            </div>
          ) : isCreditOverLimit ? (
            <div className="p-2 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                ¡Límite superado! Saldo actual: {formatCurrency(selectedCustomer.currentBalance || 0)} · Límite: {formatCurrency(selectedCustomer.creditLimit)}.
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Split payments box */}
      {paymentMethod === 'mixto' && (
        <div className="mt-3 p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col gap-2">
          <span className="text-xs font-bold text-on-surface">División del Cobro:</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-outline font-medium">Efectivo:</span>
            <div className="relative w-32">
              <span className="absolute left-2 top-1.5 text-xs font-mono text-outline">$</span>
              <input
                type="number"
                value={splitCash || ''}
                onChange={(e) => handleSplitChange(parseFloat(e.target.value) || 0, splitDigital)}
                placeholder="0.00"
                className="w-full h-8 pl-5 pr-2 text-right bg-white font-mono text-xs font-bold rounded border border-slate-300 text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-outline font-medium">Digital / Débito:</span>
            <div className="relative w-32">
              <span className="absolute left-2 top-1.5 text-xs font-mono text-outline">$</span>
              <input
                type="number"
                value={splitDigital || ''}
                onChange={(e) => handleSplitChange(splitCash, parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-8 pl-5 pr-2 text-right bg-white font-mono text-xs font-bold rounded border border-slate-300 text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-outline">Diferencia:</span>
            <span
              className={`font-mono font-bold ${
                Math.abs(splitDifference) < 0.01 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatCurrency(splitDifference)}
            </span>
          </div>
        </div>
      )}

      {/* Cash settlement box & return calculator (if cash) */}
      {paymentMethod === 'efectivo' && (
        <div className="mt-3 p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-outline font-medium">Paga con:</span>
            <div className="relative w-32">
              <span className="absolute left-2 top-1.5 text-xs font-mono text-outline">$</span>
              <input
                type="number"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-8 pl-5 pr-2 text-right bg-white font-mono text-xs font-bold rounded border border-slate-300 text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-on-surface">Vuelto a entregar:</span>
            <span className="font-mono font-bold text-sm text-emerald-700">
              {formatCurrency(change())}
            </span>
          </div>
        </div>
      )}

      {/* Checkout Action Button */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onClearCart}
          disabled={items.length === 0}
          className="h-12 px-3 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-40"
        >
          Limpiar
        </button>

        <button
          type="button"
          onClick={onCheckout}
          disabled={
            items.length === 0 ||
            checkoutSuccess ||
            !isRegisterOpen ||
            (paymentMethod === 'cuenta_corriente' && (!selectedCustomer || isCreditOverLimit))
          }
          className="flex-1 h-12 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        >
          {checkoutSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-900" />
              <span>¡Cobro Finalizado!</span>
            </>
          ) : (
            <>
              <span>Cobrar Ticket [F12]</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
