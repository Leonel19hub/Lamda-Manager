import React, { useState } from 'react'
import {
  Search,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Plus,
  Edit2,
  FileText,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  User,
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useCustomerStore } from '@/stores/useCustomerStore'
import { useAppStore } from '@/stores/useAppStore'
import {
  calculateCreditUsagePct,
  getCreditStatus,
  validateCustomerForm,
  type CustomerInput,
} from '../domain/creditRules'
import type { Customer, CustomerType } from '@/types'

export const CustomersView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    recordPayment,
    getCustomerMovements,
  } = useCustomerStore()

  const { currentUser } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'debt' | 'critical'>('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '')
  const [drawerTab, setDrawerTab] = useState<'details' | 'movements'>('details')

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState('Abono parcial de cuenta corriente en efectivo')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

  // Customer Create/Edit Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formFullName, setFormFullName] = useState('')
  const [formDniCuit, setFormDniCuit] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formCreditLimit, setFormCreditLimit] = useState('50000')
  const [formType, setFormType] = useState<CustomerType>('persona')
  const [formError, setFormError] = useState<string | null>(null)

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0]

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dni?.includes(searchQuery) ||
      c.dniCuit?.includes(searchQuery) ||
      c.phone?.includes(searchQuery)

    if (!matchesSearch) return false

    if (filterTab === 'debt') return c.currentBalance > 0
    if (filterTab === 'critical') {
      return getCreditStatus(c.currentBalance, c.creditLimit) === 'critical'
    }
    return true
  })

  // Total debt in the streets
  const totalDebt = customers.reduce((acc, c) => acc + c.currentBalance, 0)
  const customersWithDebt = customers.filter((c) => c.currentBalance > 0).length

  // Open Payment modal
  const openPaymentModal = (cust: Customer) => {
    setSelectedCustomerId(cust.id)
    setPaymentAmount(String(cust.currentBalance))
    setPaymentNotes('Abono en efectivo de libreta de fiado')
    setPaymentError(null)
    setPaymentModalOpen(true)
  }

  // Open Create Customer modal
  const openCreateModal = () => {
    setIsEditing(false)
    setFormFullName('')
    setFormDniCuit('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
    setFormCreditLimit('40000')
    setFormType('persona')
    setFormError(null)
    setCustomerModalOpen(true)
  }

  // Open Edit Customer modal
  const openEditModal = (cust: Customer) => {
    setIsEditing(true)
    setFormFullName(cust.fullName)
    setFormDniCuit(cust.dniCuit || cust.dni || '')
    setFormPhone(cust.phone || '')
    setFormEmail(cust.email || '')
    setFormAddress(cust.address || '')
    setFormCreditLimit(String(cust.creditLimit))
    setFormType(cust.type || 'persona')
    setFormError(null)
    setCustomerModalOpen(true)
  }

  // Save Customer Form (Create or Edit)
  const handleSaveCustomer = () => {
    setFormError(null)
    const limitNum = parseFloat(formCreditLimit) || 0

    const customerInput: CustomerInput = {
      fullName: formFullName.trim(),
      dniCuit: formDniCuit.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      address: formAddress.trim() || undefined,
      creditLimit: limitNum,
      type: formType,
    }

    const validation = validateCustomerForm(customerInput)
    if (!validation.success) {
      setFormError(validation.error.message)
      return
    }

    if (isEditing && selectedCustomer) {
      const res = updateCustomer(selectedCustomer.id, customerInput)
      if (!res.success) {
        setFormError(res.error.message)
        return
      }
    } else {
      const res = addCustomer(customerInput)
      if (!res.success) {
        setFormError(res.error.message)
        return
      }
      setSelectedCustomerId(res.data.id)
    }

    setCustomerModalOpen(false)
  }

  // Register Payment
  const handleRegisterPayment = () => {
    if (!selectedCustomer) return
    setPaymentError(null)
    const amount = parseFloat(paymentAmount) || 0

    if (amount <= 0 || isNaN(amount)) {
      setPaymentError('El importe a cobrar debe ser mayor a cero.')
      return
    }

    const res = recordPayment({
      customerId: selectedCustomer.id,
      amount,
      notes: paymentNotes.trim() || undefined,
      userName: currentUser?.fullName || 'Cajero',
    })

    if (!res.success) {
      setPaymentError(res.error.message)
      return
    }

    setPaymentSuccess(
      `¡Pago asentado correctamente! Se recibieron ${formatCurrency(amount)} de ${
        selectedCustomer.fullName
      } e ingresó a la caja activa.`
    )

    setPaymentModalOpen(false)
    setTimeout(() => setPaymentSuccess(null), 4000)
  }

  const movements = selectedCustomer ? getCustomerMovements(selectedCustomer.id) : []

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">
            Clientes y Cuentas Corrientes ("Fiado")
          </h1>
          <p className="text-xs text-outline mt-0.5">
            Gestión de libreta de fiado vecinal, límites de crédito y recaudación
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-red-800">
                Total en la Calle ({customersWithDebt} con deuda)
              </span>
              <span className="font-mono text-sm font-bold text-red-600">
                {formatCurrency(totalDebt)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 rounded-lg bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {paymentSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{paymentSuccess}</span>
        </div>
      )}

      {/* Main Grid: 65% Table / 35% Customer Account Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Customer Table (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Search bar & Filter Tabs */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-outline pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, DNI/CUIT o teléfono..."
                className="w-full h-10 pl-9 pr-3 bg-surface rounded-lg border border-slate-200 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0 bg-surface p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  filterTab === 'all'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                Todos ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('debt')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  filterTab === 'debt'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                Con Deuda ({customersWithDebt})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('critical')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  filterTab === 'critical'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                Límite Crítico
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                    <th className="py-3 px-4">Cliente / Razón</th>
                    <th className="py-3 px-4">DNI / CUIT</th>
                    <th className="py-3 px-4 text-right">Límite Fiado</th>
                    <th className="py-3 px-4 text-right">Deuda Actual</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-outline">
                        No se encontraron clientes con el criterio seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const status = getCreditStatus(c.currentBalance, c.creditLimit)
                      const isSelected = selectedCustomer?.id === c.id

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCustomerId(c.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/70 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface flex items-center gap-1.5">
                                {c.type === 'empresa' ? (
                                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                {c.fullName}
                              </span>
                              <span className="text-[10px] text-outline truncate max-w-xs">
                                {c.address || 'Sin dirección'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-outline">
                            {c.dniCuit || c.dni || 'Sin documento'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-outline">
                            {formatCurrency(c.creditLimit)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-red-600">
                            {formatCurrency(c.currentBalance)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {status === 'ok' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Al Día
                              </span>
                            ) : status === 'critical' ? (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                                Límite Crítico
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                Con Deuda
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openPaymentModal(c)
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase transition-colors"
                            >
                              Cobrar
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer Detail Drawer (4 cols) */}
        {selectedCustomer ? (
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-sm sticky top-20 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedCustomer.fullName.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-sm text-on-surface truncate">
                    {selectedCustomer.fullName}
                  </h3>
                  <span className="text-xs text-outline font-mono">
                    {selectedCustomer.dniCuit || selectedCustomer.dni || 'Sin documento'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEditModal(selectedCustomer)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                title="Editar cliente y límite"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs in Drawer: Datos vs Extracto */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setDrawerTab('details')}
                className={`font-bold transition-colors pb-1 border-b-2 ${
                  drawerTab === 'details'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-outline hover:text-on-surface'
                }`}
              >
                Datos y Saldo
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('movements')}
                className={`font-bold transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
                  drawerTab === 'movements'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-outline hover:text-on-surface'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Libreta de Fiado ({movements.length})</span>
              </button>
            </div>

            {drawerTab === 'details' ? (
              <>
                {/* Contact Details */}
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-outline shrink-0" />
                    <span className="font-mono">{selectedCustomer.phone || 'Sin teléfono registrado'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-outline shrink-0" />
                    <span className="truncate">{selectedCustomer.address || 'Sin dirección registrada'}</span>
                  </div>
                </div>

                {/* Debt & Credit Limit Progress */}
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-slate-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-outline uppercase font-bold text-[10px]">Deuda Acumulada</span>
                    <span className="font-mono font-bold text-red-600 text-base">
                      {formatCurrency(selectedCustomer.currentBalance)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        getCreditStatus(selectedCustomer.currentBalance, selectedCustomer.creditLimit) === 'critical'
                          ? 'bg-red-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${calculateCreditUsagePct(
                          selectedCustomer.currentBalance,
                          selectedCustomer.creditLimit
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-outline font-mono">
                    <span>
                      Disponible: {formatCurrency(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance))}
                    </span>
                    <span>Límite: {formatCurrency(selectedCustomer.creditLimit)}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-outline uppercase font-bold">Total Comprado</span>
                    <span className="font-mono font-bold text-on-surface">
                      {formatCurrency(selectedCustomer.totalSpent || 0)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-outline uppercase font-bold">Compras Fiadas</span>
                    <span className="font-mono font-bold text-on-surface">
                      {selectedCustomer.purchaseCount || 0} operaciones
                    </span>
                  </div>
                </div>

                {/* Action: Collect Payment button */}
                <button
                  type="button"
                  onClick={() => openPaymentModal(selectedCustomer)}
                  disabled={selectedCustomer.currentBalance === 0}
                  className="w-full py-3 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Cobrar Entrega / Cancelar Deuda</span>
                </button>
              </>
            ) : (
              /* Libreta de Fiado / Account Movements */
              <div className="flex flex-col gap-2">
                <div className="max-h-72 overflow-y-auto flex flex-col gap-2">
                  {movements.length === 0 ? (
                    <div className="p-6 text-center text-xs text-outline">
                      Sin movimientos registrados en la libreta todavía.
                    </div>
                  ) : (
                    movements.map((m) => {
                      const isVenta = m.type === 'VENTA'
                      return (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-surface border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isVenta ? (
                              <ArrowUpRight className="w-4 h-4 text-red-600 shrink-0" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-on-surface truncate">
                                {isVenta ? `Venta Fiado #${m.doc}` : `Cobro Recibo #${m.doc}`}
                              </span>
                              <span className="font-mono text-[10px] text-outline flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(m.date)} · {formatTime(m.date)}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`font-mono font-bold shrink-0 ${
                              isVenta ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {isVenta ? `+${formatCurrency(m.debit)}` : `-${formatCurrency(m.credit)}`}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openPaymentModal(selectedCustomer)}
                  disabled={selectedCustomer.currentBalance === 0}
                  className="w-full mt-2 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Cobrar Abono a Cuenta</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ================= MODAL: Cobro de Fiado ================= */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Cobro de Fiado: ${selectedCustomer?.fullName}`}
        subtitle={`Deuda total actual: ${formatCurrency(selectedCustomer?.currentBalance || 0)}`}
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {paymentError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Monto a Cobrar ($):
            </label>
            <input
              type="number"
              min="0"
              value={paymentAmount}
              onChange={(e) => {
                setPaymentAmount(e.target.value)
                setPaymentError(null)
              }}
              className="w-full h-12 px-3 text-right bg-white font-mono text-lg font-bold text-emerald-800 rounded-lg border-2 border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentAmount(String(selectedCustomer?.currentBalance || 0))}
              className="flex-1 py-1.5 rounded-lg border border-slate-300 bg-surface text-xs font-semibold hover:bg-slate-100"
            >
              Total ({formatCurrency(selectedCustomer?.currentBalance || 0)})
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(String(Math.round((selectedCustomer?.currentBalance || 0) / 2)))}
              className="flex-1 py-1.5 rounded-lg border border-slate-300 bg-surface text-xs font-semibold hover:bg-slate-100"
            >
              50% Deuda
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Detalle / Observación:
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center text-slate-700">
            <span>Destino del cobro:</span>
            <span className="font-bold text-emerald-800">Gaveta de Caja Activa</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegisterPayment}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Confirmar e Ingresar a Caja
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Alta / Edición de Cliente ================= */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title={isEditing ? 'Editar Cliente y Línea de Crédito' : 'Registrar Nuevo Cliente / Vecino'}
        subtitle="Habilita libreta de fiado con límite de crédito autorizado"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Nombre Completo o Razón Social: *
            </label>
            <input
              type="text"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              placeholder="Ej: Juan Carlos Pérez o Rotisería Central"
              className="w-full h-10 px-3 bg-white text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                DNI o CUIT:
              </label>
              <input
                type="text"
                value={formDniCuit}
                onChange={(e) => setFormDniCuit(e.target.value)}
                placeholder="Ej: 24.912.443 o 20-30123456-7"
                className="w-full h-10 px-3 bg-white text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Tipo:
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as CustomerType)}
                className="w-full h-10 px-3 bg-white text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="persona">Persona / Vecino</option>
                <option value="empresa">Comercio / Empresa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Teléfono:
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Ej: +54 11 4432-8812"
                className="w-full h-10 px-3 bg-white text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Límite de Fiado ($): *
              </label>
              <input
                type="number"
                min="0"
                value={formCreditLimit}
                onChange={(e) => setFormCreditLimit(e.target.value)}
                placeholder="Ej: 50000"
                className="w-full h-10 px-3 bg-white text-xs font-mono font-bold text-emerald-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Dirección:
            </label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="Ej: Av. Rivadavia 4612, Piso 4B"
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Email (opcional):
            </label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="Ej: vecino@gmail.com"
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCustomerModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCustomer}
              className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
