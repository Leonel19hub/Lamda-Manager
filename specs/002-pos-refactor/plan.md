# PLAN-002: Refactorización del Módulo POS, Orquestación de Cobro y Optimización de Rendimiento

- **Especificación:** [SPEC-002: specs/002-pos-refactor/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/002-pos-refactor/spec.md)
- **Estado:** Aprobado
- **Fecha:** 2026-11-20
- **Objetivo:** Desacoplar `PosView.tsx` (1.040 líneas), encapsular la lógica comercial en funciones puras, centralizar el cobro en un Application Service con soporte de reversión (*rollback*), eliminar alias obsoletos de medios de pago y optimizar la reactividad para hardware de mostrador (lectores USB en PCs Celeron/i3).

---

## 1. Diagnóstico del Módulo POS y Acciones Técnicas

| Ubicación Actual | Hallazgo / Desvío Arquitectónico | Acción Técnica en PLAN-002 |
| :--- | :--- | :--- |
| `PosView.tsx` (L156–L202) | Muta directamente `useCashRegisterStore.setState()` y acumula totales financieros (`expectedCash`, `totalCard`, etc.) en el componente de UI. | Extraer a la función pura `applySaleToRegister` en `cash-register/domain/` y exponer la acción `recordSale(sale)` en `useCashRegisterStore`. |
| `PosView.tsx` (L33–L55) | Consume `usePosStore()` sin selectores atómicos ni `useShallow`, re-renderizando 1.040 líneas con cada tecla o escaneo. | Dividir `PosView` en subcomponentes atómicos (`ProductCatalogPanel`, `CartTicketPanel`, `CheckoutPanel`, `PosHardwareBar`) con suscripciones acotadas. |
| `usePosStore.ts` (L267–L281) | `checkoutTicket` dispara efectos secundarios sobre `useInventoryStore` y `useCustomerStore` directamente en el store de UI. | Mover la coordinación transaccional al servicio de aplicación `executePosCheckout` en `pos/application/checkoutService.ts`. |
| `PosView.tsx` (L184–L190) vs `usePosStore.ts` (L274) | Inconsistencia: en pagos mixtos con cuenta corriente, `PosView` sumaba deuda a la caja, pero `usePosStore` no imputaba el fiado en `useCustomerStore`. | `executePosCheckout` imputa la deuda en `useCustomerStore` evaluando la porción de cuenta corriente (`splitPayments`). |
| `PosView.tsx` (L166–L183) | Uso de alias de medios de pago (`'cash'`, `'card'`, `'transfer_qr'`, `'account'`). | Normalizar a los tipos canónicos (`'efectivo'`, `'debito'`, `'credito'`, `'transferencia_qr'`, `'cuenta_corriente'`, `'mixto'`). |
| `PosView.tsx` (L27) | Importa `mockCategories` directamente y usa el identificador artificial `'cat-01'` como "Todas". | Alojar `categories` en `useInventoryStore` y tipar `selectedCategory: string | null` (donde `null` representa "Todas"). |
| `PosView.tsx` (L258, L291) | `setTimeout` sin limpieza de memoria (*cleanup*) en `scannerNotification`, `checkoutError` y `checkoutSuccess`. | Crear el hook `useTimedNotice` con gestión de `timeoutId` en `useRef` y desmontaje seguro. |

---

## 2. Decisiones de Arquitectura

- **ADR-1: Application Service liviano (`checkoutService.ts`):** En lugar de librerías de sagas o mutaciones cruzadas sin control, un orquestador funcional determinista (`executePosCheckout`) captura *snapshots* en memoria de los stores (inventario, caja, cliente), ejecuta las mutaciones en `try/catch` y restaura los estados previos si alguna etapa falla.
- **ADR-2: Escáner USB no controlado + selectores atómicos:** El input receptor del escáner en `PosHardwareBar` se mantiene como elemento no controlado (`ref`), procesando el código únicamente ante el evento `Enter`. Esto evita 13 re-renders por cada escaneo láser.
- **ADR-3: Normalización de `PaymentMethod`:** Se eliminan los 4 alias heredados de compatibilidad (`'cash'`, `'card'`, `'transfer_qr'`, `'account'`). Todo el sistema opera con los 6 valores canónicos en español coincidentes con `src/db/schema.sql`.
- **ADR-4: Redondeo legal discriminado (Ley 25.954):** El redondeo a múltiplos de $10 opera exclusivamente para cobros en `efectivo`. Pagos con `debito`, `credito`, `transferencia_qr` y `cuenta_corriente` liquidan centavos exactos. En `mixto`, las partes deben sumar con exactitud el total del ticket.

