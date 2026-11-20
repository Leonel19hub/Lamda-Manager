# TASKS-003: Design System Mínimo y Primitivas de Interfaz

- **Especificación:** [SPEC-003: specs/003-design-system-ui/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/003-design-system-ui/spec.md)
- **Plan Técnico:** [PLAN-003: specs/003-design-system-ui/plan.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/003-design-system-ui/plan.md)
- **Estado:** Pendiente de Aprobación
- **Modalidad:** Ejecución por Fase Completa

---

## Fase 1: Tokens Semánticos, Contratos y Primitivas Base

- [x] **[T-01] Incorporar tokens semánticos de advertencia y funciones puras de variantes (`ui.test.ts`)**
  - **Archivos a modificar/crear:** `src/index.css`, `src/components/ui/variants.ts`, `src/components/ui/ui.test.ts`
  - **Descripción:** Agregar a `@theme` de `src/index.css` los tokens `--color-warning`, `--color-on-warning`, `--color-warning-container` y `--color-on-warning-container`. Implementar en `variants.ts` las funciones puras `getButtonClasses`, `getBadgeClasses`, `getAlertClasses` y `getCardClasses` utilizando únicamente `cn()` y mapas tipados con tokens del tema. Crear `ui.test.ts` evaluando exhaustivamente cada variante y tamaño sin dependencias de DOM virtual.
  - **Hecho cuando:** `pnpm test src/components/ui/ui.test.ts` pasa al 100% en verde con cobertura de todas las variantes y tamaños.

- [x] **[T-02] Primitivas Base: `Button.tsx` y `Card.tsx`**
  - **Archivos a crear:** `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`
  - **Descripción:** Implementar `Button.tsx` extendiendo `React.ComponentPropsWithRef<'button'>`, soportando `variant`, `size`, `isLoading` (con spinner accesible), `leftIcon` y `rightIcon`. Implementar `Card.tsx` con fondo `bg-surface-container-lowest`, bordes y padding configurable (`none`, `sm`, `md`, `lg`).
  - **Hecho cuando:** Ambos componentes compilan en TypeScript estricto sin errores de tipos y aceptan `ref` nativo.

- [x] **[T-03] Primitivas de Feedback: `Badge.tsx`, `AlertBanner.tsx` y `EmptyState.tsx`**
  - **Archivos a crear:** `src/components/ui/Badge.tsx`, `src/components/ui/AlertBanner.tsx`, `src/components/ui/EmptyState.tsx`
  - **Descripción:** Implementar `Badge.tsx` con variantes semánticas (`success`, `warning`, `danger`, `info`, `neutral`), prop `dot` e indicador visual acentuado. Implementar `AlertBanner.tsx` con íconos representativos según variante, título opcional y botón de cierre `onDismiss`. Implementar `EmptyState.tsx` con ícono centrado, título, descripción y slot de acción opcional.
  - **Hecho cuando:** Los 3 componentes compilan limpiamente en `pnpm run typecheck` utilizando exclusivamente tokens semánticos.

---

## Fase 2: Primitivas de Formulario, Modal y Barrel Público

- [x] **[T-04] Primitivas de Formulario con `ComponentPropsWithRef`: `Input.tsx` y `Select.tsx`**
  - **Archivos a crear:** `src/components/ui/Input.tsx`, `src/components/ui/Select.tsx`
  - **Descripción:** Implementar `Input.tsx` con soporte `React.ComponentPropsWithRef<'input'>`, `label`, `error`, `helperText`, `leftIcon`, `rightElement` y pasaje directo del `ref` para campos no controlados. Implementar `Select.tsx` con `React.ComponentPropsWithRef<'select'>`, `label`, `error`, `helperText`, y soporte tanto para prop `options` como para `children` nativos.
  - **Hecho cuando:** Ambos controles compilan en TypeScript estricto, gestionan los estados de foco/error con tokens y permiten el control nativo vía `ref`.

