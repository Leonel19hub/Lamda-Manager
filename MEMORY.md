# MEMORY.md — Persistent Project Memory
<!-- Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. -->

## Estado actual
- Fase: SPEC-001 (Arquitectura Base) **100% COMPLETADA** (Tareas T-01 a T-15 cerradas):
  - Fase 1: Contratos `Result<T, E>`, saneamiento de `src/lib/utils.ts` y persistencia `SafeStorage`.
  - Fase 2: Lógica pura TDD en los 6 dominios de negocio (POS, Caja, Inventario, Compras, Clientes, Asistencia).
  - Fase 3: Anatomía modular estandarizada (`components/`, `domain/`, `index.ts`), stores y vistas desacopladas.
  - Fase 4: Barreras estáticas (`noImplicitAny`, `@typescript-eslint/no-explicit-any: error`, restricción de imports en `domain/`), y umbral de cobertura 100% en Vitest.
- **Correcciones UI:**
  - `PosView`: Autofoco condicional en lector de código de barras (no secuestra foco en inputs interactivos; soporte de F2 y Escape).
  - `AppLayout`: Cierre automático de dropdowns de Sucursal y Rol al hacer click fuera o presionar Escape.
- **Suite Vitest:** 11 archivos de prueba, **113 pruebas unitarias pasando al 100%**.
- **Cobertura de Código:** **100% en Líneas, Funciones, Branches y Sentencias** en `domain/` y `lib/`.
- **Gate de Verificación:** `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` 100% verde con 0 advertencias y 0 errores.

## Decisiones (y por qué)
- **Core Isolation Estricto:** Restricción estática en ESLint impidiendo que `domain/` importe React, Zustand o componentes UI.
- **Barrera Modular por Barriles Públicos:** Imports inter-feature prohibidos por deep path; exclusivamente a través de `@/features/<dominio>`.
- **Persistencia Tolerante a Fallos:** `SafeStorage` crea respaldos de auditoría ante JSON corrupto (`backup_corrupt_<key>_<ts>`) y retorna fallbacks sin crashear.
- **Minimal Stack (Zero-Dependencies):** Sin librerías externas de validación (no Zod); type guards y Result pattern nativo en TypeScript.

## Aprendizajes y errores a evitar
- **Cobertura exhaustiva de ramas:** Validar casos de valores negativos o no numéricos antes de entrar al cálculo evita fallas silenciosas en producción y garantiza el 100% de cobertura en ramas.

## Próximos pasos
1. La arquitectura base está consolidada y certificada.
2. Proceder con el desarrollo de la siguiente especificación de negocio formal (ej. SPEC-002: Gestión de Caja y Arqueo o SPEC-003: Punto de Venta y Balanzas).
