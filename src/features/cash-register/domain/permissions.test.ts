import { describe, it, expect } from 'vitest'
import { canAccess } from './permissions'

describe('cash-register/domain/permissions', () => {
  describe('canAccess', () => {
    it('allows DUEÑO to access any role level', () => {
      expect(canAccess('DUEÑO', 'DUEÑO')).toBe(true)
      expect(canAccess('DUEÑO', 'GERENTE')).toBe(true)
      expect(canAccess('DUEÑO', 'EMPLEADO')).toBe(true)
    })

    it('allows GERENTE to access GERENTE and EMPLEADO, but not DUEÑO', () => {
      expect(canAccess('GERENTE', 'EMPLEADO')).toBe(true)
      expect(canAccess('GERENTE', 'GERENTE')).toBe(true)
      expect(canAccess('GERENTE', 'DUEÑO')).toBe(false)
    })

    it('allows EMPLEADO to access only EMPLEADO', () => {
      expect(canAccess('EMPLEADO', 'EMPLEADO')).toBe(true)
      expect(canAccess('EMPLEADO', 'GERENTE')).toBe(false)
      expect(canAccess('EMPLEADO', 'DUEÑO')).toBe(false)
    })
  })
})
