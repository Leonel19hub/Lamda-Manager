import React from 'react'
import { Plus, ArrowRightLeft } from 'lucide-react'
import { Card, Button, Badge, AlertBanner, EmptyState } from '@/components/ui'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useAppStore } from '@/stores/useAppStore'
import { getAvailableDestinationBranches } from '../domain/stockRules'

export interface TransfersTabProps {
  onOpenNewTransfer: () => void
}

export const TransfersTab: React.FC<TransfersTabProps> = ({ onOpenNewTransfer }) => {
  // Atomic selectors
  const transfers = useInventoryStore((state) => state.transfers)
  const receiveTransfer = useInventoryStore((state) => state.receiveTransfer)
  const branches = useAppStore((state) => state.branches)
  const activeBranch = useAppStore((state) => state.activeBranch)
  const currentUser = useAppStore((state) => state.currentUser)

  const availableDestinations = getAvailableDestinationBranches(branches, activeBranch?.id)
  const canTransfer = availableDestinations.length > 0

  return (
    <div className="flex flex-col gap-4">
      {!canTransfer && (
        <AlertBanner variant="info" title="Traslados no disponibles">
          Se requieren al menos 2 sucursales configuradas en el sistema para realizar traslados.
        </AlertBanner>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Remitos y Traslados de Mercadería</h2>
            <p className="text-xs text-outline">
              Seguimiento de envíos y recepción de existencias entre sucursales
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenNewTransfer}
            disabled={!canTransfer}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Nuevo Traslado
          </Button>
        </div>

        {transfers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={ArrowRightLeft}
              title="No hay traslados registrados"
              description="Aún no se han emitido remitos de transferencia entre sucursales."
              action={
                canTransfer ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenNewTransfer}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Crear Primer Traslado
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                  <th className="py-3 px-4">Nº Remito</th>
                  <th className="py-3 px-4">Fecha de Envío</th>
                  <th className="py-3 px-4">Origen ➔ Destino</th>
                  <th className="py-3 px-4">Producto y Cantidad</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Acción de Recepción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((trf) => {
                  const fromName =
                    branches.find((b) => b.id === trf.fromBranchId)?.name || 'Sucursal Origen'
                  const toName =
                    branches.find((b) => b.id === trf.toBranchId)?.name || 'Sucursal Destino'
                  const isReceived = trf.status === 'received'

                  return (
                    <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {trf.transferNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-outline">
                        {new Date(trf.createdAt).toLocaleDateString('es-AR')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {fromName} ➔ <strong className="text-on-surface">{toName}</strong>
                      </td>
                      <td className="py-3 px-4">
                        {trf.items?.map((item) => (
                          <span key={item.id} className="block font-semibold text-on-surface">
                            {item.product?.name || `Producto #${item.productId}`} (
                            {item.quantitySent} {item.product?.saleType === 'weight' ? 'kg' : 'un.'}
                            )
                          </span>
                        ))}
                      </td>
                      <td className="py-3 px-4">
                        {isReceived ? (
                          <Badge variant="success" size="sm" dot>
                            Recibido
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" dot>
                            En Tránsito
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isReceived ? (
                          <span className="text-[10px] text-outline font-medium">
                            Ingresado a stock
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              receiveTransfer(
                                trf.id,
                                currentUser?.fullName || 'Encargado de Destino'
                              )
                            }}
                          >
                            Confirmar Recepción
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
