# PLAN-001: Implementación de Arquitectura Base, Aislamiento de Dominio y Barreras de Calidad

- **Especificación:** [SPEC-001: specs/001-architecture-baseline/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/001-architecture-baseline/spec.md)
- **Estado:** Aprobado
- **Fecha:** 2026-11-18
- **Objetivo:** Refactorizar la estructura actual para erradicar acoplamientos, aislar la lógica en funciones puras por dominio, incorporar validación Result/Either y blindar el pipeline con Vitest (100% coverage en domain).

---

## 1. Resumen de Auditoría del Código Actual

Tras inspeccionar `src/`, se identificaron las siguientes violaciones a la especificación aprobada:

| Ubicación Actual | Hallazgo / Violación de SPEC-001 | Acción Requerida |
| :--- | :--- | :--- |
| `src/lib/utils.ts` | Contiene lógica de negocio específica (`canAccess`, `getStockStatus`, `calculateMargin`, `calculateSellPrice`). | Extraer la lógica a `inventory/domain/` y `cash-register/domain/`. Limitar `lib/` a helpers técnicos puros. |
| `src/stores/usePosStore.ts` | Métodos computados (`subtotal`, `total`, `change`) y lógica de redondeo a $10 (`Math.round(sub/10)*10`) embebidos en el store. | Extraer a funciones puras en `pos/domain/calculations.ts`. El store solo orquesta. |
| `src/stores/useCashRegisterStore.ts` | Lógica de conteo de billetes (`b.denomination * b.count`), cálculo de diferencia y deltas de movimientos ejecutados dentro del store. | Extraer a `cash-register/domain/cashCalculations.ts`. |
| `src/features/purchases/PurchasesView.tsx` | Conversión de bultos a unidades (`pks * unitsPerPack`), cálculo de unidades a bultos y recálculo de margen embebidos en handlers de React. | Extraer a `purchases/domain/packConversions.ts`. |
| `src/features/inventory/InventoryView.tsx` | Deducción de stock para mermas y traslados ejecutada directamente con `Math.max(0, stock - qty)` en el componente visual. | Extraer a `inventory/domain/stockRules.ts`. |
| `src/features/customers/CustomersView.tsx` | Lógica de saldo (`currentBalance - amount`), cálculo de porcentaje de crédito y estado crítico en JSX; además importa directamente `useCashRegisterStore`. | Extraer a `customers/domain/accountRules.ts` y desacoplar la mutación cruzada. |
| `src/features/*/` | Ningún módulo cuenta actualmente con subcarpeta `domain/` ni con archivo de barrera `index.ts`. Vistas ubicadas en la raíz del feature. | Crear `domain/`, mover vistas a `components/` y formalizar la API pública en `index.ts`. |
| `localStorage` | Los stores de Zustand usan persistencia estándar sin control de versiones ni aislamiento preventivo ante payloads corruptos. | Implementar adaptador resiliente con versión y respaldo `backup_corrupt_<timestamp>`. |

---

## 2. Arquitectura Técnica Detallada

### 2.1. Contratos Base: Patrón Result y Errores (`src/types/result.ts`)
Para cumplir **Minimal Stack (Zero Bloat)** sin dependencias externas:

```typescript
export type Result<T, E = ValidationError> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface ValidationError {
  code: string;       // ej. 'INVALID_PRICE', 'INVALID_WEIGHT', 'NEGATIVE_NOT_ALLOWED'
  message: string;    // Mensaje en español amigable para la UI
  field?: string;
}

export const ok = <T>(data: T): Result<T, never> => ({ success: true, data });
export const fail = <E = ValidationError>(error: E): Result<never, E> => ({ success: false, error });
```

### 2.2. Mapeo de Extracción de Funciones Puras (`src/features/<dominio>/domain/`)

#### A. Dominio Punto de Venta (`src/features/pos/domain/`)
- **`calculations.ts`**:
  - `calculateItemSubtotal(quantity: number, unitPrice: number): number`
  - `calculateCartSubtotal(items: readonly CartItem[]): number`
  - `calculateLegalRounding(subtotal: number): number` (Redondeo de caja argentino al escalón de $10)
  - `calculateCartTotal(subtotal: number): number`
  - `calculateChange(total: number, amountPaid: number): number`
  - `mergeOrAddItem(items: readonly CartItem[], newItem: CartItem): CartItem[]` (Fusión de unidades idénticas)
