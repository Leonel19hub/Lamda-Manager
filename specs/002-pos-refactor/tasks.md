# TASKS-002: Refactorización del Módulo POS, Orquestación de Cobro y Optimización de Rendimiento

- **Especificación:** [SPEC-002: specs/002-pos-refactor/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/002-pos-refactor/spec.md)
- **Plan Técnico:** [PLAN-002: specs/002-pos-refactor/plan.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/002-pos-refactor/plan.md)
- **Estado:** En Progreso (Fase 2 completada)

---

## Fase 1: Dominio Puro y Contratos (TDD)

- [x] **[T-01] TDD Imputación financiera pura en Caja: `applySaleToRegister`**
  - **Archivos a modificar/crear:** `src/features/cash-register/domain/cashCalculations.ts`, `src/features/cash-register/domain/cashCalculations.test.ts`
  - **Descripción:** Implementar la función pura `applySaleToRegister(register, sale): CashRegister` que imputa el total de la venta (o cada fracción de `splitPayments`) sobre `expectedCash`, `totalCard`, `totalTransfer` y `totalAccount` de forma inmutable, redondeando a 2 decimales. Cubre RF-03.1 y RF-04.1.
  - **Hecho cuando:** `pnpm test src/features/cash-register/domain/cashCalculations.test.ts` pasa al 100% en verde con cobertura de todos los medios simples y pagos mixtos.

- [x] **[T-02] TDD Dominio POS: `createCartItem`, `calculateSplitDefaults`, `calculateCheckoutTotal` e `isCustomerOverCreditLimit`**
  - **Archivos a modificar/crear:** `src/features/pos/domain/calculations.ts`, `src/features/pos/domain/calculations.test.ts`, `src/features/pos/domain/validators.ts`, `src/features/pos/domain/validators.test.ts`
  - **Descripción:** Implementar las funciones puras para construir ítems de carrito con descuentos (RF-01.2), calcular importes iniciales de pago mixto 50/50 (RF-04.4), calcular el total discriminando redondeo a $10 solo para efectivo (RF-04.2, RF-04.3) y validar el crédito disponible del cliente evaluando exclusivamente la porción a fiar en pagos mixtos (RF-02.4, RF-02.4.1).
  - **Hecho cuando:** `pnpm test src/features/pos/domain/calculations.test.ts src/features/pos/domain/validators.test.ts` pasa al 100% en verde.

- [x] **[T-03] Normalización canónica de `PaymentMethod` y soporte de reversión en stores**
  - **Archivos a modificar:** `src/types/index.ts`, `src/stores/useCashRegisterStore.ts`, `src/stores/useCustomerStore.ts`, `src/stores/useInventoryStore.ts`, `src/stores/usePosStore.ts`
  - **Descripción:** Eliminar alias obsoletos (`'cash'`, `'card'`, `'transfer_qr'`, `'account'`) dejando exclusivamente los 6 tipos canónicos. Agregar en `useCashRegisterStore` las acciones `recordSale(sale)` y `revertRegister(previousRegister)`. Agregar en `useCustomerStore` la acción `restoreCustomer(previousCustomer)`. Alojar `categories: Category[]` y `restoreProducts/restoreProductStock` en `useInventoryStore`, e inicializar `selectedCategory: string | null` y `commitSale` en `usePosStore`.
  - **Hecho cuando:** `pnpm run typecheck` compila limpiamente sin errores de tipos en los stores.

---

## Fase 2: Capa de Aplicación y Custom Hooks

- [x] **[T-04] TDD Application Service: `checkoutService.ts` con orquestación y rollback**
  - **Archivos a crear:** `src/features/pos/application/checkoutService.ts`, `src/features/pos/application/checkoutService.test.ts`
  - **Descripción:** Implementar `executePosCheckout(ctx)` con el flujo determinístico: validación previa (caja, carrito, crédito), captura de snapshots en memoria, ejecución secuencial sobre stores (inventario, fiado, caja, ticket) y reversión garantizada (*rollback*) de los stores ante cualquier error no controlado, preservando el carrito intacto. Cubre RF-02.1 a RF-02.5 y RF-03.1 a RF-03.2.
  - **Hecho cuando:** `pnpm test src/features/pos/application/checkoutService.test.ts` pasa al 100% verificando cobros en efectivo, fiado, mixto y el escenario de rollback con restauración de snapshots.

