# SPEC-002: Punto de Venta, Orquestación de Cobro y Rendimiento en Mostrador

- **Estado:** Aprobada
- **Fecha:** 2026-11-20
- **Área:** Punto de Venta (POS) / Operaciones de Mostrador
- **Autores:** Analista Funcional SDD & Arquitecto de Software
- **Dependencias:** `docs/constitution.md`, `specs/001-architecture-baseline/spec.md`

---

## 1. Contexto y Objetivo

### 1.1. Contexto
El Punto de Venta (POS) es el núcleo operativo de una despensa y verdulería. En la rutina de mostrador, el cajero interactúa simultáneamente con lectores de códigos de barras láser, balanzas digitales para productos pesables, ventas fraccionadas, clientes con libreta de fiado (cuenta corriente) y pagos mixtos (combinación de efectivo y medios digitales). Actualmente, el flujo de emisión y cobro de tickets concentra múltiples operaciones comerciales simultáneas, requiriendo un desacoplamiento estricto para garantizar que ninguna venta se registre parcialmente ante fallas y que la experiencia de escaneo continuo sea fluida en computadoras de mostrador.

### 1.2. Objetivo
Definir los requisitos comerciales y funcionales para el Punto de Venta, asegurando:
1. **Transaccionalidad del Cobro:** Garantizar la integridad comercial entre la emisión del ticket, la actualización de la gaveta de caja, el descuento de stock de productos y la imputación de deuda a clientes, con reversión completa ante fallos.
2. **Eficiencia en Escaneo y Pesaje:** Posibilitar el ingreso rápido e ininterrumpido de mercadería por lector óptico de códigos de barras y balanza comercial sin bloqueos de interfaz ni pérdidas de pulsaciones.
3. **Consistencia en Medios de Pago:** Unificar y validar las reglas para cobros en efectivo, tarjetas de débito y crédito, transferencias QR, cuentas corrientes y cobros mixtos.
4. **Operación Asistida por Teclado:** Permitir la atención fluida en mostrador mediante atajos de teclado sin requerir mouse para las operaciones repetitivas.

---

## 2. Actores

- **Cajero / Operador de Mostrador:** Registra productos por código de barras o peso, selecciona medios de pago, consulta clientes y emite tickets de venta.
- **Cliente:** Realiza compras de contado o a cuenta corriente dentro de su límite de crédito asignado.
- **Balanza Comercial / Lector Láser:** Dispositivos periféricos de entrada que proveen códigos EAN-13, PLU de verdulería o pesos netos.
- **Gaveta de Caja Activa:** Registro financiero del turno donde se acumulan los ingresos por cada medio de cobro.

---

## 3. Historias de Usuario

- **HU-01 (Cobro Integral de Ticket):** Como cajero, quiero registrar la venta de múltiples artículos y liquidarla con uno o más medios de pago, para que el stock se descuente inmediatamente, el dinero se impute a la caja del turno y la libreta del cliente se actualice si hubo fiado.
- **HU-02 (Escaneo Rápido de Balanza y Envasados):** Como cajero, quiero escanear consecutivamente productos con códigos de barra de balanza (prefijo 20 + PLU + Peso) y códigos estándar sin demoras en la pantalla, para atender rápidamente a los clientes en fila.
- **HU-03 (Venta de Verdulería con Pesaje):** Como cajero, quiero poder registrar el peso de un producto a granel mediante pesaje directo o ingreso de peso manual con accesos rápidos, para calcular el precio exacto del artículo pesable.
- **HU-04 (Pago Mixto y Fiado Controlado):** Como cajero, quiero cobrar un ticket combinando efectivo con transferencia o cuenta corriente, verificando que la porción fiada no exceda el crédito disponible del cliente.
- **HU-05 (Reversión Preventiva ante Inconsistencias):** Como encargado del local, quiero que si ocurre cualquier interrupción o error durante el proceso de cobro, ninguna parte de la operación quede a medio imputar, preservando el estado previo de caja, stock y clientes.

---

## 4. Requisitos Funcionales (Sintaxis EARS)

