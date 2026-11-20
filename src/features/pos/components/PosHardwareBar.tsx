import React from 'react'
import { ScanBarcode, Scale, CheckCircle2 } from 'lucide-react'

export interface PosHardwareBarProps {
  barcodeInputRef: React.RefObject<HTMLInputElement | null>
  scaleWeight: number
  scannerNotification: string | null
  onTare: () => void
  onBarcodeSubmit: (e: React.FormEvent) => void
}

/**
 * Hardware status bar for the POS:
 * - Uncontrolled barcode input for high-speed laser reader (RF-01.4).
 * - Live digital scale weight display with tare shortcut button (RF-05.3).
 * - Ephemeral non-obtrusive scanner notifications (RF-05.6).
 */
export const PosHardwareBar: React.FC<PosHardwareBarProps> = ({
  barcodeInputRef,
  scaleWeight,
  scannerNotification,
  onTare,
  onBarcodeSubmit,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Hardware state + Barcode reader input row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Barcode scanner input box */}
        <form onSubmit={onBarcodeSubmit} className="md:col-span-7 relative flex items-center">
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
            onClick={onTare}
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
    </div>
  )
}
