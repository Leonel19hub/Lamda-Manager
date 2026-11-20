import React from 'react'
import { ScanBarcode, Scale } from 'lucide-react'
import { Input, Button, Badge, AlertBanner, Card } from '@/components/ui'

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
        {/* Barcode scanner input box (uncontrolled ref) */}
        <form onSubmit={onBarcodeSubmit} className="md:col-span-7">
          <Input
            ref={barcodeInputRef}
            type="text"
            placeholder="Escanear código de barras (EAN-13) o PLU..."
            leftIcon={<ScanBarcode className="w-5 h-5 text-primary" />}
            rightElement={
              <Badge variant="success" dot size="sm" className="bg-surface-container-low">
                Lector USB
              </Badge>
            }
            className="h-12 border-2 border-primary/60 focus:border-primary pr-32 font-medium"
          />
        </form>

        {/* Digital Scale Status Badge with Tare */}
        <Card
          padding="none"
          className="md:col-span-5 flex items-center justify-between h-12 px-3 bg-surface-container-low"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Scale className="w-5 h-5 text-primary shrink-0" />
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTare}
            className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider bg-surface-container-highest hover:bg-surface-container border-slate-300"
          >
            Tara [F7]
          </Button>
        </Card>
      </div>

      {/* Notification banner for scanner */}
      {scannerNotification && (
        <AlertBanner variant="success" className="py-2 animate-in fade-in">
          <span className="font-semibold">{scannerNotification}</span>
        </AlertBanner>
      )}
    </div>
  )
}
