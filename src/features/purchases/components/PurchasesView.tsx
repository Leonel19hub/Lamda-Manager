import React, { useState } from 'react'
import {
  Truck,
  Package,
  Layers,
  CheckCircle2,
  FileText,
  DollarSign
} from 'lucide-react'
import { mockSuppliers, mockProducts } from '@/mock/mockData'
import { useAppStore } from '@/stores/useAppStore'
import { formatCurrency } from '@/lib/utils'
import { calculateSellPrice } from '@/features/inventory'
import {
  convertPacksToUnits,
  convertUnitsToPacks,
  validatePackInput,
} from '../domain/packConversions'
import { Modal } from '@/components/ui/Modal'
import type { Supplier, Product } from '@/types'

export const PurchasesView: React.FC = () => {
  const { activeBranch } = useAppStore()
  const [suppliers] = useState<Supplier[]>(mockSuppliers)
  const [products, setProducts] = useState<Product[]>(mockProducts)

  // Reception Modal state
  const [receptionModalOpen, setReceptionModalOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(mockSuppliers[0].id)
  const [selectedProductId, setSelectedProductId] = useState<string>(mockProducts[0].id)
  
  // Bulk or Units toggle
  const [entryMode] = useState<'packs' | 'units'>('packs')
  const [inputPacks, setInputPacks] = useState<string>('5')
  const [inputUnits, setInputUnits] = useState<string>('40')
  const [newCostPrice, setNewCostPrice] = useState<number>(mockProducts[0].costPrice)
  const [marginPct, setMarginPct] = useState<number>(mockProducts[0].marginPct || 35)
  const [suggestedSellPrice, setSuggestedSellPrice] = useState<number>(mockProducts[0].sellPrice)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0]
  const unitsPerPack = activeProduct.unitsPerPack || 1
  const packName = activeProduct.packName || 'Cajón/Pack'

  // When product changes in modal
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId)
    const p = products.find((prod) => prod.id === prodId)
    if (p) {
      setNewCostPrice(p.costPrice)
      setMarginPct(p.marginPct || 35)
      setSuggestedSellPrice(p.sellPrice)
      if (entryMode === 'packs') {
        const pks = parseFloat(inputPacks) || 0
        setInputUnits(String(convertPacksToUnits(pks, p.unitsPerPack)))
      }
    }
  }

  // When packs input changes
  const handlePacksChange = (packsVal: string) => {
    setInputPacks(packsVal)
    const pks = parseFloat(packsVal) || 0
    setInputUnits(String(convertPacksToUnits(pks, unitsPerPack)))
  }

  // When units input changes
  const handleUnitsChange = (unitsVal: string) => {
    setInputUnits(unitsVal)
    const uns = parseFloat(unitsVal) || 0
    setInputPacks(String(convertUnitsToPacks(uns, unitsPerPack)))
  }

  // When cost price changes, recalculate suggested sell price
  const handleCostChange = (cost: number) => {
    setNewCostPrice(cost)
    const suggested = calculateSellPrice(cost, marginPct)
    setSuggestedSellPrice(Math.round(suggested / 10) * 10)
  }

  // Confirm Reception
  const handleConfirmReception = () => {
    const pks = parseFloat(inputPacks) || 0
    const validation = validatePackInput(pks, unitsPerPack)
    if (!validation.success) return

    const totalUnitsToAdd = validation.data.units

    // Update stock and cost in products list
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === activeProduct.id && p.stock) {
          return {
            ...p,
            costPrice: newCostPrice,
            sellPrice: suggestedSellPrice,
            stock: {
              ...p.stock,
              currentStock: p.stock.currentStock + totalUnitsToAdd,
            },
          }
        }
        return p
      })
    )

    setSuccessBanner(
      `¡Ingreso Exitoso! Se añadieron +${totalUnitsToAdd} ${
        activeProduct.saleType === 'weight' ? 'kg' : 'unidades'
      } a ${activeProduct.name} en ${activeBranch?.name}. Nuevo costo: ${formatCurrency(newCostPrice)}`
    )

    setReceptionModalOpen(false)
    setTimeout(() => setSuccessBanner(null), 5000)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">
            Proveedores y Recepción de Mercadería
          </h1>
          <p className="text-xs text-outline mt-0.5">
            Ingreso por bultos o cajones cerrados con cálculo automático de unidades individuales y actualización de costos
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReceptionModalOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Package className="w-4 h-4" />
          <span>+ Cargar Factura / Recepción de Mercadería</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        </div>
      )}

      {/* Quick KPI stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Proveedores Activos</span>
            <span className="font-mono text-xl font-bold text-on-surface">{suppliers.length}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Facturas este Mes</span>
            <span className="font-mono text-xl font-bold text-on-surface">18</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Gasto en Mercadería (Mes)</span>
            <span className="font-mono text-xl font-bold text-on-surface">$ 3.420.500</span>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-surface-container-low/40 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            Directorio de Proveedores y Condiciones Comerciales
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                <th className="py-3 px-4">Proveedor / Razón Social</th>
                <th className="py-3 px-4">CUIT</th>
                <th className="py-3 px-4">Contacto / Preventista</th>
                <th className="py-3 px-4">Teléfono / Pedidos</th>
                <th className="py-3 px-4">Días y Notas de Reparto</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-on-surface">
                    {s.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-outline">
                    {s.cuit}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {s.contactName}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-outline">
                    {s.phone}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {s.notes}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplierId(s.id)
                        setReceptionModalOpen(true)
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase border border-emerald-300 transition-colors"
                    >
                      Cargar Remito
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: Recepción de Mercadería y Bultos ================= */}
      <Modal
        isOpen={receptionModalOpen}
        onClose={() => setReceptionModalOpen(false)}
        title="Recepción de Mercadería y Actualización de Costos"
        subtitle="Ingresa mercadería por bultos/cajones o unidades sueltas con recálculo automático de stock y precio de venta"
        maxWidth="xl"
      >
        <div className="flex flex-col gap-4">
          
          {/* Supplier Selector */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Proveedor Emisor:
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-slate-300 focus:outline-none"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.cuit})
                </option>
              ))}
            </select>
          </div>

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Seleccionar Producto del Catálogo:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full h-10 px-3 bg-white text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Bulto: 1 {p.packName || 'Pack'} = {p.unitsPerPack} {p.saleType === 'weight' ? 'kg' : 'un.'} (Stock actual: {p.stock?.currentStock})
                </option>
              ))}
            </select>
          </div>

          {/* Pack Equivalence Rule Card */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-emerald-700" />
              <div>
                <span className="text-xs font-bold text-emerald-950">
                  Equivalencia de Compra: 1 {packName} = {unitsPerPack}{' '}
                  {activeProduct.saleType === 'weight' ? 'kg' : 'unidades individuales'}
                </span>
                <p className="text-[11px] text-emerald-700">
                  El sistema sumará automáticamente al stock de {activeBranch?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Dual Entry: Bultos / Cajones vs Unidades Sueltas */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Ingreso por BULTOS / {packName.toUpperCase()}:
              </label>
              <input
                type="number"
                step="0.5"
                value={inputPacks}
                onChange={(e) => handlePacksChange(e.target.value)}
                className="w-full h-11 px-3 bg-white font-mono text-sm font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-outline mt-0.5 block">
                Ej: 5 cajones
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Total UNIDADES a sumar al Stock:
              </label>
              <input
                type="number"
                step="1"
                value={inputUnits}
                onChange={(e) => handleUnitsChange(e.target.value)}
                className="w-full h-11 px-3 bg-white font-mono text-sm font-bold rounded-lg border-2 border-emerald-500 text-emerald-900 focus:outline-none"
              />
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                = {inputUnits} {activeProduct.saleType === 'weight' ? 'kg' : 'unidades'} individuales
              </span>
            </div>
          </div>

          {/* Cost Price & Margin Recalculation */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-on-surface uppercase mb-1">
                Nuevo Costo Unitario ($):
              </label>
              <input
                type="number"
                value={newCostPrice}
                onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded border border-slate-300"
              />
              <span className="text-[10px] text-outline">
                Anterior: {formatCurrency(activeProduct.costPrice)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface uppercase mb-1">
                Margen Sugerido (%):
              </label>
              <input
                type="number"
                value={marginPct}
                onChange={(e) => {
                  const m = parseFloat(e.target.value) || 0
                  setMarginPct(m)
                  const suggested = calculateSellPrice(newCostPrice, m)
                  setSuggestedSellPrice(Math.round(suggested / 10) * 10)
                }}
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded border border-slate-300 text-blue-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface uppercase mb-1">
                Nuevo Precio Venta ($):
              </label>
              <input
                type="number"
                value={suggestedSellPrice}
                onChange={(e) => setSuggestedSellPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded border border-slate-300 text-emerald-700"
              />
              <span className="text-[10px] text-outline">
                Anterior: {formatCurrency(activeProduct.sellPrice)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReceptionModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmReception}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Confirmar Recepción (+{inputUnits} {activeProduct.saleType === 'weight' ? 'kg' : 'un.'})
            </button>
          </div>

        </div>
      </Modal>

    </div>
  )
}
