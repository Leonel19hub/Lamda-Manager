# TASKS-004: Modularización y Refactor de Inventario (`InventoryView`)

- **Especificación:** [SPEC-004: specs/004-inventory-refactor/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/004-inventory-refactor/spec.md)
- **Plan Técnico:** [PLAN-004: specs/004-inventory-refactor/plan.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/004-inventory-refactor/plan.md)
- **Estado:** Pendiente
- **Modalidad:** Ejecución por Fase Completa

---

## Fase 1: Dominio Puro y Contratos (TDD)

- [x] **[T-01] Implementar funciones puras de filtrado, conteo y destinos en `stockRules.ts` con TDD**
  - **Archivos a modificar/crear:** `src/features/inventory/domain/stockRules.ts`, `src/features/inventory/domain/stockRules.test.ts`
  - **Descripción:** Implementar `filterProducts`, `countCriticalProducts`, `getAvailableDestinationBranches` y `getDefaultCategoryId` en `stockRules.ts`. Escribir pruebas unitarias exhaustivas en `stockRules.test.ts` evaluando búsquedas combinadas (nombre, SKU, PLU, código de barras), categoría `null` y específica, filtro de stock crítico (`'low'` y `'critical'`), exclusión de sucursales activas y listas vacías.
  - **Hecho cuando:** `pnpm test src/features/inventory/domain/stockRules.test.ts` pasa al 100% en verde con cobertura completa de ramas.

- [x] **[T-02] Corrección de `stock.productId` en `useInventoryStore.ts` y exportación de contratos en `index.ts`**
  - **Archivos a modificar:** `src/stores/useInventoryStore.ts`, `src/features/inventory/index.ts`
  - **Descripción:** Corregir en `addProduct` de `useInventoryStore` la asignación de `stock.productId` para que asocie el identificador generado del producto (`newProduct.id`) en lugar de arrastrar `'temp'`. Exportar las nuevas funciones de dominio y tipos desde `src/features/inventory/index.ts`.
  - **Hecho cuando:** `pnpm test` ejecuta todos los tests existentes sin regresiones y los tipos compilan sin errores.

---

## Fase 2: Extracción de los 3 Modales con Estado Aislado

- [x] **[T-03] Implementar `ProductFormModal.tsx` con estado local aislado y primitivas UI**
  - **Archivos a crear:** `src/features/inventory/components/ProductFormModal.tsx`
  - **Descripción:** Crear `ProductFormModal` encapsulando los 14 estados locales del formulario de producto. Integrar cálculo bidireccional reactivo de costo/margen/precio mediante `calculateSellPrice` y `calculateMargin`. Si `categories.length === 0`, mostrar `<AlertBanner variant="warning">` y deshabilitar guardado. En edición, incluir `helperText` en el `<Input label="Stock Actual">`. Utilizar `<Modal>`, `<Input>`, `<Select>`, `<Button>` y `<AlertBanner>`.
  - **Hecho cuando:** `ProductFormModal.tsx` compila en TypeScript estricto sin errores de tipos y valida altas y ediciones con `validateProductForm`.

- [x] **[T-04] Implementar `WasteModal.tsx` con estado local aislado**
  - **Archivos a crear:** `src/features/inventory/components/WasteModal.tsx`
  - **Descripción:** Crear `WasteModal` encapsulando los estados de cantidad, motivo, notas y error. Inicializar cantidades sugeridas según `saleType` (peso vs unidad). Integrar con `recordWaste` de `useInventoryStore` y manejar errores con `<AlertBanner variant="error">` y primitivas de UI.
  - **Hecho cuando:** El modal compila limpiamente, valida la merma y no re-renderiza componentes ajenos a su ciclo de vida.

- [x] **[T-05] Implementar `TransferModal.tsx` con cálculo reactivo de sucursales destino**
  - **Archivos a crear:** `src/features/inventory/components/TransferModal.tsx`
  - **Descripción:** Crear `TransferModal` encapsulando estados de producto, sucursal destino, cantidad y notas. Utilizar `getAvailableDestinationBranches` para listar exclusivamente destinos válidos diferentes a `activeBranch`. Validar existencias con `validateTransfer` e invocar `createTransfer`.
  - **Hecho cuando:** El modal compila limpiamente y no permite emitir traslados hacia la misma sucursal de origen ni cantidades superiores al stock disponible.

