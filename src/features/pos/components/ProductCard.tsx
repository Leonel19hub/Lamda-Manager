import React from 'react'
import { Scale, Plus } from 'lucide-react'
import type { Product } from '@/types'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { Card, Badge, Button } from '@/components/ui'

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
      <Card
        padding="md"
        className="flex flex-col justify-between group hover:shadow-md hover:border-slate-300 transition-all"
      >
        <div>
          {/* Top Tag & Stock indicator */}
          <div className="flex items-start justify-between gap-2 mb-2">
            {isWeighed ? (
              <Badge variant="success" size="sm">
                <Scale className="w-3 h-3 text-primary shrink-0" />
                PESO / PLU {product.pluCode}
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                {product.barcode || 'UNIDAD'}
              </Badge>
            )}

            <span
              className={`font-mono text-xs ${
                isLowStock ? 'text-error font-bold' : 'text-outline'
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
              <span className="font-mono font-bold text-base text-primary mt-1">
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
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onWeigh(product)}
              leftIcon={<Scale className="w-4 h-4 text-primary" />}
              className="w-full text-xs font-bold border-primary/40 text-on-surface hover:bg-primary hover:text-on-primary transition-all shadow-xs"
            >
              Pesar en Balanza
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => onAddUnit(product)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="w-full text-xs font-semibold hover:bg-primary hover:text-on-primary transition-all shadow-xs"
            >
              + Agregar Unidad
            </Button>
          )}
        </div>
      </Card>
    )
  }
)

ProductCard.displayName = 'ProductCard'
