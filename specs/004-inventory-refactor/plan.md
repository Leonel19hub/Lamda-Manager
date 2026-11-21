# PLAN-004: Modularización y Refactor de Inventario (`InventoryView`)

- **Especificación:** [SPEC-004: specs/004-inventory-refactor/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/004-inventory-refactor/spec.md)
- **Estado:** Completado
- **Fecha:** 2026-11-20
- **Objetivo:** Descomponer el componente monolítico `InventoryView.tsx` (1.197 líneas) en un orquestador ligero (~130 líneas), 3 pestañas especializadas, 3 modales con estado local aislado y 1 fila de tabla memorizada, extrayendo lógica de filtrado y contratos a funciones de dominio puro en `domain/stockRules.ts`, adoptando el Design System (`src/components/ui/`) y eliminando el acoplamiento a mocks.

---

## 1. Arquitectura y Matriz de Componentes

```text
src/features/inventory/
├── index.ts                           # Barrel público (InventoryView, domain rules, pricing)
├── domain/
│   ├── pricing.ts                     # Existente (calculateMargin, calculateSellPrice)
│   ├── pricing.test.ts
│   ├── stockRules.ts                  # + filterProducts, countCriticalProducts, getAvailableDestinationBranches, etc.
│   └── stockRules.test.ts             # + tests unitarios de nuevas funciones puras (100% cobertura)
└── components/
    ├── index.ts                       # Barrel interno de componentes
    ├── InventoryView.tsx              # Orquestador: tabs ('products'|'waste'|'transfers') y apertura de modales (~130 líneas)
    ├── ProductCatalogTab.tsx          # Pestaña Catálogo: toolbar de búsqueda, pills de categoría, filtro stock y tabla
    ├── ProductTableRow.tsx            # Fila de tabla de producto memorizada (React.memo) con Badges y Buttons
    ├── WasteLogsTab.tsx               # Pestaña Historial de Mermas con Badges y EmptyState
    ├── TransfersTab.tsx               # Pestaña Traslados con detección de sucursales, remitos y recepción
    ├── ProductFormModal.tsx           # Modal de alta/edición de producto con estado aislado y cálculo margen/precio
    ├── WasteModal.tsx                 # Modal de registro de merma con estado aislado
    └── TransferModal.tsx              # Modal de remito de traslado con validación reactiva de destino y stock
```

---

## 2. Decisiones de Arquitectura (ADRs)

