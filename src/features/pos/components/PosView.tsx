import React, { useState, useRef, useCallback } from 'react'
import { usePosStore } from '@/stores/usePosStore'
import { useAppStore } from '@/stores/useAppStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useCustomerStore } from '@/stores/useCustomerStore'
import { executePosCheckout } from '../application/checkoutService'
import { createCartItem } from '../domain/calculations'
import {
  useTimedNotice,
  usePosScannerFocus,
  usePosHotkeys,
  usePosBarcodeHandler,
} from '../hooks'
import { PosHardwareBar } from './PosHardwareBar'
import { ProductCatalogPanel } from './ProductCatalogPanel'
import { CartTicketPanel } from './CartTicketPanel'
import { CheckoutPanel } from './CheckoutPanel'
import { WeighProductModal } from './WeighProductModal'
import { CustomerSelectModal } from './CustomerSelectModal'
import { Card } from '@/components/ui'
import type { Product, Customer } from '@/types'

/**
 * Main POS View container:
 * Pure layout orchestrator coordinating catalog, hardware, ticket, and transactional checkout.
 * Reduced from 1,025 lines to ~140 lines in accordance with SDD ADR-1 to ADR-4.
 */
export const PosView: React.FC = () => {
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [weighModalOpen, setWeighModalOpen] = useState(false)
  const [activeWeighProduct, setActiveWeighProduct] = useState<Product | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [scaleWeight, setScaleWeight] = useState(0.0)

  const isModalOpen = weighModalOpen || customerModalOpen

  const { activeCashRegister, currentUser, activeBranch } = useAppStore()
  const catalogProducts = useInventoryStore((s) => s.products)
  const customers = useCustomerStore((s) => s.customers)

  const addItem = usePosStore((s) => s.addItem)
  const removeItem = usePosStore((s) => s.removeItem)
  const updateItemQuantity = usePosStore((s) => s.updateItemQuantity)
  const clearCart = usePosStore((s) => s.clearCart)
  const setCustomer = usePosStore((s) => s.setCustomer)
  const setSearchQuery = usePosStore((s) => s.setSearchQuery)

  const scannerNotice = useTimedNotice(2000)
  const checkoutNotice = useTimedNotice(4000)
  const successNotice = useTimedNotice(1800)

  usePosScannerFocus(barcodeInputRef, isModalOpen)

  const handleTare = useCallback(() => setScaleWeight(0.0), [])

  const handleOpenWeighModal = useCallback((product: Product) => {
    setActiveWeighProduct(product)
    setWeighModalOpen(true)
  }, [])

  const handleCloseWeighModal = useCallback(() => {
    setWeighModalOpen(false)
    setActiveWeighProduct(null)
  }, [])

  const handleConfirmWeigh = useCallback(
    (product: Product, kg: number) => {
      addItem(createCartItem(product, kg))
      scannerNotice.show(`+ ${kg} kg ${product.name}`)
    },
    [addItem, scannerNotice]
  )

  const handleAddUnit = useCallback(
    (product: Product) => {
      addItem(createCartItem(product, 1))
      scannerNotice.show(`+ 1x ${product.name}`)
    },
    [addItem, scannerNotice]
  )

  const { handleBarcodeSubmit } = usePosBarcodeHandler({
    catalogProducts,
    barcodeInputRef,
    onAddItem: addItem,
    onWeighRequired: handleOpenWeighModal,
    onNotify: scannerNotice.show,
  })

  const handleBarcodeFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      handleBarcodeSubmit()
    },
    [handleBarcodeSubmit]
  )

  const handleCheckout = useCallback(() => {
    checkoutNotice.clear()
    const result = executePosCheckout({
      cashierId: currentUser?.id || 'user-01',
      cashierName: currentUser?.fullName || 'Cajero Principal',
      cashierRole: currentUser?.role || 'EMPLEADO',
      activeRegister: activeCashRegister,
      activeBranch,
      warehouseId: activeBranch?.id,
      warehouseName: activeBranch?.name || 'Sucursal Central',
    })

    if (!result.success) {
      checkoutNotice.show(result.error.message)
      return
    }

    successNotice.show('¡Cobro exitoso!')
  }, [currentUser, activeCashRegister, activeBranch, checkoutNotice, successNotice])

  usePosHotkeys({
    onCheckout: handleCheckout,
    onFocusSearch: () => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    },
    onTareScale: handleTare,
    onEscape: () => {
      if (weighModalOpen) handleCloseWeighModal()
      else if (customerModalOpen) setCustomerModalOpen(false)
      else {
        setSearchQuery('')
        barcodeInputRef.current?.focus()
      }
    },
    isModalOpen,
  })

  const handleSelectCustomer = useCallback(
    (customer: Customer | null) => setCustomer(customer),
    [setCustomer]
  )

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Hardware Bar & Catalog */}
        <div className="xl:col-span-8">
          <ProductCatalogPanel
            searchInputRef={searchInputRef}
            onAddUnit={handleAddUnit}
            onWeigh={handleOpenWeighModal}
            headerControl={
              <PosHardwareBar
                barcodeInputRef={barcodeInputRef}
                scaleWeight={scaleWeight}
                scannerNotification={scannerNotice.notice}
                onTare={handleTare}
                onBarcodeSubmit={handleBarcodeFormSubmit}
              />
            }
          />
        </div>

        {/* Right Panel: Current Ticket & Checkout */}
        <div className="xl:col-span-4 flex flex-col gap-4 sticky top-20">
          <Card padding="md" className="shadow-md flex flex-col">
            <CartTicketPanel
              onOpenCustomerModal={() => setCustomerModalOpen(true)}
              onUpdateQuantity={updateItemQuantity}
              onRemoveItem={removeItem}
            />
            <CheckoutPanel
              isRegisterOpen={Boolean(activeCashRegister?.isOpen)}
              checkoutSuccess={Boolean(successNotice.notice)}
              checkoutError={checkoutNotice.notice}
              onCheckout={handleCheckout}
              onClearCart={clearCart}
            />
          </Card>
        </div>
      </div>

      {/* Modals */}
      <WeighProductModal
        isOpen={weighModalOpen}
        product={activeWeighProduct}
        scaleWeight={scaleWeight}
        onClose={handleCloseWeighModal}
        onConfirm={handleConfirmWeigh}
      />
      <CustomerSelectModal
        isOpen={customerModalOpen}
        customers={customers}
        onClose={() => setCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />
    </div>
  )
}