- [x] **[T-05] Adecuación Accesible de `Modal.tsx` y Barrel Público `index.ts`**
  - **Archivos a modificar/crear:** `src/components/ui/Modal.tsx`, `src/components/ui/index.ts`
  - **Descripción:** Actualizar `Modal.tsx` incorporando `role="dialog"` y `aria-modal="true"` en su contenedor principal para sincronización con accesibilidad y `usePosScannerFocus`. Crear `src/components/ui/index.ts` exportando todas las primitivas y sus tipos correspondientes (`Button`, `Badge`, `Input`, `Select`, `AlertBanner`, `Card`, `EmptyState`, `Modal`).
  - **Hecho cuando:** `src/components/ui/index.ts` exporta la totalidad del catálogo y `pnpm run typecheck` compila con 0 errores.

---

## Fase 3: Adopción Piloto en el Módulo POS

- [x] **[T-06] Migración en Barra de Hardware: `PosHardwareBar.tsx`**
  - **Archivos a modificar:** `src/features/pos/components/PosHardwareBar.tsx`
  - **Descripción:** Sustituir los estilos ad-hoc del banner efímero por `<AlertBanner>`, las etiquetas de balanza y lector por `<Badge>`, el botón de Tara por `<Button>` y el input del lector USB por `<Input ref={barcodeInputRef} />` verificando que el flujo no controlado permanezca idéntico y sin re-renders ante ráfagas.
  - **Hecho cuando:** `PosHardwareBar` consume primitivas desde `src/components/ui/` y pasa `pnpm run typecheck` sin romper el foco de escaneo.

- [x] **[T-07] Migración en Panel de Cobro y Modales: `CheckoutPanel.tsx`, `WeighProductModal.tsx` y `CustomerSelectModal.tsx`**
  - **Archivos a modificar:** `src/features/pos/components/CheckoutPanel.tsx`, `src/features/pos/components/WeighProductModal.tsx`, `src/features/pos/components/CustomerSelectModal.tsx`
  - **Descripción:** Reemplazar los avisos de caja cerrada, error de cobro y exceso de límite de crédito en `CheckoutPanel` por `<AlertBanner>`, y los botones de medios de pago y cobro por `<Button>`. Migrar botones e inputs de `WeighProductModal` y `CustomerSelectModal` hacia `<Button>` e `<Input>`.
  - **Hecho cuando:** Los tres componentes utilizan las primitivas del Design System y pasan `pnpm run typecheck`.

- [x] **[T-08] Migración en Ítems Memorizados y Estados Vacíos: `ProductCard.tsx`, `CartItemRow.tsx`, `CartTicketPanel.tsx` y `ProductCatalogPanel.tsx`**
  - **Archivos a modificar:** `src/features/pos/components/ProductCard.tsx`, `src/features/pos/components/CartItemRow.tsx`, `src/features/pos/components/CartTicketPanel.tsx`, `src/features/pos/components/ProductCatalogPanel.tsx`
  - **Descripción:** Reemplazar badges y botones en `ProductCard` y `CartItemRow` asegurando que la envoltura en `React.memo` se mantenga intacta. Reemplazar los contenedores de carrito vacío y búsqueda sin resultados en `CartTicketPanel` y `ProductCatalogPanel` por `<EmptyState>`.
  - **Hecho cuando:** Todos los subcomponentes del POS compilan con 0 errores de tipos y `pnpm test` ejecuta los 210+ tests en verde.

---

## Fase 4: Verificación Integral (Zero-Defect Gate)

- [ ] **[T-09] Verificación Integral, Gate de Calidad y Registro en Memoria**
  - **Archivos a modificar:** `MEMORY.md`
  - **Descripción:** Ejecutar la verificación completa del repositorio: `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`. Verificar manualmente en navegador (`pnpm run dev` en `/pos`) el correcto renderizado visual, contraste, atajos de teclado y funcionamiento del escáner USB. Actualizar `MEMORY.md` documentando el nuevo catálogo de `src/components/ui/` disponible para SPEC-004.
  - **Hecho cuando:** Pipeline 100% verde con 0 errores, 0 advertencias y `MEMORY.md` actualizado con el cierre de SPEC-003.
