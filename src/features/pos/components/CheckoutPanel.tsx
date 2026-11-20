import React, { useState, useEffect } from 'react'
import {
  Banknote,
  CreditCard,
  QrCode,
  BookOpen,
  Layers,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { formatCurrency, cn } from '@/lib/utils'
import { Button, AlertBanner, Card, Input } from '@/components/ui'
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
        <AlertBanner variant="warning" className="mt-2.5 py-2">
          Turno de caja cerrado. Para cobrar tickets debe abrir la caja en <strong>Caja y Roles</strong>.
        </AlertBanner>
      )}

      {/* Checkout error banner */}
      {checkoutError && (
        <AlertBanner variant="error" className="mt-2.5 py-2 animate-in fade-in">
          {checkoutError}
        </AlertBanner>
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
              <Button
                key={pm.id}
                type="button"
                variant={active ? 'primary' : 'outline'}
                onClick={() => setPaymentMethod(pm.id)}
                className={cn(
                  'h-11 px-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold',
                  !active && 'bg-surface hover:bg-surface-container text-on-surface border-slate-200'
                )}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    active ? 'text-on-primary' : 'text-secondary'
                  }`}
                />
                <span className="truncate">{pm.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Fiado validations */}
      {paymentMethod === 'cuenta_corriente' && (
        <div className="mt-2.5">
          {!selectedCustomer ? (
            <AlertBanner variant="warning" className="py-2">
              Seleccione un cliente registrado para autorizar el fiado.
            </AlertBanner>
          ) : isCreditOverLimit ? (
            <AlertBanner variant="error" className="py-2">
              ¡Límite superado! Saldo actual: {formatCurrency(selectedCustomer.currentBalance || 0)} · Límite: {formatCurrency(selectedCustomer.creditLimit)}.
            </AlertBanner>
          ) : null}
        </div>
      )}

      {/* Split payments box */}
      {paymentMethod === 'mixto' && (
        <Card padding="sm" className="mt-3 flex flex-col gap-2 bg-surface">
          <span className="text-xs font-bold text-on-surface">División del Cobro:</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-outline font-medium">Efectivo:</span>
            <div className="w-32">
              <Input
                type="number"
                value={splitCash || ''}
                onChange={(e) => handleSplitChange(parseFloat(e.target.value) || 0, splitDigital)}
                placeholder="0.00"
                leftIcon={<span className="text-xs font-mono text-outline">$</span>}
                className="h-8 pl-6 pr-2 text-right bg-white font-mono text-xs font-bold"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-outline font-medium">Digital / Débito:</span>
            <div className="w-32">
              <Input
                type="number"
                value={splitDigital || ''}
                onChange={(e) => handleSplitChange(splitCash, parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                leftIcon={<span className="text-xs font-mono text-outline">$</span>}
                className="h-8 pl-6 pr-2 text-right bg-white font-mono text-xs font-bold"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-outline">Diferencia:</span>
            <span
              className={`font-mono font-bold ${
                Math.abs(splitDifference) < 0.01 ? 'text-primary' : 'text-error'
              }`}
            >
              {formatCurrency(splitDifference)}
            </span>
          </div>
        </Card>
      )}

      {/* Cash settlement box & return calculator (if cash) */}
      {paymentMethod === 'efectivo' && (
        <Card padding="sm" className="mt-3 flex flex-col gap-2 bg-surface">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-outline font-medium">Paga con:</span>
            <div className="w-32">
              <Input
                type="number"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                leftIcon={<span className="text-xs font-mono text-outline">$</span>}
                className="h-8 pl-6 pr-2 text-right bg-white font-mono text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-on-surface">Vuelto a entregar:</span>
            <span className="font-mono font-bold text-sm text-primary">
              {formatCurrency(change())}
            </span>
          </div>
        </Card>
      )}

      {/* Checkout Action Button */}
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClearCart}
          disabled={items.length === 0}
          className="h-12 px-3 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          Limpiar
        </Button>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onCheckout}
          disabled={
            items.length === 0 ||
            checkoutSuccess ||
            !isRegisterOpen ||
            (paymentMethod === 'cuenta_corriente' && (!selectedCustomer || isCreditOverLimit))
          }
          className="flex-1 h-12 font-bold text-sm shadow-sm"
          leftIcon={checkoutSuccess ? <CheckCircle2 className="w-5 h-5 text-on-primary" /> : undefined}
          rightIcon={!checkoutSuccess ? <ArrowRight className="w-4 h-4" /> : undefined}
        >
          {checkoutSuccess ? '¡Cobro Finalizado!' : 'Cobrar Ticket [F12]'}
        </Button>
      </div>
    </div>
  )
}
