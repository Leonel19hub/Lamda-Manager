# SPEC-004: Modularización y Refactor de Inventario (`InventoryView`)

- **Estado:** Completada
- **Fecha:** 2026-11-20
- **Área:** Gestión de Inventario / Catálogo (`src/features/inventory/`)
- **Autores:** Analista Funcional SDD & Arquitecto de Software
- **Dependencias:** `docs/constitution.md`, `specs/001-architecture-baseline/spec.md`, `specs/002-pos-refactor/spec.md`, `specs/003-design-system-ui/spec.md`

---

## 1. Contexto y Diagnóstico del Problema

### 1.1. Contexto
La vista `InventoryView.tsx` es actualmente el archivo más extenso y sobrecargado del sistema: **1.197 líneas de código** que concentran en un único componente React la totalidad de la gestión de productos, catálogo, historial de mermas y remitos de traslados inter-sucursales.

A diferencia del módulo de Punto de Venta (resuelto en SPEC-002), no existen mutaciones cruzadas no autorizadas sobre stores externos, pero el componente acumula severas deficiencias arquitectónicas y de rendimiento que impactan directamente en la usabilidad del mostrador:
1. **Acoplamiento Directo a Mocks:** Importa directamente `mockCategories` desde `@/mock/mockData` y ejecuta rebanados (`mockCategories.slice(1)`) en múltiples ubicaciones, omitiendo que `useInventoryStore` ya mantiene y expone la colección oficial de categorías.
2. **Identificadores Mágicos Hardcodeados:** Emplea `'cat-02'` como categoría por defecto para altas y resets, `'all'` para la categoría general (en conflicto con el estándar `null` establecido en SPEC-002) y `'branch-01'` como sucursal de reserva (*fallback*), generando fallas silenciosas si los datos provienen de la base de datos real (`schema.sql`).
3. **Explosión de Estado Local (34 hooks `useState` en el nodo raíz):**
   - 15 estados dedicados exclusivamente al formulario de producto.
   - 6 estados para el modal de registro de mermas.
   - 6 estados para el modal de traslados.
   - 7 estados de navegación, filtros y búsqueda.
   *Efecto secundario:* Cada pulsación de teclado en cualquiera de los inputs de cualquier modal re-renderiza las 1.197 líneas de la vista, recalculando de forma innecesaria la tabla entera de productos.
4. **Ausencia de Selectores Atómicos en Zustand:** Desestructura `useInventoryStore()` y `useAppStore()` de manera global, provocando que un registro de merma re-renderice la pestaña de traslados, y viceversa.
5. **Cómputos No Memoizados:** `criticalProductsCount` y `filteredProducts` se recalculan en cada ciclo de render sin `useMemo`, ralentizando terminales Celeron / Core i3 a medida que el catálogo crece.
6. **Defecto Latente en Traslados Inter-Sucursales:** La sucursal de destino se inicializa una sola vez en el montaje del componente y no responde a cambios de `activeBranch`, posibilitando registrar traslados inválidos donde origen y destino coinciden.
7. **Violación de Core Isolation en Altas de Producto:** La vista construye manualmente objetos de persistencia con identificadores provisorios (`productId: 'temp'`), y genera códigos SKU mediante `Math.random()` dentro del manejador de eventos de la interfaz.
8. **Duplicación Masiva de UI y Desalineación del Design System:** Posee 18 botones, 15 campos de entrada, 6 selectores, 4 tarjetas y 3 tablas maquetados con clases utilitarias crudas (`bg-emerald-*`, `border-slate-*`), desaprovechando las primitivas de interfaz creadas y probadas en SPEC-003.

### 1.2. Objetivo
Definir los requisitos funcionales, contratos de dominio y descomposición modular para `src/features/inventory/`, logrando:
1. **Aislamiento Total de Estado:** Encapsular el estado local de los formularios dentro de sus respectivos modales (`ProductFormModal`, `WasteModal`, `TransferModal`).
2. **Dominio Puro y Core Isolation:** Trasladar la lógica de filtrado de productos, conteo de stock crítico, determinación de sucursales destino y armado de payloads a funciones puras en `domain/stockRules.ts` con cobertura de pruebas al 100%.
3. **Adopción Total del Design System (`src/components/ui/`):** Migrar íntegramente la interfaz a las primitivas `Button`, `Badge`, `Input`, `Select`, `AlertBanner`, `Card` y `EmptyState`.
4. **Optimización de Renderizado para Hardware de Mostrador:** Componentes de fila memorizados con `React.memo`, suscripciones atómicas por tab en Zustand y memorización de listas filtradas con `useMemo`.
5. **Arquitectura Limpia y Modular:** Reducir `InventoryView.tsx` a un orquestador conciso (~130 líneas) que gestione navegación de tabs y visibilidad de modales.

---

## 2. Actores

