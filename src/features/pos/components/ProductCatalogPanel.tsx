import React, { useMemo } from 'react'
import { Search, Package } from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { Input, Button, Card, EmptyState } from '@/components/ui'
import type { Product } from '@/types'
import { ProductCard } from './ProductCard'

export interface ProductCatalogPanelProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onAddUnit: (product: Product) => void
  onWeigh: (product: Product) => void
  headerControl?: React.ReactNode
}

/**
 * Product catalog panel for the POS:
 * - Integrates top hardware bar and search control surface.
 * - Quick search bar with F2 hotkey shortcut (RF-05.2).
 * - Category filter pills loaded from useInventoryStore (ADR-4).
 * - Responsive 3-column product grid with memoized ProductCard items.
 */
export const ProductCatalogPanel: React.FC<ProductCatalogPanelProps> = ({
  searchInputRef,
  onAddUnit,
  onWeigh,
  headerControl,
}) => {
  const searchQuery = usePosStore((s) => s.searchQuery)
  const setSearchQuery = usePosStore((s) => s.setSearchQuery)
  const selectedCategory = usePosStore((s) => s.selectedCategory)
  const setSelectedCategory = usePosStore((s) => s.setSelectedCategory)

  const catalogProducts = useInventoryStore((s) => s.products)
  const categories = useInventoryStore((s) => s.categories)

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      if (p.isActive === false) return false
      const matchesCat = !selectedCategory || p.categoryId === selectedCategory
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.pluCode?.includes(query) ||
        p.barcode?.includes(query) ||
        p.sku?.toLowerCase().includes(query)
      return matchesCat && matchesQuery
    })
  }, [catalogProducts, selectedCategory, searchQuery])

  return (
    <div className="flex flex-col gap-4">
      {/* Top Operational Control Surface */}
      <Card padding="md" className="flex flex-col gap-3">
        {headerControl}

        {/* Quick Filter & PLU search line */}
        <Input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre o código PLU (ej: 101, Tomate, Aceite)..."
          leftIcon={<Search className="w-4 h-4 text-outline" />}
          rightElement={
            <span className="text-[10px] uppercase font-bold bg-surface-container px-2 py-0.5 rounded text-outline border border-slate-200">
              F2
            </span>
          }
          className="h-10 text-xs pl-9 pr-20"
        />

        {/* Category Filter Pills (ADR-4) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
          {categories.map((cat) => {
            const isAllCategory = cat.id === 'cat-01' || cat.name.toLowerCase() === 'todos'
            const isSelected = (!selectedCategory && isAllCategory) || selectedCategory === cat.id

            return (
              <Button
                key={cat.id}
                type="button"
                variant={isSelected ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(isAllCategory ? null : cat.id)}
                className={`shrink-0 text-xs font-semibold ${
                  isSelected
                    ? 'shadow-xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-slate-200'
                }`}
              >
                {cat.name}
              </Button>
            )
          })}
        </div>
      </Card>

      {/* Product Catalog Grid (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddUnit={onAddUnit}
            onWeigh={onWeigh}
          />
        ))}

        {filteredProducts.length === 0 && (
          <EmptyState
            icon={Package}
            title="No se encontraron productos"
            description="Intente con otro término de búsqueda o categoría"
            className="col-span-full py-12"
          />
        )}
      </div>
    </div>
  )
}