- [x] **[T-05] Custom Hooks de POS: hardware, teclado y notificaciones**
  - **Archivos a crear:** `src/features/pos/hooks/useTimedNotice.ts`, `src/features/pos/hooks/usePosScannerFocus.ts`, `src/features/pos/hooks/usePosHotkeys.ts`, `src/features/pos/hooks/usePosBarcodeHandler.ts`, `src/features/pos/hooks/index.ts`
  - **Descripción:** Extraer del componente visual la gestión de notificaciones temporales con cleanup (RF-05.6), el autofoco condicional del escáner USB (RF-01.4), los atajos globales F12, F2, F7 y Escape con suspensión durante modales abiertos (RF-05.1 a RF-05.5), y el enrutamiento de códigos de balanza y PLU (RF-01.1 a RF-01.3).
  - **Hecho cuando:** Los 4 hooks compilan limpiamente en `pnpm run typecheck` y quedan exportados para consumo de la UI.

---

## Fase 3: Descomposición de Interfaz y Optimización de Rendimiento

- [ ] **[T-06] Subcomponentes del Catálogo y Escáner: `PosHardwareBar`, `ProductCard` y `ProductCatalogPanel`**
  - **Archivos a crear:** `src/features/pos/components/PosHardwareBar.tsx`, `src/features/pos/components/ProductCard.tsx`, `src/features/pos/components/ProductCatalogPanel.tsx`
  - **Descripción:** Construir la barra de hardware con input no controlado para el escáner y balanza; la tarjeta de producto envuelta en `React.memo`; y el panel de catálogo con filtrado memoizado por categoría (`null` = todas) y texto de búsqueda.
  - **Hecho cuando:** Los 3 subcomponentes compilan limpiamente y responden fluidamente sin re-renderizar componentes externos.

- [ ] **[T-07] Subcomponentes del Carrito y Cobro: `CartItemRow`, `CartTicketPanel` y `CheckoutPanel`**
  - **Archivos a crear:** `src/features/pos/components/CartItemRow.tsx`, `src/features/pos/components/CartTicketPanel.tsx`, `src/features/pos/components/CheckoutPanel.tsx`
  - **Descripción:** Construir la fila de ítem del carrito con `React.memo`; el panel del ticket con cabecera de cliente y totales; y el panel de cobro con selector de medios de pago, formulario de pago mixto y cálculo de vuelto en efectivo con redondeo a $10.
  - **Hecho cuando:** Los subcomponentes se suscriben atómicamente a `usePosStore` y compilan sin errores en `pnpm run typecheck`.

- [ ] **[T-08] Modales y Ensamblado de `PosView.tsx` (~120 líneas)**
  - **Archivos a crear/modificar:** `src/features/pos/components/WeighProductModal.tsx`, `src/features/pos/components/CustomerSelectModal.tsx`, `src/features/pos/components/PosView.tsx`
  - **Descripción:** Extraer los modales de pesaje y de selección de cliente. Reemplazar el archivo monolítico `PosView.tsx` (1.040 líneas) por un contenedor de layout limpio de ~120 líneas que conecta los hooks y orquesta los subcomponentes.
  - **Hecho cuando:** `PosView.tsx` no supera las 150 líneas, no realiza mutaciones directas `setState` en stores ajenos y pasa `pnpm run typecheck`.

---

## Fase 4: Verificación Integral (Zero-Defect Gate)

- [ ] **[T-09] Verificación Integral, Gate de Calidad y Registro en Memoria**
  - **Archivos a modificar:** `MEMORY.md`
  - **Descripción:** Ejecutar la suite completa de verificación del proyecto (`pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`). Comprobar que los 172 tests preexistentes más los nuevos tests pasen al 100% en verde. Actualizar `MEMORY.md` con los logros alcanzados de SPEC-002.
  - **Hecho cuando:** Pipeline 100% verde con 0 errores y 0 advertencias críticas, y `MEMORY.md` actualizado.
