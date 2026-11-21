import React, { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal, Input, Select, Button, AlertBanner } from '@/components/ui'
import { formatWeight } from '@/lib/utils'
import { useInventoryStore } from '@/stores/useInventoryStore'
import type { Product } from '@/types'

export interface WasteModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  activeBranchId?: string
  registeredBy?: string
}

const REASON_OPTIONS = [
  {
    value: 'Mercadería podrida / maduración',
    label: 'Mercadería podrida / maduración acelerada (Verdulería)',
  },
  { value: 'Producto vencido en góndola', label: 'Producto vencido en góndola' },
  {
    value: 'Rotura de empaque / sachet pinchado',
    label: 'Rotura de empaque / sachet pinchado',
  },
  { value: 'Merma por flete / descarga', label: 'Golpes en descarga / flete' },
]

export const WasteModal: React.FC<WasteModalProps> = ({
  isOpen,
  onClose,
  product,
  activeBranchId,
  registeredBy,
}) => {
  const recordWaste = useInventoryStore((state) => state.recordWaste)

  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('Mercadería podrida / maduración')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset local state when modal opens or product changes
  useEffect(() => {
    if (!isOpen) return

    setError(null)
    setQuantity(product?.saleType === 'weight' ? '1.5' : '1')
    setReason('Mercadería podrida / maduración')
    setNotes('')
  }, [isOpen, product])

  const handleRegisterWaste = () => {
    setError(null)
    if (!product) return

    const qty = parseFloat(quantity) || 0
    if (qty <= 0) {
      setError('La cantidad a descontar debe ser un número mayor a cero.')
      return
    }

    const res = recordWaste({
      productId: product.id,
      branchId: activeBranchId || 'branch-01',
      quantity: qty,
      reason,
      notes: notes.trim() || undefined,
      registeredBy: registeredBy || 'Encargado de Depósito',
    })

    if (!res.success) {
      setError(res.error.message)
      return
    }

    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Merma / Pérdida de Mercadería"
      subtitle="Da de baja stock por vencimiento, rotura o mal estado sin afectar el arqueo de caja"
      maxWidth="md"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <AlertBanner variant="error" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}

        {product && (
          <div className="p-3 bg-error-container/20 rounded-xl border border-error/30 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-error shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-on-surface truncate">
                {product.name}
              </span>
              <span className="text-xs text-outline font-mono">
                Stock actual disponible:{' '}
                {product.saleType === 'weight'
                  ? formatWeight(product.stock?.currentStock ?? 0)
                  : `${product.stock?.currentStock ?? 0} un.`}
              </span>
            </div>
          </div>
        )}

        <Input
          label={`Cantidad a descontar (${product?.saleType === 'weight' ? 'kg' : 'unidades'})`}
          type="number"
          step="0.05"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <Select
          label="Motivo de la merma"
          value={reason}
          options={REASON_OPTIONS}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface">
            Observaciones adicionales
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalles sobre el lote, proveedor o estado..."
            className="w-full p-2.5 bg-surface-container-lowest text-xs rounded-lg border border-slate-300 text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            onClick={handleRegisterWaste}
            disabled={!product}
          >
            Confirmar Baja de Stock
          </Button>
        </div>
      </div>
    </Modal>
  )
}
