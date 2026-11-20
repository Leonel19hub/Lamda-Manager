import React, { useState } from 'react'
import {
  Truck,
  Package,
  Layers,
  CheckCircle2,
  FileText,
  DollarSign,
  Plus,
  Edit2,
  Building2,
  Calendar,
  AlertCircle,
  Phone,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { usePurchaseStore } from '@/stores/usePurchaseStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { calculateSellPrice } from '@/features/inventory'
import {
  convertPacksToUnits,
  convertUnitsToPacks,
  validatePackInput,
  validateSupplierForm,
  type SupplierInput,
} from '../domain/packConversions'
import { Modal } from '@/components/ui/Modal'
import type { Supplier } from '@/types'

export const PurchasesView: React.FC = () => {
  const { activeBranch, currentUser } = useAppStore()
  const { suppliers, purchaseOrders, addSupplier, updateSupplier, createPurchaseOrder } =
    usePurchaseStore()
  const { products } = useInventoryStore()

  // Tabs: Comprobantes vs Proveedores
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders')

  // Reception Modal state
  const [receptionModalOpen, setReceptionModalOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '')
  const [orderInvoiceNumber, setOrderInvoiceNumber] = useState<string>('')
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '')
  const [inputPacks, setInputPacks] = useState<string>('5')
  const [inputUnits, setInputUnits] = useState<string>('40')
  const [newCostPrice, setNewCostPrice] = useState<number>(products[0]?.costPrice || 0)
  const [marginPct, setMarginPct] = useState<number>(products[0]?.marginPct || 35)
  const [suggestedSellPrice, setSuggestedSellPrice] = useState<number>(products[0]?.sellPrice || 0)
  const [receptionNotes, setReceptionNotes] = useState<string>('')
  const [receptionError, setReceptionError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Supplier Create / Edit Modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [isEditingSupplier, setIsEditingSupplier] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [supplierCuit, setSupplierCuit] = useState('')
  const [supplierContact, setSupplierContact] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [supplierEmail, setSupplierEmail] = useState('')
  const [supplierAddress, setSupplierAddress] = useState('')
  const [supplierNotes, setSupplierNotes] = useState('')
  const [supplierError, setSupplierError] = useState<string | null>(null)

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0]
  const unitsPerPack = activeProduct?.unitsPerPack || 1
  const packName = activeProduct?.packName || 'Cajón/Pack'

  // Dynamic KPI Stats
  const activeSuppliersCount = suppliers.filter((s) => s.isActive).length
  const totalOrdersCount = purchaseOrders.length
  const totalPurchasesAmount = purchaseOrders.reduce((acc, po) => acc + po.total, 0)

  // When opening Reception Modal
  const openReceptionModal = (preselectedSupplierId?: string) => {
    setReceptionError(null)
    if (preselectedSupplierId) {
      setSelectedSupplierId(preselectedSupplierId)
    } else if (!selectedSupplierId && suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id)
    }

    if (products.length > 0) {
      const prod = products[0]
      setSelectedProductId(prod.id)
      setNewCostPrice(prod.costPrice)
      setMarginPct(prod.marginPct || 35)
      setSuggestedSellPrice(prod.sellPrice)
      setInputPacks('5')
      setInputUnits(String(convertPacksToUnits(5, prod.unitsPerPack || 1)))
    }
    setOrderInvoiceNumber('')
    setReceptionNotes('')
    setReceptionModalOpen(true)
  }

  // When product changes in modal
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId)
    const p = products.find((prod) => prod.id === prodId)
    if (p) {
      setNewCostPrice(p.costPrice)
      setMarginPct(p.marginPct || 35)
      setSuggestedSellPrice(p.sellPrice)
      const pks = parseFloat(inputPacks) || 0
      setInputUnits(String(convertPacksToUnits(pks, p.unitsPerPack || 1)))
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
    setReceptionError(null)
    const pks = parseFloat(inputPacks) || 0
    const validation = validatePackInput(pks, unitsPerPack)
    if (!validation.success) {
      setReceptionError(validation.error.message)
      return
    }

    if (!activeProduct) {
      setReceptionError('Debe seleccionar un producto válido.')
      return
    }

    const totalUnitsToAdd = validation.data.units
    const totalLineCost = Math.round(totalUnitsToAdd * newCostPrice * 100) / 100

    const orderRes = createPurchaseOrder({
      supplierId: selectedSupplierId,
      branchId: activeBranch?.id || 'branch-01',
      orderNumber: orderInvoiceNumber.trim() || undefined,
      receivedBy: currentUser?.fullName || 'María Gómez',
      notes: receptionNotes.trim() || `Recepción de ${totalUnitsToAdd} ${activeProduct.saleType === 'weight' ? 'kg' : 'unidades'}`,
      items: [
        {
          productId: activeProduct.id,
          productName: activeProduct.name,
          packsReceived: pks,
          unitsPerPack,
          unitsReceived: totalUnitsToAdd,
          unitCost: newCostPrice,
          totalCost: totalLineCost,
          oldCost: activeProduct.costPrice,
          newCost: newCostPrice,
          oldSellPrice: activeProduct.sellPrice,
          newSellPrice: suggestedSellPrice,
        },
      ],
    })

    if (!orderRes.success) {
      setReceptionError(orderRes.error.message)
      return
    }

    setSuccessBanner(
      `¡Ingreso Exitoso! Se añadieron +${totalUnitsToAdd} ${
        activeProduct.saleType === 'weight' ? 'kg' : 'unidades'
      } a ${activeProduct.name} en ${activeBranch?.name}. Nuevo costo: ${formatCurrency(newCostPrice)}`
    )

    setReceptionModalOpen(false)
    setTimeout(() => setSuccessBanner(null), 5000)
  }

  // Supplier modal handlers
  const openCreateSupplierModal = () => {
    setIsEditingSupplier(false)
    setEditingSupplierId(null)
    setSupplierName('')
    setSupplierCuit('')
    setSupplierContact('')
    setSupplierPhone('')
    setSupplierEmail('')
    setSupplierAddress('')
    setSupplierNotes('')
    setSupplierError(null)
    setSupplierModalOpen(true)
  }

  const openEditSupplierModal = (s: Supplier) => {
    setIsEditingSupplier(true)
    setEditingSupplierId(s.id)
    setSupplierName(s.name)
    setSupplierCuit(s.cuit || '')
    setSupplierContact(s.contactName || '')
    setSupplierPhone(s.phone || '')
    setSupplierEmail(s.email || '')
    setSupplierAddress(s.address || '')
    setSupplierNotes(s.notes || '')
    setSupplierError(null)
    setSupplierModalOpen(true)
  }

  const handleSaveSupplier = () => {
    setSupplierError(null)
    const supplierInput: SupplierInput = {
      name: supplierName.trim(),
      cuit: supplierCuit.trim() || undefined,
      contactName: supplierContact.trim() || undefined,
      phone: supplierPhone.trim() || undefined,
      email: supplierEmail.trim() || undefined,
      address: supplierAddress.trim() || undefined,
      notes: supplierNotes.trim() || undefined,
    }

    const validation = validateSupplierForm(supplierInput)
    if (!validation.success) {
      setSupplierError(validation.error.message)
      return
    }

    if (isEditingSupplier && editingSupplierId) {
      const res = updateSupplier(editingSupplierId, supplierInput)
      if (!res.success) {
        setSupplierError(res.error.message)
        return
      }
    } else {
      const res = addSupplier(supplierInput)
      if (!res.success) {
        setSupplierError(res.error.message)
        return
      }
    }

    setSupplierModalOpen(false)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">
            Compras, Proveedores y Recepción de Mercadería
          </h1>
          <p className="text-xs text-outline mt-0.5">
            Ingreso por bultos o cajones cerrados con cálculo de unidades, actualización de costos y stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateSupplierModal}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Nuevo Proveedor</span>
          </button>
          <button
            type="button"
            onClick={() => openReceptionModal()}
            className="px-4 py-2 rounded-lg bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Package className="w-4 h-4" />
            <span>+ Cargar Factura / Remito</span>
          </button>
        </div>
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
            <span className="font-mono text-xl font-bold text-on-surface">{activeSuppliersCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Comprobantes Recibidos</span>
            <span className="font-mono text-xl font-bold text-on-surface">{totalOrdersCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline">Gasto en Mercadería</span>
            <span className="font-mono text-xl font-bold text-on-surface">
              {formatCurrency(totalPurchasesAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Comprobantes y Recepciones de Mercadería ({purchaseOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'suppliers'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Directorio de Proveedores Mayoristas ({suppliers.length})</span>
        </button>
      </div>

      {/* TAB 1: Comprobantes de Compra y Recepciones */}
      {activeTab === 'orders' && (
        <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-surface-container-low/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Historial de Órdenes de Compra y Remitos Ingresados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">N° Comprobante</th>
                  <th className="py-3 px-4">Proveedor Emisor</th>
                  <th className="py-3 px-4">Destino / Depósito</th>
                  <th className="py-3 px-4">Ítems Ingresados</th>
                  <th className="py-3 px-4 text-right">Total Facturado</th>
                  <th className="py-3 px-4">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-outline">
                      No hay comprobantes de compra registrados aún.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const sup = suppliers.find((s) => s.id === po.supplierId)
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-on-surface font-medium">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-outline" />
                              {formatDate(po.receivedAt)}
                            </span>
                            <span className="text-[10px] text-outline font-mono">
                              {formatTime(po.receivedAt)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {po.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-on-surface">
                          {sup?.name || 'Proveedor'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {activeBranch?.name || 'Sucursal Central'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex flex-col gap-0.5">
                            {po.items?.map((item) => (
                              <span key={item.id} className="text-[11px] font-medium text-slate-800">
                                {item.productName || 'Producto'} · +{item.unitsReceived} un/kg (Costo: {formatCurrency(item.unitCost)})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {formatCurrency(po.total)}
                        </td>
                        <td className="py-3.5 px-4 text-outline whitespace-nowrap">
                          {po.receivedBy}
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

      {/* TAB 2: Directorio de Proveedores */}
      {activeTab === 'suppliers' && (
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
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-outline">
                      {s.cuit || 'Sin CUIT'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {s.contactName || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-outline">
                      {s.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-outline" />
                          {s.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={s.notes}>
                      {s.notes || <span className="text-slate-300 italic">Sin notas</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openReceptionModal(s.id)}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase border border-emerald-300 transition-colors"
                        >
                          Cargar Remito
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditSupplierModal(s)}
                          className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Editar Proveedor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: Recepción de Mercadería y Bultos ================= */}
      <Modal
        isOpen={receptionModalOpen}
        onClose={() => setReceptionModalOpen(false)}
        title="Recepción de Mercadería y Actualización de Costos"
        subtitle="Ingresa mercadería por bultos/cajones con recálculo automático de stock y precio de reposición"
        maxWidth="xl"
      >
        <div className="flex flex-col gap-4">
          {receptionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{receptionError}</span>
            </div>
          )}

          {/* Supplier Selector & Invoice Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Proveedor Emisor:
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.cuit || 'Sin CUIT'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                N° de Factura o Remito (opcional):
              </label>
              <input
                type="text"
                value={orderInvoiceNumber}
                onChange={(e) => setOrderInvoiceNumber(e.target.value)}
                placeholder="Ej: FC-0002-00049182"
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Seleccionar Producto del Catálogo:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full h-10 px-3 bg-white text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Bulto: 1 {p.packName || 'Pack'} = {p.unitsPerPack}{' '}
                  {p.saleType === 'weight' ? 'kg' : 'un.'} (Stock actual: {p.stock?.currentStock || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Pack Equivalence Rule Card */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-950">
                  Equivalencia de Compra: 1 {packName} = {unitsPerPack}{' '}
                  {activeProduct?.saleType === 'weight' ? 'kg' : 'unidades individuales'}
                </span>
                <p className="text-[11px] text-emerald-700">
                  El sistema sumará automáticamente al stock físico de {activeBranch?.name}
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
                min="0.1"
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
                min="1"
                value={inputUnits}
                onChange={(e) => handleUnitsChange(e.target.value)}
                className="w-full h-11 px-3 bg-white font-mono text-sm font-bold rounded-lg border-2 border-emerald-500 text-emerald-900 focus:outline-none"
              />
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                = {inputUnits} {activeProduct?.saleType === 'weight' ? 'kg' : 'unidades'} individuales
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
                min="0"
                value={newCostPrice}
                onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-outline">
                Anterior: {formatCurrency(activeProduct?.costPrice || 0)}
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
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded border border-slate-300 text-blue-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface uppercase mb-1">
                Nuevo Precio Venta ($):
              </label>
              <input
                type="number"
                min="0"
                value={suggestedSellPrice}
                onChange={(e) => setSuggestedSellPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-white font-mono text-xs font-bold rounded border border-slate-300 text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-outline">
                Anterior: {formatCurrency(activeProduct?.sellPrice || 0)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Observaciones del Remito (opcional):
            </label>
            <input
              type="text"
              value={receptionNotes}
              onChange={(e) => setReceptionNotes(e.target.value)}
              placeholder="Ej: Remito conforme, calidad óptima..."
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
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
              Confirmar Recepción (+{inputUnits} {activeProduct?.saleType === 'weight' ? 'kg' : 'un.'})
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Alta / Edición de Proveedor ================= */}
      <Modal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        title={isEditingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor Mayorista'}
        subtitle="Datos comerciales y contacto de distribución"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {supplierError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{supplierError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Nombre o Razón Social: *
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Ej: Distribuidora Quilmes o Mercado Central"
              className="w-full h-10 px-3 bg-white text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                CUIT:
              </label>
              <input
                type="text"
                value={supplierCuit}
                onChange={(e) => setSupplierCuit(e.target.value)}
                placeholder="Ej: 30-50279317-2"
                className="w-full h-10 px-3 bg-white text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Contacto / Preventista:
              </label>
              <input
                type="text"
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
                placeholder="Ej: Esteban Rossi"
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Teléfono:
              </label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="Ej: +54 11 5282-4000"
                className="w-full h-10 px-3 bg-white text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Email:
              </label>
              <input
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                placeholder="Ej: pedidos@distribuidora.com"
                className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Dirección:
            </label>
            <input
              type="text"
              value={supplierAddress}
              onChange={(e) => setSupplierAddress(e.target.value)}
              placeholder="Ej: Av. Amancio Alcorta 2400"
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Días de Reparto y Notas:
            </label>
            <textarea
              rows={2}
              value={supplierNotes}
              onChange={(e) => setSupplierNotes(e.target.value)}
              placeholder="Ej: Reparto martes y viernes. Plazo de pago 14 días..."
              className="w-full p-2.5 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSupplierModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveSupplier}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              {isEditingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