---

## 3. Especificación de Firmas y Tipos

### 3.1. Dominio Caja (`src/features/cash-register/domain/cashCalculations.ts`)
```typescript
/**
 * Imputa los importes de una venta cerrada a los acumuladores de la gaveta de caja activa.
 * Es pura, inmutable y redondea a 2 decimales.
 */
export function applySaleToRegister(
  register: Readonly<CashRegister>,
  sale: Readonly<Sale>
): CashRegister;
```

### 3.2. Dominio POS (`src/features/pos/domain/`)

#### A. Cálculos (`calculations.ts`)
```typescript
/**
 * Construye una entidad CartItem tipada y validada a partir de un producto y cantidad.
 */
export function createCartItem(
  product: Readonly<Product>,
  quantity: number,
  discountPercent?: number,
  idGenerator?: () => string
): CartItem;

/**
 * Calcula los importes por defecto para un cobro mixto (50% efectivo y 50% digital).
 */
export function calculateSplitDefaults(
  total: number
): { cash: number; digital: number };

/**
 * Calcula el total del ticket discriminando por medio de pago (redondeo a $10 solo para efectivo).
 */
export function calculateCheckoutTotal(
  subtotal: number,
  paymentMethod: PaymentMethod
): number;
```

#### B. Validadores (`validators.ts`)
```typescript
/**
 * Valida si la imputación a cuenta corriente (total o parcial en mixto) supera el crédito disponible del cliente.
 */
export function isCustomerOverCreditLimit(
  paymentMethod: PaymentMethod,
  customer: Readonly<Customer> | null,
  cartTotal: number,
  splitPayments?: readonly SplitPayment[]
): { isOver: boolean; excessAmount: number };
```

---

## 4. Capa de Aplicación: Orquestación Transaccional (`src/features/pos/application/`)

### 4.1. Servicio de Cobro (`checkoutService.ts`)
```typescript
export interface CheckoutContext {
  activeRegister: CashRegister | null;
  currentUser: { id: string; name: string; role: UserRole } | null;
  activeBranch: { id: string; name: string } | null;
  warehouseId?: string;
}

export function executePosCheckout(
  ctx: CheckoutContext
): Result<Sale, ValidationError>;
```

#### Flujo de Ejecución y Garantía de Integridad:
1. **Validación Previa (Pura / Read-only):**
   - Verificar caja abierta (`REGISTER_CLOSED`).
   - Verificar carrito con al menos 1 ítem (`CART_EMPTY`).
   - Verificar cliente seleccionado si aplica `cuenta_corriente` (`CUSTOMER_REQUIRED`).
   - Validar límite de crédito del cliente si hay porción a fiado (`CREDIT_LIMIT_EXCEEDED`).
   - Verificar que el monto abonado en efectivo cubra el total (`INSUFFICIENT_PAYMENT`).
   - Si el pago es mixto, verificar coincidencia exacta de la suma de partes (`SPLIT_SUM_MISMATCH`).
2. **Captura de Snapshots en Memoria:**
   - `inventorySnapshot`: Copia superficial de los productos a descontar.
   - `customerSnapshot`: Copia del cliente antes de la imputación.
   - `registerSnapshot`: Copia de `currentRegister`.
3. **Paso a Paso Transaccional (`try / catch`):**
   - **Paso 1:** Descontar existencias en `useInventoryStore.deductProductStock()`.
   - **Paso 2:** Si hay fiado (total o en split), imputar deuda en `useCustomerStore.chargeAccount()`.
   - **Paso 3:** Imputar recaudación en caja mediante `useCashRegisterStore.recordSale(sale)`.
   - **Paso 4:** Emitir ticket y limpiar carrito en `usePosStore.commitSale(sale)`.