- **Encargado de Inventario / Administrador:** Crea y edita productos, actualiza márgenes y precios, audita niveles de stock físico y registra mermas por deterioro o vencimiento.
- **Operador de Sucursal:** Consulta existencias de mercadería en catálogo, inicia remitos de traslado hacia otras sucursales y confirma la recepción de mercadería en tránsito.
- **Terminal de Punto de Venta (Hardware Celeron / i3):** Ejecuta la vista con alta reactividad, sin demoras ni congelamientos visuales al tipear en formularios o filtrar productos.

---

## 3. Historias de Usuario

- **HU-01 (Catálogo Reactivo y Filtrado Eficiente):** Como encargado de inventario, quiero buscar productos por nombre, código SKU, código de barras o código PLU, y filtrarlos por categoría o estado de stock sin demoras en la interfaz, para localizar rápidamente la mercadería.
- **HU-02 (Alta y Edición Segura de Productos):** Como administrador, quiero un formulario modal aislado que calcule automáticamente el precio de venta en base al costo y margen deseado (y viceversa), permitiendo corregir el stock físico con advertencia clara de uso.
- **HU-03 (Registro de Mermas Directo):** Como operador, quiero registrar mermas de productos por deterioro o maduración desde una ventana modal ágil, reflejando el descuento de existencias de manera inmediata.
- **HU-04 (Traslados Inter-Sucursales sin Conflictos):** Como operador, quiero emitir remitos de traslado hacia otras sucursales válidas, impidiendo seleccionar la misma sucursal de origen y recibiendo aviso cuando no haya sucursales destino disponibles.
- **HU-05 (Recepción de Mercadería en Tránsito):** Como encargado de sucursal destino, quiero consultar los traslados pendientes e ingresar la mercadería al stock local mediante una confirmación explícita de un solo clic.

---

## 4. Requisitos Funcionales (Sintaxis EARS)

### 4.1. Catálogo y Búsqueda de Productos (`ProductCatalogTab`, `ProductTableRow`)

- **[RF-01.1]** *CUANDO* el usuario ingresa un término de búsqueda en el catálogo, *EL SISTEMA* filtrará la lista de productos comparando el texto en minúsculas y sin distinción de mayúsculas contra los campos `name`, `sku`, `barcode` y `pluCode`.
- **[RF-01.2]** *SI* no se selecciona ninguna categoría (`selectedCategory === null`), *ENTONCES* *EL SISTEMA* mostrará los productos correspondientes a todas las categorías. *SI* se selecciona una categoría específica, *ENTONCES* *EL SISTEMA* mostrará exclusivamente los productos pertenecientes a dicho identificador.
- **[RF-01.3]** *CUANDO* el usuario active el filtro de "Stock Crítico", *EL SISTEMA* excluirá los productos con estado de stock `'ok'` y exhibirá únicamente aquellos en estado `'low'` o `'critical'` (existencias iguales o inferiores al stock mínimo o menores/iguales a cero).
- **[RF-01.4]** *MIENTRAS* la lista de productos filtrados esté vacía, *EL SISTEMA* renderizará el componente `EmptyState` indicando la ausencia de coincidencias y ofreciendo limpiar los filtros de búsqueda.
- **[RF-01.5]** *CUANDO* se renderiza cada fila de producto (`ProductTableRow`), *EL SISTEMA* exhibirá el estado de stock mediante un componente `Badge` con variantes semánticas normalizadas (`ok` -> `success`, `low` -> `warning`, `critical` -> `danger`) y botones accesibles para "Editar" y "Merma".

### 4.2. Formulario de Alta y Edición de Producto (`ProductFormModal`)

- **[RF-02.1]** *CUANDO* se abre el modal de producto para creación, *EL SISTEMA* preseleccionará automáticamente la primera categoría disponible (`categories[0]?.id`) y generará un código SKU secuencial o formateado provisorio.
- **[RF-02.2]** *SI* la colección de categorías en el store está vacía (`categories.length === 0`), *ENTONCES* *EL SISTEMA* desplegará un `<AlertBanner variant="warning">` indicando que se requiere configurar categorías y deshabilitará el botón de guardar.
- **[RF-02.3]** *CUANDO* se abre el modal en modo edición, *EL SISTEMA* cargará los datos existentes del producto y mantendrá el campo "Stock Actual" editable, exhibiendo un texto de ayuda descriptivo (`helperText`) advirtiendo que modifica directamente el stock físico.
- **[RF-02.4]** *CUANDO* el usuario modifica el campo "Precio de Costo" o el "Margen (%)", *EL SISTEMA* recalculará de forma inmediata y automática el "Precio de Venta" utilizando la función de dominio puro `calculateSellPrice`.
- **[RF-02.5]** *CUANDO* el usuario modifica directamente el "Precio de Venta", *EL SISTEMA* recalculará de forma inmediata y automática el "Margen (%)" utilizando la función de dominio puro `calculateMargin`.
- **[RF-02.6]** *CUANDO* el usuario pulsa "Guardar Producto", *EL SISTEMA* validará los campos mediante `validateProductForm`. *SI* la validación falla, *ENTONCES* *EL SISTEMA* exhibirá el mensaje de error con `<AlertBanner variant="error">`. *SI* es válida, *ENTONCES* persistirá la entidad, cerrará el modal y restablecerá el estado del formulario.

