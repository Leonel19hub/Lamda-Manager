# SPEC-003: Design System Mínimo y Primitivas de Interfaz

- **Estado:** Aprobada
- **Fecha:** 2026-11-20
- **Área:** Core UI / Design System (`src/components/ui/`)
- **Autores:** Analista Funcional SDD & Arquitecto de Software
- **Dependencias:** `docs/constitution.md`, `specs/001-architecture-baseline/spec.md`, `specs/002-pos-refactor/spec.md`

---

## 1. Contexto y Objetivo

### 1.1. Contexto
Tras completar exitosamente la modularización del Punto de Venta en SPEC-002, una auditoría exhaustiva sobre los 19 archivos `.tsx` de `src/` (6.188 líneas) reveló una significativa deuda técnica transversal de interfaz:
- Existen **88 elementos `<button>`**, **48 elementos `<input>`** y **38 contenedores tipo card** maquetados manualmente con clases utilitarias ad-hoc de Tailwind.
- Se identificó una mezcla inconsistente entre la paleta cruda de Tailwind (`bg-emerald-*` con 68 usos, `bg-red-*` con 34 usos) frente a los tokens semánticos definidos en `src/index.css` (`--color-primary`, `--color-error` con 0 usos directos), provocando discrepancias de color y contrastes visuales variables.
- Los estilos de foco (`focus:ring`), estados inhabilitados (`disabled`), tamaños táctiles y etiquetas de accesibilidad ARIA se reescriben a mano de forma heterogénea en cada vista.
- El directorio `src/components/ui/` únicamente contiene `Modal.tsx` (65 líneas) y carece de un archivo barrel (`index.ts`) que organice la exportación pública de primitivas.

Antes de emprender la refactorización de las vistas masivas del sistema (`InventoryView`, `CashRegisterView`, `PurchasesView`, `CustomersView`), es indispensable establecer una base sólida y tipada de primitivas de interfaz para evitar trasladar la duplicación a los futuros submódulos.

### 1.2. Objetivo
Definir los requisitos funcionales, contratos y criterios de calidad para un **Design System Mínimo** en `src/components/ui/`, que asegure:
1. **Primitivas Base Reutilizables:** Proporcionar un catálogo compacto de 7 componentes primitivos (`Button`, `Badge`, `Input`, `Select`, `AlertBanner`, `Card`, `EmptyState`) más el ajuste del `Modal` existente.
2. **Adherencia Estricta a Tokens Semánticos:** Normalizar colores, contrastes y jerarquías visuales sobre los tokens de diseño de `src/index.css` (incorporando los tokens faltantes de advertencia/warning).
3. **Cero Dependencias Adicionales (Minimal Stack):** Construir las variantes y estilos combinatorios exclusivamente mediante TypeScript estricto y la función utilitaria pura `cn()` de `src/lib/utils.ts`.
4. **Compatibilidad Nativa con React 19 y Periféricos:** Emplear `React.ComponentPropsWithRef` en los componentes de formulario para garantizar el pasaje transparente de referencias (`ref`) hacia elementos no controlados (como el lector de código de barras USB).
5. **Adopción Piloto en el Módulo POS:** Validar la ergonomía, robustez y preservación de rendimiento (`React.memo`) implementando las primitivas en los subcomponentes del módulo `pos/` ya modularizados.

---

## 2. Actores

- **Desarrollador / Agente:** Consume primitivas tipadas y predecibles desde `src/components/ui/` con autocompletado y validación de tipos en tiempo de compilación.
- **Operador de Mostrador:** Interactúa con controles táctiles ergonómicos, botones de acción inmediata, campos de texto con indicación clara de foco/error y avisos de estado legibles bajo condiciones variables de luz.
- **Lector de Código de Barras USB / Periféricos:** Interactúa con campos de entrada de datos a través de referencias DOM directas (`ref`) sin penalizaciones de rendimiento ni interferencias en el flujo de eventos.

---

## 3. Historias de Usuario

