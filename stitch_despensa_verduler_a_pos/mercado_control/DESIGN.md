---
name: Mercado Control
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006591'
  on-tertiary: '#ffffff'
  tertiary-container: '#23acf1'
  on-tertiary-container: '#003d59'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
  data-display-xl:
    fontFamily: JetBrains Mono
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.5rem
  data-display-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
  data-mono-md:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
  label-caps:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.875rem
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered specifically for independent grocery stores, neighborhood produce markets, and bodegas (*despensas y verdulerías*). The operational environment is fast-paced, high-turnover, and subjected to harsh overhead fluorescent lighting. Operators alternate continuously between rapid barcode scanning, manual PLU entry, scale weighing, and split cash/digital settlement. 

The aesthetic is utilitarian modern SaaS: high contrast, zero unnecessary ornamentation, instant optical hierarchy, and immediate spatial clarity. It merges high-legibility inventory dashboards with an ultra-responsive, error-preventative Point of Sale interface. The emotional tone is dependable, industrious, and sharp—instilling total confidence in cash reconciliation, batch tracking, and produce freshness management.

## Colors

The palette is tuned for extreme legibility and rapid state comprehension:

- **Primary (`#10B981` — Esmeralda):** Represents positive cash transactions, inventory gains, healthy margins, finalized ticket checkouts (*Cobrar*), and successful weigh-ins.
- **Secondary / Navigation Shell (`#0F172A` — Pizarra Oscura):** Anchors the master navigation rail, high-level header states, and active session locks to visually segregate core navigation from transactional workspace.
- **Tertiary / Informative (`#0EA5E9` — Azul Cielo):** Used for electronic payments, QR transfers, bank integrations, and scale status telemetry.
- **Alert States:**
  - **Warning (`#F59E0B` — Ámbar):** Low-stock thresholds, ripening/freshness expiration windows, and pending scale confirmations.
  - **Danger (`#EF4444` — Carmesí):** Waste/write-offs (*mermas*), voided tickets (*anulaciones*), customer credit limits (*cuenta corriente / fiado*), and system errors.
- **Surfaces & Canvas:**
  - Base canvas is `#F8FAFC` (Slate-50) to prevent retina fatigue from pure white backlights.
  - Interactive cards and POS registers use `#FFFFFF` (Pure White) with definitive `#E2E8F0` (Slate-200) structural boundaries.

## Typography

The typographic engine uses **Inter** for all contextual narrative UI, navigation, table headers, and form inputs, ensuring immediate glyph recognition. 

All numeric data—including prices (`$`), weights (`kg`), PLU codes, EAN-13 barcodes, stock quantities, and receipt serial numbers—must strictly use **JetBrains Mono** with tabular lining figures. This prevents horizontal layout shift during rapid incrementation on live counter scales and receipt totals. Micro-labels such as `LOTE`, `VENCIMIENTO`, and `PLU` use uppercase styling with explicit letter-spacing (`0.05em`) for immediate scan-ability at counter distances.

## Layout & Spacing

The architecture operates on an 8px base rhythm with a strict dual-pane or tripartite screen allocation for POS environments:
- **Navigation Rail:** 72px collapsed or 240px expanded docked left (`#0F172A`).
- **POS / Checkout View:** Split 60/40. The left 60% contains the product catalog, category tabs, and PLU quick-keys; the right 40% is the dedicated sticky ticket feed with live subtotal and execution controls.
- **Inventory & Dashboard View:** 12-column responsive fluid grid with 1.5rem gutters, standardizing compact table views, metric cards, and batch control drawers.
- **Touch Targets:** Any interactive touch surface (quick-sale fruits/vegetables buttons, keypad digits) must maintain a minimum bounding height of 48px to accommodate gloved or damp hands common in produce handling.

## Elevation & Depth

To avoid optical washout under harsh overhead lighting, this system relies on **structural boundaries and tonal contrast** rather than diffuse drop shadows:

- **Base Level (Canvas):** `#F8FAFC` flat surface.
- **Container Level (Cards, Tables, Rails):** `#FFFFFF` surfaces bounded by crisp `1px solid #E2E8F0` borders.
- **Overlay & Modals (Cobro / Pesaje popups):** Elevated with a single high-definition anchor shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)` combined with a `1px solid #CBD5E1` boundary.
- **Active Focus & Selection:** Instead of heavy outer glows, active items (such as selected inventory rows or active PLU keys) utilize a 2px inner border of `#10B981` or `#0F172A` with a tinted background fill (`#ECFDF5` or `#F1F5F9`).

## Shapes

The design system adopts a **soft-rectilinear** shape profile (`roundedness: 1`, 4px base radius). 

- Standard inputs, buttons, table cells, and badges maintain a crisp `4px` (`0.25rem`) radius.
- Cards, modals, and container panels use `8px` (`0.5rem`).
- Strict prohibition of pill-shaped containers or excessive circular rounding; sharp, defined borders communicate transactional precision and maximize content density in data-heavy inventory tables.

## Components

### Botones (Action Buttons)
- **Primario (*Cobrar / Confirmar*):** Solid `#10B981`, white text, `font-weight: 600`. Hover: `#059669`. Focus: Ring of 2px offset `#10B981`. Min-height: 48px on POS screens.
- **Secundario (*Pausar Ticket / Imprimir*):** Surface `#FFFFFF`, border `1px solid #E2E8F0`, text `#0F172A`. Hover: `#F8FAFC`.
- **Destructivo (*Anular / Merma*):** Surface `#FEF2F2`, border `1px solid #FECACA`, text `#EF4444`. Hover: `#EF4444`, text `#FFFFFF`.

### Teclado Rápido PLU & Balanza (Weigh Scale & Quick Keys)
- Grid-based visual buttons for high-velocity produce items (e.g., *Tomate Redondo*, *Banana Ecuador*).
- Displays item label in Inter, with PLU number and active kilo-price in JetBrains Mono at bottom right.
- Live scale weight readouts render in `data-display-xl` JetBrains Mono with automatic stabilization indicator (Green for settled weight, Amber for unstable scale tare).

### Tarjetas de Métricas (Dashboard KPI Cards)
- Background `#FFFFFF`, border `1px solid #E2E8F0`, 8px radius.
- Categorized by state: Total de Caja (Emerald indicator), Stock Crítico (Amber badge), Mermas del Día (Rose badge).
- Monospaced numeric totals for instantaneous register comparisons.

### Tablas de Inventario y Lotes (Data Tables)
- Header row with dark muted text (`#64748B`), 11px uppercase Inter, borders bottom `1px solid #CBD5E1`.
- Numeric columns (*Stock Actual*, *Costo*, *Precio Venta*, *Margen %*) right-aligned in JetBrains Mono.
- State chips indicate freshness alerts: *Fresco*, *Próximo a Vencer*, *Revisar Lote*.

### Campos de Entrada (Form Inputs & Barcode Readers)
- Height: 44px (48px for POS cash fields).
- `#FFFFFF` background with `1px solid #CBD5E1`. On active hardware scanner pulse, flash a brief `2px solid #10B981` transition border.