import { useCallback, type RefObject } from 'react'
import type { Product, CartItem } from '@/types'
import { parseScaleBarcode } from '../domain/validators'
import { createCartItem } from '../domain/calculations'

export interface PosBarcodeHandlerProps {
  catalogProducts: readonly Product[]
  barcodeInputRef: RefObject<HTMLInputElement | null>
  onAddItem: (item: CartItem) => void
  onWeighRequired: (product: Product) => void
  onNotify: (message: string) => void
}

/**
 * Handles barcode resolution from hardware USB scanners or manual code inputs:
 * 1. Resolves prefix 20 scale barcodes (PLU + Weight).
 * 2. Matches exact barcode, PLU, or SKU in the product catalog.
 * 3. Triggers weigh modal for produce or directly appends unit items to cart.
 *
 * Conforms to RF-01.1 to RF-01.3.
 */
export function usePosBarcodeHandler({
  catalogProducts,
  barcodeInputRef,
  onAddItem,
  onWeighRequired,
  onNotify,
}: PosBarcodeHandlerProps) {
  const handleBarcodeSubmit = useCallback(
    (codeToScan?: string) => {
      const code = (codeToScan ?? barcodeInputRef.current?.value ?? '').trim()
      if (!code) return

      // Always clear the uncontrolled scanner input immediately for continuous scanning
      if (barcodeInputRef.current) {
        barcodeInputRef.current.value = ''
      }

      // 1. Check if it's a grocery scale barcode (20 + PLU + Weight + C) (RF-01.1)
      const scaleRes = parseScaleBarcode(code)
      if (scaleRes.success) {
        const foundWeighed = catalogProducts.find((p) => p.pluCode === scaleRes.data.plu)
        if (foundWeighed) {
          const item = createCartItem(foundWeighed, scaleRes.data.weight)
          onAddItem(item)
          onNotify(`+ ${scaleRes.data.weight} kg ${foundWeighed.name}`)
          return
        }
        // PLU not found in catalog (QA definition #3)
        onNotify(`PLU no encontrado: ${scaleRes.data.plu}`)
        return
      }

      // 2. Exact match by barcode, PLU, or SKU (RF-01.2, RF-01.3)
      const found = catalogProducts.find(
        (p) => p.barcode === code || p.pluCode === code || p.sku === code
      )

      if (found) {
        if (found.saleType === 'weight') {
          onWeighRequired(found)
        } else {
          const item = createCartItem(found, 1)
          onAddItem(item)
          onNotify(`+ 1x ${found.name}`)
        }
      } else {
        onNotify(`No encontrado: ${code}`)
      }
    },
    [catalogProducts, barcodeInputRef, onAddItem, onWeighRequired, onNotify]
  )

  return { handleBarcodeSubmit }
}
