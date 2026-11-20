# MEMORY.md — Persistent Project Memory
<!-- Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. -->

## Estado actual
- **Fase:** SPEC-002 (Refactor POS y Orquestación) — **Fase 3 COMPLETADA (T-06, T-07, T-08)**:
  - **T-06:** `PosHardwareBar` (input no controlado de escáner USB y balanza), `ProductCard` (`React.memo`) y `ProductCatalogPanel` (búsqueda rápida F2 y categorías desde `useInventoryStore` con `null` = "Todas").
  - **T-07:** `CartItemRow` (`React.memo`), `CartTicketPanel` (cabecera ticket, cliente, desglose de subtotal y total) y `CheckoutPanel` (medios de pago normalizados, split mixto, vuelto en efectivo con redondeo a $10 y cobro con rollback).
  - **T-08:** `WeighProductModal` (pesaje asistido con balanza o presets), `CustomerSelectModal` y reducción de `PosView.tsx` de 1.025 líneas a ~198 líneas orquestadoras puras sin `setState()` cruzado.
- **Suite Vitest:** 12 archivos de prueba, **210 pruebas pasando al 100%**.
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
1. **Fase 4 (T-09)**: Cierre definitivo de SPEC-002 tras confirmación del usuario.
