# MEMORY.md — Persistent Project Memory
<!-- Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. -->

## Estado actual
- Fase: SPEC-001 (Arquitectura Base) **100% COMPLETADA** (Tareas T-01 a T-15 cerradas):
  - Fase 1: Contratos `Result<T, E>`, saneamiento de `src/lib/utils.ts` y persistencia `SafeStorage`.
  - Fase 2: Lógica pura TDD en los 6 dominios de negocio (POS, Caja, Inventario, Compras, Clientes, Asistencia).
  - Fase 3: Anatomía modular estandarizada (`components/`, `domain/`, `index.ts`), stores y vistas desacopladas.
  - Fase 4: Barreras estáticas (`noImplicitAny`, `@typescript-eslint/no-explicit-any: error`, restricción de imports en `domain/`), y umbral de cobertura 100% en Vitest.
- **Correcciones UI:**
  - `PosView`: Autofoco condicional en lector de código de barras (no secuestra foco en inputs interactivos; soporte de F2 y Escape).
  - `AppLayout`: Cierre automático de dropdowns de Sucursal y Rol al hacer click fuera o presionar Escape.
- **Base de Datos / Schema:** `src/db/schema.sql` actualizado a versión 2.1.0 (Gestión comercial interna pura: removidas dependencias fiscales de AFIP/ARCA y Monotributo, tickets comerciales internos sin desglose forzado de IVA, soporte de balanzas con stock `NUMERIC(12,3)`, turnos de caja, mermas y RLS completo).
- **Suite Vitest:** 11 archivos de prueba, **172 pruebas unitarias pasando al 100%**.
- **Cobertura de Código:** **100% en Líneas, Funciones, Branches y Sentencias** en `domain/` y `lib/`.
- **Gate de Verificación:** `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` 100% verde con 0 advertencias y 0 errores.
- **Punto de Venta (POS):** Totalmente alineado con `schema.sql` (v2.1.0):
  - Control de caja abierta obligatoria para emitir tickets (con bloqueo visual).
  - Medios de pago normalizados: Efectivo, Débito, Crédito, QR/Transferencia, Fiado/Cta. Cte., y Pago Mixto.
  - Validación de cliente y límite de crédito para ventas a cuenta corriente.
  - Soporte de etiquetas de balanza EAN-13 (prefijo 20 + PLU + Peso) y toma directa de peso en balanza digital Toledo 2090.
  - Pipeline de cobro real con orquestación hacia `useCashRegisterStore`, `useCustomerStore` (imputación de deuda) y descuento en tiempo real en `useInventoryStore`.
- **Productos e Inventario:** Totalmente alineado con `schema.sql` (v2.1.0):
  - Store central `useInventoryStore` persistente con `SafeStorage` sincronizado con el POS.
  - Formulario de alta/edición de productos funcional con validación TDD (`validateProductForm`), SKU, presentación, conversión de bultos y stock mínimo.
  - Filtro rápido de Stock Crítico / Agotado (`v_critical_stock`).
  - Pestañas funcionales para Catálogo, Historial de Mermas y Traslados entre Sucursales con flujo de confirmación de recepción.
- **Caja y Roles:** Totalmente alineado con `schema.sql` (v2.1.0):
  - Modal dinámico de Apertura de Caja validado con `validateShiftOpening` (fondo de cambio, nombre de turno, número de caja y responsable).
  - Modal de Movimientos con soporte de `egreso` (gasto menor), `ingreso` (extraordinario) y `retiro` (seguridad) validado con `validateCashMovement` impidiendo retiros que excedan el efectivo disponible.
  - Sincronización bidireccional entre `useCashRegisterStore` y `useAppStore.activeCashRegister`.
  - Pestaña de "Historial de Cierres de Turno" (`v_cash_register_summary`) con arqueo ciego, discrepancias (+/-) y observaciones.
- **Clientes y Cuentas Corrientes:** Totalmente alineado con `schema.sql` (v2.1.0):
  - Store central `useCustomerStore` persistente con `SafeStorage` sincronizado con el Punto de Venta.
  - Formulario de alta y edición de clientes validado con `validateCustomerForm` (DNI/CUIT, tipo persona/empresa, límite de fiado).
  - Pestaña de "Libreta de Fiado / Extracto" (`v_customer_account_movements`) en el panel lateral mostrando compras a crédito vs cobros registrados.
  - Cobro de deuda con imputación simultánea en el saldo del cliente, en el historial de cobros (`customer_payments`) y en la gaveta activa (`useCashRegisterStore`).
  - Filtros rápidos por estado ("Todos", "Con Deuda" y "Límite Crítico").
- **Compras y Proveedores:** Totalmente alineado con `schema.sql` (v2.1.0):
  - Store central `usePurchaseStore` persistente con `SafeStorage` orquestado con `useInventoryStore`.
  - Historial de órdenes de compra y remitos recibidos (`purchase_orders` y `purchase_items`) con fecha, ítems, costos y responsable.
  - Recepción de mercadería con cálculo automático de bultos/cajones vs unidades sueltas que actualiza el stock físico y los costos del catálogo en tiempo real.
  - Directorio de proveedores mayoristas con modal de alta y edición (`validateSupplierForm`), CUIT, contactos y notas de reparto.
- **Fichaje y Asistencia:** Totalmente alineado con `schema.sql` (v2.1.0):
  - Store central `useAttendanceStore` persistente con `SafeStorage`.
  - Terminal Kiosco de Fichaje interactivo con teclado numérico en pantalla y validación de PIN de 4 dígitos (`validatePinFormat`, `verifyUserPin`).
  - Ciclo de vida completo del turno (`status: 'active' | 'completed'`) con cálculo automático de horas trabajadas (`calculateTotalHours`).
  - Panel de métricas en tiempo real (personal en turno activo, fichajes del día y horas acumuladas).
  - Historial detallado de fichajes con desglose de entrada, salida, horas exactas y notas.
- **Panel Gerencial / Dashboard:** Totalmente alineado con `schema.sql` (v2.1.0):
  - Indicador de caja activa en tiempo real sincronizado con `useAppStore.activeCashRegister` y `useCashRegisterStore`.
  - Alertas de stock crítico y reposición computadas dinámicamente desde el catálogo de `useInventoryStore`.
  - Tarjeta de métricas "Fiado en Calle" calculada en tiempo real a partir del saldo adeudado y cantidad de cuentas activas de `useCustomerStore`.
  - Integración visual y funcional completa de las 7 vistas de la aplicación.

## Decisiones (y por qué)
- **Core Isolation Estricto:** Restricción estática en ESLint impidiendo que `domain/` importe React, Zustand o componentes UI.
- **Barrera Modular por Barriles Públicos:** Imports inter-feature prohibidos por deep path; exclusivamente a través de `@/features/<dominio>`.
- **Persistencia Tolerante a Fallos:** `SafeStorage` crea respaldos de auditoría ante JSON corrupto (`backup_corrupt_<key>_<ts>`) y retorna fallbacks sin crashear.
- **Minimal Stack (Zero-Dependencies):** Sin librerías externas de validación (no Zod); type guards y Result pattern nativo en TypeScript.

## Aprendizajes y errores a evitar
- **Cobertura exhaustiva de ramas:** Validar casos de valores negativos o no numéricos antes de entrar al cálculo evita fallas silenciosas en producción y garantiza el 100% de cobertura en ramas.

## Próximos pasos
1. La arquitectura base está consolidada y certificada.
2. Proceder con el desarrollo de la siguiente especificación de negocio formal (ej. SPEC-002: Gestión de Caja y Arqueo o SPEC-003: Punto de Venta y Balanzas).