4. **Mecanismo de Rollback en `catch`:**
   - Si ocurre una excepción o fallo inesperado:
     - Restaurar existencias en `useInventoryStore` con los valores de `inventorySnapshot`.
     - Restaurar cuenta corriente en `useCustomerStore` con `customerSnapshot`.
     - Restaurar caja en `useCashRegisterStore` con `registerSnapshot`.
     - Mantener el carrito de compras de `usePosStore` **intacto**.
     - Retornar `fail({ code: 'CHECKOUT_TRANSACTION_FAILED', message: ... })`.

---

## 5. Extracción de Custom Hooks

1. **`useTimedNotice`:** Gestión de mensajes temporales (notificaciones de escáner, errores y éxitos de cobro) con cancelación segura de `setTimeout` al desmontar.
2. **`usePosScannerFocus`:** Autofoco condicional en el input del escáner que respeta el foco si el usuario interactúa con inputs de texto o tiene un modal abierto.
3. **`usePosHotkeys`:** Manejador de teclado para `F12` (cobro), `F2` (búsqueda rápida), `F7` (tara de balanza) y `Escape` (cierre de modales o limpieza de búsqueda y foco a escáner).
4. **`usePosBarcodeHandler`:** Orquestación de códigos escaneados: detección de prefijo 20 (balanza EAN-13), búsqueda por PLU/Barcode/SKU, apertura de pesaje y avisos de no encontrado.

---

## 6. Descomposición de la Interfaz (`src/features/pos/components/`)

```text
src/features/pos/components/
├── PosView.tsx                 # Contenedor orquestador (~120 líneas)
├── PosHardwareBar.tsx          # Barra de escáner USB, peso de balanza y avisos temporales
├── ProductCatalogPanel.tsx     # Buscador de catálogo y pestañas de categorías
├── ProductCard.tsx             # Tarjeta de producto individual (React.memo)
├── CartTicketPanel.tsx         # Cabecera de ticket, selector de cliente y lista de ítems
├── CartItemRow.tsx             # Fila individual de ítem en carrito (React.memo)
├── CheckoutPanel.tsx           # Panel de cobro: métodos de pago, mixto, vuelto y botón cobrar
├── WeighProductModal.tsx       # Modal de pesaje con balanza o presets rápidos
└── CustomerSelectModal.tsx     # Modal de búsqueda y selección de cliente
```

---

## 7. Estrategia de Testing (TDD)

- **`cashCalculations.test.ts`:**
  - Imputación de venta en efectivo, débito, crédito, QR y cuenta corriente.
  - Imputación de venta en pago mixto con partes combinadas.
  - Inmutabilidad del registro de caja original y redondeos a 2 decimales.
- **`calculations.test.ts` (POS):**
  - Construcción de `createCartItem` con y sin descuentos.
  - Cálculo de `calculateSplitDefaults` (50/50 exacto).
  - Redondeo de `calculateCheckoutTotal` (redondea solo si es `efectivo`).
- **`validators.test.ts` (POS):**
  - `isCustomerOverCreditLimit` para venta 100% cuenta corriente.
  - `isCustomerOverCreditLimit` para pago mixto evaluando solo la fracción fiada.
- **`checkoutService.test.ts`:**
  - Cobro exitoso en efectivo (descuenta inventario, suma a caja y emite ticket).
  - Cobro exitoso mixto con fiado (imputa en cliente y en caja correctamente).
  - Simulación de error a mitad de camino y verificación de reversión (*rollback*).

---

## 8. Verificación de No Regresión (*Zero-Defect Gate*)

Antes de dar por finalizada la refactorización:
1. `pnpm run typecheck` (0 errores en TypeScript estricto).
2. `pnpm run lint` (0 advertencias críticas en ESLint).
3. `pnpm test` (100% de tests verdes, superando los 172 tests actuales).
4. `pnpm run build` (compilación limpia para producción con Vite).