---

## Fase 3: Descomposición de Pestañas, Optimización y Ensamblado

- [ ] **[T-06] Implementar `ProductTableRow.tsx` memorizada (`React.memo`)**
  - **Archivos a crear:** `src/features/inventory/components/ProductTableRow.tsx`
  - **Descripción:** Implementar la fila de producto envuelta en `React.memo` para optimizar el rendimiento en PCs de mostrador. Integrar `<Badge>` para stock (`ok` -> success, `low` -> warning, `critical` -> danger) y tipo de venta. Utilizar `<Button size="sm" variant="outline">` para las acciones de edición y registro de merma.
  - **Hecho cuando:** El componente compila limpiamente y solo se re-renderiza si sus props individuales cambian.

- [ ] **[T-07] Implementar `ProductCatalogTab.tsx` con suscripciones atómicas y `useMemo`**
  - **Archivos a crear:** `src/features/inventory/components/ProductCatalogTab.tsx`
  - **Descripción:** Crear `ProductCatalogTab` suscripto atómicamente a `products` y `categories` en `useInventoryStore`. Utilizar `useMemo` para `filteredProducts` y `criticalProductsCount` mediante `filterProducts` y `countCriticalProducts`. Implementar barra de búsqueda con `<Input leftIcon={<Search />} />`, selector de categoría con `null` ("Todas"), selector de stock y renderizado de tabla con `<Card>` y `<EmptyState>`.
  - **Hecho cuando:** La pestaña compila sin errores, filtra fluidamente y no produce re-renders globales fuera de su árbol.

- [ ] **[T-08] Implementar `WasteLogsTab.tsx` y `TransfersTab.tsx`**
  - **Archivos a crear:** `src/features/inventory/components/WasteLogsTab.tsx`, `src/features/inventory/components/TransfersTab.tsx`
  - **Descripción:** Implementar `WasteLogsTab` con suscripción atómica a `wasteLogs`, tabla formateada y `<EmptyState>`. Implementar `TransfersTab` con suscripción a `transfers`, `branches` y `activeBranch`. Si `availableDestinationBranches.length === 0`, mostrar `<AlertBanner variant="info">` y deshabilitar "Nuevo Traslado". Renderizar badges de estado (`received` vs `in_transit`), botón "Confirmar Recepción" (`receiveTransfer`) y `<EmptyState>`.
  - **Hecho cuando:** Ambas pestañas compilan limpiamente y consumen exclusivamente sus respectivos slices de estado.

- [ ] **[T-09] Ensamblado y reducción de `InventoryView.tsx` y barrel `components/index.ts`**
  - **Archivos a modificar/crear:** `src/features/inventory/components/InventoryView.tsx`, `src/features/inventory/components/index.ts`
  - **Descripción:** Rediseñar `InventoryView.tsx` como orquestador ligero (~130 líneas). Gestionar tabs ('products', 'waste', 'transfers') y visibilidad de los 3 modales. Eliminar por completo la importación de `mockCategories` y selectores globales de store. Crear barrel `components/index.ts` exportando todos los componentes.
  - **Hecho cuando:** `InventoryView.tsx` se reduce a ~130 líneas, no importa mocks y compila con 0 errores de TypeScript.

---

## Fase 4: Verificación Integral y Cierre

- [ ] **[T-10] Verificación del Zero-Defect Gate y Actualización de `MEMORY.md`**
  - **Archivos a modificar:** `MEMORY.md`
  - **Descripción:** Ejecutar la suite completa de calidad: `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`. Verificar 100% de tests en verde y 0 advertencias. Actualizar `MEMORY.md` registrando el cierre de SPEC-004, las decisiones de arquitectura aplicadas y el estado actualizado del proyecto.
  - **Hecho cuando:** Todos los checks del pipeline son 100% verdes y `MEMORY.md` refleja el estado final actualizado respetando el límite de ~50 líneas.
