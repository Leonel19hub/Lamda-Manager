import React, { useState, useEffect } from 'react'
import { Scale } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
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
        <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-slate-200 text-sm">
          <span className="text-outline font-medium">Subtotal a sumar:</span>
          <span className="font-mono font-bold text-emerald-700 text-base">
            {formatCurrency(weightKg * product.sellPrice)}
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={weightKg <= 0}
            className="flex-1 py-2.5 bg-primary-container hover:bg-emerald-600 text-on-primary-container hover:text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
          >
            Confirmar y Sumar
          </button>
        </div>
      </div>
    </Modal>
  )
}
