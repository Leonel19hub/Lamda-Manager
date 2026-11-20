# MEMORY.md — Persistent Project Memory
<!-- Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. -->

## Estado actual
- **Fase:** SPEC-002 (Refactor POS y Orquestación) — **COMPLETADA AL 100% (Fases 1, 2, 3 y 4 / T-01 a T-09)**:
  - **Fase 1 (Dominio Puro):** Imputación de caja (`applySaleToRegister`), cálculo de splits (`calculateSplitDefaults`), redondeo a $10 solo efectivo (`calculateCheckoutTotal`), validación de fiado mixto (`isCustomerOverCreditLimit`) y normalización canónica de `PaymentMethod`.
  - **Fase 2 (Aplicación y Hooks):** Application Service transaccional `executePosCheckout` con snapshots y rollback atómico ante fallos; 4 custom hooks (`useTimedNotice`, `usePosScannerFocus`, `usePosHotkeys`, `usePosBarcodeHandler`).
  - **Fase 3 (Subcomponentes):** `PosHardwareBar` (input no controlado y balanza), `ProductCard` (`React.memo`), `ProductCatalogPanel`, `CartItemRow` (`React.memo`), `CartTicketPanel`, `CheckoutPanel`, `WeighProductModal`, `CustomerSelectModal` y reducción de `PosView.tsx` a ~198 líneas orquestadoras.
  - **Fase 4 (Zero-Defect Gate):** QA manual verificado en mostrador y suite automatizada 100% verde.
- **Suite Vitest:** 12 archivos de prueba, **210 pruebas unitarias pasando al 100%**.
- **Cobertura de Código:** **100% en Líneas, Funciones, Branches y Sentencias** en `domain/` y `lib/`.
- **Gate de Verificación:** `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` 100% verde con 0 errores y 0 advertencias.

## Decisiones (y por qué)
- **ADR-1 (Application Service):** `executePosCheckout` coordina inventario, fiado, gaveta de caja y ticket correlativo. Ante fallos restaura snapshots y preserva el carrito intacto en pantalla.
- **ADR-2 (Hardware Barcode):** Input no controlado en escáner USB sin `value`/`onChange` reactivos para evitar re-renders ante ráfagas (<50ms).
- **ADR-3 (Canonical Payments):** Erradicados alias (`cash`, `card`, etc.) operando únicamente con los 6 canónicos de `schema.sql`.
- **ADR-4 (Ley 25.954):** Redondeo a $10 exclusivo para efectivo. En medios digitales y fiado se liquidan centavos exactos.
- **Optimización de Hardware:** `ProductCard` y `CartItemRow` envueltos en `React.memo` recibiendo callbacks estables para garantizar 60 FPS en PCs de mostrador Celeron/i3.

## Aprendizajes y errores a evitar
- **Persistencia de categorías:** No importar `mockCategories` directamente en componentes; consumirlas desde `useInventoryStore.categories`.

## Próximos pasos
1. Listo para la siguiente especificación del roadmap funcional (ej: compras, proveedores o migración a base de datos).