### 4.1. Carrito de Compras y Escaneo
- **[RF-01.1]** *CUANDO* el lector óptico escanea un código de barras de balanza que inicia con el prefijo 20, *EL SISTEMA* interpretará automáticamente el código PLU del artículo y su peso en kilogramos, agregando el ítem pesable al carrito con su importe calculado. *SI* el código PLU no coincide con ningún producto cargado en el catálogo, *ENTONCES* *EL SISTEMA* no agregará ningún ítem al carrito, limpiará el campo del escáner, mantendrá el foco en el lector y mostrará una notificación temporal no obstructiva con el mensaje "PLU no encontrado: <código>".
- **[RF-01.2]** *CUANDO* el lector óptico escanea un código de barras estándar correspondiente a un producto por unidad, *EL SISTEMA* agregará una unidad de dicho producto al carrito o incrementará en una unidad la cantidad de la línea existente manteniendo el porcentaje de descuento que dicha línea ya tuviera aplicado.
- **[RF-01.3]** *CUANDO* el operador selecciona un producto comercializado por peso que requiere pesaje, *EL SISTEMA* abrirá una interfaz de pesaje permitiendo capturar el peso actual de la balanza o ingresar un peso manual con atajos numéricos predefinidos.
- **[RF-01.4]** *MIENTRAS* el operador se encuentre en la pantalla del punto de venta y no exista un diálogo modal abierto ni un campo de texto con foco activo, *EL SISTEMA* mantendrá activo el receptor del lector de código de barras para capturar lecturas continuas.

### 4.2. Validación de Venta y Cobro
- **[RF-02.1]** *SI* la caja del turno se encuentra cerrada, *ENTONCES* *EL SISTEMA* bloqueará la finalización de cobro y notificará que se requiere la apertura de caja para operar.
- **[RF-02.2]** *SI* el carrito de compras no contiene artículos, *ENTONCES* *EL SISTEMA* impedirá iniciar el proceso de cobro.
- **[RF-02.3]** *CUANDO* el medio de pago seleccionado es cuenta corriente o pago mixto con porción a cuenta corriente, *EL SISTEMA* requerirá la selección previa de un cliente registrado. *SI* habiendo un cliente seleccionado el operador cambia el medio de pago hacia efectivo o medios digitales, *ENTONCES* *EL SISTEMA* conservará al cliente asociado en la cabecera del ticket para mantener el registro de la venta a su nombre en el historial.
- **[RF-02.4]** *SI* el importe a imputar en cuenta corriente (sea por cobro total a cuenta corriente o por la porción parcial a fiar de un pago mixto) sumado a la deuda previa del cliente supera su límite de crédito disponible, *ENTONCES* *EL SISTEMA* rechazará la operación indicando el monto exacto excedente.
- **[RF-02.4.1]** *CUANDO* el cobro es de tipo mixto y combina cuenta corriente con otros medios inmediatos (efectivo, tarjeta, QR), *EL SISTEMA* validará el crédito disponible del cliente evaluando exclusivamente el monto asignado a cuenta corriente, permitiendo la operación si dicha porción no excede el margen disponible.
- **[RF-02.5]** *SI* el pago se realiza en efectivo y el monto entregado por el cliente es menor al total a pagar, *ENTONCES* *EL SISTEMA* impedirá emitir el ticket hasta completar el importe exacto o superior.

### 4.3. Transaccionalidad e Integridad de la Venta
- **[RF-03.1]** *CUANDO* se confirma satisfactoriamente el cobro de una venta, *EL SISTEMA* ejecutará de forma coordinada:
  1. La emisión del ticket con su número correlativo y detalle de productos.
  2. El descuento de las existencias vendidas del catálogo de inventario.
  3. La imputación de los importes cobrados en la gaveta de caja activa clasificados por medio de pago (efectivo, tarjeta, transferencia o fiado).
  4. La adición de la deuda correspondiente en la ficha del cliente cuando exista saldo a cuenta corriente.
  5. El vaciado del carrito y la preparación para la siguiente venta.
- **[RF-03.2]** *SI* ocurre cualquier falla o rechazo durante alguno de los pasos de la confirmación de la venta, *ENTONCES* *EL SISTEMA* restaurará de inmediato los valores originales de inventario, gaveta de caja y ficha del cliente, manteniendo el carrito de compras intacto en pantalla e informando el motivo del fallo.

### 4.4. Medios de Pago Normalizados y Redondeo
- **[RF-04.1]** *EL SISTEMA* admitirá exclusivamente los siguientes medios de pago canónicos:
  - Efectivo (`efectivo`)
  - Tarjeta de Débito (`debito`)
  - Tarjeta de Crédito (`credito`)
  - Transferencia QR (`transferencia_qr`)
  - Cuenta Corriente / Fiado (`cuenta_corriente`)
  - Pago Mixto (`mixto`)
- **[RF-04.2]** *CUANDO* el medio de pago seleccionado es `debito`, `credito`, `transferencia_qr` o `cuenta_corriente`, *EL SISTEMA* liquidará el importe exacto con centavos coincidente con el subtotal del carrito, sin aplicar redondeo automático.
- **[RF-04.3]** *CUANDO* el medio de pago seleccionado es `efectivo`, *EL SISTEMA* aplicará el redondeo legal vigente a múltiplos de $10 sobre el total a pagar y calculará el vuelto exacto a entregar a partir del monto entregado por el cliente.
- **[RF-04.4]** *CUANDO* el medio de pago es `mixto`, *EL SISTEMA* permitirá registrar dos o más cobros parciales cuya suma sea exactamente igual al total del ticket sin redondeo automático, exigiendo coincidencia matemática exacta para evitar descuadres de caja.

