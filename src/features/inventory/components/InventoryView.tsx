import React, { useState } from 'react'
import {
  Plus,
  AlertTriangle,
  ArrowRightLeft,
  Search,
  Scale,
  Edit,
  Boxes,
  Trash2,
  CheckCircle2,
  Clock,
  Package,
} from 'lucide-react'
import { mockCategories } from '@/mock/mockData'
import { useAppStore } from '@/stores/useAppStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { calculateMargin, calculateSellPrice } from '../domain/pricing'
import { getStockStatus, validateProductForm } from '../domain/stockRules'
import { Modal } from '@/components/ui/Modal'
import type { Product } from '@/types'

type InventoryTab = 'products' | 'waste' | 'transfers'

export const InventoryView: React.FC = () => {
  const { activeBranch, branches, currentUser } = useAppStore()
  const {
    products,
    wasteLogs,
    transfers,
    addProduct,
    updateProduct,
    recordWaste,
    createTransfer,
    receiveTransfer,
  } = useInventoryStore()

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<InventoryTab>('products')

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'critical'>('all')

  // Modals state
  const [mermaModalOpen, setMermaModalOpen] = useState(false)
  const [selectedProductForMerma, setSelectedProductForMerma] = useState<Product | null>(null)
  const [mermaQuantity, setMermaQuantity] = useState('1')
  const [mermaReason, setMermaReason] = useState('Mercadería podrida / maduración')
  const [mermaNotes, setMermaNotes] = useState('')
  const [mermaError, setMermaError] = useState<string | null>(null)

  const [productDrawerOpen, setProductDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productError, setProductError] = useState<string | null>(null)

  // Product Form state
  const [formName, setFormName] = useState('')
  const [formSku, setFormSku] = useState('')
  const [formBarcode, setFormBarcode] = useState('')
  const [formPlu, setFormPlu] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('cat-02')
  const [formSaleType, setFormSaleType] = useState<'unit' | 'weight'>('unit')
  const [formPresentation, setFormPresentation] = useState<'unidad' | 'kg' | 'pack' | 'litro'>('unidad')
  const [formPackName, setFormPackName] = useState('Cajón')
  const [formUnitsPerPack, setFormUnitsPerPack] = useState('12')
  const [formCostPrice, setFormCostPrice] = useState('1000')
  const [formMarginPct, setFormMarginPct] = useState('35')
  const [formSellPrice, setFormSellPrice] = useState('1540')
  const [formCurrentStock, setFormCurrentStock] = useState('20')
  const [formMinStock, setFormMinStock] = useState('10')

  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferProductId, setTransferProductId] = useState<string>(products[0]?.id || '')
  const [transferQty, setTransferQty] = useState('5')
  const [transferDestBranch, setTransferDestBranch] = useState(
    branches.find((b) => b.id !== activeBranch?.id)?.id || ''
  )
  const [transferNotes, setTransferNotes] = useState('')
  const [transferError, setTransferError] = useState<string | null>(null)

  // Critical stock count
  const criticalProductsCount = products.filter(
    (p) => getStockStatus(p.stock?.currentStock || 0, p.stock?.minStock || 0) !== 'ok'
  ).length

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pluCode?.includes(searchQuery) ||
      p.barcode?.includes(searchQuery) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStock =
      stockFilter === 'all' ||
      getStockStatus(p.stock?.currentStock || 0, p.stock?.minStock || 0) !== 'ok'

    return matchesCat && matchesSearch && matchesStock
  })

  // Open Product Modal (New or Edit)
  const handleOpenProductModal = (product: Product | null) => {
    setProductError(null)
    setEditingProduct(product)
    if (product) {
      setFormName(product.name)
      setFormSku(product.sku || product.pluCode || product.barcode || `SKU-${Date.now()}`)
      setFormBarcode(product.barcode || '')
      setFormPlu(product.pluCode || '')
      setFormCategoryId(product.categoryId || 'cat-02')
      setFormSaleType(product.saleType)
      setFormPresentation(product.presentation || (product.saleType === 'weight' ? 'kg' : 'unidad'))
      setFormPackName(product.packName || 'Cajón')
      setFormUnitsPerPack(String(product.unitsPerPack || 1))
      setFormCostPrice(String(product.costPrice))
      setFormMarginPct(String(product.marginPct || 35))
      setFormSellPrice(String(product.sellPrice))
      setFormCurrentStock(String(product.stock?.currentStock || 0))
      setFormMinStock(String(product.stock?.minStock || 10))
    } else {
      setFormName('')
      setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`)
      setFormBarcode('')
      setFormPlu('')
      setFormCategoryId('cat-02')
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
    setProductDrawerOpen(true)
  }

  // Cost or Margin change handler in product form
  const handleCostOrMarginChange = (costVal: string, marginVal: string) => {
    const cost = parseFloat(costVal) || 0
    const margin = parseFloat(marginVal) || 0
    setFormCostPrice(costVal)
    setFormMarginPct(marginVal)
    if (cost > 0 && margin >= 0 && margin < 100) {
      setFormSellPrice(String(calculateSellPrice(cost, margin)))
    }
  }

  // Save product (Add or Update)
  const handleSaveProduct = () => {
    setProductError(null)
    const cost = parseFloat(formCostPrice) || 0
    const sell = parseFloat(formSellPrice) || 0
    const curStock = parseFloat(formCurrentStock) || 0
    const minStk = parseFloat(formMinStock) || 0
    const unitsPack = parseFloat(formUnitsPerPack) || 1

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
      setProductError(validation.error.message)
      return
    }

    if (editingProduct) {
      const updateRes = updateProduct(editingProduct.id, {
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
        stock: editingProduct.stock
          ? {
              ...editingProduct.stock,
              currentStock: curStock,
              minStock: minStk,
              updatedAt: new Date().toISOString(),
            }
          : undefined,
      })
      if (!updateRes.success) {
        setProductError(updateRes.error.message)
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
          productId: 'temp',
          branchId: activeBranch?.id || 'branch-01',
          currentStock: curStock,
          minStock: minStk,
          updatedAt: new Date().toISOString(),
        },
      })
      if (!addRes.success) {
        setProductError(addRes.error.message)
        return
      }
    }

    setProductDrawerOpen(false)
  }

  // Open Merma modal
  const openMerma = (product: Product) => {
    setMermaError(null)
    setSelectedProductForMerma(product)
    setMermaQuantity(product.saleType === 'weight' ? '1.5' : '1')
    setMermaReason('Mercadería podrida / mal estado')
    setMermaNotes('')
    setMermaModalOpen(true)
  }

  // Confirm Merma
  const handleRegisterMerma = () => {
    setMermaError(null)
    if (!selectedProductForMerma) return
    const qty = parseFloat(mermaQuantity) || 0

    const res = recordWaste({
      productId: selectedProductForMerma.id,
      branchId: activeBranch?.id || 'branch-01',
      quantity: qty,
      reason: mermaReason,
      notes: mermaNotes.trim() || undefined,
      registeredBy: currentUser?.fullName || 'Encargado de Depósito',
    })

    if (!res.success) {
      setMermaError(res.error.message)
      return
    }

    setMermaModalOpen(false)
  }

  // Confirm Transfer
  const handleTransfer = () => {
    setTransferError(null)
    if (!transferProductId || !transferDestBranch) return
    const qty = parseFloat(transferQty) || 0

    const res = createTransfer({
      fromBranchId: activeBranch?.id || 'branch-01',
      toBranchId: transferDestBranch,
      productId: transferProductId,
      quantity: qty,
      notes: transferNotes.trim() || undefined,
      createdBy: currentUser?.fullName || 'Encargado de Sucursal',
    })

    if (!res.success) {
      setTransferError(res.error.message)
      return
    }

    setTransferModalOpen(false)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Gestión de Productos e Inventario</h1>
          <p className="text-xs text-outline mt-0.5">
            Catálogo con stock decimal, control de mermas, traslados entre sucursales y bultos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {branches.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setTransferError(null)
                setTransferProductId(products[0]?.id || '')
                setTransferModalOpen(true)
              }}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
              <span>Traslado entre Sucursales</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenProductModal(null)}
            className="px-4 py-2 rounded-lg bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Catálogo de Productos ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('waste')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'waste'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Historial de Mermas ({wasteLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'transfers'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Remitos y Traslados ({transfers.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: PRODUCT CATALOG ================= */}
      {activeTab === 'products' && (
        <>
          {/* Filter, Search & Stock Alert Bar */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-outline pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, SKU, EAN o PLU..."
                  className="w-full h-10 pl-9 pr-3 bg-surface rounded-lg border border-slate-200 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Stock Status Filter Button */}
              <button
                type="button"
                onClick={() => setStockFilter(stockFilter === 'all' ? 'critical' : 'all')}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
                  stockFilter === 'critical'
                    ? 'bg-red-50 text-red-800 border-red-300 shadow-xs'
                    : 'bg-surface-container-low text-outline hover:text-on-surface border-slate-200'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 ${stockFilter === 'critical' ? 'text-red-600' : 'text-outline'}`}
                />
                <span>Stock Crítico ({criticalProductsCount})</span>
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 border ${
                  selectedCategory === 'all'
                    ? 'bg-primary-container text-on-primary-container border-emerald-600 shadow-xs'
                    : 'bg-surface-container-low text-on-surface border-slate-200'
                }`}
              >
                Todas las Categorías
              </button>
              {mockCategories.slice(1).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 border ${
                    selectedCategory === cat.id
                      ? 'bg-primary-container text-on-primary-container border-emerald-600 shadow-xs'
                      : 'bg-surface-container-low text-on-surface border-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Catalog Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-outline">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No se encontraron productos que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isWeighed = p.saleType === 'weight'
                      const stock = p.stock?.currentStock || 0
                      const min = p.stock?.minStock || 0
                      const isLow = getStockStatus(stock, min) !== 'ok'

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Name & SKU */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-on-surface truncate">{p.name}</span>
                                <span className="text-[10px] text-outline font-mono truncate">
                                  SKU: {p.sku || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Sale Type / PLU / Barcode */}
                          <td className="py-3 px-4">
                            {isWeighed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                <Scale className="w-3 h-3 text-emerald-600" />
                                PLU {p.pluCode} (kg)
                              </span>
                            ) : (
                              <span className="font-mono text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {p.barcode || 'UNIDAD'}
                              </span>
                            )}
                          </td>

                          {/* Pack / Bulto equivalence */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-on-surface">
                                1 {p.packName || 'Pack'}
                              </span>
                              <span className="font-mono text-[10px] text-outline">
                                = {p.unitsPerPack} {isWeighed ? 'kg' : 'un.'}
                              </span>
                            </div>
                          </td>

                          {/* Current Stock */}
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={isLow ? 'text-red-600' : 'text-on-surface'}>
                              {isWeighed ? formatWeight(stock) : `${stock} un.`}
                            </span>
                            {isLow && (
                              <span className="block text-[10px] text-red-500 font-sans font-medium">
                                Mín: {min}
                              </span>
                            )}
                          </td>

                          {/* Cost */}
                          <td className="py-3 px-4 text-right font-mono text-outline">
                            {formatCurrency(p.costPrice)}
                          </td>

                          {/* Sell Price */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(p.sellPrice)}
                          </td>

                          {/* Margin % */}
                          <td className="py-3 px-4 text-right font-mono text-slate-700">
                            {calculateMargin(p.costPrice, p.sellPrice).toFixed(1)}%
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openMerma(p)}
                                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase transition-colors"
                                title="Dar de baja mercadería rota o podrida"
                              >
                                Merma
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenProductModal(p)}
                                className="p-1.5 rounded hover:bg-slate-100 text-outline hover:text-on-surface transition-colors"
                                title="Editar producto"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= TAB 2: WASTE LOGS (MERMAS) ================= */}
      {activeTab === 'waste' && (
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-on-surface">Historial de Mermas y Pérdidas</h2>
              <p className="text-xs text-outline">
                Registro inmutable de bajas por descarte, vencimiento o rotura
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-right">Cantidad Descartada</th>
                  <th className="py-3 px-4">Motivo / Causa</th>
                  <th className="py-3 px-4">Observaciones</th>
                  <th className="py-3 px-4">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wasteLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-outline">
                      No hay registros de mermas reportadas.
                    </td>
                  </tr>
                ) : (
                  wasteLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-outline">
                        {new Date(log.createdAt).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-on-surface">
                        {log.product?.name || `Producto #${log.productId}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                        -{log.quantity}{' '}
                        <span className="text-[10px] text-outline font-normal">
                          {log.product?.saleType === 'weight' ? 'kg' : 'un.'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 text-[11px] font-semibold border border-red-200">
                          {log.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-outline">{log.notes || '—'}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {log.registeredByUser?.fullName || log.registeredBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: INTER-BRANCH TRANSFERS ================= */}
      {activeTab === 'transfers' && (
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-on-surface">Remitos y Traslados de Mercadería</h2>
              <p className="text-xs text-outline">
                Seguimiento de envíos y recepción de existencias entre sucursales
              </p>
            </div>
            {branches.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setTransferError(null)
                  setTransferProductId(products[0]?.id || '')
                  setTransferModalOpen(true)
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Traslado</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                  <th className="py-3 px-4">Nº Remito</th>
                  <th className="py-3 px-4">Fecha de Envío</th>
                  <th className="py-3 px-4">Origen ➔ Destino</th>
                  <th className="py-3 px-4">Producto y Cantidad</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Acción de Recepción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-outline">
                      No hay traslados registrados.
                    </td>
                  </tr>
                ) : (
                  transfers.map((trf) => {
                    const fromName =
                      branches.find((b) => b.id === trf.fromBranchId)?.name || 'Sucursal Origen'
                    const toName =
                      branches.find((b) => b.id === trf.toBranchId)?.name || 'Sucursal Destino'
                    const isReceived = trf.status === 'received'

                    return (
                      <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                          {trf.transferNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-outline">
                          {new Date(trf.createdAt).toLocaleDateString('es-AR')}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {fromName} ➔ <strong className="text-on-surface">{toName}</strong>
                        </td>
                        <td className="py-3 px-4">
                          {trf.items?.map((item) => (
                            <span key={item.id} className="block font-semibold text-slate-800">
                              {item.product?.name || `Producto #${item.productId}`} (
                              {item.quantitySent} {item.product?.saleType === 'weight' ? 'kg' : 'un.'}
                              )
                            </span>
                          ))}
                        </td>
                        <td className="py-3 px-4">
                          {isReceived ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Recibido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              En Tránsito
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isReceived ? (
                            <span className="text-[10px] text-outline font-medium">
                              Ingresado a stock
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                receiveTransfer(
                                  trf.id,
                                  currentUser?.fullName || 'Encargado de Destino'
                                )
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 text-xs font-bold rounded border border-emerald-300 transition-colors shadow-xs"
                            >
                              Confirmar Recepción
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: Registrar Merma ================= */}
      <Modal
        isOpen={mermaModalOpen}
        onClose={() => setMermaModalOpen(false)}
        title="Registrar Merma / Pérdida de Mercadería"
        subtitle="Da de baja stock por vencimiento, rotura o mal estado sin afectar el arqueo de caja"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {mermaError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{mermaError}</span>
            </div>
          )}

          {selectedProductForMerma && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-red-900 truncate">
                  {selectedProductForMerma.name}
                </span>
                <span className="text-xs text-red-700 font-mono">
                  Stock actual disponible:{' '}
                  {selectedProductForMerma.saleType === 'weight'
                    ? formatWeight(selectedProductForMerma.stock?.currentStock || 0)
                    : `${selectedProductForMerma.stock?.currentStock || 0} un.`}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Cantidad a descontar ({selectedProductForMerma?.saleType === 'weight' ? 'kg' : 'unidades'}):
            </label>
            <input
              type="number"
              step="0.05"
              value={mermaQuantity}
              onChange={(e) => setMermaQuantity(e.target.value)}
              className="w-full h-11 px-3 bg-white font-mono text-sm font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Motivo de la merma:
            </label>
            <select
              value={mermaReason}
              onChange={(e) => setMermaReason(e.target.value)}
              className="w-full h-11 px-3 bg-white text-xs font-medium rounded-lg border border-slate-300 focus:outline-none"
            >
              <option value="Mercadería podrida / maduración">
                Mercadería podrida / maduración acelerada (Verdulería)
              </option>
              <option value="Producto vencido en góndola">Producto vencido en góndola</option>
              <option value="Rotura de empaque / sachet pinchado">
                Rotura de empaque / sachet pinchado
              </option>
              <option value="Merma por flete / descarga">Golpes en descarga / flete</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Observaciones adicionales:
            </label>
            <textarea
              rows={2}
              value={mermaNotes}
              onChange={(e) => setMermaNotes(e.target.value)}
              placeholder="Detalles sobre el lote, proveedor o estado..."
              className="w-full p-2.5 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMermaModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegisterMerma}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Confirmar Baja de Stock
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Traslado de Stock entre Sucursales ================= */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Remito Interno: Traslado entre Sucursales"
        subtitle="Envío de mercadería desde sucursal origen hacia sucursal destino"
        maxWidth="lg"
      >
        <div className="flex flex-col gap-4">
          {transferError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-outline">Sucursal Origen:</span>
              <p className="font-bold text-xs text-on-surface">{activeBranch?.name}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-outline">Sucursal Destino:</span>
              <select
                value={transferDestBranch}
                onChange={(e) => setTransferDestBranch(e.target.value)}
                className="w-full h-8 mt-1 px-2 text-xs font-medium rounded border border-slate-300 bg-white"
              >
                {branches
                  .filter((b) => b.id !== activeBranch?.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Producto a trasladar:
            </label>
            <select
              value={transferProductId}
              onChange={(e) => setTransferProductId(e.target.value)}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-slate-300"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (
                  {p.saleType === 'weight' ? `${p.stock?.currentStock} kg` : `${p.stock?.currentStock} un.`}{' '}
                  disp.)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Cantidad a transferir:
            </label>
            <input
              type="number"
              step="0.1"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              className="w-full h-10 px-3 bg-white font-mono text-sm font-bold rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Notas del Remito:
            </label>
            <input
              type="text"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="Ej: Flete de mañana, reposición fin de semana..."
              className="w-full h-9 px-3 bg-white text-xs rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleTransfer}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Generar Remito y Enviar
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL / DRAWER: Nuevo / Editar Producto ================= */}
      <Modal
        isOpen={productDrawerOpen}
        onClose={() => setProductDrawerOpen(false)}
        title={editingProduct ? `Editar: ${editingProduct.name}` : 'Nuevo Producto en Catálogo'}
        subtitle="Configuración de SKU, bultos, precios, stock y presentación"
        maxWidth="xl"
      >
        <div className="flex flex-col gap-4">
          {productError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{productError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Nombre Comercial *:
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Tomate Perita Selección"
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Código SKU Interno *:
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="Ej: VER-TOM-01"
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Tipo de Venta:
              </label>
              <select
                value={formSaleType}
                onChange={(e) => setFormSaleType(e.target.value as 'unit' | 'weight')}
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300"
              >
                <option value="unit">Por Unidad</option>
                <option value="weight">Por Peso (Balanza)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Presentación:
              </label>
              <select
                value={formPresentation}
                onChange={(e) =>
                  setFormPresentation(e.target.value as 'unidad' | 'kg' | 'pack' | 'litro')
                }
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300"
              >
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo (kg)</option>
                <option value="pack">Pack / Fardo</option>
                <option value="litro">Litro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Categoría:
              </label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300"
              >
                {mockCategories.slice(1).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Código de Barras EAN-13:
              </label>
              <input
                type="text"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="779..."
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Código PLU (Balanza):
              </label>
              <input
                type="text"
                value={formPlu}
                onChange={(e) => setFormPlu(e.target.value)}
                placeholder="Ej: 105"
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Pack Equivalence Section */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-2">
              Conversión de Bultos / Fraccionamiento
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nombre del Bulto:
                </label>
                <input
                  type="text"
                  value={formPackName}
                  onChange={(e) => setFormPackName(e.target.value)}
                  placeholder="Ej: Cajón, Bolsa, Fardo"
                  className="w-full h-9 px-2.5 bg-white text-xs rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Unidades o Kilos por Bulto:
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formUnitsPerPack}
                  onChange={(e) => setFormUnitsPerPack(e.target.value)}
                  className="w-full h-9 px-2.5 bg-white font-mono text-xs rounded border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Margin Section */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Precio Costo ($) *:
              </label>
              <input
                type="number"
                value={formCostPrice}
                onChange={(e) => handleCostOrMarginChange(e.target.value, formMarginPct)}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Margen (%):
              </label>
              <input
                type="number"
                value={formMarginPct}
                onChange={(e) => handleCostOrMarginChange(formCostPrice, e.target.value)}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold text-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Precio Venta ($) *:
              </label>
              <input
                type="number"
                value={formSellPrice}
                onChange={(e) => {
                  setFormSellPrice(e.target.value)
                  const s = parseFloat(e.target.value) || 0
                  const c = parseFloat(formCostPrice) || 0
                  if (s > 0) setFormMarginPct(String(calculateMargin(c, s)))
                }}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold text-emerald-700"
              />
            </div>
          </div>

          {/* Stock Levels Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Stock Inicial ({formSaleType === 'weight' ? 'kg' : 'un.'}):
              </label>
              <input
                type="number"
                step="0.1"
                value={formCurrentStock}
                onChange={(e) => setFormCurrentStock(e.target.value)}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Stock Mínimo de Alerta:
              </label>
              <input
                type="number"
                step="0.1"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold text-red-600"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setProductDrawerOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveProduct}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
