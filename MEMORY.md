# MEMORY.md — Persistent Project Memory
<!-- Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. -->

## Estado actual
- **Fase:** SPEC-002 (Refactor POS y Orquestación) — **Fase 2 COMPLETADA (T-04, T-05)**:
  - **T-04:** Application Service `executePosCheckout` en `pos/application/` con validación previa, captura de snapshots y rollback determinista ante fallos (testeado al 100% en `checkoutService.test.ts`).
  - **T-05:** 4 Custom Hooks de POS desacoplados (`useTimedNotice`, `usePosScannerFocus`, `usePosHotkeys`, `usePosBarcodeHandler`).
  - **Fase 1 previa:** Lógica pura (`applySaleToRegister`, `createCartItem`, `calculateSplitDefaults`, `calculateCheckoutTotal`, `isCustomerOverCreditLimit`) y normalización canónica de `PaymentMethod`.
- **Suite Vitest:** 12 archivos de prueba, **210 pruebas unitarias pasando al 100%**.
- **Cobertura de Código:** **100% en Líneas, Funciones, Branches y Sentencias** en `domain/` y `lib/`.
- **Gate de Verificación:** `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` 100% verde con 0 advertencias y 0 errores.

## Decisiones (y por qué)
- **ADR-1 (Application Service):** `executePosCheckout` orquesta inventario, fiado, gaveta de caja y ticket correlativo. Ante cualquier error restaura snapshots y preserva el carrito intacto en pantalla.
- **ADR-2 (Hardware Barcode):** Input no controlado en escáner USB con evento Enter para evitar re-renders en ráfagas.
- **ADR-3 (Canonical Payments):** Erradicados alias (`cash`, `card`, etc.) operando únicamente con los 6 canónicos de `schema.sql`.
- **ADR-4 (Ley 25.954):** Redondeo a $10 exclusivo para efectivo. En medios digitales y fiado se liquidan centavos exactos.
- **Reversión limpia en Stores:** Stores exponen métodos dedicados (`revertRegister`, `restoreCustomer`, `restoreProducts`) evitando `setState()` cruzado.

## Aprendizajes y errores a evitar
- **Rollback en pagos mixtos con fiado:** Cuando falla el registro de caja en Paso 3, restaurar tanto inventario como cuenta del cliente en orden inverso antes de lanzar el fallo controlado.

## Próximos pasos
1. Iniciar **Fase 3 de SPEC-002 (Descomposición de UI y Optimización)**:
   - `[T-06]` `PosHardwareBar.tsx`, `ProductCard.tsx` (React.memo) y `ProductCatalogPanel.tsx`.
   - `[T-07]` `CartItemRow.tsx` (React.memo), `CartTicketPanel.tsx` y `CheckoutPanel.tsx`.
   - `[T-08]` `WeighProductModal.tsx`, `CustomerSelectModal.tsx` y ensamblado final de `PosView.tsx` (~120 líneas).