### 4.5. Operación por Teclado y Notificaciones Temporales
- **[RF-05.1]** *CUANDO* el operador presiona la tecla de función F12 y no existe ningún diálogo modal abierto, *EL SISTEMA* disparará el flujo de cobro del ticket actual.
- **[RF-05.2]** *CUANDO* el operador presiona la tecla de función F2 y no existe ningún diálogo modal abierto, *EL SISTEMA* posicionará el cursor en el buscador rápido del catálogo de productos.
- **[RF-05.3]** *CUANDO* el operador presiona la tecla de función F7 y no existe ningún diálogo modal abierto, *EL SISTEMA* ejecutará la función de tara de la balanza comercial fijando el peso neto en cero.
- **[RF-05.4]** *MIENTRAS* exista un diálogo modal abierto en pantalla (pesaje, selección de cliente u otro), *EL SISTEMA* suspenderá estrictamente la ejecución de los atajos globales F12, F2 y F7 para prevenir cobros accidentales o pérdidas de foco dentro del diálogo.
- **[RF-05.5]** *CUANDO* el operador presiona la tecla Escape y existe un diálogo modal activo, *EL SISTEMA* cerrará exclusivamente dicho diálogo devolviendo el foco al receptor del lector de código de barras, sin modificar, vaciar ni alterar el carrito de compras ni los datos ya cargados. *SI* no hay modales abiertos y el foco se encuentra en el buscador rápido del catálogo de productos, *ENTONCES* *EL SISTEMA* limpiará el texto de búsqueda y devolverá el foco al receptor del lector de código de barras dejando la pantalla lista para continuar escaneando.
- **[RF-05.6]** *CUANDO* se emite una notificación informativa o de confirmación en el punto de venta, *EL SISTEMA* la presentará de manera no obstructiva y la retirará automáticamente tras un intervalo programado, cancelando el temporizador si el operador cambia de pantalla o desmonta la vista.

---

## 5. Requisitos No Funcionales

- **[RNF-01] Tiempo de Respuesta en Escaneo:** El procesamiento y agregado al carrito de un producto por código de barras debe resolverse en menos de 50 milisegundos en equipos con procesadores de gama baja (Celeron/i3), sin congelamiento del cursor.
- **[RNF-02] Aislamiento del Dominio Comercial:** Las reglas de redondeo, cálculo de vueltos, imputación de pagos a caja y validación de crédito deben ser puras, deterministas y libres de efectos secundarios visuales.
- **[RNF-03] Tolerancia a Ráfagas:** El sistema debe tolerar la entrada de caracteres a alta velocidad producida por lectores ópticos de emulación de teclado sin truncar dígitos del código.
- **[RNF-04] Cero Dependencias Adicionales:** La solución debe resolverse utilizando exclusivamente las herramientas del stack base del proyecto.

---

## 6. Casos Límite y Manejo de Errores

| Caso Límite | Comportamiento Requerido |
| :--- | :--- |
| **Escaneo de código de balanza con peso menor o igual a cero (`0.000 kg`)** | El sistema rechaza el código y emite un aviso sonoro o visual de peso inválido sin agregar el ítem al carrito. |
| **Venta de producto sin existencia de stock registrada** | Si el producto no cuenta con control estricto de stock, se permite la venta con advertencia; si tiene control estricto, se bloquea la adición del ítem. |
| **Pago mixto cuya suma de partes no coincide con el total** | El sistema bloquea el botón de cobro y resalta la diferencia faltante o sobrante. |
| **Fallo imprevisto en la persistencia local durante el cobro** | Se activa la reversión de estados (rollback en memoria) y se alerta al cajero sin perder los artículos del ticket actual. |
| **Presión de atajos de teclado mientras un diálogo modal está abierto** | Los atajos de cobro rápido se suspenden para evitar cobros accidentales mientras se ingresan datos en un diálogo. |

---

## 7. Fuera de Alcance

- Creación de un catálogo de productos o alta de clientes desde la pantalla del POS (se realiza en sus respectivos módulos de Inventario y Clientes).
- Integración con controladores fiscales homologados de AFIP/ARCA o facturación electrónica (los comprobantes son de gestión comercial interna).
- Rediseño general de los componentes visuales de otros módulos del sistema.
- Comunicación directa con puertos serie COM físicos de balanza (se mantiene la interfaz de simulación y entrada por teclado/pesaje asistido).
