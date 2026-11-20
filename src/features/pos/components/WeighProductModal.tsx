import React, { useState, useEffect } from 'react'
import { Scale } from 'lucide-react'
import { Modal, Button, Input, Card } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

export interface WeighProductModalProps {
  isOpen: boolean
  product: Product | null
  scaleWeight: number
  onClose: () => void
  onConfirm: (product: Product, weightKg: number) => void
}

/**
 * Modal dialog for produce weighing:
 * - Direct kilogram input.
 * - Live scale acquisition button when Toledo scale has registered weight.
 * - Rapid preset buttons (250g, 500g, 1kg, 2kg).
 * - Real-time monetary subtotal calculation preview.
 */
export const WeighProductModal: React.FC<WeighProductModalProps> = ({
  isOpen,
  product,
  scaleWeight,
  onClose,
  onConfirm,
}) => {
  const [modalWeight, setModalWeight] = useState<string>('0.500')

  useEffect(() => {
    if (isOpen) {
      setModalWeight(scaleWeight > 0 ? scaleWeight.toFixed(3) : '0.500')
    }
  }, [isOpen, scaleWeight])

  if (!product) return null

  const weightKg = parseFloat(modalWeight) || 0

  const handleConfirm = () => {
    if (weightKg <= 0) return
    onConfirm(product, weightKg)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pesar: ${product.name}`}
      subtitle={`PLU ${product.pluCode} · Precio: ${formatCurrency(product.sellPrice)} / kg`}
      maxWidth="md"
    >
      <div className="flex flex-col gap-4">
        <Card
          padding="md"
          className="bg-surface-container-low border-primary/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <div>
              <span className="text-xs uppercase font-bold text-on-surface tracking-wider">
                Balanza Digital
              </span>
              <p className="text-xs text-outline">Ingrese el peso en kilogramos</p>
            </div>
          </div>
          <span className="font-mono text-2xl font-bold text-primary">
            {modalWeight} kg
          </span>
        </Card>

        <Input
          type="number"
          step="0.005"
          autoFocus
          label="KILOGRAMOS (KG):"
          value={modalWeight}
          onChange={(e) => setModalWeight(e.target.value)}
          className="h-12 text-right font-mono text-lg font-bold border-2 border-primary/50 focus:border-primary"
        />

        {/* Live scale button if scale has weight */}
        {scaleWeight > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalWeight(scaleWeight.toFixed(3))}
            leftIcon={<Scale className="w-4 h-4 text-primary" />}
            className="w-full text-xs font-bold border-primary/30 text-on-surface"
          >
            Usar peso de balanza en vivo ({scaleWeight.toFixed(3)} kg)
          </Button>
        )}

        {/* Quick preset weight buttons */}
        <div className="grid grid-cols-4 gap-2">
          {['0.250', '0.500', '1.000', '2.000'].map((w) => (
            <Button
              key={w}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalWeight(w)}
              className="py-1.5 font-mono text-xs font-bold"
            >
              {w} kg
            </Button>
          ))}
        </div>

        {/* Subtotal preview */}
        <Card
          padding="sm"
          className="flex items-center justify-between bg-surface-container-low text-sm"
        >
          <span className="text-outline font-medium">Subtotal a sumar:</span>
          <span className="font-mono font-bold text-primary text-base">
            {formatCurrency(weightKg * product.sellPrice)}
          </span>
        </Card>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            className="flex-1 text-xs font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={weightKg <= 0}
            className="flex-1 text-xs font-bold shadow-xs"
          >
            Confirmar y Sumar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
