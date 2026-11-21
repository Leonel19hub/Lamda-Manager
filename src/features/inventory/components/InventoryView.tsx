import React, { useState } from 'react'
import { Plus, ArrowRightLeft, Boxes, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAppStore } from '@/stores/useAppStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { getAvailableDestinationBranches } from '../domain/stockRules'
import { ProductCatalogTab } from './ProductCatalogTab'
import { WasteLogsTab } from './WasteLogsTab'
import { TransfersTab } from './TransfersTab'
import { ProductFormModal } from './ProductFormModal'
import { WasteModal } from './WasteModal'
import { TransferModal } from './TransferModal'
import type { Product } from '@/types'

type InventoryTab = 'products' | 'waste' | 'transfers'

export const InventoryView: React.FC = () => {
  const activeBranch = useAppStore((state) => state.activeBranch)
  const branches = useAppStore((state) => state.branches)
  const currentUser = useAppStore((state) => state.currentUser)

  const productsCount = useInventoryStore((state) => state.products.length)
  const wasteLogsCount = useInventoryStore((state) => state.wasteLogs.length)
  const transfersCount = useInventoryStore((state) => state.transfers.length)

  // Navigation tab
  const [activeTab, setActiveTab] = useState<InventoryTab>('products')

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [mermaModalOpen, setMermaModalOpen] = useState(false)
  const [selectedProductForMerma, setSelectedProductForMerma] = useState<Product | null>(null)

  const [transferModalOpen, setTransferModalOpen] = useState(false)

  const canTransfer = getAvailableDestinationBranches(branches, activeBranch?.id).length > 0

  const handleOpenNewProduct = () => {
    setEditingProduct(null)
    setProductModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductModalOpen(true)
  }

  const handleOpenMerma = (product: Product) => {
    setSelectedProductForMerma(product)
    setMermaModalOpen(true)
  }

  const handleOpenNewTransfer = () => {
    setTransferModalOpen(true)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Gestión de Productos e Inventario</h1>
          <p className="text-xs text-outline mt-0.5">
            Catálogo con stock decimal, control de mermas, traslados entre sucursales y bultos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canTransfer && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleOpenNewTransfer}
              leftIcon={<ArrowRightLeft className="w-4 h-4 text-primary" />}
            >
              Traslado entre Sucursales
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleOpenNewProduct}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Catálogo de Productos ({productsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('waste')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'waste'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Historial de Mermas ({wasteLogsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'transfers'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Remitos y Traslados ({transfersCount})</span>
        </button>
      </div>

      {/* ================= TAB 1: PRODUCT CATALOG ================= */}
      {activeTab === 'products' && (
        <ProductCatalogTab
          onEditProduct={handleEditProduct}
          onOpenMerma={handleOpenMerma}
        />
      )}

      {/* ================= TAB 2: WASTE LOGS (MERMAS) ================= */}
      {activeTab === 'waste' && <WasteLogsTab />}

      {/* ================= TAB 3: INTER-BRANCH TRANSFERS ================= */}
      {activeTab === 'transfers' && (
        <TransfersTab onOpenNewTransfer={handleOpenNewTransfer} />
      )}

      {/* Modals */}
      <ProductFormModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        initialProduct={editingProduct}
        activeBranchId={activeBranch?.id}
      />

      <WasteModal
        isOpen={mermaModalOpen}
        onClose={() => setMermaModalOpen(false)}
        product={selectedProductForMerma}
        activeBranchId={activeBranch?.id}
        registeredBy={currentUser?.fullName}
      />

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        activeBranchId={activeBranch?.id}
        createdBy={currentUser?.fullName}
      />
    </div>
  )
}
