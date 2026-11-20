import React, { useState } from 'react'
import {
  Plus,
  AlertTriangle,
  ArrowRightLeft,
  Search,
  Scale,
  Edit
} from 'lucide-react'
import { mockProducts, mockCategories, mockWasteLogs, mockTransfers } from '@/mock/mockData'
import { useAppStore } from '@/stores/useAppStore'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { calculateMargin } from '../domain/pricing'
import { deductStock, validateTransfer, getStockStatus } from '../domain/stockRules'
import { Modal } from '@/components/ui/Modal'
import type { Product, WasteLog, InventoryTransfer } from '@/types'

export const InventoryView: React.FC = () => {
  const { activeBranch, branches } = useAppStore()
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(mockWasteLogs)
  const [transfers, setTransfers] = useState<InventoryTransfer[]>(mockTransfers)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Modals
  const [mermaModalOpen, setMermaModalOpen] = useState(false)
  const [selectedProductForMerma, setSelectedProductForMerma] = useState<Product | null>(null)
  const [mermaQuantity, setMermaQuantity] = useState('1')
  const [mermaReason, setMermaReason] = useState('Mercadería podrida / maduración')
  const [mermaNotes, setMermaNotes] = useState('')

  const [productDrawerOpen, setProductDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Transfer modal
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferProduct, setTransferProduct] = useState<Product | null>(null)
  const [transferQty, setTransferQty] = useState('5')
  const [transferDestBranch, setTransferDestBranch] = useState(
    branches.find((b) => b.id !== activeBranch?.id)?.id || ''
  )

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pluCode?.includes(searchQuery) ||
      p.barcode?.includes(searchQuery)
    return matchesCat && matchesSearch
  })

  // Open Merma modal
  const openMerma = (product: Product) => {
    setSelectedProductForMerma(product)
    setMermaQuantity(product.saleType === 'weight' ? '1.5' : '1')
    setMermaReason('Mercadería podrida / mal estado')
    setMermaNotes('')
    setMermaModalOpen(true)
  }

  // Handle register merma
  const handleRegisterMerma = () => {
    if (!selectedProductForMerma) return
    const qty = parseFloat(mermaQuantity) || 0
    const deduction = deductStock(selectedProductForMerma.stock?.currentStock || 0, qty)
    if (!deduction.success) return

    // Deduct from stock
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === selectedProductForMerma.id && p.stock) {
          return {
            ...p,
            stock: {
              ...p.stock,
              currentStock: deduction.data,
            },
          }
        }
        return p
      })
    )

    // Add waste log
    const newLog: WasteLog = {
      id: `wst-${Date.now()}`,
      productId: selectedProductForMerma.id,
      branchId: activeBranch?.id || 'branch-01',
      quantity: qty,
      reason: mermaReason,
      notes: mermaNotes,
      registeredBy: 'user-01',
      createdAt: new Date().toISOString(),
      product: selectedProductForMerma,
    }

    setWasteLogs([newLog, ...wasteLogs])
    setMermaModalOpen(false)
  }

  // Handle Transfer stock between branches
  const handleTransfer = () => {
    if (!transferProduct || !transferDestBranch) return
    const qty = parseFloat(transferQty) || 0
    const validation = validateTransfer(transferProduct.stock?.currentStock || 0, qty)
    if (!validation.success) return

    const transferAmount = validation.data
    const deduction = deductStock(transferProduct.stock?.currentStock || 0, transferAmount)
    if (!deduction.success) return

    // Deduct from local stock
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === transferProduct.id && p.stock) {
          return {
            ...p,
            stock: {
              ...p.stock,
              currentStock: deduction.data,
            },
          }
        }
        return p
      })
    )

    const newTransfer: InventoryTransfer = {
      id: `trf-${Date.now()}`,
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      fromBranchId: activeBranch?.id || 'branch-01',
      toBranchId: transferDestBranch,
      status: 'in_transit',
      createdBy: 'user-01',
      notes: 'Remito interno entre locales',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: `trf-item-${Date.now()}`,
          transferId: `trf-${Date.now()}`,
          productId: transferProduct.id,
          quantitySent: qty,
          product: transferProduct,
        },
      ],
      fromBranch: activeBranch || undefined,
      toBranch: branches.find((b) => b.id === transferDestBranch),
    }

    setTransfers([newTransfer, ...transfers])
    setTransferModalOpen(false)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">
            Gestión de Productos e Inventario
          </h1>
          <p className="text-xs text-outline mt-0.5">
            Control de stock por sucursal, equivalencia de bultos/cajones y registro de mermas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {branches.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setTransferProduct(products[0])
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
            onClick={() => {
              setEditingProduct(null)
              setProductDrawerOpen(true)
            }}
            className="px-4 py-2 rounded-lg bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-outline pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código EAN o PLU..."
            className="w-full h-10 pl-9 pr-3 bg-surface rounded-lg border border-slate-200 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

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
            Todos ({products.length})
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
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Tipo / Código</th>
                <th className="py-3 px-4">Equivalencia Bulto</th>
                <th className="py-3 px-4 text-right">Stock Actual</th>
                <th className="py-3 px-4 text-right">Costo Unit.</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-right">Margen</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.map((p) => {
                const isWeighed = p.saleType === 'weight'
                const stock = p.stock?.currentStock || 0
                const min = p.stock?.minStock || 0
                const isLow = getStockStatus(stock, min) !== 'ok'

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Image */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-on-surface truncate">{p.name}</span>
                          <span className="text-[11px] text-outline truncate">{p.description}</span>
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
                          {p.barcode}
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
                          Mínimo: {min}
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
                          onClick={() => {
                            setEditingProduct(p)
                            setProductDrawerOpen(true)
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-outline hover:text-on-surface transition-colors"
                          title="Editar producto"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: Registrar Merma ================= */}
      <Modal
        isOpen={mermaModalOpen}
        onClose={() => setMermaModalOpen(false)}
        title="Registrar Merma / Pérdida de Mercadería"
        subtitle="Da de baja stock por vencimiento, rotura o mal estado sin afectar el arqueo de caja"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {selectedProductForMerma && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-red-900 truncate">
                  {selectedProductForMerma.name}
                </span>
                <span className="text-xs text-red-700 font-mono">
                  Stock actual disponible: {selectedProductForMerma.saleType === 'weight'
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
              <option value="Mercadería podrida / maduración">Mercadería podrida / maduración acelerada (Verdulería)</option>
              <option value="Producto vencido en góndola">Producto vencido en góndola</option>
              <option value="Rotura de empaque / sachet pinchado">Rotura de empaque / sachet pinchado</option>
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
              value={transferProduct?.id || ''}
              onChange={(e) => {
                const prod = products.find((p) => p.id === e.target.value) || null
                setTransferProduct(prod)
              }}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-slate-300"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.saleType === 'weight' ? `${p.stock?.currentStock} kg` : `${p.stock?.currentStock} un.`} disp.)
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
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              className="w-full h-10 px-3 bg-white font-mono text-sm font-bold rounded-lg border border-slate-300"
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
        subtitle="Configuración de precios, margen sugerido y equivalencia de bulto/cajón"
        maxWidth="xl"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">Nombre Comercial:</label>
              <input
                type="text"
                defaultValue={editingProduct?.name || ''}
                placeholder="Ej: Tomate Perita Selección"
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">Tipo de Venta:</label>
              <select
                defaultValue={editingProduct?.saleType || 'unit'}
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300"
              >
                <option value="unit">Por Unidad (Almacén, Bebidas, Limpieza)</option>
                <option value="weight">Por Peso / Fraccionado kg (Verdulería, Fiambrería)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">Código de Barras (EAN):</label>
              <input
                type="text"
                defaultValue={editingProduct?.barcode || ''}
                placeholder="779..."
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">Código PLU (Balanza):</label>
              <input
                type="text"
                defaultValue={editingProduct?.pluCode || ''}
                placeholder="Ej: 105"
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Pack Equivalence Section */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-2">
              Gestión de Bultos / Compra Mayorista
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre del Bulto:</label>
                <input
                  type="text"
                  defaultValue={editingProduct?.packName || 'Cajón'}
                  placeholder="Ej: Cajón, Fardo, Pack, Bolsa"
                  className="w-full h-9 px-2.5 bg-white text-xs rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unidades/Kg por Bulto:</label>
                <input
                  type="number"
                  defaultValue={editingProduct?.unitsPerPack || 12}
                  className="w-full h-9 px-2.5 bg-white font-mono text-xs rounded border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Margin Section */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">Precio Costo ($):</label>
              <input
                type="number"
                defaultValue={editingProduct?.costPrice || 1000}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">Margen (%):</label>
              <input
                type="number"
                defaultValue={editingProduct?.marginPct || 35}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold text-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">Precio Venta Sugerido ($):</label>
              <input
                type="number"
                defaultValue={editingProduct?.sellPrice || 1540}
                className="w-full h-10 px-3 bg-white font-mono text-xs rounded-lg border border-slate-300 font-bold text-emerald-700"
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
              onClick={() => setProductDrawerOpen(false)}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
