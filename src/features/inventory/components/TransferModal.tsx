import React, { useState, useEffect } from 'react'
import { Modal, Input, Select, Button, AlertBanner } from '@/components/ui'
import { validateTransfer, getAvailableDestinationBranches } from '../domain/stockRules'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useAppStore } from '@/stores/useAppStore'

export interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  initialProductId?: string
  activeBranchId?: string
  createdBy?: string
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  initialProductId,
  activeBranchId,
  createdBy,
}) => {
  const products = useInventoryStore((state) => state.products)
  const createTransfer = useInventoryStore((state) => state.createTransfer)
  const branches = useAppStore((state) => state.branches)
  const activeBranch = useAppStore((state) => state.activeBranch)

  const effectiveActiveBranchId = activeBranchId || activeBranch?.id
  const availableDestinations = getAvailableDestinationBranches(branches, effectiveActiveBranchId)

  const [productId, setProductId] = useState<string>('')
  const [destBranchId, setDestBranchId] = useState<string>('')
  const [quantity, setQuantity] = useState('5')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Synchronize and reset state on open or when active branch / initial product changes
  useEffect(() => {
    if (!isOpen) return

    setError(null)
    const available = getAvailableDestinationBranches(branches, effectiveActiveBranchId)
    setDestBranchId(available[0]?.id || '')
    setProductId(initialProductId || products[0]?.id || '')
    setQuantity('5')
    setNotes('')
  }, [isOpen, initialProductId, effectiveActiveBranchId, branches, products])

  const handleTransfer = () => {
    setError(null)

    if (availableDestinations.length === 0) {
      setError('No existen sucursales de destino disponibles para realizar un traslado.')
      return
    }

    if (!productId) {
      setError('Debes seleccionar un producto a transferir.')
      return
    }

    if (!destBranchId) {
      setError('Debes seleccionar una sucursal destino válida.')
      return
    }

    const qty = parseFloat(quantity) || 0
    const selectedProduct = products.find((p) => p.id === productId)
    const currentStock = selectedProduct?.stock?.currentStock ?? 0

    const validation = validateTransfer(currentStock, qty)
    if (!validation.success) {
      setError(validation.error.message)
      return
    }

    const res = createTransfer({
      fromBranchId: effectiveActiveBranchId || 'branch-01',
      toBranchId: destBranchId,
      productId,
      quantity: qty,
      notes: notes.trim() || undefined,
      createdBy: createdBy || 'Encargado de Sucursal',
    })

    if (!res.success) {
      setError(res.error.message)
      return
    }

    onClose()
  }

  const destinationOptions = availableDestinations.map((b) => ({
    value: b.id,
    label: b.name,
  }))

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.saleType === 'weight' ? `${p.stock?.currentStock ?? 0} kg` : `${p.stock?.currentStock ?? 0} un.`} disp.)`,
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Remito Interno: Traslado entre Sucursales"
      subtitle="Envío de mercadería desde sucursal origen hacia sucursal destino"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <AlertBanner variant="error" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}

        {availableDestinations.length === 0 && (
          <AlertBanner variant="warning" title="Sin destinos disponibles">
            Se requieren al menos 2 sucursales configuradas en el sistema para realizar traslados.
          </AlertBanner>
        )}

        {/* Origin and Destination Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-bold text-outline">Sucursal Origen:</span>
            <p className="font-bold text-xs text-on-surface mt-1">
              {activeBranch?.name || 'Sucursal Origen'}
            </p>
          </div>
          <div>
            <Select
              label="Sucursal Destino"
              value={destBranchId}
              options={destinationOptions}
              onChange={(e) => setDestBranchId(e.target.value)}
              disabled={availableDestinations.length === 0}
            />
          </div>
        </div>

        {/* Product selector */}
        <Select
          label="Producto a trasladar"
          value={productId}
          options={productOptions}
          onChange={(e) => setProductId(e.target.value)}
        />

        {/* Quantity */}
        <Input
          label="Cantidad a transferir"
          type="number"
          step="0.1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        {/* Notes */}
        <Input
          label="Notas del Remito"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Flete de mañana, reposición fin de semana..."
        />

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleTransfer}
            disabled={availableDestinations.length === 0 || products.length === 0}
          >
            Generar Remito y Enviar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