### 4.3. Registro y Consulta de Mermas (`WasteModal`, `WasteLogsTab`)

- **[RF-03.1]** *CUANDO* el usuario presiona "Registrar Merma" sobre un producto, *EL SISTEMA* abrirá `WasteModal` inicializando la cantidad predeterminada (1.5 para venta por peso, 1 para venta por unidad) y el motivo estándar.
- **[RF-03.2]** *CUANDO* el usuario confirma el registro de merma, *EL SISTEMA* validará la cantidad ingresada. *SI* la cantidad es inválida o excede el stock disponible, *ENTONCES* *EL SISTEMA* mostrará el error en el diálogo. *SI* es válida, *ENTONCES* registrará el log en `useInventoryStore`, descontará el stock del producto y cerrará el modal.
- **[RF-03.3]** *MIENTRAS* la pestaña de historial de mermas carezca de registros, *EL SISTEMA* exhibirá un componente `EmptyState` informando que no existen mermas registradas.

### 4.4. Traslados Inter-Sucursales (`TransferModal`, `TransfersTab`)

- **[RF-04.1]** *EL SISTEMA* determinará las sucursales destino válidas excluyendo estrictamente la sucursal activa actual (`activeBranchId`).
- **[RF-04.2]** *SI* no existen sucursales de destino disponibles (`getAvailableDestinationBranches(...).length === 0`), *ENTONCES* *EL SISTEMA* deshabilitará el botón "Nuevo Traslado" en la pestaña de traslados y desplegará un `<AlertBanner variant="info">` informando que se requieren al menos dos sucursales configuradas.
- **[RF-04.3]** *CUANDO* se abre `TransferModal`, *EL SISTEMA* seleccionará como sucursal destino la primera disponible y permitirá seleccionar el producto y la cantidad a transferir.
- **[RF-04.4]** *CUANDO* el usuario confirma la creación del traslado, *EL SISTEMA* validará mediante `validateTransfer` que la cantidad sea mayor a cero y no supere las existencias disponibles en la sucursal origen.
- **[RF-04.5]** *CUANDO* un traslado se encuentre con estado en tránsito (`status === 'in_transit'`), *EL SISTEMA* mostrará un botón "Confirmar Recepción" en la fila correspondiente. Al pulsarlo, *EL SISTEMA* invocará `receiveTransfer`, sumará el stock a la sucursal de destino y actualizará el estado a recibido (`'received'`).
- **[RF-04.6]** *MIENTRAS* la colección de traslados esté vacía, *EL SISTEMA* exhibirá un componente `EmptyState` indicando la ausencia de remitos.

### 4.5. Orquestador y Rendimiento (`InventoryView`)

- **[RF-05.1]** *EL SISTEMA* mantendrá la navegación entre las 3 pestañas principales ("Catálogo de Productos", "Historial de Mermas" y "Remitos y Traslados") mediante navegación por solapas accesibles.
- **[RF-05.2]** *EL SISTEMA* delegará la renderización y consumo de stores a cada subcomponente de pestaña, garantizando que cambios en mermas o traslados no originen re-renders en el catálogo de productos.
- **[RF-05.3]** *EL SISTEMA* eliminará por completo la importación de `mockCategories` y datos de prueba directos desde componentes de interfaz, consumiendo exclusivamente los datos tipados de los stores.

---

## 5. Criterios de Aceptación y Fuera de Alcance

### 5.1. Criterios de Aceptación
1. **Zero-Defect Gate:** `pnpm run typecheck`, `pnpm run lint`, `pnpm test` y `pnpm run build` pasan al 100% en verde con 0 errores y 0 advertencias.
2. **Cobertura de Dominio:** 100% de cobertura en ramas y funciones para `stockRules.ts` y sus nuevas funciones puras de filtrado y conteo.
3. **Erradicación de Mocks en UI:** Cero referencias a `mockCategories` en `src/features/inventory/components/`.
4. **Adopción del Design System:** Cero botones, inputs o badges maquetados con clases utilitarias crudas ad-hoc; empleo total de `src/components/ui/`.
5. **Rendimiento:** Tipear en los campos de `ProductFormModal`, `WasteModal` o `TransferModal` no produce re-renders en `ProductCatalogTab` ni en `ProductTableRow`.

### 5.2. Fuera de Alcance
- Creación de un módulo completo de compras o recepción de proveedores (reservado para futuras specs).
- Creación de auditorías o recuentos físicos periódicos con comprobante de ajuste formal.
- Modificación del esquema de persistencia en PostgreSQL (`src/db/schema.sql`).
