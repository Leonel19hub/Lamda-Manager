import React, { useState } from 'react'
import {
  Search,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react'
import { mockCustomers } from '@/mock/mockData'
import { formatCurrency } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { useCashRegisterStore } from '@/stores/useCashRegisterStore'
import {
  calculateCreditUsagePct,
  getCreditStatus,
  applyPayment,
} from '../domain/creditRules'
import type { Customer } from '@/types'

export interface CustomersViewProps {
  onPaymentCollected?: (amount: number, customerName: string) => void
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onPaymentCollected }) => {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(mockCustomers[0])
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState('Abono parcial de cuenta corriente en efectivo')
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)

  const { addMovement, currentRegister } = useCashRegisterStore()

  // Filter customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dni?.includes(searchQuery) ||
      c.phone?.includes(searchQuery)
  )

  // Total balance sum
  const totalDebt = customers.reduce((acc, c) => acc + c.currentBalance, 0)

  // Open payment collection modal
  const openPaymentModal = (cust: Customer) => {
    setSelectedCustomer(cust)
    setPaymentAmount(String(cust.currentBalance))
    setPaymentNotes('Abono en efectivo de fiado')
    setPaymentModalOpen(true)
  }

  // Handle register payment
  const handleRegisterPayment = () => {
    const amount = parseFloat(paymentAmount) || 0
    if (!selectedCustomer) return

    const result = applyPayment(selectedCustomer.currentBalance, amount)
    if (!result.success) {
      return
    }

    const newBalance = result.data

    // Update customer debt
    const updatedCustomers = customers.map((c) => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          currentBalance: newBalance,
        }
      }
      return c
    })

    setCustomers(updatedCustomers)
    setSelectedCustomer((prev) => ({
      ...prev,
      currentBalance: newBalance,
    }))

    // Add cash movement to register
    if (onPaymentCollected) {
      onPaymentCollected(amount, selectedCustomer.fullName)
    } else if (currentRegister) {
      addMovement({
        id: `mov-${Date.now()}`,
        registerId: currentRegister.id,
        type: 'income',
        amount,
        description: `Cobro fiado / cuenta corriente: ${selectedCustomer.fullName}`,
        createdAt: new Date().toISOString(),
      })
    }

    setPaymentSuccess(
      `¡Pago asentado! Se recibieron ${formatCurrency(amount)} de ${selectedCustomer.fullName}. Nuevo saldo: ${formatCurrency(
        newBalance
      )}`
    )

    setPaymentModalOpen(false)
    setTimeout(() => setPaymentSuccess(null), 4000)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">
            Clientes y Cuentas Corrientes ("Fiado")
          </h1>
          <p className="text-xs text-outline mt-0.5">
            Gestión de libreta de fiado, límites de crédito por vecino y cobro de deudas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-red-800">
                Total en la Calle (Fiado)
              </span>
              <span className="font-mono text-sm font-bold text-red-600">
                {formatCurrency(totalDebt)}
              </span>
            </div>
          </div>
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
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-outline pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, DNI o teléfono de cliente..."
                className="w-full h-10 pl-9 pr-3 bg-surface rounded-lg border border-slate-200 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-outline font-medium shrink-0">
              {filteredCustomers.length} clientes encontrados
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">DNI / CUIT</th>
                    <th className="py-3 px-4 text-right">Límite Fiado</th>
                    <th className="py-3 px-4 text-right">Deuda Actual</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const status = getCreditStatus(c.currentBalance, c.creditLimit)
                    const isSelected = selectedCustomer.id === c.id

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/70 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{c.fullName}</span>
                            <span className="text-[10px] text-outline">{c.address}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-outline">
                          {c.dni || 'Sin DNI'}
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer Detail Drawer / Card (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-sm sticky top-20 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                {selectedCustomer.fullName.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-sm text-on-surface truncate">
                  {selectedCustomer.fullName}
                </h3>
                <span className="text-xs text-outline font-mono">DNI {selectedCustomer.dni}</span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-outline" />
              <span className="font-mono">{selectedCustomer.phone || 'Sin teléfono'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-outline" />
              <span>{selectedCustomer.address || 'Sin dirección'}</span>
            </div>
          </div>

          {/* Debt & Credit Limit Progress */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-outline uppercase font-bold text-[10px]">Deuda Actual</span>
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
              <span>Crédito Disponible: {formatCurrency(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance))}</span>
              <span>Límite: {formatCurrency(selectedCustomer.creditLimit)}</span>
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
        </div>

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
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase mb-1">
              Monto a Cobrar ($):
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full h-12 px-3 text-right bg-white font-mono text-lg font-bold rounded-lg border-2 border-emerald-500 focus:outline-none"
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
              className="w-full h-10 px-3 bg-white text-xs rounded-lg border border-slate-300"
            />
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

    </div>
  )
}
