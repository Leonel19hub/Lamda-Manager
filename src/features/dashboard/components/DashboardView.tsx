import React from 'react'
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Boxes,
  BookOpen,
  ArrowUpRight
} from 'lucide-react'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { mockProducts } from '@/mock/mockData'
import { useAppStore } from '@/stores/useAppStore'

export const DashboardView: React.FC = () => {
  const { activeBranch } = useAppStore()

  const hourlyData = [
    { hour: '08:00', amount: 18500, height: 28 },
    { hour: '09:00', amount: 34200, height: 45 },
    { hour: '10:00', amount: 58900, height: 75 },
    { hour: '11:00', amount: 82400, height: 100 },
    { hour: '12:00', amount: 64100, height: 80 },
    { hour: '13:00', amount: 29800, height: 38 },
    { hour: '14:00', amount: 15400, height: 22 },
    { hour: '15:00', amount: 22100, height: 32 },
    { hour: '16:00', amount: 48300, height: 62 },
    { hour: '17:00', amount: 73500, height: 92 },
    { hour: '18:00', amount: 69200, height: 86 },
    { hour: '19:00', amount: 51200, height: 68 },
  ]

  const categoryDistribution = [
    { name: 'Verdulería (Por Peso)', pct: 44, color: 'bg-emerald-500', amount: 153406 },
    { name: 'Almacén Seco', pct: 31, color: 'bg-blue-500', amount: 108081 },
    { name: 'Bebidas & Gaseosas', pct: 15, color: 'bg-purple-500', amount: 52297 },
    { name: 'Lácteos & Fiambrería', pct: 10, color: 'bg-amber-500', amount: 34865 },
  ]

  const lowStockItems = mockProducts.filter(
    (p) => (p.stock?.currentStock || 0) <= (p.stock?.minStock || 0)
  )

  const recentTickets = [
    { id: '#0004-000891', time: '11:38', items: '3 ítems', total: 6850, method: 'Efectivo', customer: 'Consumidor Final' },
    { id: '#0004-000890', time: '11:22', items: '5 ítems', total: 14200, method: 'QR Mercado Pago', customer: 'Silvia Fernández' },
    { id: '#0004-000889', time: '11:05', items: '2 ítems', total: 3950, method: 'Tarjeta Débito', customer: 'Consumidor Final' },
    { id: '#0004-000888', time: '10:48', items: '7 ítems', total: 22400, method: 'Fiado / Cta. Cte.', customer: 'Carlos Méndez' },
  ]

  return (
    <div className="p-6 flex flex-col gap-6">
      
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface text-balance">
            Panel Gerencial y Métricas del Negocio
          </h1>
          <p className="text-xs text-outline mt-0.5 text-pretty">
            Rendimiento en tiempo real · {activeBranch?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            Caja Activa: $ 85.200
          </span>
        </div>
      </header>

      {/* Top 5 KPI Cards Row - Semantic Definition List */}
      <section aria-label="Métricas clave de rendimiento">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Total Sales */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <dt className="flex items-center justify-between text-outline text-xs">
              <span className="uppercase font-bold text-[10px]">Ventas de Hoy</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </dt>
            <dd className="my-2">
              <span className="font-mono text-xl font-bold text-on-surface">
                $ 348.650
              </span>
            </dd>
            <dd className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              +14.2% vs ayer
            </dd>
          </div>

          {/* KPI 2: Ticket Average */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <dt className="flex items-center justify-between text-outline text-xs">
              <span className="uppercase font-bold text-[10px]">Ticket Promedio</span>
              <Receipt className="w-4 h-4 text-blue-600" aria-hidden="true" />
            </dt>
            <dd className="my-2">
              <span className="font-mono text-xl font-bold text-on-surface">
                $ 4.820
              </span>
            </dd>
            <dd className="text-[10px] text-outline font-mono">
              72 tickets emitidos hoy
            </dd>
          </div>

          {/* KPI 3: Mermas del Día */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <dt className="flex items-center justify-between text-outline text-xs">
              <span className="uppercase font-bold text-[10px]">Mermas / Pérdidas</span>
              <AlertTriangle className="w-4 h-4 text-red-600" aria-hidden="true" />
            </dt>
            <dd className="my-2">
              <span className="font-mono text-xl font-bold text-red-600">
                $ 12.450
              </span>
            </dd>
            <dd className="text-[10px] text-outline font-mono">
              3.2 kg verdura + 2 un.
            </dd>
          </div>

          {/* KPI 4: Low Stock */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <dt className="flex items-center justify-between text-outline text-xs">
              <span className="uppercase font-bold text-[10px]">Stock Crítico</span>
              <Boxes className="w-4 h-4 text-amber-600" aria-hidden="true" />
            </dt>
            <dd className="my-2">
              <span className="font-mono text-xl font-bold text-amber-700">
                {lowStockItems.length} productos
              </span>
            </dd>
            <dd className="text-[10px] text-amber-800 font-semibold">
              Requiere reposición
            </dd>
          </div>

          {/* KPI 5: Fiado Activo */}
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <dt className="flex items-center justify-between text-outline text-xs">
              <span className="uppercase font-bold text-[10px]">Fiado en Calle</span>
              <BookOpen className="w-4 h-4 text-purple-600" aria-hidden="true" />
            </dt>
            <dd className="my-2">
              <span className="font-mono text-xl font-bold text-purple-800">
                $ 149.450
              </span>
            </dd>
            <dd className="text-[10px] text-outline">
              4 cuentas activas
            </dd>
          </div>

        </dl>
      </section>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Hourly Sales Bar Chart (8 cols) */}
        <section
          aria-labelledby="hourly-sales-title"
          className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 id="hourly-sales-title" className="font-bold text-sm text-on-surface text-balance">
                Curva de Facturación Horaria (Flujo de Clientes)
              </h3>
              <p className="text-xs text-outline text-pretty">Picos de venta en turno mañana y regreso vespertino</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
              Pico 11:00 hs: $ 82.400
            </span>
          </div>

          {/* Bar Chart Visual with Keyboard Navigation and A11y Attributes */}
          <div
            role="region"
            aria-label="Gráfico de facturación por hora"
            className="h-56 flex items-end justify-between gap-2 pt-6 px-2"
          >
            {hourlyData.map((d) => (
              <div
                key={d.hour}
                tabIndex={0}
                role="img"
                aria-label={`Ventas a las ${d.hour}: ${formatCurrency(d.amount)}`}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded p-0.5"
              >
                <span
                  aria-hidden="true"
                  className="text-[10px] font-mono text-outline opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity pointer-events-none"
                >
                  ${Math.round(d.amount / 1000)}k
                </span>
                <div
                  aria-hidden="true"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 group-focus-visible:bg-emerald-600 rounded-t transition-all shadow-2xs"
                  style={{ height: `${d.height}%` }}
                />
                <span aria-hidden="true" className="font-mono text-[10px] text-outline">{d.hour}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Category Breakdown (4 cols) */}
        <section
          aria-labelledby="category-breakdown-title"
          className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4"
        >
          <div className="pb-3 border-b border-slate-100">
            <h3 id="category-breakdown-title" className="font-bold text-sm text-on-surface text-balance">
              Distribución por Rubro
            </h3>
            <p className="text-xs text-outline text-pretty">Participación en la facturación total</p>
          </div>

          <div className="flex flex-col gap-3">
            {categoryDistribution.map((cat) => (
              <div key={cat.name} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-on-surface">{cat.name}</span>
                  <span className="font-mono font-bold">{cat.pct}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={cat.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Participación de ${cat.name}: ${cat.pct}%`}
                  className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
                >
                  <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                </div>
                <span className="font-mono text-[10px] text-outline text-right">
                  {formatCurrency(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Bottom Grid: Low Stock Warnings (6 cols) & Recent Tickets Feed (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Critical Stock Alerts */}
        <section
          aria-labelledby="low-stock-title"
          className="lg:col-span-6 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <h3 id="low-stock-title" className="font-bold text-xs uppercase tracking-wider text-outline">
                Alertas de Stock Bajo y Reposición
              </h3>
            </div>
          </div>

          <ul role="list" className="divide-y divide-slate-100 text-xs">
            {lowStockItems.map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="w-8 h-8 rounded object-cover border"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-on-surface">{p.name}</span>
                    <span className="text-[10px] text-outline">
                      Bulto: 1 {p.packName} = {p.unitsPerPack} {p.saleType === 'weight' ? 'kg' : 'un.'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-red-600">
                    {p.saleType === 'weight' ? formatWeight(p.stock?.currentStock || 0) : `${p.stock?.currentStock} un.`}
                  </span>
                  <span className="block text-[10px] text-outline">
                    Mínimo: {p.stock?.minStock}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent Tickets Feed */}
        <section
          aria-labelledby="recent-tickets-title"
          className="lg:col-span-6 bg-surface-container-lowest rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <h3 id="recent-tickets-title" className="font-bold text-xs uppercase tracking-wider text-outline">
                Últimos Tickets Emitidos
              </h3>
            </div>
          </div>

          <ul role="list" className="divide-y divide-slate-100 text-xs">
            {recentTickets.map((t) => (
              <li key={t.id} className="py-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-on-surface">{t.id}</span>
                    <span className="text-[10px] text-outline font-mono">({t.time} hs)</span>
                  </div>
                  <span className="text-[11px] text-outline">
                    {t.customer} · {t.items} · {t.method}
                  </span>
                </div>

                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatCurrency(t.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>

      </div>

    </div>
  )
}
