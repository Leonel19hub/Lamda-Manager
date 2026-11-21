# MEMORY.md — Persistent Project Memory
<!-- Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. -->

## Estado actual
- **Fase:** SPEC-003 (Design System Mínimo y Primitivas UI) — **COMPLETADA AL 100% (T-01 a T-09)**:
  - **Catálogo Core (`src/components/ui/`):** `Button`, `Badge`, `AlertBanner`, `Card`, `EmptyState`, `Input`, `Select`, `Modal` (accesible con `role="dialog"` y `aria-modal="true"`) exportados desde barrel `index.ts`.
  - **Tokens Semánticos:** `@theme` en `src/index.css` normalizado con tokens MD3, incorporando familia `--color-warning*`.
  - **React 19 & a11y:** Primitivas de formulario (`Input`, `Button`, `Select`) con `ComponentPropsWithRef` y enlace de accesibilidad vía `useId()`.
  - **Adopción Piloto en POS:** 8 subcomponentes de `pos/` migrados exitosamente, preservando `React.memo` en tarjetas e input no controlado en escáner USB.
- **Suite Vitest:** 13 archivos de prueba, **226 pruebas unitarias pasando al 100%**.
- **Cobertura de Código:** **100% en Líneas, Funciones, Branches y Sentencias** en `domain/` y `lib/`.
- **Gate de Verificación:** `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` 100% verde con 0 errores y 0 advertencias.

## Decisiones (y por qué)
- **ADR-1 (Design System Mínimo):** 7 primitivas esenciales + Modal cubren >85% de la UI transaccional sin sobreingeniería.
- **ADR-2 (Cero Bloat en UI):** Sin `cva` ni librerías headless; variantes puras tipadas (`variants.ts`) y `cn()` nativo.
- **ADR-3 (Tokens MD3):** Erradicado el uso de paleta cruda (`emerald-*`, `red-*`) en favor de tokens semánticos del tema.
- **ADR-4 (React 19 Refs):** Pasaje transparente de `ref` para periféricos de mostrador (lectores de código de barras USB).
- **ADR-5 (Application Service POS):** `executePosCheckout` coordina inventario, fiado y caja con reversión atómica ante fallos.
- **ADR-6 (Ley 25.954):** Redondeo a $10 exclusivo para efectivo; pagos digitales liquidan centavos exactos.
- **Optimización de Hardware:** `ProductCard` y `CartItemRow` con `React.memo` garantizando 60 FPS en PCs Celeron/i3.

## Aprendizajes y errores a evitar
- **Tipado estricto con `verbatimModuleSyntax`:** Importar tipos de Lucide siempre con `import type { LucideIcon }`.
- **Lógica de `ref` en React 19:** `ComponentPropsWithRef` permite recibir `ref` como prop estándar sin `forwardRef`.

## Próximos pasos
1. Iniciar **SPEC-004: Modularización y Refactor de Inventario (`InventoryView.tsx`)** utilizando el catálogo de `src/components/ui/`.
