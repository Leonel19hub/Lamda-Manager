import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/layouts/AppLayout'
import { PosView } from '@/features/pos'
import { DashboardView } from '@/features/dashboard'
import { InventoryView } from '@/features/inventory'
import { CustomersView } from '@/features/customers'
import { PurchasesView } from '@/features/purchases'
import { CashRegisterView, canAccess } from '@/features/cash-register'
import { AttendanceView } from '@/features/attendance'
import { useAppStore } from '@/stores/useAppStore'
import type { UserRole } from '@/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
})

// Role guard wrapper
const ProtectedRoute: React.FC<{
  minRole: UserRole
  children: React.ReactNode
}> = ({ minRole, children }) => {
  const { currentRole } = useAppStore()
  if (!canAccess(currentRole, minRole)) {
    return <Navigate to="/pos" replace />
  }
  return <>{children}</>
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/pos" replace />} />
            
            {/* POS: accessible by all (Empleado, Gerente, Dueño) */}
            <Route path="pos" element={<PosView />} />

            {/* Dashboard: requires Dueño */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute minRole="DUEÑO">
                  <DashboardView />
                </ProtectedRoute>
              }
            />

            {/* Inventory: requires Gerente */}
            <Route
              path="inventory"
              element={
                <ProtectedRoute minRole="GERENTE">
                  <InventoryView />
                </ProtectedRoute>
              }
            />

            {/* Customers / Fiado: accessible by Empleado (cobro) and above */}
            <Route path="customers" element={<CustomersView />} />

            {/* Purchases / Suppliers: requires Gerente */}
            <Route
              path="purchases"
              element={
                <ProtectedRoute minRole="GERENTE">
                  <PurchasesView />
                </ProtectedRoute>
              }
            />

            {/* Cash register: accessible by Empleado */}
            <Route path="cash-register" element={<CashRegisterView />} />

            {/* Attendance clock-in kiosk: accessible by Empleado */}
            <Route path="attendance" element={<AttendanceView />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
