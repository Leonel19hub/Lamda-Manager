import React from 'react'
import { Modal, Badge } from '@/components/ui'
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
          className="p-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-surface-container-low transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <span className="font-bold text-sm text-on-surface">Consumidor Final (Genérico)</span>
            <p className="text-xs text-outline">Sin cuenta corriente ni límite de fiado</p>
          </div>
          <Badge variant="neutral" size="sm" className="font-mono">
            00-00000000-0
          </Badge>
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
            className="p-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-surface-container-low transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <div>
              <span className="font-bold text-sm text-on-surface">{c.fullName}</span>
              <p className="text-xs text-outline">
                {c.address} · DNI {c.dni || c.dniCuit}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="font-mono text-xs font-bold text-error">
                Debe: {formatCurrency(c.currentBalance || 0)}
              </span>
              <span className="text-[10px] text-outline font-mono">
                Límite: {formatCurrency(c.creditLimit)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
