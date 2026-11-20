import React from 'react'
import { Scale, Plus } from 'lucide-react'
import type { Product } from '@/types'
import { formatCurrency, formatWeight } from '@/lib/utils'

export interface ProductCardProps {
  product: Product
  onAddUnit: (product: Product) => void
  onWeigh: (product: Product) => void
}

/**
 * Individual product card for the POS catalog grid.
 * Memoized with React.memo to prevent re-renders when other catalog or cart items change.
 */
export const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({ product, onAddUnit, onWeigh }) => {
    const isWeighed = product.saleType === 'weight'
    const currentStock = product.stock?.currentStock || 0
    const minStock = product.stock?.minStock || 0
    const isLowStock = currentStock <= minStock

    return (
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between group hover:shadow-md hover:border-slate-300 transition-all">
        <div>
          {/* Top Tag & Stock indicator */}
          <div className="flex items-start justify-between gap-2 mb-2">
            {isWeighed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <Scale className="w-3 h-3 text-emerald-600" />
                PESO / PLU {product.pluCode}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                {product.barcode || 'UNIDAD'}
              </span>
            )}

            <span
              className={`font-mono text-xs ${
                isLowStock ? 'text-red-600 font-bold' : 'text-outline'
              }`}
            >
              {isWeighed ? formatWeight(currentStock) : `${currentStock} un.`}
            </span>
          </div>

          {/* Product visual & details */}
          <div className="flex gap-3 items-center">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-14 h-14 rounded-lg object-cover bg-surface-container-low shrink-0 border border-slate-100"
            />
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-sm text-on-surface truncate leading-tight">
                {product.name}
              </h4>
              <span className="text-xs text-on-surface-variant truncate mt-0.5">
                {product.description}
              </span>
              <span className="font-mono font-bold text-base text-emerald-700 mt-1">
                {formatCurrency(product.sellPrice)}{' '}
                <span className="text-xs text-outline font-normal">
                  /{isWeighed ? 'kg' : 'un'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Action bottom area */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          {isWeighed ? (
            <button
              type="button"
              onClick={() => onWeigh(product)}
              className="w-full h-10 px-3 bg-emerald-50 hover:bg-primary-container text-emerald-800 hover:text-on-primary-container text-xs font-bold rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Scale className="w-4 h-4" />
              <span>Pesar en Balanza</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAddUnit(product)}
              className="w-full h-10 px-3 bg-surface-container hover:bg-emerald-600 hover:text-white text-on-surface text-xs font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Unidad</span>
            </button>
          )}
        </div>
      </div>
    )
  }
)

ProductCard.displayName = 'ProductCard'