| ID | Decisión | Justificación Técnica |
| :--- | :--- | :--- |
| **ADR-1** | **Encapsular el estado de cada formulario dentro de su propio modal.** | Mover los 15 `useState` del producto a `ProductFormModal`, los 6 de merma a `WasteModal` y los 6 de traslado a `TransferModal` elimina ~27 estados del componente raíz y corta de raíz los re-renders de la tabla al escribir en un modal. |
| **ADR-2** | **Erradicación de `mockCategories` y estandarización a `null`.** | Eliminar la importación directa de `@/mock/mockData` en la UI. Las categorías se leen exclusivamente desde `useInventoryStore.getState().categories`. El filtro "Todas" se estandariza con `null` (alineado con SPEC-002). |
| **ADR-3** | **Extraer helpers puros de filtrado y construcción en `domain/stockRules.ts`.** | Cumple con la regla de *Core Isolation* (Constitución #3). `filterProducts`, `countCriticalProducts`, `getAvailableDestinationBranches` y `getDefaultCategoryId` se testean de forma unitaria y determinista sin React. |
| **ADR-4** | **Adopción total del Design System (`src/components/ui/`).** | Reemplazar los 18 botones, 15 inputs, 6 selects, badges de stock y tablas maquetadas ad-hoc por `Button`, `Input`, `Select`, `Badge`, `AlertBanner`, `Card` y `EmptyState` creados en SPEC-003. |
| **ADR-5** | **Suscripciones Atómicas por Pestaña en Zustand.** | Cada pestaña (`ProductCatalogTab`, `WasteLogsTab`, `TransfersTab`) se suscribe únicamente a sus selectores específicos (`state => state.products`, `state => state.wasteLogs`, etc.), impidiendo renders cruzados entre dominios. |
| **ADR-6** | **Fila de Catálogo Memorizada (`ProductTableRow`).** | `ProductTableRow` se envuelve en `React.memo` para evitar reconciliaciones masivas de 50+ filas cuando se interactúa con la barra de navegación o se abren modales. |

---

## 3. Firmas y Contratos de Dominio (`src/features/inventory/domain/stockRules.ts`)

### 3.1. Tipos y Filtros
```typescript
export interface ProductFilters {
  searchQuery?: string
  categoryId?: string | null
  stockFilter?: 'all' | 'critical'
}
```

### 3.2. Funciones Puras
```typescript
/**
 * Filtra la lista de productos por término de búsqueda (nombre, sku, plu, barcode),
 * categoría específica (o todas si es null) y salud de stock.
 */
export function filterProducts(products: Product[], filters: ProductFilters): Product[]

/**
 * Cuenta la cantidad de productos con stock en estado de alerta ('low' o 'critical').
 */
export function countCriticalProducts(products: Product[]): number

/**
 * Devuelve la lista de sucursales destino elegibles, excluyendo la sucursal activa.
 */
export function getAvailableDestinationBranches(
  branches: Array<{ id: string; name: string }>,
  activeBranchId?: string
): Array<{ id: string; name: string }>

/**
 * Obtiene el ID de la primera categoría disponible como valor por defecto para nuevas altas.
 */
export function getDefaultCategoryId(categories: Array<{ id: string }>): string | undefined
```

---

## 4. Adecuación de Store (`src/stores/useInventoryStore.ts`)

En la acción `addProduct`:
- Asegurar que si `productData.stock` está presente, su propiedad `productId` se actualice con el `newProduct.id` generado, eliminando el valor `'temp'` que actualmente se arrastra.
- Mantener la firma retrocompatible con `Result<Product, ValidationError>`.

---

## 5. Diseño y Responsabilidades de Componentes UI

### 5.1. `ProductFormModal.tsx`
- **Props:**
  ```typescript
  interface ProductFormModalProps {
    isOpen: boolean
    onClose: () => void
    initialProduct: Product | null
    activeBranchId?: string
  }
  ```
- **Responsabilidad:** Gestiona sus 14 estados locales. Al cambiar costo o margen, invoca `calculateSellPrice`. Al cambiar precio de venta, invoca `calculateMargin`. Si `categories.length === 0`, muestra `<AlertBanner variant="warning">` y deshabilita guardar. En modo edición, muestra `<Input label="Stock Actual" helperText="Usar solo para correcciones de conteo físico; para pérdidas usar Mermas" />`.

### 5.2. `WasteModal.tsx`
- **Props:**
  ```typescript
  interface WasteModalProps {
    isOpen: boolean
    onClose: () => void
    product: Product | null
    activeBranchId?: string
    registeredBy?: string
  }
  ```
- **Responsabilidad:** Gestiona cantidad, motivo y notas de merma. Consume `recordWaste` de `useInventoryStore` y maneja errores con `<AlertBanner variant="error">`.

### 5.3. `TransferModal.tsx`
- **Props:**
  ```typescript
  interface TransferModalProps {
    isOpen: boolean
    onClose: () => void
    initialProductId?: string
    activeBranchId?: string
    createdBy?: string
  }
  ```
- **Responsabilidad:** Gestiona producto a transferir, sucursal destino, cantidad y notas. Calcula las sucursales destino mediante `getAvailableDestinationBranches`. Valida existencias con `validateTransfer` y ejecuta `createTransfer`.

### 5.4. `ProductTableRow.tsx`
- **Props:**
  ```typescript
  interface ProductTableRowProps {
    product: Product
    categoryName: string
    onEdit: (product: Product) => void
    onMerma: (product: Product) => void
  }
  ```
- **Responsabilidad:** Componente funcional envuelto en `React.memo`. Mapea el estado de stock a `<Badge variant="success" | "warning" | "danger">`. Botones "Editar" y "Merma" utilizando `<Button size="sm" variant="outline">`.

### 5.5. `ProductCatalogTab.tsx`
- **Props:**
  ```typescript
  interface ProductCatalogTabProps {
    onOpenNewProduct: () => void
    onEditProduct: (product: Product) => void
    onOpenMerma: (product: Product) => void
  }
  ```
- **Responsabilidad:** Suscripción atómica a `products` y `categories`. Selector de "Todas" (`null`) y pills de categorías. Barra de búsqueda con `<Input leftIcon={<Search />} />`. Selector de "Todos" vs "Críticos" (`criticalProductsCount`). Memoriza `filteredProducts` con `useMemo`. Renderiza `<Card>` y `<EmptyState>` si no hay productos.

### 5.6. `WasteLogsTab.tsx`
- **Responsabilidad:** Suscripción atómica a `wasteLogs`. Renderiza tabla de mermas con fecha formateada (`toLocaleDateString('es-AR')`), producto, cantidad y motivo. Renderiza `<EmptyState>` cuando no hay mermas.

### 5.7. `TransfersTab.tsx`
- **Props:**
  ```typescript
  interface TransfersTabProps {
    onOpenNewTransfer: () => void
  }
  ```
- **Responsabilidad:** Suscripción atómica a `transfers`, `branches` y `activeBranch`. Calcula `availableDestinations`. Si `length === 0`, exhibe `<AlertBanner variant="info" title="Traslados no disponibles">Se requieren al menos 2 sucursales configuradas para realizar traslados.</AlertBanner>` y deshabilita el botón "Nuevo Traslado". Renderiza tabla de remitos con badges de estado (`received` vs `in_transit`) y botón "Confirmar Recepción" que invoca `receiveTransfer`.

### 5.8. `InventoryView.tsx`
- **Responsabilidad:** Orquestador principal (~130 líneas). Gestiona:
  - `activeTab: 'products' | 'waste' | 'transfers'`
  - `productModalOpen`, `editingProduct`
  - `mermaModalOpen`, `selectedProductForMerma`
  - `transferModalOpen`
- Renderiza el encabezado superior con el nombre del módulo y botón "Nuevo Producto", solapas de navegación con conteo dinámico, y el tab activo con sus respectivos modales.

---

## 6. Estrategia de Testing (Zero-Defect Gate)

1. **Pruebas de Dominio (`stockRules.test.ts`):**
   - `filterProducts`: búsqueda por nombre, SKU, PLU, código de barras (case-insensitive y con espacios); filtrado por categoría (`null` vs específica); filtrado por stock (`all` vs `critical`); combinación de los 3 filtros simultáneos; colección vacía.
   - `countCriticalProducts`: productos con stock ok (0 críticos), productos con stock low y critical (conteo exacto), productos sin objeto stock (fallback a 0).
   - `getAvailableDestinationBranches`: exclusión de la sucursal activa, lista vacía cuando solo hay una sucursal, preservación de sucursales ajenas.
   - `getDefaultCategoryId`: primera categoría si existe, `undefined` si lista vacía.
2. **Pruebas de Integración y Construcción:**
   - `pnpm run typecheck`: 0 errores con TypeScript en modo estricto.
   - `pnpm run lint`: 0 advertencias o errores ESLint.
   - `pnpm test`: 100% de la suite en verde (más de 235 tests unitarios).
   - `pnpm run build`: bundle de producción sin fallas.
