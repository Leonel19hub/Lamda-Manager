import React, { useState, useMemo, useCallback } from 'react'
import { Search, AlertTriangle, Package } from 'lucide-react'
import { Input, Button, Card, EmptyState } from '@/components/ui'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { filterProducts, countCriticalProducts } from '../domain/stockRules'
import { ProductTableRow } from './ProductTableRow'
import type { Product } from '@/types'

export interface ProductCatalogTabProps {
  onEditProduct: (product: Product) => void
  onOpenMerma: (product: Product) => void
}

export const ProductCatalogTab: React.FC<ProductCatalogTabProps> = ({
  onEditProduct,
  onOpenMerma,
}) => {
  // Atomic selectors from Zustand
  const products = useInventoryStore((state) => state.products)
  const categories = useInventoryStore((state) => state.categories)

  // Local filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<'all' | 'critical'>('all')

  // Memoized critical stock count
  const criticalProductsCount = useMemo(() => countCriticalProducts(products), [products])

  // Memoized filtered products list
  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        searchQuery,
        categoryId: selectedCategory,
        stockFilter,
      }),
    [products, searchQuery, selectedCategory, stockFilter]
  )

  // Stable callbacks for memoized rows
  const handleEdit = useCallback(
    (product: Product) => {
      onEditProduct(product)
    },
    [onEditProduct]
  )

  const handleMerma = useCallback(
    (product: Product) => {
      onOpenMerma(product)
    },
    [onOpenMerma]
  )

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(null)
    setStockFilter('all')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter, Search & Stock Alert Bar */}
      <Card padding="md" className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-72">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU, EAN o PLU..."
              leftIcon={<Search className="w-4 h-4 text-outline" />}
            />
          </div>

          {/* Quick Stock Status Filter Button */}
          <Button
            type="button"
            variant={stockFilter === 'critical' ? 'danger' : 'outline'}
            size="md"
            onClick={() => setStockFilter((current) => (current === 'all' ? 'critical' : 'all'))}
            leftIcon={<AlertTriangle className="w-4 h-4" />}
          >
            Stock Crítico ({criticalProductsCount})
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
          <Button
            type="button"
            variant={selectedCategory === null ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todas las Categorías
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              type="button"
              variant={selectedCategory === cat.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Product Catalog Table */}
      <Card padding="none" className="overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={Package}
              title="No se encontraron productos"
              description="No hay artículos en catálogo que coincidan con los criterios de búsqueda o filtros seleccionados."
              action={
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Limpiar Filtros
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                  <th className="py-3 px-4">Producto / SKU</th>
                  <th className="py-3 px-4">Tipo / Código</th>
                  <th className="py-3 px-4">Bulto / Conversión</th>
                  <th className="py-3 px-4 text-right">Stock Disponible</th>
                  <th className="py-3 px-4 text-right">Costo Unit.</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-right">Margen</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((product) => (
                  <ProductTableRow
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onMerma={handleMerma}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
