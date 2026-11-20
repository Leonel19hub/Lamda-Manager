import React from 'react'
import {
  Receipt,
  User as UserIcon,
  ChevronsUpDown,
  Package,
  CheckCircle2,
} from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { formatCurrency } from '@/lib/utils'
import { EmptyState, Card } from '@/components/ui'
import { CartItemRow } from './CartItemRow'

export interface CartTicketPanelProps {
  onOpenCustomerModal: () => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
}

/**
 * Cart ticket panel displaying current items, active customer header,
 * financial subtotal breakdown, and prominent final total display.
 */
export const CartTicketPanel: React.FC<CartTicketPanelProps> = ({
  onOpenCustomerModal,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const items = usePosStore((s) => s.items)
  const selectedCustomer = usePosStore((s) => s.selectedCustomer)
  const ticketNumber = usePosStore((s) => s.ticketNumber)
  const paymentMethod = usePosStore((s) => s.paymentMethod)
  const subtotal = usePosStore((s) => s.subtotal)
  const rounding = usePosStore((s) => s.rounding)
  const total = usePosStore((s) => s.total)

  const subtotalAmount = subtotal()
  const roundingAmount = rounding()
  const totalAmount = total()

  return (
    <div className="flex flex-col">
      {/* Ticket Header & Sequence */}
      <div className="pb-3 border-b border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <span className="font-bold text-base text-on-surface tracking-tight">
              Ticket #{ticketNumber}
            </span>
          </div>
          <span className="font-mono text-xs text-outline font-semibold">
            {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Customer Pill / Account Selector */}
        <button
          type="button"
          onClick={onOpenCustomerModal}
          className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-surface-container transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <UserIcon className="w-4 h-4 text-secondary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface truncate">
                {selectedCustomer ? selectedCustomer.fullName : 'Consumidor Final'}
              </span>
              <span className="text-[10px] text-outline truncate font-mono">
                {selectedCustomer
                  ? `DNI/CUIT ${selectedCustomer.dni || selectedCustomer.dniCuit || ''}`
                  : 'DNI Genérico 00-00000000-0'}
              </span>
            </div>
          </div>
          <span className="text-primary text-xs font-bold flex items-center gap-0.5">
            Cambiar
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* Scrollable Ticket Line Items */}
      <div className="py-3 flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Ticket vacío"
            description="Escanea o selecciona productos del catálogo"
            className="py-10"
          />
        ) : (
          items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Financial Breakdown */}
      <Card
        padding="sm"
        className="pt-2 flex flex-col gap-1.5 bg-surface-container-low/60 my-1"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="text-outline">Subtotal bruto</span>
          <span className="font-mono font-semibold text-on-surface">
            {formatCurrency(subtotalAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-outline">
          <span>Redondeo en caja (ley redondeo)</span>
          <span
            className={`font-mono font-semibold ${
              roundingAmount !== 0 ? 'text-primary' : 'text-outline'
            }`}
          >
            {formatCurrency(roundingAmount)}
          </span>
        </div>
      </Card>

      {/* High-contrast TOTAL box (Emerald/Primary) */}
      <div className="mt-1 p-3.5 rounded-xl bg-primary text-on-primary flex items-center justify-between shadow-md">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-primary-fixed-dim font-bold">
            Importe Final a Cobrar {paymentMethod === 'efectivo' ? '(Efectivo)' : ''}
          </span>
          <span className="font-mono font-bold text-2xl tracking-tight">
            {formatCurrency(totalAmount)}
          </span>
        </div>
        <CheckCircle2 className="w-8 h-8 text-primary-fixed" />
      </div>
    </div>
  )
}