- **HU-01 (Primitivas Accesibles y Consistentes):** Como desarrollador, quiero disponer de primitivas de interfaz con variantes semánticas y estados preconfigurados (`disabled`, `focus-visible`, `isLoading`), para no reescribir combinaciones de clases Tailwind ni generar inconsistencias entre pantallas.
- **HU-02 (Feedback Visual Estandarizado):** Como cajero, quiero visualizar badges de estado (existencias de stock, estado de caja, conectividad de lector), carteles de alerta y estados vacíos con un código cromático unificado y contrastado, para comprender de un vistazo la situación operativa del mostrador.
- **HU-03 (Soporte Directo de Periféricos y Teclado):** Como operador de mostrador, quiero que los campos de texto y diálogos modales mantengan compatibilidad transparente con referencias directas y atributos de accesibilidad, para que el lector de códigos USB y los atajos de teclado sigan operando a máxima velocidad.
- **HU-04 (Rendimiento en Hardware de Mostrador):** Como sistema, las primitivas deben ser ligeras, deterministas y libres de cómputos pesados o librerías externas de runtime, para no degradar el rendimiento de los componentes memorizados (`React.memo`) en computadoras de punto de venta (Celeron / Core i3).

---

## 4. Requisitos Funcionales (Sintaxis EARS)

### 4.1. Primitivas de Acción y Estructura (`Button`, `Card`)

- **[RF-01.1]** *CUANDO* se renderiza un componente `Button`, *EL SISTEMA* aplicará los estilos correspondientes a la variante especificada (`primary`, `secondary`, `outline`, `ghost`, `danger`) y al tamaño solicitado (`sm`, `md`, `lg`), extendiendo todas las propiedades nativas de botón vía `React.ComponentPropsWithRef<'button'>`.
- **[RF-01.2]** *SI* la propiedad `isLoading` de `Button` es verdadera, *ENTONCES* *EL SISTEMA* mostrará un indicador animado de carga (spinner), deshabilitará el botón impidiendo clics adicionales y mantendrá la estabilidad dimensional del elemento.
- **[RF-01.3]** *CUANDO* se provean las propiedades `leftIcon` o `rightIcon` en `Button`, *EL SISTEMA* renderizará los íconos alineados verticalmente con el espaciado correspondiente respecto al contenido de texto.
- **[RF-01.4]** *CUANDO* se renderiza un componente `Card`, *EL SISTEMA* aplicará una superficie estandarizada con color de fondo de contenedor (`bg-surface-container-lowest`), bordes sutiles (`border border-slate-200`), esquinas redondeadas (`rounded-xl`), sombra suave y el relleno interno configurado mediante la propiedad `padding` (`'none' | 'sm' | 'md' | 'lg'`).

### 4.2. Primitivas de Feedback y Estado (`Badge`, `AlertBanner`, `EmptyState`)

- **[RF-02.1]** *CUANDO* se renderiza un componente `Badge`, *EL SISTEMA* aplicará la combinación cromática correspondiente a la variante semántica (`success`, `warning`, `danger`, `info`, `neutral`) basada exclusivamente en tokens semánticos del tema. *SI* la propiedad `dot` es verdadera, *ENTONCES* *EL SISTEMA* antepondrá un indicador circular de estado con color sólido acentuado.
- **[RF-02.2]** *CUANDO* se renderiza un componente `AlertBanner`, *EL SISTEMA* exhibirá un contenedor informativo destacado con el esquema de color de la variante (`info`, `success`, `warning`, `error`), ícono representativo por defecto y soporte para título destacado opcional. *SI* se especifica la función `onDismiss`, *ENTONCES* *EL SISTEMA* proveerá un botón de cierre accesible.
- **[RF-02.3]** *CUANDO* una colección, lista o panel se encuentre desprovisto de datos, *EL SISTEMA* posibilitará el uso de `EmptyState` para mostrar un ícono centrado en contenedor tenue, un título principal, una descripción secundaria explicativa y un slot opcional `action` para botones o enlaces de acción inmediata.

### 4.3. Primitivas de Formulario y Entrada de Datos (`Input`, `Select`)

