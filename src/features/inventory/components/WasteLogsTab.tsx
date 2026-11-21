import React from 'react'
import { Trash2 } from 'lucide-react'
import { Card, Badge, EmptyState } from '@/components/ui'
import { useInventoryStore } from '@/stores/useInventoryStore'

export const WasteLogsTab: React.FC = () => {
  // Atomic selector: only re-renders when wasteLogs change
  const wasteLogs = useInventoryStore((state) => state.wasteLogs)

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-on-surface">Historial de Mermas y Pérdidas</h2>
          <p className="text-xs text-outline">
            Registro inmutable de bajas por descarte, vencimiento o rotura
          </p>
        </div>
      </div>

      {wasteLogs.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={Trash2}
            title="Sin mermas registradas"
            description="No se han reportado pérdidas, roturas ni descartes de mercadería en el sistema."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-surface-container-low/60 text-[11px] font-bold uppercase text-outline tracking-wider">
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4 text-right">Cantidad Descartada</th>
                <th className="py-3 px-4">Motivo / Causa</th>
                <th className="py-3 px-4">Observaciones</th>
                <th className="py-3 px-4">Registrado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wasteLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-outline">
                    {new Date(log.createdAt).toLocaleString('es-AR')}
                  </td>
                  <td className="py-3 px-4 font-bold text-on-surface">
                    {log.product?.name || `Producto #${log.productId}`}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-error">
                    -{log.quantity}{' '}
                    <span className="text-[10px] text-outline font-normal">
                      {log.product?.saleType === 'weight' ? 'kg' : 'un.'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="danger" size="sm">
                      {log.reason}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-outline">{log.notes || '—'}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {log.registeredByUser?.fullName || log.registeredBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
