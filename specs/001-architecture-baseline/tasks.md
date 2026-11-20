# TASKS-001: Tareas de Implementación de Arquitectura Base y Barreras de Calidad

- **Especificación:** [SPEC-001: specs/001-architecture-baseline/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/001-architecture-baseline/spec.md)
- **Plan Técnico:** [PLAN-001: specs/001-architecture-baseline/plan.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/001-architecture-baseline/plan.md)
- **Estado:** Aprobado

---

## Fase 1: Contratos Base e Infraestructura Compartida

- [x] **[T-01] Definir contratos del patrón Result y tipos de error de validación**
  - **Archivos a crear/modificar:** `src/types/result.ts`, `src/types/index.ts`
  - **Descripción:** Implementar los tipos discriminados `Result<T, E>`, `ValidationError` y las funciones auxiliares `ok()` y `fail()` en TypeScript estricto, sin librerías externas.
  - **Hecho cuando:** Los tipos y constructores se exportan desde `src/types/` y compilan limpiamente en `pnpm run typecheck`.

- [x] **[T-02] Saneamiento y suite de tests para utilidades técnicas en `src/lib/utils.ts`**
  - **Archivos a crear/modificar:** `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - **Descripción:** Remover de `src/lib/utils.ts` las funciones de negocio (`canAccess`, `getStockStatus`, `calculateMargin`, `calculateSellPrice`). Mantener únicamente helpers puros (`cn`, formateadores y generador de ID) y crear su suite de pruebas unitarias.
  - **Hecho cuando:** `pnpm test src/lib/utils.test.ts` pasa al 100% en verde con cobertura total de líneas.

- [x] **[T-03] Implementar adaptador de almacenamiento seguro y resiliente (`src/lib/storage.ts`)**
  - **Archivos a crear/modificar:** `src/lib/storage.ts`, `src/lib/storage.test.ts`
  - **Descripción:** Crear un adaptador de lectura/escritura para `localStorage` que valide la versión del payload, capture excepciones por JSON malformado, genere un volcado de rescate bajo `backup_corrupt_<key>_<timestamp>` y retorne el fallback por defecto sin quebrar la ejecución.
  - **Hecho cuando:** Las pruebas en `src/lib/storage.test.ts` simulan JSON corrupto, confirman la creación del backup y pasan al 100% en Vitest.

---

## Fase 2: Implementación TDD de Lógica Pura por Dominio (100% Coverage)

- [x] **[T-04] TDD Dominio POS: Cálculos de ticket, redondeo legal a $10 y vuelto**
  - **Archivos a crear:** `src/features/pos/domain/calculations.ts`, `src/features/pos/domain/calculations.test.ts`
  - **Descripción:** Implementar con TDD las funciones puras `calculateItemSubtotal`, `calculateCartSubtotal`, `calculateLegalRounding`, `calculateCartTotal`, `calculateChange` y `mergeOrAddItem`.
  - **Hecho cuando:** `pnpm test src/features/pos/domain/calculations.test.ts` pasa al 100% cubriendo casos nominales y bordes (redondeos exactos, centavos, importes inferiores al total).

- [x] **[T-05] TDD Dominio POS: Validadores de pesaje de balanza y códigos de barras**
  - **Archivos a crear:** `src/features/pos/domain/validators.ts`, `src/features/pos/domain/validators.test.ts`
  - **Descripción:** Implementar `validateWeightInput` (rechaza `<= 0`, `NaN`, infinitos) y `validateBarcode` (rechaza strings vacíos o con solo espacios) retornando `Result<T, ValidationError>`.
  - **Hecho cuando:** La suite de tests rechaza valores inválidos con el código de error correspondiente y pasa al 100% en Vitest.

- [x] **[T-06] TDD Dominio Caja y Roles: Arqueo de gaveta, movimientos y jerarquía de permisos**
  - **Archivos a crear:** `src/features/cash-register/domain/cashCalculations.ts`, `src/features/cash-register/domain/cashCalculations.test.ts`, `src/features/cash-register/domain/permissions.ts`, `src/features/cash-register/domain/permissions.test.ts`
  - **Descripción:** Implementar funciones puras para calcular subtotales de billetes en pesos argentinos, total físico recontado, diferencias contra efectivo esperado, deltas de movimientos y matriz jerárquica de roles (`EMPLEADO`, `GERENTE`, `DUEÑO`).
  - **Hecho cuando:** Ambas suites pasan al 100% en Vitest con cobertura completa de branches.

- [x] **[T-07] TDD Dominio Inventario: Precios, márgenes y reglas de deducción de stock**
  - **Archivos a crear:** `src/features/inventory/domain/pricing.ts`, `src/features/inventory/domain/pricing.test.ts`, `src/features/inventory/domain/stockRules.ts`, `src/features/inventory/domain/stockRules.test.ts`
  - **Descripción:** Implementar `calculateMargin`, `calculateSellPrice`, `getStockStatus` ('ok' | 'low' | 'critical'), `deductStock` (para mermas) y `validateTransfer` utilizando el patrón `Result`.
  - **Hecho cuando:** Ambas suites pasan al 100% en Vitest verificando umbrales de stock y divisiones por cero.

- [x] **[T-08] TDD Dominio Compras: Conversión y equivalencia de bultos/cajones a unidades**
  - **Archivos a crear:** `src/features/purchases/domain/packConversions.ts`, `src/features/purchases/domain/packConversions.test.ts`
  - **Descripción:** Implementar `convertPacksToUnits`, `convertUnitsToPacks` y `validatePackInput` retornando `Result<{ packs: number; units: number }, ValidationError>`..
  - **Hecho cuando:** `pnpm test src/features/purchases/domain/packConversions.test.ts` pasa al 100% cubriendo entradas fraccionadas y cero.

- [x] **[T-09] TDD Dominio Clientes: Límites de crédito, estados de cuenta y cobranza de fiado**
  - **Archivos a crear:** `src/features/customers/domain/creditRules.ts`, `src/features/customers/domain/creditRules.test.ts`
  - **Descripción:** Implementar `calculateCreditUsagePct`, `getCreditStatus` ('ok' | 'warning' | 'critical') y `applyPayment` (validando que el abono no supere la deuda ni sea `<= 0`).
  - **Hecho cuando:** `pnpm test src/features/customers/domain/creditRules.test.ts` pasa al 100% en Vitest.

- [x] **[T-10] TDD Dominio Asistencia: Validación de formato y verificación de PIN**
  - **Archivos a crear:** `src/features/attendance/domain/pinValidator.ts`, `src/features/attendance/domain/pinValidator.test.ts`
  - **Descripción:** Implementar `validatePinFormat` (exactamente 4 dígitos numéricos) y `verifyUserPin` desacopladas de React.
  - **Hecho cuando:** `pnpm test src/features/attendance/domain/pinValidator.test.ts` pasa al 100% en Vitest.

---

## Fase 3: Reorganización Modular y Desacoplamiento de UI/Stores

- [x] **[T-11] Normalizar la anatomía interna de carpetas y crear barreras `index.ts`**
  - **Archivos a crear/mover:**
    - Mover vistas a `src/features/<dominio>/components/<Dominio>View.tsx` (para pos, inventory, purchases, customers, cash-register, attendance, dashboard).
    - Crear `src/features/<dominio>/index.ts` en cada una de las 7 features exportando únicamente componentes de vista y hooks públicos.
  - **Hecho cuando:** No quedan vistas en la raíz de ninguna feature y cada módulo cuenta con su `index.ts` como API pública.

- [x] **[T-12] Refactorizar Zustand stores para consumir lógica pura de `domain/`**
  - **Archivos a modificar:** `src/stores/usePosStore.ts`, `src/stores/useCashRegisterStore.ts`
  - **Descripción:** Eliminar los cálculos matemáticos embebidos en los stores; delegar la adición de ítems, totales, redondeos y diferencias en las funciones de `domain/`. Conectar el middleware de persistencia al adaptador seguro de `src/lib/storage.ts`.
  - **Hecho cuando:** Los stores solo mutan estado orquestado y no contienen algoritmos matemáticos ni conversiones de redondeo directas.

- [x] **[T-13] Refactorizar componentes visuales y enrutador (`App.tsx`)**
  - **Archivos a modificar:** `src/features/*/components/*View.tsx`, `src/App.tsx`, `src/layouts/AppLayout.tsx`
  - **Descripción:** Reemplazar en las vistas los cálculos inline por las funciones de `domain/`. Desacoplar `CustomersView` para que no importe directamente `useCashRegisterStore`. Actualizar `App.tsx` para importar exclusivamente desde `@/features/<dominio>`.
  - **Hecho cuando:** Cero cálculos de negocio residen en componentes JSX y todas las rutas se resuelven a través de la API pública de cada feature.

---

## Fase 4: Barreras Estáticas y Certificación del Gate Final

- [x] **[T-14] Configurar barreras estáticas en TypeScript y ESLint contra `any` e imports en `domain/`**
  - **Archivos a modificar:** `tsconfig.app.json`, `eslint.config.js`
  - **Descripción:** Configurar `@typescript-eslint/no-explicit-any: error` y añadir regla de restricción para prohibir terminantemente que cualquier archivo dentro de `src/features/**/domain/**` importe de `react`, `react-dom`, `zustand` o archivos con extensión `.tsx`.
  - **Hecho cuando:** Un intento intencional de importar React en un archivo de dominio o usar `any` es bloqueado por `pnpm run lint` y `pnpm run typecheck`.

- [x] **[T-15] Configurar reporte de cobertura y certificar el Gate 100% Verde**
  - **Archivos a modificar:** `vite.config.ts`, `package.json`
  - **Descripción:** Configurar en Vitest el umbral de 100% de cobertura en líneas y branches para `src/features/*/domain/**` y `src/lib/**`. Ejecutar la verificación completa.
  - **Hecho cuando:** La ejecución de `pnpm run typecheck && pnpm run lint && pnpm test` finaliza con código de salida 0, sin advertencias y con 100% de cobertura en lógica pura.
