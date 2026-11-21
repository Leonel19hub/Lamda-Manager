import React, { useState, useEffect } from 'react'
import { Modal, Input, Select, Button, AlertBanner } from '@/components/ui'
import { calculateMargin, calculateSellPrice } from '../domain/pricing'
import { validateProductForm, getDefaultCategoryId } from '../domain/stockRules'
import { useInventoryStore } from '@/stores/useInventoryStore'
import type { Product, SaleType } from '@/types'

export interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialProduct: Product | null
  activeBranchId?: string
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  initialProduct,
  activeBranchId,
}) => {
  const categories = useInventoryStore((state) => state.categories)
  const addProduct = useInventoryStore((state) => state.addProduct)
  const updateProduct = useInventoryStore((state) => state.updateProduct)

  // Local Form state
  const [formName, setFormName] = useState('')
  const [formSku, setFormSku] = useState('')
  const [formBarcode, setFormBarcode] = useState('')
  const [formPlu, setFormPlu] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formSaleType, setFormSaleType] = useState<SaleType>('unit')
  const [formPresentation, setFormPresentation] = useState<'unidad' | 'kg' | 'pack' | 'litro'>('unidad')
  const [formPackName, setFormPackName] = useState('Cajón')
  const [formUnitsPerPack, setFormUnitsPerPack] = useState('12')
  const [formCostPrice, setFormCostPrice] = useState('1000')
  const [formMarginPct, setFormMarginPct] = useState('35')
  const [formSellPrice, setFormSellPrice] = useState('1540')
  const [formCurrentStock, setFormCurrentStock] = useState('20')
  const [formMinStock, setFormMinStock] = useState('10')
  const [error, setError] = useState<string | null>(null)

  // Synchronize and reset form state whenever isOpen or initialProduct changes
  useEffect(() => {
    if (!isOpen) return

    setError(null)
    if (initialProduct) {
      setFormName(initialProduct.name)
      setFormSku(initialProduct.sku || initialProduct.pluCode || initialProduct.barcode || '')
      setFormBarcode(initialProduct.barcode || '')
      setFormPlu(initialProduct.pluCode || '')
      setFormCategoryId(initialProduct.categoryId || getDefaultCategoryId(categories) || '')
      setFormSaleType(initialProduct.saleType)
      setFormPresentation(
        initialProduct.presentation || (initialProduct.saleType === 'weight' ? 'kg' : 'unidad')
      )
      setFormPackName(initialProduct.packName || 'Cajón')
      setFormUnitsPerPack(String(initialProduct.unitsPerPack || 1))
      setFormCostPrice(String(initialProduct.costPrice))
      setFormMarginPct(String(initialProduct.marginPct ?? 35))
      setFormSellPrice(String(initialProduct.sellPrice))
      setFormCurrentStock(String(initialProduct.stock?.currentStock ?? 0))
      setFormMinStock(String(initialProduct.stock?.minStock ?? 10))
    } else {
      setFormName('')
      setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`)
      setFormBarcode('')
      setFormPlu('')
      setFormCategoryId(getDefaultCategoryId(categories) || '')
      setFormSaleType('unit')
      setFormPresentation('unidad')
      setFormPackName('Cajón')
      setFormUnitsPerPack('12')
      setFormCostPrice('1000')
      setFormMarginPct('35')
      setFormSellPrice('1540')
      setFormCurrentStock('20')
      setFormMinStock('10')
    }
  }, [isOpen, initialProduct, categories])

  const handleCostOrMarginChange = (costVal: string, marginVal: string) => {
    const cost = parseFloat(costVal) || 0
    const margin = parseFloat(marginVal) || 0
    setFormCostPrice(costVal)
    setFormMarginPct(marginVal)
    if (cost > 0 && margin >= 0 && margin < 100) {
      setFormSellPrice(String(calculateSellPrice(cost, margin)))
    }
  }

  const handleSellPriceChange = (sellVal: string) => {
    setFormSellPrice(sellVal)
    const sell = parseFloat(sellVal) || 0
    const cost = parseFloat(formCostPrice) || 0
    if (sell > 0) {
      setFormMarginPct(String(calculateMargin(cost, sell)))
    }
  }

  const handleSaveProduct = () => {
    setError(null)
    const cost = parseFloat(formCostPrice) || 0
    const sell = parseFloat(formSellPrice) || 0
    const curStock = parseFloat(formCurrentStock) || 0
    const minStk = parseFloat(formMinStock) || 0
    const unitsPack = parseFloat(formUnitsPerPack) || 1

    if (categories.length === 0) {
      setError('No existen categorías configuradas en el sistema. Registrá al menos una categoría primero.')
      return
    }

    const validation = validateProductForm({
      name: formName,
      sku: formSku,
      costPrice: cost,
      sellPrice: sell,
      currentStock: curStock,
      minStock: minStk,
      unitsPerPack: unitsPack,
    })

    if (!validation.success) {
      setError(validation.error.message)
      return
    }

    if (initialProduct) {
      const updateRes = updateProduct(initialProduct.id, {
        name: formName.trim(),
        sku: formSku.trim(),
        barcode: formBarcode.trim() || undefined,
        pluCode: formPlu.trim() || undefined,
        categoryId: formCategoryId,
        saleType: formSaleType,
        presentation: formPresentation,
        packName: formPackName.trim(),
        unitsPerPack: unitsPack,
        costPrice: cost,
        sellPrice: sell,
        marginPct: calculateMargin(cost, sell),
        stock: initialProduct.stock
          ? {
              ...initialProduct.stock,
              currentStock: curStock,
              minStock: minStk,
              updatedAt: new Date().toISOString(),
            }
          : undefined,
      })

      if (!updateRes.success) {
        setError(updateRes.error.message)
        return
      }
    } else {
      const addRes = addProduct({
        name: formName.trim(),
        sku: formSku.trim(),
        barcode: formBarcode.trim() || undefined,
        pluCode: formPlu.trim() || undefined,
        categoryId: formCategoryId,
        saleType: formSaleType,
        presentation: formPresentation,
        packName: formPackName.trim(),
        unitsPerPack: unitsPack,
        costPrice: cost,
        sellPrice: sell,
        marginPct: calculateMargin(cost, sell),
        isActive: true,
        stock: {
          id: `stk-${Date.now()}`,
          productId: '',
          branchId: activeBranchId || 'branch-01',
          currentStock: curStock,
          minStock: minStk,
          updatedAt: new Date().toISOString(),
        },
      })

      if (!addRes.success) {
        setError(addRes.error.message)
        return
      }
    }

    onClose()
  }

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }))

  const saleTypeOptions = [
    { value: 'unit', label: 'Por Unidad' },
    { value: 'weight', label: 'Por Peso (Balanza)' },
  ]

  const presentationOptions = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'pack', label: 'Pack / Fardo' },
    { value: 'litro', label: 'Litro' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialProduct ? `Editar: ${initialProduct.name}` : 'Nuevo Producto en Catálogo'}
      subtitle="Configuración de SKU, bultos, precios, stock y presentación"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <AlertBanner variant="error" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}

        {categories.length === 0 && (
          <AlertBanner variant="warning" title="Categorías requeridas">
            No existen categorías configuradas en el sistema. Registrá al menos una categoría para poder guardar productos.
          </AlertBanner>
        )}

        {/* Identification Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Nombre Comercial *"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ej: Tomate Perita Selección"
          />
          <Input
            label="Código SKU Interno *"
            value={formSku}
            onChange={(e) => setFormSku(e.target.value)}
            placeholder="Ej: VER-TOM-01"
          />
        </div>

        {/* Classification & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Tipo de Venta"
            value={formSaleType}
            options={saleTypeOptions}
            onChange={(e) => setFormSaleType(e.target.value as SaleType)}
          />
          <Select
            label="Presentación"
            value={formPresentation}
            options={presentationOptions}
            onChange={(e) =>
              setFormPresentation(e.target.value as 'unidad' | 'kg' | 'pack' | 'litro')
            }
          />
          <Select
            label="Categoría"
            value={formCategoryId}
            options={categoryOptions}
            onChange={(e) => setFormCategoryId(e.target.value)}
            disabled={categories.length === 0}
          />
        </div>

        {/* Barcode & PLU */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Código de Barras EAN-13"
            value={formBarcode}
            onChange={(e) => setFormBarcode(e.target.value)}
            placeholder="779..."
          />
          <Input
            label="Código PLU (Balanza)"
            value={formPlu}
            onChange={(e) => setFormPlu(e.target.value)}
            placeholder="Ej: 105"
          />
        </div>

        {/* Pack Equivalence Section */}
        <div className="p-3 bg-surface-container-low rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-2">
            Conversión de Bultos / Fraccionamiento
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Nombre del Bulto"
              value={formPackName}
              onChange={(e) => setFormPackName(e.target.value)}
              placeholder="Ej: Cajón, Bolsa, Fardo"
            />
            <Input
              label="Unidades o Kilos por Bulto"
              type="number"
              step="0.5"
              value={formUnitsPerPack}
              onChange={(e) => setFormUnitsPerPack(e.target.value)}
            />
          </div>
        </div>

        {/* Pricing & Margin Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Precio Costo ($) *"
            type="number"
            value={formCostPrice}
            onChange={(e) => handleCostOrMarginChange(e.target.value, formMarginPct)}
          />
          <Input
            label="Margen (%)"
            type="number"
            value={formMarginPct}
            onChange={(e) => handleCostOrMarginChange(formCostPrice, e.target.value)}
          />
          <Input
            label="Precio Venta ($) *"
            type="number"
            value={formSellPrice}
            onChange={(e) => handleSellPriceChange(e.target.value)}
          />
        </div>

        {/* Stock Levels Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={initialProduct ? 'Stock Actual' : `Stock Inicial (${formSaleType === 'weight' ? 'kg' : 'un.'})`}
            type="number"
            step="0.1"
            value={formCurrentStock}
            onChange={(e) => setFormCurrentStock(e.target.value)}
            helperText={
              initialProduct
                ? 'Usar solo para correcciones de conteo físico; para pérdidas usar Mermas'
                : undefined
            }
          />
          <Input
            label="Stock Mínimo de Alerta"
            type="number"
            step="0.1"
            value={formMinStock}
            onChange={(e) => setFormMinStock(e.target.value)}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleSaveProduct}
            disabled={categories.length === 0}
          >
            {initialProduct ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
