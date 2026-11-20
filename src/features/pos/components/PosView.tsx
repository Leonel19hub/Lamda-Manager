import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ScanBarcode,
  Scale,
  Search,
  Plus,
  Trash2,
  Receipt,
  User as UserIcon,
  ChevronsUpDown,
  CheckCircle2,
  Banknote,
  QrCode,
  CreditCard,
  BookOpen,
  ArrowRight,
  Package,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import { usePosStore } from '@/stores/usePosStore'
import { useAppStore } from '@/stores/useAppStore'
import { useCashRegisterStore } from '@/stores/useCashRegisterStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useCustomerStore } from '@/stores/useCustomerStore'
import { parseScaleBarcode } from '@/features/pos'
import { mockCategories } from '@/mock/mockData'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import type { Product, PaymentMethod } from '@/types'

export const PosView: React.FC = () => {
  const {
    items,
    selectedCustomer,
    paymentMethod,
    amountPaid,
    ticketNumber,
    searchQuery,
    selectedCategory,
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    setCustomer,
    setPaymentMethod,
    setSplitPayments,
    setAmountPaid,
    setSearchQuery,
    setSelectedCategory,
    checkoutTicket,
    subtotal,
    total,
    change,
  } = usePosStore()

  const { activeCashRegister, currentUser, activeBranch } = useAppStore()
  const catalogProducts = useInventoryStore((s) => s.products)
  const customers = useCustomerStore((s) => s.customers)
  const isRegisterOpen = Boolean(activeCashRegister?.isOpen)

  // Hardware barcode input autofocus ref
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Modals state
  const [weighModalOpen, setWeighModalOpen] = useState(false)
  const [activeWeighProduct, setActiveWeighProduct] = useState<Product | null>(null)
  const [modalWeight, setModalWeight] = useState<string>('0.500')
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [scaleWeight, setScaleWeight] = useState<number>(0.0)
  const [scannerNotification, setScannerNotification] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Split payment state
  const [splitCash, setSplitCash] = useState<number>(0)
  const [splitDigital, setSplitDigital] = useState<number>(0)

  // Initial focus on barcode input
  useEffect(() => {
    if (!weighModalOpen && !customerModalOpen && barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [weighModalOpen, customerModalOpen])

  // Focus scanner when clicking empty/neutral areas, without stealing focus from interactive elements
  useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      if (weighModalOpen || customerModalOpen) return
      const target = e.target as HTMLElement | null
      if (!target) return

      if (
        target.closest(
          'input, textarea, select, button, a, [role="button"], [role="dialog"], [data-no-autofocus]'
        )
      ) {
        return
      }

      barcodeInputRef.current?.focus()
    }

    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [weighModalOpen, customerModalOpen])

  // Tare balance
  const handleTare = useCallback(() => {
    setScaleWeight(0.0)
  }, [])

  // Sync split payments when method is mixto
  useEffect(() => {
    if (paymentMethod === 'mixto') {
      const currentTot = total()
      const half = Math.round((currentTot / 2) * 100) / 100
      const remainder = Math.round((currentTot - half) * 100) / 100
      setSplitCash(half)
      setSplitDigital(remainder)
      setSplitPayments([
        { id: 'sp-1', method: 'efectivo', amount: half },
        { id: 'sp-2', method: 'debito', amount: remainder },
      ])
    }
  }, [paymentMethod, total, setSplitPayments])

  const handleSplitChange = (cashVal: number, digitalVal: number) => {
    setSplitCash(cashVal)
    setSplitDigital(digitalVal)
    setSplitPayments([
      { id: 'sp-1', method: 'efectivo', amount: cashVal },
      { id: 'sp-2', method: 'debito', amount: digitalVal },
    ])
  }

  // Checkout action
  const handleCheckout = useCallback(() => {
    setCheckoutError(null)
    const res = checkoutTicket({
      cashierId: currentUser?.id || 'user-01',
      cashierName: currentUser?.fullName || 'Cajero Principal',
      cashierRole: currentUser?.role || 'EMPLEADO',
      warehouseId: activeBranch?.id,
      warehouseName: activeBranch?.name || 'Sucursal Central',
      activeRegister: activeCashRegister,
    })

    if (!res.success) {
      setCheckoutError(res.error.message)
      setTimeout(() => setCheckoutError(null), 4000)
      return
    }

    // Synchronize totals in cash register store
    const sale = res.data
    const regStore = useCashRegisterStore.getState()
    if (regStore.currentRegister && regStore.currentRegister.isOpen) {
      const cr = regStore.currentRegister
      let newExpected = cr.expectedCash
      let newTotalCard = cr.totalCard
      let newTotalTransfer = cr.totalTransfer
      let newTotalAccount = cr.totalAccount

      if (sale.paymentMethod === 'efectivo') {
        newExpected += sale.total
      } else if (sale.paymentMethod === 'debito' || sale.paymentMethod === 'credito') {
        newTotalCard += sale.total
      } else if (sale.paymentMethod === 'transferencia_qr') {
        newTotalTransfer += sale.total
      } else if (sale.paymentMethod === 'cuenta_corriente') {
        newTotalAccount += sale.total
      } else if (sale.paymentMethod === 'mixto' && sale.splitPayments) {
        sale.splitPayments.forEach((p) => {
          if (p.method === 'efectivo') newExpected += p.amount
          else if (p.method === 'debito' || p.method === 'credito') newTotalCard += p.amount
          else if (p.method === 'transferencia_qr') newTotalTransfer += p.amount
          else if (p.method === 'cuenta_corriente') newTotalAccount += p.amount
        })
      }

      useCashRegisterStore.setState({
        currentRegister: {
          ...cr,
          expectedCash: newExpected,
          totalCard: newTotalCard,
          totalTransfer: newTotalTransfer,
          totalAccount: newTotalAccount,
        },
      })
    }

    setCheckoutSuccess(true)
    setTimeout(() => {
      setCheckoutSuccess(false)
    }, 1800)
  }, [checkoutTicket, currentUser, activeBranch, activeCashRegister])

  // Global Keyboard shortcuts (F12: Cobrar, F2: Search, F7: Tare, Escape: Barcode scanner)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        handleCheckout()
      } else if (e.key === 'F7') {
        e.preventDefault()
        handleTare()
      } else if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if (e.key === 'Escape') {
        if (!weighModalOpen && !customerModalOpen) {
          barcodeInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCheckout, handleTare, weighModalOpen, customerModalOpen])

  // Handle barcode scanning submit (including Argentine scale labels EAN-13 starting with 20)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInputRef.current) return
    const code = barcodeInputRef.current.value.trim()
    if (!code) return

    // 1. Check if it's a grocery scale barcode (20 + PLU + Weight + C)
    const scaleRes = parseScaleBarcode(code)
    if (scaleRes.success) {
      const foundWeighed = catalogProducts.find((p) => p.pluCode === scaleRes.data.plu)
      if (foundWeighed) {
        addItem({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: foundWeighed.id,
          productName: foundWeighed.name,
          productSku: foundWeighed.sku,
          saleType: 'weight',
          quantity: scaleRes.data.weight,
          unitPrice: foundWeighed.sellPrice,
          costPrice: foundWeighed.costPrice,
          subtotal: Math.round(scaleRes.data.weight * foundWeighed.sellPrice * 100) / 100,
          pluCode: foundWeighed.pluCode,
        })
        setScannerNotification(`+ ${scaleRes.data.weight} kg ${foundWeighed.name}`)
        setTimeout(() => setScannerNotification(null), 1500)
        barcodeInputRef.current.value = ''
        return
      }
    }

    // 2. Exact match by barcode or PLU
    const found = catalogProducts.find(
      (p) => p.barcode === code || p.pluCode === code || p.sku === code
    )

    if (found) {
      if (found.saleType === 'weight') {
        openWeighModal(found)
      } else {
        addItem({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: found.id,
          productName: found.name,
          productSku: found.sku,
          saleType: 'unit',
          quantity: 1,
          unitPrice: found.sellPrice,
          costPrice: found.costPrice,
          subtotal: found.sellPrice,
          barcode: found.barcode,
        })
        setScannerNotification(`+ 1x ${found.name}`)
        setTimeout(() => setScannerNotification(null), 1500)
      }
      barcodeInputRef.current.value = ''
    } else {
      setScannerNotification(`No encontrado: ${code}`)
      setTimeout(() => setScannerNotification(null), 2000)
    }
  }

  // Open weigh modal for produce, initializing with live scale weight if available
  const openWeighModal = (product: Product) => {
    setActiveWeighProduct(product)
    const initialWeight = scaleWeight > 0 ? scaleWeight.toFixed(3) : '0.500'
    setModalWeight(initialWeight)
    setWeighModalOpen(true)
  }

  // Confirm weigh modal item add
  const handleConfirmWeigh = () => {
    if (!activeWeighProduct) return
    const kg = parseFloat(modalWeight) || 0
    if (kg <= 0) return

    addItem({
      id: `item-${Date.now()}-${Math.random()}`,
      productId: activeWeighProduct.id,
      productName: activeWeighProduct.name,
      productSku: activeWeighProduct.sku,
      saleType: 'weight',
      quantity: kg,
      unitPrice: activeWeighProduct.sellPrice,
      costPrice: activeWeighProduct.costPrice,
      subtotal: Math.round(kg * activeWeighProduct.sellPrice * 100) / 100,
      pluCode: activeWeighProduct.pluCode,
    })

    setWeighModalOpen(false)
    setActiveWeighProduct(null)
  }

  // Add unit product to cart directly
  const handleAddUnit = (product: Product) => {
    addItem({
      id: `item-${Date.now()}-${Math.random()}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      saleType: 'unit',
      quantity: 1,
      unitPrice: product.sellPrice,
      costPrice: product.costPrice,
      subtotal: product.sellPrice,
      barcode: product.barcode,
    })
  }

  // Filter products by category and search
  const filteredProducts = catalogProducts.filter((p) => {
    const matchesCat =
      !selectedCategory ||
      selectedCategory === 'cat-01' ||
      p.categoryId === selectedCategory
    const matchesQuery =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pluCode?.includes(searchQuery) ||
      p.barcode?.includes(searchQuery)
    return matchesCat && matchesQuery
  })

  // Credit validation for selected customer
  const isCreditOverLimit =
    paymentMethod === 'cuenta_corriente' &&
    selectedCustomer !== null &&
    selectedCustomer.creditLimit > 0 &&
    (selectedCustomer.currentBalance || 0) + total() > selectedCustomer.creditLimit

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT PANEL: Catalog, Scan & Hardware (approx 65%) ================= */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          
          {/* Top Operational Control Surface */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col gap-3">
            
            {/* Hardware state + Barcode reader input row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              
              {/* Barcode scanner input box */}
              <form onSubmit={handleBarcodeSubmit} className="md:col-span-7 relative flex items-center">
                <div className="absolute left-3 flex items-center pointer-events-none text-emerald-700">
                  <ScanBarcode className="w-5 h-5" />
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Escanear código de barras (EAN-13) o PLU..."
                  className="w-full h-12 pl-11 pr-28 bg-surface text-on-surface font-medium rounded-lg border-2 border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-outline text-sm transition-all"
                />
                <div className="absolute right-2.5 flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Lector USB
                  </span>
                </div>
              </form>

              {/* Digital Scale Status Badge with Tare */}
              <div className="md:col-span-5 flex items-center justify-between h-12 px-3 bg-surface-container-low rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Scale className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant truncate">
                      Toledo 2090
                    </span>
                    <span className="font-mono text-sm text-on-surface font-bold">
                      {scaleWeight.toFixed(3)}{' '}
                      <span className="text-xs text-outline font-normal">kg</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTare}
                  className="px-2.5 py-1 bg-surface-container-highest hover:bg-surface-container text-on-surface text-[10px] font-bold uppercase rounded border border-slate-300 transition-colors"
                >
                  Tara [F7]
                </button>
              </div>

            </div>

            {/* Notification banner for scanner */}
            {scannerNotification && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-between animate-in fade-in">
                <span>{scannerNotification}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            )}

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

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
              {mockCategories.map((cat) => {
                const isSelected = (!selectedCategory && cat.id === 'cat-01') || selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id === 'cat-01' ? null : cat.id)}
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
            {filteredProducts.map((product) => {
              const isWeighed = product.saleType === 'weight'
              const currentStock = product.stock?.currentStock || 0
              const minStock = product.stock?.minStock || 0
              const isLowStock = currentStock <= minStock

              return (
                <div
                  key={product.id}
                  className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between group hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div>
                    {/* Top Tag & Stock indicator */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {isWeighed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          <Scale className="w-3 h-3 text-emerald-600" />
                          PESO / PLU {product.pluCode}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {product.barcode || 'UNIDAD'}
                        </span>
                      )}

                      <span className={`font-mono text-xs ${isLowStock ? 'text-red-600 font-bold' : 'text-outline'}`}>
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
                        <span className="font-mono font-bold text-base text-emerald-700 mt-1">
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
                      <button
                        type="button"
                        onClick={() => openWeighModal(product)}
                        className="w-full h-10 px-3 bg-emerald-50 hover:bg-primary-container text-emerald-800 hover:text-on-primary-container text-xs font-bold rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Scale className="w-4 h-4" />
                        <span>Pesar en Balanza</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddUnit(product)}
                        className="w-full h-10 px-3 bg-surface-container hover:bg-emerald-600 hover:text-white text-on-surface text-xs font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Agregar Unidad</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

        </div>

        {/* ================= RIGHT PANEL: Current Cart Ticket & Checkout (approx 35%) ================= */}
        <div className="xl:col-span-4 flex flex-col gap-4 sticky top-20">
          
          <div className="bg-surface-container-lowest rounded-xl shadow-md border border-slate-200 p-4 flex flex-col">
            
            {/* Ticket Header & Sequence */}
            <div className="pb-3 border-b border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-700" />
                  <span className="font-bold text-base text-on-surface tracking-tight">
                    Ticket #{ticketNumber}
                  </span>
                </div>
                <span className="font-mono text-xs text-outline font-semibold">
                  {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Customer Pill / Account Selector */}
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-surface-container transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserIcon className="w-4 h-4 text-secondary shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-on-surface truncate">
                      {selectedCustomer ? selectedCustomer.fullName : 'Consumidor Final'}
                    </span>
                    <span className="text-[10px] text-outline truncate font-mono">
                      {selectedCustomer ? `DNI/CUIT ${selectedCustomer.dni}` : 'DNI Genérico 00-00000000-0'}
                    </span>
                  </div>
                </div>
                <span className="text-emerald-700 text-xs font-bold flex items-center gap-0.5">
                  Cambiar
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>

            {/* Scrollable Ticket Line Items */}
            <div className="py-3 flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center text-outline">
                  <Package className="w-10 h-10 mb-2 opacity-30" />
                  <span className="text-sm font-medium">Ticket vacío</span>
                  <span className="text-xs mt-0.5">Escanea o selecciona productos del catálogo</span>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col gap-1.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-on-surface truncate">
                          {item.productName}
                        </span>
                        <span className="font-mono text-[11px] text-outline">
                          {item.saleType === 'weight'
                            ? `${formatWeight(item.quantity)} × ${formatCurrency(item.unitPrice)}/kg`
                            : `${item.quantity} un. × ${formatCurrency(item.unitPrice)}/un`}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-on-surface shrink-0">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>

                    {/* Quantity modifier and delete button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center bg-surface-container-lowest border border-slate-200 rounded">
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = item.saleType === 'weight' ? item.quantity - 0.1 : item.quantity - 1
                            if (newQty <= 0) {
                              removeItem(item.id)
                            } else {
                              updateItemQuantity(item.id, newQty)
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center text-outline hover:text-on-surface hover:bg-slate-100 rounded text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono text-[11px] font-semibold">
                          {item.saleType === 'weight' ? formatWeight(item.quantity) : `${item.quantity} un`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = item.saleType === 'weight' ? item.quantity + 0.1 : item.quantity + 1
                            updateItemQuantity(item.id, newQty)
                          }}
                          className="w-6 h-6 flex items-center justify-center text-outline hover:text-on-surface hover:bg-slate-100 rounded text-xs font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar del ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="pt-2 flex flex-col gap-1.5 bg-surface-container-low/60 p-2.5 rounded-lg my-1 border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-outline">Subtotal bruto</span>
                <span className="font-mono font-semibold text-on-surface">
                  {formatCurrency(subtotal())}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-outline">
                <span>Redondeo en caja (ley redondeo)</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {formatCurrency(total() - subtotal())}
                </span>
              </div>
            </div>

            {/* High-contrast TOTAL box (Emerald) */}
            <div className="mt-1 p-3.5 rounded-xl bg-primary text-on-primary flex items-center justify-between shadow-md">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">
                  Importe Final a Cobrar
                </span>
                <span className="font-mono font-bold text-2xl tracking-tight">
                  {formatCurrency(total())}
                </span>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-300" />
            </div>

            {/* Cash register closed operational warning */}
            {!isRegisterOpen && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Turno de caja cerrado. Para cobrar tickets debe abrir la caja en <strong>Caja y Roles</strong>.
                </span>
              </div>
            )}

            {/* Checkout error banner */}
            {checkoutError && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Payment Method Selection Grid */}
            <div className="mt-3 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-outline">
                Forma de Pago
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                  { id: 'debito', label: 'Débito', icon: CreditCard },
                  { id: 'credito', label: 'Crédito', icon: CreditCard },
                  { id: 'transferencia_qr', label: 'QR / MP', icon: QrCode },
                  { id: 'cuenta_corriente', label: 'Fiado / Cta.', icon: BookOpen },
                  { id: 'mixto', label: 'Mixto', icon: Layers },
                ].map((pm) => {
                  const Icon = pm.icon
                  const active = paymentMethod === pm.id
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                      className={`h-11 px-2 rounded-lg flex items-center justify-center gap-1.5 text-center text-xs font-semibold border transition-all ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs'
                          : 'bg-surface hover:bg-surface-container text-on-surface border-slate-200'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-700' : 'text-secondary'}`} />
                      <span className="truncate">{pm.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fiado validations */}
            {paymentMethod === 'cuenta_corriente' && (
              <div className="mt-2.5">
                {!selectedCustomer ? (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Seleccione un cliente registrado para autorizar el fiado.</span>
                  </div>
                ) : isCreditOverLimit ? (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      ¡Límite superado! Saldo actual: {formatCurrency(selectedCustomer.currentBalance)} · Límite: {formatCurrency(selectedCustomer.creditLimit)}.
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Split payments box */}
            {paymentMethod === 'mixto' && (
              <div className="mt-3 p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface">División del Cobro:</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-outline font-medium">Efectivo:</span>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1.5 text-xs font-mono text-outline">$</span>
                    <input
                      type="number"
                      value={splitCash || ''}
                      onChange={(e) => handleSplitChange(parseFloat(e.target.value) || 0, splitDigital)}
                      placeholder="0.00"
                      className="w-full h-8 pl-5 pr-2 text-right bg-white font-mono text-xs font-bold rounded border border-slate-300 text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-outline font-medium">Digital / Débito:</span>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1.5 text-xs font-mono text-outline">$</span>
                    <input
                      type="number"
                      value={splitDigital || ''}
                      onChange={(e) => handleSplitChange(splitCash, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-8 pl-5 pr-2 text-right bg-white font-mono text-xs font-bold rounded border border-slate-300 text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-outline">Diferencia:</span>
                  <span
                    className={`font-mono font-bold ${
                      Math.abs(total() - (splitCash + splitDigital)) < 0.01 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(total() - (splitCash + splitDigital))}
                  </span>
                </div>
              </div>
            )}

            {/* Cash settlement box & return calculator (if cash) */}
            {paymentMethod === 'efectivo' && (
              <div className="mt-3 p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-outline font-medium">Paga con:</span>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1.5 text-xs font-mono text-outline">$</span>
                    <input
                      type="number"
                      value={amountPaid || ''}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-8 pl-5 pr-2 text-right bg-white font-mono text-xs font-bold rounded border border-slate-300 text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs font-bold text-on-surface">Vuelto a entregar:</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    {formatCurrency(change())}
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={clearCart}
                disabled={items.length === 0}
                className="h-12 px-3 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={
                  items.length === 0 ||
                  checkoutSuccess ||
                  !isRegisterOpen ||
                  (paymentMethod === 'cuenta_corriente' && (!selectedCustomer || isCreditOverLimit))
                }
                className="flex-1 h-12 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                {checkoutSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-900" />
                    <span>¡Cobro Finalizado!</span>
                  </>
                ) : (
                  <>
                    <span>Cobrar Ticket [F12]</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ================= MODAL: Weigh Produce ================= */}
      <Modal
        isOpen={weighModalOpen}
        onClose={() => setWeighModalOpen(false)}
        title={`Pesar: ${activeWeighProduct?.name || ''}`}
        subtitle={`PLU ${activeWeighProduct?.pluCode} · Precio: ${formatCurrency(activeWeighProduct?.sellPrice || 0)} / kg`}
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-emerald-700" />
              <div>
                <span className="text-xs uppercase font-bold text-emerald-900 tracking-wider">
                  Balanza Digital
                </span>
                <p className="text-xs text-emerald-700">Ingrese el peso en kilogramos</p>
              </div>
            </div>
            <span className="font-mono text-2xl font-bold text-emerald-800">
              {modalWeight} kg
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Kilogramos (kg):
            </label>
            <input
              type="number"
              step="0.005"
              autoFocus
              value={modalWeight}
              onChange={(e) => setModalWeight(e.target.value)}
              className="w-full h-12 px-3 text-right bg-white font-mono text-lg font-bold rounded-lg border-2 border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Live scale button if scale has weight */}
          {scaleWeight > 0 && (
            <button
              type="button"
              onClick={() => setModalWeight(scaleWeight.toFixed(3))}
              className="py-2 px-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors shadow-xs"
            >
              <Scale className="w-4 h-4 text-emerald-700" />
              <span>Usar peso de balanza en vivo ({scaleWeight.toFixed(3)} kg)</span>
            </button>
          )}

          {/* Quick preset weight buttons */}
          <div className="grid grid-cols-4 gap-2">
            {['0.250', '0.500', '1.000', '2.000'].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setModalWeight(w)}
                className="py-1.5 rounded-lg border border-slate-200 bg-surface text-xs font-mono font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              >
                {w} kg
              </button>
            ))}
          </div>

          {/* Subtotal preview */}
          {activeWeighProduct && (
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-slate-200 text-sm">
              <span className="text-outline font-medium">Subtotal a sumar:</span>
              <span className="font-mono font-bold text-emerald-700 text-base">
                {formatCurrency((parseFloat(modalWeight) || 0) * activeWeighProduct.sellPrice)}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWeighModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmWeigh}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Confirmar y Sumar
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Select Customer for Ticket ================= */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Seleccionar Cliente del Ticket"
        subtitle="Asociar ticket a consumidor final o cuenta corriente con fiado"
        maxWidth="lg"
      >
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setCustomer(null)
              setCustomerModalOpen(false)
            }}
            className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-between text-left"
          >
            <div>
              <span className="font-bold text-sm text-on-surface">Consumidor Final (Genérico)</span>
              <p className="text-xs text-outline">Sin cuenta corriente ni límite de fiado</p>
            </div>
            <span className="text-xs font-mono font-bold text-outline">00-00000000-0</span>
          </button>

          <div className="text-[10px] font-bold uppercase tracking-wider text-outline mt-2">
            Clientes Registrados con Cuenta Corriente:
          </div>

          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCustomer(c)
                setCustomerModalOpen(false)
              }}
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-between text-left"
            >
              <div>
                <span className="font-bold text-sm text-on-surface">{c.fullName}</span>
                <p className="text-xs text-outline">{c.address} · DNI {c.dni}</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-red-600">
                  Debe: {formatCurrency(c.currentBalance)}
                </span>
                <p className="text-[10px] text-outline font-mono">
                  Límite: {formatCurrency(c.creditLimit)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </Modal>

    </div>
  )
}
