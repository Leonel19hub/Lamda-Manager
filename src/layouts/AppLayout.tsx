import React, { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Store,
  BarChart3,
  Boxes,
  Users,
  Truck,
  ShieldCheck,
  Clock,
  Scale,
  Keyboard,
  ChevronDown,
  CheckCircle2,
  UserCheck
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { canAccess } from '@/features/cash-register'
import type { UserRole } from '@/types'

export const AppLayout: React.FC = () => {
  const { currentRole, setRole, activeBranch, branches, setBranch, activeCashRegister } = useAppStore()
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false)
  const branchDropdownRef = useRef<HTMLDivElement>(null)
  const roleDropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(target)) {
        setBranchDropdownOpen(false)
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(target)) {
        setRoleDropdownOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBranchDropdownOpen(false)
        setRoleDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const navItems = [
    {
      to: '/pos',
      label: 'Punto de Venta',
      icon: Store,
      minRole: 'EMPLEADO' as UserRole,
    },
    {
      to: '/dashboard',
      label: 'Panel de Control',
      icon: BarChart3,
      minRole: 'DUEÑO' as UserRole,
    },
    {
      to: '/inventory',
      label: 'Productos e Inventario',
      icon: Boxes,
      minRole: 'GERENTE' as UserRole,
    },
    {
      to: '/customers',
      label: 'Clientes y Cuentas Ctes.',
      icon: Users,
      minRole: 'EMPLEADO' as UserRole,
    },
    {
      to: '/purchases',
      label: 'Proveedores y Compras',
      icon: Truck,
      minRole: 'GERENTE' as UserRole,
    },
    {
      to: '/cash-register',
      label: 'Caja y Roles',
      icon: ShieldCheck,
      minRole: 'EMPLEADO' as UserRole,
    },
    {
      to: '/attendance',
      label: 'Fichaje de Turnos',
      icon: Clock,
      minRole: 'EMPLEADO' as UserRole,
    },
  ]

  const roles: UserRole[] = ['EMPLEADO', 'GERENTE', 'DUEÑO']

  return (
    <div className="min-h-screen bg-surface flex">
      {/* ================= FIXED SIDEBAR ================= */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-inverse-surface text-inverse-on-surface z-50 flex flex-col justify-between shadow-lg">
        <div className="flex flex-col">
          {/* Logo & Brand Header */}
          <div className="h-16 px-4 flex items-center gap-3 bg-inverse-surface border-b border-slate-700/50">
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-black text-xl shadow-md">
              λ
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-surface truncate leading-none">
                Lambda Manager
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-variant truncate mt-1">
                Despensa & Verdulería
              </span>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="px-3 py-3">
            <div className="text-[10px] font-bold uppercase text-surface-variant tracking-wider px-2 mb-2">
              Operaciones & Gestión
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const allowed = canAccess(currentRole, item.minRole)
                const Icon = item.icon
                const isActive = location.pathname === item.to || (item.to === '/pos' && location.pathname === '/')

                if (!allowed) {
                  return (
                    <div
                      key={item.to}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 opacity-40 cursor-not-allowed select-none text-xs"
                      title={`Requiere rol ${item.minRole}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto text-[9px] uppercase tracking-wider bg-slate-800 px-1.5 py-0.5 rounded">
                        {item.minRole}
                      </span>
                    </div>
                  )
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                        : 'text-surface-variant hover:bg-slate-700/40 hover:text-surface'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Hardware Status / Scale COM1 */}
        <div className="p-3 bg-inverse-surface border-t border-slate-700/50">
          <div className="bg-slate-800/80 rounded-lg p-2.5 flex items-center justify-between border border-slate-700/40">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-surface-variant uppercase tracking-wider">
                Balanza Serial COM1
              </span>
              <span className="font-mono text-xs text-primary-fixed-dim font-bold flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                Online · 0.000 kg
              </span>
            </div>
            <Scale className="w-5 h-5 text-surface-variant" />
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="pl-64 w-full flex flex-col min-h-screen">
        {/* ================= FIXED HEADER ================= */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md z-40 border-b border-slate-200 shadow-xs">
          <div className="h-16 w-full px-6 flex items-center justify-between gap-4">
            
            {/* Left Header: Branch & Register info */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Branch Selector Pill */}
              <div ref={branchDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                  className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-surface-container transition-colors text-left"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  <span className="text-xs font-semibold text-on-surface truncate">
                    {activeBranch?.name || 'Sucursal Central'}
                  </span>
                  <span className="text-xs text-outline hidden xl:inline">
                    {activeBranch?.address ? `- ${activeBranch.address}` : ''}
                  </span>
                  {branches.length > 1 && (
                    <ChevronDown className="w-3.5 h-3.5 text-outline ml-1" />
                  )}
                </button>

                {branchDropdownOpen && branches.length > 1 && (
                  <div className="absolute left-0 mt-1 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-outline border-b border-slate-100">
                      Cambiar de Sucursal Activa
                    </div>
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBranch(b)
                          setBranchDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-container-low transition-colors ${
                          activeBranch?.id === b.id ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-on-surface'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{b.name}</span>
                          <span className="text-[10px] text-outline">{b.address}</span>
                        </div>
                        {activeBranch?.id === b.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cash Register Open Status Pill */}
              <div className="hidden sm:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-slate-200">
                <span className={`inline-block w-2 h-2 rounded-full ${activeCashRegister?.isOpen ? 'bg-primary' : 'bg-red-500'}`} />
                <span className="font-mono text-xs text-on-surface font-medium truncate">
                  {activeCashRegister?.isOpen
                    ? `Caja Abierta · ${activeCashRegister.shiftName || 'Turno Mañana'}`
                    : 'Caja Cerrada'}
                </span>
              </div>
            </div>

            {/* Right Header: Shortcuts Strip, Role Switcher & User Profile */}
            <div className="flex items-center gap-3">
              {/* Keyboard shortcuts strip */}
              <div className="hidden 2xl:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-slate-200">
                <Keyboard className="w-3.5 h-3.5 text-outline" />
                <span className="font-mono text-[11px] text-on-surface-variant font-medium">
                  <strong className="text-on-surface">F12:</strong> Cobrar | <strong className="text-on-surface">F2:</strong> Buscar PLU | <strong className="text-on-surface">F4:</strong> Balanza
                </span>
              </div>

              {/* Role Switcher Dropdown (Dev & testing tool) */}
              <div ref={roleDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Cambiar rol para probar permisos de interfaz"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Rol:</span>
                  <span className="text-xs font-bold">{currentRole}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-surface-container-lowest rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-outline border-b border-slate-100">
                      Alternar Nivel de Acceso
                    </div>
                    {roles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setRole(r)
                          setRoleDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-container-low transition-colors ${
                          currentRole === r ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-on-surface'
                        }`}
                      >
                        <span>{r}</span>
                        {currentRole === r && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Profile Pill */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex flex-col text-right hidden sm:flex">
                  <span className="text-xs font-semibold text-on-surface leading-tight">
                    María Gómez
                  </span>
                  <span className="text-[10px] text-outline leading-tight font-medium">
                    Encargada / Central
                  </span>
                </div>
                <img
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-xs"
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop"
                />
              </div>
            </div>

          </div>
        </header>

        {/* Content Outlet */}
        <main className="relative pt-16 flex-1 w-full bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