- **[RF-03.1]** *CUANDO* se renderiza un componente `Input`, *EL SISTEMA* admitirá todas las propiedades nativas de campo de texto vía `React.ComponentPropsWithRef<'input'>`, permitiendo tanto el uso controlado (`value`/`onChange`) como el pasaje transparente de `ref` para campos no controlados (escáner USB).
- **[RF-03.2]** *SI* se proporciona la propiedad `label` en `Input` o `Select`, *ENTONCES* *EL SISTEMA* renderizará una etiqueta superior vinculada al control. *SI* se proporciona la propiedad `error`, *ENTONCES* *EL SISTEMA* coloreará los bordes con el token `--color-error` y desplegará el mensaje de error inferior con rol accesible.
- **[RF-03.3]** *CUANDO* se renderice `Input` con `leftIcon` o `rightElement`, *EL SISTEMA* ajustará de forma automática los rellenos internos (`padding`) del campo para evitar la superposición visual entre el texto ingresado y los elementos complementarios.
- **[RF-03.4]** *CUANDO* se renderiza un componente `Select`, *EL SISTEMA* encapsulará un elemento `<select>` nativo extendiendo `React.ComponentPropsWithRef<'select'>`, admitiendo tanto un arreglo estructurado de opciones (`options?: Array<{ value: string; label: string; disabled?: boolean }>`) como elementos hijos nativos (`children`).

### 4.4. Accesibilidad y Diálogos (`Modal`)

- **[RF-04.1]** *CUANDO* el componente `Modal` se encuentre visible (`isOpen = true`), *EL SISTEMA* asignará explícitamente los atributos `role="dialog"` y `aria-modal="true"` al contenedor del diálogo, permitiendo a los lectores de pantalla y a los hooks de gestión de periféricos (como `usePosScannerFocus`) detectar la presencia de una ventana modal activa.

### 4.5. Tokens Semánticos y Arquitectura de Variantes

- **[RF-05.1]** *EL SISTEMA* incorporará en `@theme` de `src/index.css` los tokens semánticos faltantes para estados de advertencia: `--color-warning`, `--color-on-warning`, `--color-warning-container` y `--color-on-warning-container`.
- **[RF-05.2]** *EL SISTEMA* resolverá todas las clases de variantes y estados de las primitivas mediante la función utilitaria pura `cn()` de `src/lib/utils.ts` y mapas de variantes tipados en TypeScript, prohibiendo la adición de dependencias externas como `class-variance-authority`, `clsx` o `tailwind-merge`.
- **[RF-05.3]** *EL SISTEMA* exportará la totalidad de las primitivas de interfaz desde el punto de entrada único `src/components/ui/index.ts`.

### 4.6. Adopción Piloto en Módulo POS

- **[RF-06.1]** *CUANDO* se apliquen las nuevas primitivas en `src/features/pos/components/`, *EL SISTEMA* mantendrá intacta la compatibilidad con el lector de códigos de barras no controlado en `PosHardwareBar.tsx` mediante el pasaje directo de `barcodeInputRef`.
- **[RF-06.2]** *CUANDO* se utilicen las primitivas dentro de `ProductCard.tsx` y `CartItemRow.tsx`, *EL SISTEMA* conservará la optimización con `React.memo` sin provocar re-renderizados innecesarios ante cambios en otros componentes.
- **[RF-06.3]** *CUANDO* el carrito de compras o los resultados del catálogo estén vacíos en el POS, *EL SISTEMA* empleará la primitiva `EmptyState` preservando los textos y mensajes en español de Argentina ya establecidos.

---

## 5. Requisitos No Funcionales (Criterios de Calidad)

1. **Rendimiento de Renderizado:** Las primitivas no deberán incorporar efectos secundarios (`useEffect`), suscripciones a stores ni estado interno superfluo; deben ser componentes puros basados en props y variantes.
2. **Accesibilidad (a11y):** Contraste de color mínimo WCAG AA (y AAA en variantes de texto principal y botones primarios), bordes de foco perceptibles (`focus-visible:ring-2`) y atributos semánticos para lectores de pantalla.
3. **Mantenibilidad:** Zero Bloat. No se permiten librerías externas adicionales. La resolución de clases debe ser testeable como función pura sin requerir DOM virtual.
4. **Verificación Estricta (Zero-Defect Gate):** Toda la suite de pruebas unitarias (mínimo 210 tests existentes + nuevos tests de variantes), el typecheck estricto de TypeScript (`tsc -b`), el linter de ESLint y el empaquetado de producción (`vite build`) deberán ejecutarse con 0 errores y 0 advertencias.
