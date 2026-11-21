# MEMORY.md — Persistent Project Memory
<!-- Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. -->

## Estado actual
- **Fase:** SPEC-004 (Modularización y Refactor de Inventario) — **COMPLETADA AL 100% (T-01 a T-10)**:
  - **Descomposición Modular (`src/features/inventory/components/`):** `InventoryView` reducido de 1.197 a 177 líneas.
  - **Pestañas y Rendimiento:** `ProductCatalogTab`, `ProductTableRow` (con `React.memo`), `WasteLogsTab` y `TransfersTab` con selectores atómicos de Zustand y `useMemo`.
  - **Modales Aislados:** `ProductFormModal`, `WasteModal` y `TransferModal` encapsulando sus estados y reseteo reactivo.
  - **Core Isolation (`domain/stockRules.ts`):** `filterProducts`, `countCriticalProducts`, `getAvailableDestinationBranches` y `getDefaultCategoryId` 100% testeadas. Erradicado `mockCategories`.
  - **Store Inviolability:** `useInventoryStore.addProduct` vincula `stock.productId` con el ID real del producto.
- **Suite Vitest:** 13 archivos de prueba, **245 pruebas unitarias pasando al 100%**.
- **Cobertura de Código:** **100% en Líneas, Funciones, Branches y Sentencias** en `domain/` y `lib/`.
- **Gate de Verificación:** `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` 100% verde con 0 errores y 0 advertencias.

## Decisiones (y por qué)
- **ADR-1 (Design System Mínimo):** Primitivas de `src/components/ui/` adoptadas en POS e Inventario.
- **ADR-2 (Cero Bloat en UI):** Sin `cva` ni librerías headless; variantes puras tipadas y `cn()` nativo.
- **ADR-3 (Tokens MD3):** Erradicado uso de colores crudos; uso de tokens semánticos del tema.
- **ADR-4 (React 19 Refs):** Pasaje transparente de `ref` para lectores de código de barras USB.
- **ADR-5 (Estado Aislado en Modales):** Elimina ~27 `useState` del orquestador, cortando re-renders en catálogo.
- **ADR-6 (Selectores Atómicos en Zustand):** Cada tab suscripta únicamente a su slice (`products`, `wasteLogs`, `transfers`).
- **ADR-7 (Paridad y Advertencia en Stock):** Stock editable en ficha de producto con helperText aclaratorio de recuento físico.

## Aprendizajes y errores a evitar
- **Prop `icon` en `EmptyState`:** Pasa la referencia del componente Lucide (`icon={Package}`), no el elemento JSX.
- **`verbatimModuleSyntax`:** Importar tipos de Lucide siempre con `import type { LucideIcon }`.

## Próximos pasos
1. Iniciar refactor modular de la siguiente vista monolítica (`CashRegisterView.tsx` o `PurchasesView.tsx`).