- **`validators.ts`**:
  - `validateWeightInput(kg: number): Result<number, ValidationError>` (Rechaza `<= 0`, `NaN`, infinitos)
  - `validateBarcode(code: string): Result<string, ValidationError>` (Rechaza strings vacíos/espacios)

#### B. Dominio Caja y Roles (`src/features/cash-register/domain/`)
- **`cashCalculations.ts`**:
  - `calculateBillSubtotal(denomination: number, count: number): number`
  - `calculateTotalCounted(bills: readonly BillCount[]): number`
  - `calculateCashDifference(countedCash: number, expectedCash: number): number`
  - `calculateMovementDelta(type: CashMovementType, amount: number): number`
- **`permissions.ts`**:
  - `canAccess(userRole: UserRole, requiredRole: UserRole): boolean`

#### C. Dominio Inventario (`src/features/inventory/domain/`)
- **`pricing.ts`**:
  - `calculateMargin(cost: number, sell: number): number`
  - `calculateSellPrice(cost: number, marginPct: number): number`
- **`stockRules.ts`**:
  - `getStockStatus(currentStock: number, minStock: number): 'ok' | 'low' | 'critical'`
  - `deductStock(currentStock: number, quantityToDeduct: number): Result<number, ValidationError>`
  - `validateTransfer(currentStock: number, quantity: number): Result<number, ValidationError>`

#### D. Dominio Compras y Proveedores (`src/features/purchases/domain/`)
- **`packConversions.ts`**:
  - `convertPacksToUnits(packs: number, unitsPerPack: number): number`
  - `convertUnitsToPacks(units: number, unitsPerPack: number): number`
  - `validatePackInput(packs: number, unitsPerPack: number): Result<{ packs: number; units: number }, ValidationError>`

#### E. Dominio Clientes y Cuentas Corrientes (`src/features/customers/domain/`)
- **`creditRules.ts`**:
  - `calculateCreditUsagePct(currentBalance: number, creditLimit: number): number`
  - `getCreditStatus(currentBalance: number, creditLimit: number): 'ok' | 'warning' | 'critical'`
  - `applyPayment(currentBalance: number, paymentAmount: number): Result<number, ValidationError>`

#### F. Dominio Fichaje de Asistencia (`src/features/attendance/domain/`)
- **`pinValidator.ts`**:
  - `validatePinFormat(pin: string): Result<string, ValidationError>` (4 dígitos numéricos)
  - `verifyUserPin(inputPin: string, actualPin?: string): boolean`

---

### 2.3. Estructura de Carpetas Resultante

```text
src/
├── types/
│   ├── index.ts               # Contratos compartidos transversales
│   └── result.ts              # Result<T, E> y ValidationError
├── lib/
│   ├── utils.ts               # cn, formatCurrency, formatWeight, formatDateTime (puro cross-cutting)
│   └── storage.ts             # Adaptador de persistencia segura y tolerante a fallos
├── features/
│   ├── pos/
│   │   ├── domain/
│   │   │   ├── calculations.ts
│   │   │   ├── calculations.test.ts
│   │   │   ├── validators.ts
│   │   │   └── validators.test.ts
│   │   ├── components/
│   │   │   └── PosView.tsx
│   │   ├── stores/
│   │   │   └── usePosStore.ts
│   │   └── index.ts           # Exporta PosView y usePosStore
│   ├── inventory/
│   │   ├── domain/
│   │   │   ├── pricing.ts
│   │   │   ├── pricing.test.ts
│   │   │   ├── stockRules.ts
│   │   │   └── stockRules.test.ts
│   │   ├── components/
│   │   │   └── InventoryView.tsx
│   │   └── index.ts           # Exporta InventoryView
│   ├── purchases/
│   │   ├── domain/
│   │   │   ├── packConversions.ts
│   │   │   └── packConversions.test.ts
│   │   ├── components/
│   │   │   └── PurchasesView.tsx
│   │   └── index.ts           # Exporta PurchasesView
│   ├── customers/
│   │   ├── domain/
│   │   │   ├── creditRules.ts
│   │   │   └── creditRules.test.ts
│   │   ├── components/
│   │   │   └── CustomersView.tsx
│   │   └── index.ts           # Exporta CustomersView
│   ├── cash-register/
│   │   ├── domain/
│   │   │   ├── cashCalculations.ts
│   │   │   ├── cashCalculations.test.ts
│   │   │   ├── permissions.ts
│   │   │   └── permissions.test.ts
│   │   ├── components/
│   │   │   └── CashRegisterView.tsx
│   │   ├── stores/
│   │   │   └── useCashRegisterStore.ts
│   │   └── index.ts           # Exporta CashRegisterView y useCashRegisterStore
│   ├── attendance/
│   │   ├── domain/
│   │   │   ├── pinValidator.ts
│   │   │   └── pinValidator.test.ts
│   │   ├── components/
│   │   │   └── AttendanceView.tsx
│   │   └── index.ts           # Exporta AttendanceView
│   └── dashboard/
│       ├── components/
│       │   └── DashboardView.tsx
│       └── index.ts           # Exporta DashboardView
├── components/ui/
│   └── Modal.tsx
├── layouts/
│   └── AppLayout.tsx
├── App.tsx                    # Rutas importando desde @/features/<dominio>
└── main.tsx
```

