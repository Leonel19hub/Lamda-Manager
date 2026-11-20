import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/types'

export interface CustomerSelectModalProps {
  isOpen: boolean
  customers: readonly Customer[]
  onClose: () => void
  onSelectCustomer: (customer: Customer | null) => void
}

/**
 * Modal dialog for selecting customer to attach to the POS ticket:
 * - Option for "Consumidor Final" (null customer).
 * - List of registered customers with current account balances and credit limits.
 */
export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  customers,
  onClose,
  onSelectCustomer,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Cliente del Ticket"
      subtitle="Asociar ticket a consumidor final o cuenta corriente con fiado"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            onSelectCustomer(null)
            onClose()
          }}
          className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-between text-left"
        >
          <div>
            <span className="font-bold text-sm text-on-surface">Consumidor Final (Genérico)</span>
            <p className="text-xs text-outline">Sin cuenta corriente ni límite de fiado</p>
          </div>
          <span className="text-xs font-mono font-bold text-outline">00-00000000-0</span>
        </button>

        <div className="text-[10px] font-bold uppercase tracking-wider text-outline mt-2">
          Clientes Registrados con Cuenta Corriente:
        </div>

        {customers.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onSelectCustomer(c)
              onClose()
            }}
            className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-between text-left"
          >
            <div>
              <span className="font-bold text-sm text-on-surface">{c.fullName}</span>
              <p className="text-xs text-outline">
                {c.address} · DNI {c.dni || c.dniCuit}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-red-600">
                Debe: {formatCurrency(c.currentBalance || 0)}
              </span>
              <p className="text-[10px] text-outline font-mono">
                Límite: {formatCurrency(c.creditLimit)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
