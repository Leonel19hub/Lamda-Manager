import type { UserRole } from '@/types'

export function canAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    EMPLEADO: 1,
    GERENTE: 2,
    DUEÑO: 3,
  }
  return hierarchy[userRole] >= hierarchy[requiredRole]
}