---

## 3. Estrategia de Pruebas Unitarias y Cobertura (Vitest)

1. **Configuración de Cobertura en Vitest (`vite.config.ts`):**
   Configurar el proveedor `v8` con umbrales del 100% en `statements`, `branches`, `functions` y `lines` para los archivos coincidentes con `src/features/*/domain/**/*.ts` y `src/lib/**/*.ts`.
2. **Estructura Colocalizada de Tests:**
   Cada archivo de lógica pura tendrá su contraparte directa `*.test.ts` en la misma carpeta `domain/`.
3. **Casos Obligatorios a Testear:**
   - Casos nominales (sumas, multiplicaciones, márgenes exactos).
   - Casos límite numéricos: `0`, números negativos, `NaN`, decimales flotantes (ej. `0.1 + 0.2` en moneda), redondeos a múltiplos de 10.
   - Casos límite de strings: caracteres especiales, espacios, códigos inválidos.
   - Manejo de ramas en `Result` (éxito `ok` vs. falla `fail`).

---

## 4. Barreras Estáticas y Reglas de Tipado

1. **TypeScript (`tsconfig.app.json`):**
   Asegurar `strict: true`, `noImplicitAny: true` y `exactOptionalPropertyTypes: true`.
2. **ESLint (`eslint.config.js`):**
   - Regla activa: `'@typescript-eslint/no-explicit-any': 'error'`.
   - Regla de restricción de imports: Prohibir explícitamente que los archivos bajo `src/features/**/domain/**` importen de `react`, `react-dom`, `zustand`, `@tanstack/react-query` o cualquier ruta con extensiones de componentes (`.tsx`).
3. **Prohibición de Deep Imports:**
   Configurar ESLint con `no-restricted-imports` para que cualquier import fuera de una feature deba apuntar a `@/features/<modulo>` y no a submódulos internos.

---

## 5. Criterios de Verificación Paso a Paso

1. **Fase 1 (Contratos y Lib):**
   - Crear `src/types/result.ts`.
   - Limpiar `src/lib/utils.ts` dejando solo utilidades técnicas.
   - Crear `src/lib/storage.ts` con tolerancia a JSON corrupto y backup.
   - Verificar: `pnpm run typecheck` limpio.
2. **Fase 2 (Extracción de Lógica Pura y Tests):**
   - Crear los archivos de `domain/` y sus suites `*.test.ts` por cada feature.
   - Ejecutar suite: `pnpm test` (100% verde en lógica de dominio).
3. **Fase 3 (Adaptación de Stores y Componentes):**
   - Refactorizar stores para consumir las funciones de `domain/`.
   - Mover vistas a `components/` y reemplazar cálculos por funciones puras.
   - Crear `index.ts` en cada feature.
   - Actualizar rutas en `App.tsx` para importar desde la API pública de cada feature.
4. **Fase 4 (Gate Final de Auditoría):**
   - Ejecutar linteo: `pnpm run lint` (0 advertencias, 0 errores).
   - Ejecutar typecheck: `pnpm run typecheck` (0 errores).
   - Ejecutar tests y cobertura: `pnpm test --coverage` (100% en `domain/` y `lib/`).
   - Compilación final: `pnpm run build` (cero errores).
