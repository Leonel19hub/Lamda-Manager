import React from 'react'
import { Scale, Edit, Trash2 } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { calculateMargin } from '../domain/pricing'
import { getStockStatus } from '../domain/stockRules'
import type { Product } from '@/types'

export interface ProductTableRowProps {
  product: Product
  onEdit: (product: Product) => void
  onMerma: (product: Product) => void
}

export const ProductTableRow: React.FC<ProductTableRowProps> = React.memo(
  ({ product, onEdit, onMerma }) => {
    const isWeighed = product.saleType === 'weight'
    const stock = product.stock?.currentStock ?? 0
    const min = product.stock?.minStock ?? 0
    const status = getStockStatus(stock, min)
    const isLow = status !== 'ok'

    return (
      <tr className="hover:bg-slate-50/80 transition-colors">
        {/* Name & SKU */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline text-xs font-bold border border-slate-200 shrink-0">
                {product.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-on-surface truncate">{product.name}</span>
              <span className="text-[10px] text-outline font-mono truncate">
                SKU: {product.sku || 'N/A'}
              </span>
            </div>
          </div>
        </td>

        {/* Sale Type / PLU / Barcode */}
        <td className="py-3 px-4">
          {isWeighed ? (
            <Badge variant="success" size="sm">
              <Scale className="w-3 h-3 mr-1" />
              PLU {product.pluCode || 'S/C'} (kg)
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              {product.barcode || 'UNIDAD'}
            </Badge>
          )}
        </td>

        {/* Pack / Bulto equivalence */}
        <td className="py-3 px-4">
          <div className="flex flex-col">
            <span className="font-semibold text-on-surface">
              1 {product.packName || 'Pack'}
            </span>
            <span className="font-mono text-[10px] text-outline">
              = {product.unitsPerPack} {isWeighed ? 'kg' : 'un.'}
            </span>
          </div>
        </td>

        {/* Current Stock */}
        <td className="py-3 px-4 text-right font-mono font-bold">
          <span
            className={
              status === 'critical'
                ? 'text-error'
                : status === 'low'
                  ? 'text-warning'
                  : 'text-on-surface'
            }
          >
            {isWeighed ? formatWeight(stock) : `${stock} un.`}
          </span>
          {isLow && (
            <span
              className={`block text-[10px] font-sans font-medium ${
                status === 'critical' ? 'text-error' : 'text-warning'
              }`}
            >
              Mín: {min}
            </span>
          )}
        </td>

        {/* Cost */}
        <td className="py-3 px-4 text-right font-mono text-outline">
          {formatCurrency(product.costPrice)}
        </td>

        {/* Sell Price */}
        <td className="py-3 px-4 text-right font-mono font-bold text-primary">
          {formatCurrency(product.sellPrice)}
        </td>

        {/* Margin % */}
        <td className="py-3 px-4 text-right font-mono text-on-surface">
          {calculateMargin(product.costPrice, product.sellPrice).toFixed(1)}%
        </td>

        {/* Actions */}
        <td className="py-3 px-4">
          <div className="flex items-center justify-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMerma(product)}
              className="text-[10px] font-bold text-error border-error/30 hover:bg-error-container/20"
              title="Dar de baja mercadería rota o podrida"
            >
              <Trash2 className="w-3 h-3 mr-1 text-error" />
              Merma
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEdit(product)}
              title="Editar producto"
              aria-label="Editar producto"
            >
              <Edit className="w-4 h-4 text-outline hover:text-on-surface" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }
)

ProductTableRow.displayName = 'ProductTableRow'
