import React, { useMemo } from 'react'
import { Search, Package } from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
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
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col gap-3">
        {headerControl}

        {/* Quick Filter & PLU search line */}
        <div className="relative w-full">
          <div className="absolute left-3 top-3 flex items-center pointer-events-none text-outline">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o código PLU (ej: 101, Tomate, Aceite)..."
            className="w-full h-10 pl-9 pr-24 bg-surface text-on-surface text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-outline"
          />
          <span className="absolute right-3 top-2 text-[10px] uppercase font-bold bg-surface-container px-2 py-0.5 rounded text-outline border border-slate-200">
            F2
          </span>
        </div>

        {/* Category Filter Pills (ADR-4) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
          {categories.map((cat) => {
            const isAllCategory = cat.id === 'cat-01' || cat.name.toLowerCase() === 'todos'
            const isSelected = (!selectedCategory && isAllCategory) || selectedCategory === cat.id

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(isAllCategory ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container border-emerald-600 shadow-xs'
                    : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border-slate-200'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>

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
          <div className="col-span-full py-12 text-center text-outline">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <span className="text-sm font-medium">No se encontraron productos</span>
          </div>
        )}
      </div>
    </div>
  )
}
