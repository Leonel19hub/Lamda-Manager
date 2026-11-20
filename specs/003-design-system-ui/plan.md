# PLAN-003: Design System Mínimo y Primitivas de Interfaz

- **Especificación:** [SPEC-003: specs/003-design-system-ui/spec.md](file:///c:/Users/leone.DESKTOP-BM9FAGB/Desktop/Leonel/Lamda-Manager/specs/003-design-system-ui/spec.md)
- **Estado:** Aprobado
- **Fecha:** 2026-11-20
- **Objetivo:** Construir una biblioteca de 7 primitivas esenciales (`Button`, `Badge`, `Input`, `Select`, `AlertBanner`, `Card`, `EmptyState`) más la adecuación de `Modal` en `src/components/ui/`, 100% tipadas con `React.ComponentPropsWithRef` en React 19, basadas en tokens semánticos (incorporando tokens de advertencia en `src/index.css`), sin dependencias externas y validadas mediante adopción piloto en el módulo POS.

---

## 1. Diagnóstico de UI y Acciones Técnicas

| Elemento / Archivo Actual | Diagnóstico / Deuda Técnica | Acción Técnica en PLAN-003 |
| :--- | :--- | :--- |
| **Tokens en `src/index.css`** | Faltan tokens para estados de advertencia; `Badge` y avisos warning recurren a clases crudas `bg-amber-*` o `bg-yellow-*`. | Agregar `--color-warning`, `--color-on-warning`, `--color-warning-container` y `--color-on-warning-container` a `@theme`. |
| **`<button>` (88 instancias)** | Clases de variantes, padding, foco y estados de carga (`isLoading`) dispersos y dispares en 19 archivos. | Crear `Button.tsx` con variantes semánticas (`primary`, `secondary`, `outline`, `ghost`, `danger`), tamaños (`sm`, `md`, `lg`) y soporte `ref`. |
| **Etiquetas de estado / Badges** | Estilos `rounded-full text-xs px-2.5 py-0.5` repetidos manualmente para stock, balanza, caja y roles. | Crear `Badge.tsx` con variantes semánticas (`success`, `warning`, `danger`, `info`, `neutral`), tamaños (`sm`, `md`) y prop `dot`. |
| **`<input>` (48 instancias)** | Manejo inconsistente de labels, errores, íconos y foco. Riesgo de romper el escáner no controlado de POS. | Crear `Input.tsx` con `React.ComponentPropsWithRef<'input'>`, slots para íconos/elementos y pasaje nativo de `ref`. |
| **`<select>` (10 instancias)** | Estilos desalineados con inputs; etiquetas y estados de error no estandarizados. | Crear `Select.tsx` con `React.ComponentPropsWithRef<'select'>`, soporte para `options` estructurado y `children` nativos. |
| **Avisos de Alerta / Banners** | Banners de error de cobro, caja cerrada y notificaciones de escáner maquetados con `div` ad-hoc en POS. | Crear `AlertBanner.tsx` con variantes (`info`, `success`, `warning`, `error`), ícono representativo y `onDismiss` opcional. |
| **Cards y Contenedores (38 instancias)** | `bg-surface-container-lowest rounded-xl border border-slate-200` reescrito en casi todas las pantallas. | Crear `Card.tsx` con control de padding (`none`, `sm`, `md`, `lg`) y estilos de superficie consistentes. |
| **Listas y Estados Vacíos** | Mensajes de "Carrito vacío" y "No se encontraron productos" construidos con markup arbitrario. | Crear `EmptyState.tsx` con ícono, título, descripción y slot opcional para acciones. |
| **`Modal.tsx` (existente)** | Carece de atributos ARIA explícitos (`role="dialog"`, `aria-modal="true"`). | Adecuar `Modal.tsx` agregando dichos atributos (clave para la detección en `usePosScannerFocus`). |
| **`src/components/ui/`** | No posee archivo barrel; las vistas importan componentes sueltos desde rutas internas. | Crear `src/components/ui/index.ts` exportando todas las primitivas y sus tipos. |

---

## 2. Decisiones de Arquitectura

- **ADR-1: 7 Primitivas Esenciales + Modal (Scope Controlado):** Se construyen estrictamente `Button`, `Badge`, `Input`, `Select`, `AlertBanner`, `Card` y `EmptyState`. No se incluyen componentes complejos (tabs, dropdowns flotantes, datepickers) para evitar sobreingeniería (Regla #2 *Minimal Stack*).
- **ADR-2: Cero Dependencias Adicionales (Zero-Bloat Styling):** Se prohíbe incorporar `class-variance-authority`, `tailwind-merge` o `clsx`. Las variantes se gestionan con diccionarios de TypeScript tipados (`Record<Variant, string>`) y la función utilitaria `cn()` existente en `src/lib/utils.ts`.
- **ADR-3: Tokens Semánticos MD3 Completos:** Se normalizan los colores sobre los tokens de `@theme` de `src/index.css`. Se agregan los tokens de advertencia (`--color-warning*`) para que ni `Badge` ni `AlertBanner` requieran colores crudos.
- **ADR-4: React 19 y `React.ComponentPropsWithRef` Consistente:** En React 19, `forwardRef` está deprecado y `ref` es una propiedad de primer nivel. Todas las primitivas de formulario (`Input`, `Button`, `Select`) extienden `React.ComponentPropsWithRef<'tag'>`, asegurando que `barcodeInputRef` en `PosHardwareBar` acceda al elemento DOM directamente sin intermediarios.
- **ADR-5: Adopción Piloto sin Regresión en POS:** La adopción se realiza sobre `src/features/pos/components/` respetando los contratos de rendimiento (`React.memo` en `ProductCard` y `CartItemRow`) y verificando el 100% de los 210 tests existentes. Las vistas monolíticas (`InventoryView`, etc.) se migrarán ordenadamente en sus respectivas especificaciones funcionales (SPEC-004 y SPEC-005).

---

## 3. Especificación de Tokens en `src/index.css`

Se añaden a la sección `@theme` los tokens de advertencia armonizados con Material Design 3:

```css
  /* ---- Warning Tokens (MD3 Amber/Orange) ---- */
  --color-warning: #b26a00;
  --color-on-warning: #ffffff;
  --color-warning-container: #ffddb8;
  --color-on-warning-container: #2b1700;
```

---

## 4. Especificación de Firmas, Props y Contratos de Primitivas

### 4.1. Helper Puro de Variantes (`src/components/ui/variants.ts`)
Para posibilitar pruebas unitarias sin DOM, la lógica de resolución de clases se aísla en funciones puras:

```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export function getButtonClasses(options: {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  className?: string
}): string

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type BadgeSize = 'sm' | 'md'

export function getBadgeClasses(options: {
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}): string

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export function getAlertClasses(options: {
  variant?: AlertVariant
  className?: string
}): string

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export function getCardClasses(options: {
  padding?: CardPadding
  className?: string
}): string
```

### 4.2. `Button.tsx`
```typescript
import React from 'react'
import { ButtonVariant, ButtonSize } from './variants'

export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}
```

### 4.3. `Badge.tsx`
```typescript
import React from 'react'
import { BadgeVariant, BadgeSize } from './variants'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: React.ReactNode
}
```

### 4.4. `AlertBanner.tsx`
```typescript
import React from 'react'
import { AlertVariant } from './variants'

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
  onDismiss?: () => void
  children?: React.ReactNode
}
```

### 4.5. `Card.tsx`
```typescript
import React from 'react'
import { CardPadding } from './variants'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  children: React.ReactNode
}
```

### 4.6. `EmptyState.tsx`
```typescript
import React from 'react'
import { LucideIcon } from 'lucide-react'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}
```

### 4.7. `Input.tsx`
```typescript
import React from 'react'

export interface InputProps extends React.ComponentPropsWithRef<'input'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
  containerClassName?: string
}
```

### 4.8. `Select.tsx`
```typescript
import React from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.ComponentPropsWithRef<'select'> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  containerClassName?: string
  children?: React.ReactNode
}
```

### 4.9. `Modal.tsx` (Adecuación Accesible)
Incorporación de `role="dialog"` y `aria-modal="true"` en el contenedor principal del diálogo, manteniendo sus props actuales (`isOpen`, `onClose`, `title`, `subtitle`, `maxWidth`, `children`).

### 4.10. `index.ts` (Barrel Público)
Exportación unificada de todos los componentes y sus tipos asociados desde `src/components/ui/index.ts`.

---

## 5. Plan de Adopción Piloto en el Módulo POS

| Subcomponente POS | Elementos Reemplazados por Primitivas UI |
| :--- | :--- |
| **`PosHardwareBar.tsx`** | Notificación efímera $\rightarrow$ `<AlertBanner variant="info">`.<br>Estado balanza y lector $\rightarrow$ `<Badge variant="success">`.<br>Botón Tara $\rightarrow$ `<Button variant="secondary" size="sm">`.<br>Lector USB $\rightarrow$ `<Input ref={barcodeInputRef} />` (soporte no controlado verificado). |
| **`CheckoutPanel.tsx`** | Avisos de caja cerrada, error de cobro y exceso de crédito $\rightarrow$ `<AlertBanner>`.<br>Selector de medios de pago, botones numéricos y botón confirmar venta $\rightarrow$ `<Button>`. |
| **`WeighProductModal.tsx`** | Input de peso manual $\rightarrow$ `<Input>`.<br>Botones de presets y acciones $\rightarrow$ `<Button>`. |
| **`CustomerSelectModal.tsx`** | Input de búsqueda de clientes $\rightarrow$ `<Input>`.<br>Botón de cierre / selección $\rightarrow$ `<Button>`. |
| **`ProductCard.tsx`** | Etiqueta de stock y pesable $\rightarrow$ `<Badge>`.<br>Botón agregar al carrito $\rightarrow$ `<Button>` (verificar memoización). |
| **`CartItemRow.tsx`** | Botones de incremento/decremento y eliminación $\rightarrow$ `<Button>` (verificar memoización). |
| **`CartTicketPanel.tsx`** | Carrito vacío $\rightarrow$ `<EmptyState icon={ShoppingCart} title="El carrito está vacío" description="..." />`. |
| **`ProductCatalogPanel.tsx`** | Sin resultados de búsqueda $\rightarrow$ `<EmptyState icon={PackageSearch} title="No se encontraron productos" description="..." />`. |

---

## 6. Estrategia de Testing y Verificación (*Zero-Defect Gate*)

1. **Tests Unitarios Puros (`src/components/ui/ui.test.ts`):**
   - Evaluar `getButtonClasses`: variante por defecto (`primary`), tamaños (`sm`, `md`, `lg`), estado `isLoading`, clases añadidas mediante `className`.
   - Evaluar `getBadgeClasses`: variantes semánticas (`success`, `warning`, `danger`, `info`, `neutral`) y tamaños.
   - Evaluar `getAlertClasses`: variantes semánticas (`info`, `success`, `warning`, `error`).
   - Evaluar `getCardClasses`: paddings (`none`, `sm`, `md`, `lg`).
   - Total esperado: $\ge 12$ nuevos tests puros en Vitest.
2. **Typecheck Estricto:** `pnpm run typecheck` sin errores con React 19.
3. **Linter:** `pnpm run lint` con 0 advertencias.
4. **Pruebas de Regresión:** `pnpm test` (210 tests preexistentes + nuevos tests de variantes al 100% verde).
5. **Build de Producción:** `pnpm run build` (`tsc -b && vite build`) exitoso con 0 fallos.
6. **Verificación en Mostrador:** Comprobación manual en navegador (`pnpm run dev`) validando que el escaneo continuo, pesaje y atajos de teclado sigan operando fluidamente.
