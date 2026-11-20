import React from 'react'
import { Trash2 } from 'lucide-react'
import type { CartItem } from '@/types'
import { formatCurrency, formatWeight } from '@/lib/utils'

export interface CartItemRowProps {
  item: CartItem
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}

/**
 * Individual line item in the POS cart ticket.
 * Memoized with React.memo to prevent re-rendering when other cart items or inputs change.
 */
export const CartItemRow: React.FC<CartItemRowProps> = React.memo(
  ({ item, onUpdateQuantity, onRemove }) => {
    const isWeight = item.saleType === 'weight'

    const handleDecrement = () => {
      const step = isWeight ? 0.1 : 1
      const newQty = Math.round((item.quantity - step) * 1000) / 1000
      if (newQty <= 0) {
        onRemove(item.id)
      } else {
        onUpdateQuantity(item.id, newQty)
      }
    }

    const handleIncrement = () => {
      const step = isWeight ? 0.1 : 1
      const newQty = Math.round((item.quantity + step) * 1000) / 1000
      onUpdateQuantity(item.id, newQty)
    }

    return (
      <div className="p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col gap-1.5 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-on-surface truncate">
              {item.productName}
            </span>
            <span className="font-mono text-[11px] text-outline">
              {isWeight
                ? `${formatWeight(item.quantity)} × ${formatCurrency(item.unitPrice)}/kg`
                : `${item.quantity} un. × ${formatCurrency(item.unitPrice)}/un`}
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-on-surface shrink-0">
            {formatCurrency(item.subtotal)}
          </span>
        </div>

        {/* Quantity modifier and delete button */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center bg-surface-container-lowest border border-slate-200 rounded">
            <button
              type="button"
              onClick={handleDecrement}
              className="w-6 h-6 flex items-center justify-center text-outline hover:text-on-surface hover:bg-slate-100 rounded text-xs font-bold"
            >
              -
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold">
              {isWeight ? formatWeight(item.quantity) : `${item.quantity} un`}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              className="w-6 h-6 flex items-center justify-center text-outline hover:text-on-surface hover:bg-slate-100 rounded text-xs font-bold"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Eliminar del ticket"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }
)

CartItemRow.displayName = 'CartItemRow'
