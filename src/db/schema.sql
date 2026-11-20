-- =============================================================================
-- LAMBDA MANAGER — SUPABASE / POSTGRESQL DEFINITIVE SCHEMA
-- Sistema Integral de Punto de Venta (POS), Stock, Cajas y Cuentas Corrientes
-- Diseñado para Comercio Minorista y de Proximidad (Despensas, Verdulerías,
-- Forrajerías, Minimercados, Indumentaria y Bazar)
-- Gestión comercial y operativa interna (sin requerimientos fiscales externos)
-- Versión: 2.1.0
-- =============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS (Tipos enumerados)
-- =============================================================================

CREATE TYPE user_role AS ENUM ('cajero', 'encargado', 'administrador', 'root');

CREATE TYPE paper_width AS ENUM ('80mm', '58mm');

CREATE TYPE payment_method AS ENUM (
  'efectivo',
  'debito',
  'credito',
  'transferencia_qr',
  'mixto',
  'cuenta_corriente'
);

CREATE TYPE sale_status AS ENUM ('completed', 'voided', 'refunded');

CREATE TYPE stock_movement_type AS ENUM (
  'VENTA_POS',
  'DEVOLUCION',
  'COMPRA_INGRESO',
  'MERMA_ROTURA',
  'TRANSFERENCIA',
  'AJUSTE_INVENTARIO'
);

CREATE TYPE product_presentation AS ENUM ('unidad', 'kg', 'pack', 'litro');

CREATE TYPE notification_type AS ENUM ('critical', 'warning', 'info', 'success');

CREATE TYPE plan_status AS ENUM ('Activo', 'Por Vencer', 'Prueba');

CREATE TYPE customer_type AS ENUM ('persona', 'empresa');

CREATE TYPE tenant_plan_tier AS ENUM ('trial', 'basic', 'pro', 'enterprise');

CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'cancelled');

CREATE TYPE cash_movement_type AS ENUM ('apertura', 'ingreso', 'egreso', 'retiro', 'ajuste');

CREATE TYPE transfer_status AS ENUM ('pending', 'in_transit', 'received', 'cancelled');

-- =============================================================================
-- TABLA: tenants (Empresas / Organizaciones SaaS)
-- =============================================================================

CREATE TABLE tenants (
  id                     UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                   VARCHAR(100)     NOT NULL UNIQUE,
  name                   VARCHAR(200)     NOT NULL,
  plan_tier              tenant_plan_tier NOT NULL DEFAULT 'trial',
  status                 tenant_status    NOT NULL DEFAULT 'active',
  max_users              INTEGER          NOT NULL DEFAULT 5 CHECK (max_users > 0),
  max_products           INTEGER          NOT NULL DEFAULT 500 CHECK (max_products > 0),
  current_users_count    INTEGER          NOT NULL DEFAULT 0 CHECK (current_users_count >= 0),
  current_products_count INTEGER          NOT NULL DEFAULT 0 CHECK (current_products_count >= 0),
  created_at             TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Empresas u organizaciones clientes del SaaS';

-- =============================================================================
-- TABLA: warehouses (Sucursales / Depósitos)
-- =============================================================================

CREATE TABLE warehouses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(150) NOT NULL,            -- Ej: "Sucursal Central - Salón"
  code         VARCHAR(20)  NOT NULL UNIQUE,     -- Ej: "SUC-01"
  is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
  address      TEXT,
  phone        VARCHAR(50),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_warehouses_default ON warehouses (is_default)
  WHERE is_default = TRUE;

COMMENT ON TABLE warehouses IS 'Sucursales y depósitos físicos de la empresa';

-- =============================================================================
-- TABLA: system_config (Configuración general del sistema)
-- =============================================================================

CREATE TABLE system_config (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name        VARCHAR(200) NOT NULL,
  trade_name          VARCHAR(200),                        -- Nombre de fantasía
  cuit                VARCHAR(30),                         -- CUIT o identificación comercial opcional
  address             TEXT,
  phone               VARCHAR(50),
  email               VARCHAR(150),
  ticket_footer       TEXT,
  default_paper_width paper_width  NOT NULL DEFAULT '80mm',
  active_warehouse_id UUID         REFERENCES warehouses(id) ON DELETE SET NULL,
  currency_symbol     VARCHAR(5)   NOT NULL DEFAULT '$',
  pos_number          SMALLINT     DEFAULT 1,              -- Número de terminal / punto de venta
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'Configuración general del comercio y de impresión de tickets';

-- =============================================================================
-- TABLA: users (Usuarios y Cajeros)
-- =============================================================================

CREATE TABLE users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   VARCHAR(150) NOT NULL,
  role        user_role    NOT NULL DEFAULT 'cajero',
  pin_code    VARCHAR(6),                          -- PIN rápido para fichaje y cambios de turno
  warehouse_id UUID        REFERENCES warehouses(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Perfiles de usuario del sistema (extiende auth.users)';

-- =============================================================================
-- TABLA: cash_registers (Cajas Físicas y Turnos)
-- =============================================================================

CREATE TABLE cash_registers (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  register_number VARCHAR(20)   NOT NULL,          -- "Caja 01", "Caja Mostrador"
  warehouse_id    UUID          NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  opened_by       UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_by       UUID          REFERENCES users(id) ON DELETE SET NULL,
  shift_name      VARCHAR(50),                     -- "Turno Mañana", "Turno Tarde"
  
  -- Montos de control y arqueo ciego
  opening_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
  expected_cash   NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_cash     NUMERIC(14,2),                   -- Conteo real del cajero al cerrar
  difference      NUMERIC(14,2),                   -- Sobrante (+) o Faltante (-)
  
  -- Totales recaudados por medio de pago
  total_cash      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_card      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_qr        NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_account   NUMERIC(14,2) NOT NULL DEFAULT 0, -- Fiado emitido
  
  is_open         BOOLEAN       NOT NULL DEFAULT TRUE,
  notes           TEXT,
  opened_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_registers_warehouse ON cash_registers(warehouse_id);
CREATE INDEX idx_cash_registers_opened_by ON cash_registers(opened_by);
CREATE INDEX idx_cash_registers_is_open   ON cash_registers(is_open);

COMMENT ON TABLE cash_registers IS 'Sesiones y turnos de caja física con arqueo y control de fondos';

-- =============================================================================
-- TABLA: cash_movements (Movimientos de Caja: Retiros, Gastos, Ingresos)
-- =============================================================================

CREATE TABLE cash_movements (
  id          UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  register_id UUID               NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  type        cash_movement_type NOT NULL,
  amount      NUMERIC(12,2)      NOT NULL CHECK (amount > 0),
  description TEXT               NOT NULL,         -- "Pago sodero", "Retiro de seguridad"
  user_id     UUID               REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_movements_register_id ON cash_movements(register_id);
CREATE INDEX idx_cash_movements_type        ON cash_movements(type);

COMMENT ON TABLE cash_movements IS 'Entradas y salidas de dinero en efectivo de la caja activa';

-- =============================================================================
-- TABLA: categories (Categorías de productos)
-- =============================================================================

CREATE TABLE categories (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL UNIQUE,         -- "Almacén", "Verdulería", "Forrajería"
  icon       VARCHAR(50),                          -- Nombre de icono de interfaz (Lucide)
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Categorías para organización del catálogo';

-- =============================================================================
-- TABLA: products (Catálogo Maestro de Productos)
-- =============================================================================

CREATE TABLE products (
  id             UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku            VARCHAR(50)          NOT NULL UNIQUE,    -- Código interno / PLU
  barcode        VARCHAR(50)          UNIQUE,             -- Código de barras EAN-13
  plu_code       VARCHAR(10),                             -- Código PLU corto para balanzas
  name           VARCHAR(200)         NOT NULL,
  description    TEXT,
  category_id    UUID                 REFERENCES categories(id) ON DELETE SET NULL,
  brand          VARCHAR(100),
  provider       VARCHAR(150),
  cost           NUMERIC(12,2)        NOT NULL DEFAULT 0 CHECK (cost >= 0),
  price          NUMERIC(12,2)        NOT NULL DEFAULT 0 CHECK (price >= 0),
  
  -- Control de Stock Decimal (Soporta kilos, gramos, litros y unidades)
  stock          NUMERIC(12,3)        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock      NUMERIC(12,3)        NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  
  warehouse_id   UUID                 REFERENCES warehouses(id) ON DELETE SET NULL,
  location       VARCHAR(150),                            -- Ej: "Pasillo 1 - Canasto 3"
  presentation   product_presentation NOT NULL DEFAULT 'unidad',
  
  -- Manejo de Bultos / Fraccionamiento (Cajones, packs, bolsas)
  pack_name      VARCHAR(50),                             -- "Cajón", "Bolsa", "Pack"
  units_per_pack NUMERIC(10,3)        DEFAULT 1 CHECK (units_per_pack > 0),
  
  image_url      TEXT,
  is_active      BOOLEAN              NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku          ON products(sku);
CREATE INDEX idx_products_barcode      ON products(barcode);
CREATE INDEX idx_products_plu_code     ON products(plu_code);
CREATE INDEX idx_products_category_id  ON products(category_id);
CREATE INDEX idx_products_warehouse_id ON products(warehouse_id);
CREATE INDEX idx_products_is_active    ON products(is_active);
CREATE INDEX idx_products_stock_alert  ON products(stock, min_stock) WHERE is_active = TRUE;

COMMENT ON TABLE products IS 'Catálogo de productos con soporte decimal y balanzas';
COMMENT ON COLUMN products.stock IS 'Stock con 3 decimales: permite 1.500 kg, 0.250 kg o 1 unidad';
COMMENT ON COLUMN products.plu_code IS 'Código corto de balanza para frutas, verduras o alimento suelto';

-- =============================================================================
-- TABLA: warehouse_stock (Stock Independiente por Sucursal / Depósito)
-- =============================================================================

CREATE TABLE warehouse_stock (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID          NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  stock        NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock    NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  location     VARCHAR(150),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_warehouse UNIQUE (product_id, warehouse_id)
);

CREATE INDEX idx_warehouse_stock_product   ON warehouse_stock(product_id);
CREATE INDEX idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);

COMMENT ON TABLE warehouse_stock IS 'Existencias de cada producto en cada sucursal o depósito';

-- =============================================================================
-- TABLA: product_variants (Variantes: Talle, Color, Modelo)
-- =============================================================================

CREATE TABLE product_variants (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name         VARCHAR(150)  NOT NULL,                    -- Ej: "Talle 42 - Azul"
  sku          VARCHAR(50)   NOT NULL UNIQUE,
  price_delta  NUMERIC(12,2) NOT NULL DEFAULT 0,          -- Ajuste sobre el precio base
  stock        NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

COMMENT ON TABLE product_variants IS 'Variantes de producto con stock y precio diferenciado';

-- =============================================================================
-- TABLA: suppliers (Proveedores y Distribuidores)
-- =============================================================================

CREATE TABLE suppliers (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(200) NOT NULL,
  cuit         VARCHAR(30)  UNIQUE,                      -- CUIT o DNI del distribuidor
  contact_name VARCHAR(150),
  phone        VARCHAR(50),
  email        VARCHAR(150),
  address      TEXT,
  notes        TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_cuit ON suppliers(cuit);

COMMENT ON TABLE suppliers IS 'Proveedores y distribuidores mayoristas de mercadería';

-- =============================================================================
-- TABLA: product_suppliers (Relación N:M Producto - Proveedores)
-- =============================================================================

CREATE TABLE product_suppliers (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id  UUID          NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  cost         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  supplier_sku VARCHAR(50),
  is_primary   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_supplier UNIQUE (product_id, supplier_id)
);

CREATE INDEX idx_product_suppliers_product_id  ON product_suppliers(product_id);
CREATE INDEX idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);

COMMENT ON TABLE product_suppliers IS 'Asociación de proveedores con costos específicos';

-- =============================================================================
-- TABLA: purchase_orders (Órdenes de Compra y Recepción)
-- =============================================================================

CREATE TABLE purchase_orders (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(30)   NOT NULL UNIQUE,             -- "OC-2026-0012"
  supplier_id  UUID          NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id UUID          NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  received_by  UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subtotal     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes        TEXT,
  received_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_supplier_id  ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_warehouse_id ON purchase_orders(warehouse_id);

COMMENT ON TABLE purchase_orders IS 'Comprobantes de ingreso y compras a distribuidores';

-- =============================================================================
-- TABLA: purchase_items (Detalle de Compra y Conversión de Bultos/Cajones)
-- =============================================================================

CREATE TABLE purchase_items (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id    UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id     UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  packs_received NUMERIC(10,3),                           -- Cantidad de bultos/cajones recibidos
  units_per_pack NUMERIC(10,3),                           -- Equivalencia (ej. 18 kg por cajón)
  units_received NUMERIC(12,3) NOT NULL CHECK (units_received > 0), -- Total en kg o unidades
  unit_cost      NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost     NUMERIC(14,2) NOT NULL CHECK (total_cost >= 0),
  old_cost       NUMERIC(12,2),
  new_cost       NUMERIC(12,2),
  old_price      NUMERIC(12,2),
  new_price      NUMERIC(12,2),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id  ON purchase_items(product_id);

COMMENT ON TABLE purchase_items IS 'Líneas de ingreso de mercadería con conversión de bultos';

-- =============================================================================
-- TABLA: inventory_transfers (Traslados entre Sucursales)
-- =============================================================================

CREATE TABLE inventory_transfers (
  id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number   VARCHAR(30)     NOT NULL UNIQUE,      -- "TRF-00084"
  from_warehouse_id UUID            NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id   UUID            NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status            transfer_status NOT NULL DEFAULT 'pending',
  created_by        UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  received_by       UUID            REFERENCES users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  received_at       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE transfer_items (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id       UUID          NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  product_id        UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_sent     NUMERIC(12,3) NOT NULL CHECK (quantity_sent > 0),
  quantity_received NUMERIC(12,3) CHECK (quantity_received >= 0)
);

CREATE INDEX idx_transfer_items_transfer_id ON transfer_items(transfer_id);

COMMENT ON TABLE inventory_transfers IS 'Envíos de mercadería entre sucursales o depósitos';

-- =============================================================================
-- TABLA: waste_logs (Mermas, Roturas y Desperdicios)
-- =============================================================================

CREATE TABLE waste_logs (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id  UUID          NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  quantity      NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  reason        VARCHAR(100)  NOT NULL,                  -- "Podrido", "Vencido", "Rotura"
  notes         TEXT,
  registered_by UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waste_logs_product_id   ON waste_logs(product_id);
CREATE INDEX idx_waste_logs_warehouse_id ON waste_logs(warehouse_id);
CREATE INDEX idx_waste_logs_created_at   ON waste_logs(created_at DESC);

COMMENT ON TABLE waste_logs IS 'Bajas de mercadería por vencimiento, rotura o descarte';

-- =============================================================================
-- TABLA: customers (Clientes y Cuentas Corrientes)
-- =============================================================================

CREATE TABLE customers (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  type             customer_type NOT NULL DEFAULT 'persona',
  name             VARCHAR(200)  NOT NULL,
  dni_cuit         VARCHAR(30),                           -- DNI o identificación para la libreta/cuenta corriente
  phone            VARCHAR(50),
  email            VARCHAR(150),
  address          TEXT,
  balance          NUMERIC(14,2) NOT NULL DEFAULT 0,      -- Negativo = el cliente debe
  credit_limit     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  total_spent      NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  purchase_count   INTEGER       NOT NULL DEFAULT 0 CHECK (purchase_count >= 0),
  last_purchase_at TIMESTAMPTZ,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_dni_cuit ON customers(dni_cuit);
CREATE INDEX idx_customers_name     ON customers(name);
CREATE INDEX idx_customers_balance  ON customers(balance) WHERE balance < 0;

COMMENT ON TABLE customers IS 'Clientes registrados con límite y saldo de cuenta corriente';

-- =============================================================================
-- TABLA: sales (Comprobantes de Venta POS)
-- =============================================================================

CREATE TABLE sales (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number   VARCHAR(30)    NOT NULL UNIQUE,         -- "0001-00004921"
  sale_date       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  register_id     UUID           REFERENCES cash_registers(id) ON DELETE SET NULL,
  customer_id     UUID           REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   VARCHAR(200)   NOT NULL DEFAULT 'Consumidor Final',
  customer_dni    VARCHAR(30),
  cashier_id      UUID           REFERENCES users(id) ON DELETE SET NULL,
  cashier_name    VARCHAR(150)   NOT NULL,
  cashier_role    user_role      NOT NULL,
  payment_method  payment_method NOT NULL,
  cash_received   NUMERIC(12,2),                           -- Pago entregado para calcular vuelto
  cash_change     NUMERIC(12,2),                           -- Vuelto entregado
  subtotal        NUMERIC(14,2)  NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total  NUMERIC(14,2)  NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total           NUMERIC(14,2)  NOT NULL DEFAULT 0 CHECK (total >= 0),
  status          sale_status    NOT NULL DEFAULT 'completed',
  void_reason     TEXT,
  warehouse_id    UUID           REFERENCES warehouses(id) ON DELETE SET NULL,
  warehouse_name  VARCHAR(150)   NOT NULL,
  offline_queued  BOOLEAN        NOT NULL DEFAULT FALSE,
  synced_at       TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_ticket_number  ON sales(ticket_number);
CREATE INDEX idx_sales_register_id    ON sales(register_id);
CREATE INDEX idx_sales_customer_id    ON sales(customer_id);
CREATE INDEX idx_sales_cashier_id     ON sales(cashier_id);
CREATE INDEX idx_sales_sale_date      ON sales(sale_date DESC);
CREATE INDEX idx_sales_status         ON sales(status);
CREATE INDEX idx_sales_warehouse_id   ON sales(warehouse_id);

COMMENT ON TABLE sales IS 'Cabeceras de venta vinculadas a turnos de caja y comprobantes';

-- =============================================================================
-- TABLA: sale_items (Líneas de Detalle de Venta)
-- =============================================================================

CREATE TABLE sale_items (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id          UUID          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id       UUID          REFERENCES products(id) ON DELETE SET NULL,
  product_sku      VARCHAR(50)   NOT NULL,
  product_name     VARCHAR(200)  NOT NULL,
  quantity         NUMERIC(10,3) NOT NULL CHECK (quantity > 0), -- Soporta 1.250 kg
  unit_price       NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  total            NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id    ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

COMMENT ON TABLE sale_items IS 'Líneas vendidas con soporte decimal para pesables';

-- =============================================================================
-- TABLA: sale_split_payments (Pagos Divididos / Mixtos)
-- =============================================================================

CREATE TABLE sale_split_payments (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id    UUID           NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method     payment_method NOT NULL,
  amount     NUMERIC(12,2)  NOT NULL CHECK (amount > 0),
  reference  VARCHAR(100),                                -- Ej: código de transferencia
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_split_payments_sale_id ON sale_split_payments(sale_id);

COMMENT ON TABLE sale_split_payments IS 'Sub-pagos cuando el cliente abona con múltiples medios';

-- =============================================================================
-- TABLA: stock_movements / Kardex (Registro Inmutable de Movimientos)
-- =============================================================================

CREATE TABLE stock_movements (
  id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  moved_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  product_id      UUID                REFERENCES products(id) ON DELETE SET NULL,
  product_name    VARCHAR(200)        NOT NULL,
  product_sku     VARCHAR(50)         NOT NULL,
  movement_type   stock_movement_type NOT NULL,
  motive          TEXT                NOT NULL,
  quantity_delta  NUMERIC(10,3)       NOT NULL,           -- Positivo = entrada, negativo = salida
  resulting_stock NUMERIC(12,3)       NOT NULL,           -- Stock resultante en decimales
  user_id         UUID                REFERENCES users(id) ON DELETE SET NULL,
  user_name       VARCHAR(150)        NOT NULL,
  warehouse_id    UUID                REFERENCES warehouses(id) ON DELETE SET NULL,
  warehouse_name  VARCHAR(150)        NOT NULL,
  reference_doc   VARCHAR(100),
  sale_id         UUID                REFERENCES sales(id) ON DELETE SET NULL,
  supplier_id     UUID                REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name   VARCHAR(150),
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product_id   ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_moved_at     ON stock_movements(moved_at DESC);
CREATE INDEX idx_stock_movements_type         ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);

COMMENT ON TABLE stock_movements IS 'Kardex inmutable para auditoría de movimientos de stock';

-- =============================================================================
-- TABLA: customer_payments (Cobros de Cuenta Corriente)
-- =============================================================================

CREATE TABLE customer_payments (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes       TEXT          DEFAULT 'Pago a cuenta',
  user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(150),
  paid_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX idx_customer_payments_paid_at     ON customer_payments(paid_at DESC);

COMMENT ON TABLE customer_payments IS 'Cobros de libreta de fiado registrados a clientes';

-- =============================================================================
-- TABLA: notifications (Notificaciones y Alertas del Sistema)
-- =============================================================================

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      VARCHAR(200)      NOT NULL,
  message    TEXT              NOT NULL,
  type       notification_type NOT NULL DEFAULT 'info',
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  product_id UUID              REFERENCES products(id) ON DELETE SET NULL,
  user_id    UUID              REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX idx_notifications_is_read    ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'Alertas operativas de stock crítico y vencimientos';

-- =============================================================================
-- TABLA: attendance_records (Control de Asistencia y Fichajes)
-- =============================================================================

CREATE TABLE attendance_records (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id    UUID         NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  check_in        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  check_out       TIMESTAMPTZ,
  total_hours     NUMERIC(5,2),
  is_manual_entry BOOLEAN      NOT NULL DEFAULT FALSE,
  edited_by       UUID         REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'flagged')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_user_id     ON attendance_records(user_id);
CREATE INDEX idx_attendance_warehouse   ON attendance_records(warehouse_id);
CREATE INDEX idx_attendance_check_in    ON attendance_records(check_in DESC);

COMMENT ON TABLE attendance_records IS 'Fichajes de entrada y salida del personal';

-- =============================================================================
-- FUNCIONES Y TRIGGERS AUTOMÁTICOS
-- =============================================================================

-- Actualización automática de la columna updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cash_registers_updated_at
  BEFORE UPDATE ON cash_registers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_warehouse_stock_updated_at
  BEFORE UPDATE ON warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_product_suppliers_updated_at
  BEFORE UPDATE ON product_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inventory_transfers_updated_at
  BEFORE UPDATE ON inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notificación automática de Stock Crítico
CREATE OR REPLACE FUNCTION fn_check_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= NEW.min_stock AND NEW.is_active = TRUE THEN
    INSERT INTO notifications (title, message, type, product_id)
    VALUES (
      CASE WHEN NEW.stock = 0 THEN '¡Producto Agotado!' ELSE '¡Stock Crítico!' END,
      NEW.name || ': quedan ' || TRIM(TO_CHAR(NEW.stock, '999999990.999')) || ' ' || NEW.presentation::TEXT || ' (Mín: ' || TRIM(TO_CHAR(NEW.min_stock, '999999990.999')) || ')',
      CASE WHEN NEW.stock = 0 THEN 'critical'::notification_type ELSE 'warning'::notification_type END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_stock_alert
  AFTER UPDATE OF stock ON products
  FOR EACH ROW
  WHEN (NEW.stock <= NEW.min_stock AND NEW.is_active = TRUE)
  EXECUTE FUNCTION fn_check_stock_alert();

-- Actualización de métricas de cuenta corriente del cliente
CREATE OR REPLACE FUNCTION fn_update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Venta completada
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE customers SET
      total_spent      = total_spent + NEW.total,
      purchase_count   = purchase_count + 1,
      last_purchase_at = NEW.sale_date,
      balance = CASE
        WHEN NEW.payment_method = 'cuenta_corriente' THEN balance - NEW.total
        ELSE balance
      END,
      updated_at = NOW()
    WHERE id = NEW.customer_id;

  -- Venta anulada
  ELSIF NEW.status = 'voided' AND OLD.status = 'completed' THEN
    UPDATE customers SET
      total_spent    = GREATEST(0, total_spent - NEW.total),
      purchase_count = GREATEST(0, purchase_count - 1),
      balance = CASE
        WHEN NEW.payment_method = 'cuenta_corriente' THEN balance + NEW.total
        ELSE balance
      END,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_customer_metrics
  AFTER INSERT OR UPDATE OF status ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_update_customer_metrics();

-- Descontar / Restaurar Stock Decimal al Vender o Anular
CREATE OR REPLACE FUNCTION fn_update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- Venta completada: descontar stock decimal
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    FOR item IN SELECT * FROM sale_items WHERE sale_id = NEW.id LOOP
      UPDATE products SET
        stock = GREATEST(0, stock - item.quantity),
        updated_at = NOW()
      WHERE id = item.product_id;
      
      -- Si existe stock por sucursal, descontar también en la sucursal de la venta
      IF NEW.warehouse_id IS NOT NULL THEN
        UPDATE warehouse_stock SET
          stock = GREATEST(0, stock - item.quantity),
          updated_at = NOW()
        WHERE product_id = item.product_id AND warehouse_id = NEW.warehouse_id;
      END IF;
    END LOOP;

  -- Venta anulada: restaurar stock decimal
  ELSIF NEW.status = 'voided' AND OLD.status = 'completed' THEN
    FOR item IN SELECT * FROM sale_items WHERE sale_id = NEW.id LOOP
      UPDATE products SET
        stock = stock + item.quantity,
        updated_at = NOW()
      WHERE id = item.product_id;
      
      IF NEW.warehouse_id IS NOT NULL THEN
        UPDATE warehouse_stock SET
          stock = stock + item.quantity,
          updated_at = NOW()
        WHERE product_id = item.product_id AND warehouse_id = NEW.warehouse_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_stock_update
  AFTER INSERT OR UPDATE OF status ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_update_stock_on_sale();

-- Actualización automática de acumulados de Caja al insertar ventas
CREATE OR REPLACE FUNCTION fn_update_cash_register_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.register_id IS NOT NULL THEN
    UPDATE cash_registers SET
      expected_cash = expected_cash + CASE WHEN NEW.payment_method = 'efectivo' THEN (NEW.total) ELSE 0 END,
      total_cash    = total_cash    + CASE WHEN NEW.payment_method = 'efectivo' THEN NEW.total ELSE 0 END,
      total_card    = total_card    + CASE WHEN NEW.payment_method IN ('debito', 'credito') THEN NEW.total ELSE 0 END,
      total_qr      = total_qr      + CASE WHEN NEW.payment_method = 'transferencia_qr' THEN NEW.total ELSE 0 END,
      total_account = total_account + CASE WHEN NEW.payment_method = 'cuenta_corriente' THEN NEW.total ELSE 0 END,
      updated_at    = NOW()
    WHERE id = NEW.register_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_cash_register_totals
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_update_cash_register_totals();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE tenants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_split_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records  ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para usuarios autenticados
CREATE POLICY "Auth users can read tenants"             ON tenants FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read warehouses"          ON warehouses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read system_config"       ON system_config FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read users"               ON users FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read cash_registers"      ON cash_registers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read cash_movements"      ON cash_movements FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read categories"          ON categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read products"            ON products FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read warehouse_stock"     ON warehouse_stock FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read product_variants"    ON product_variants FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read suppliers"           ON suppliers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read product_suppliers"   ON product_suppliers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read purchase_orders"     ON purchase_orders FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read purchase_items"      ON purchase_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read inventory_transfers" ON inventory_transfers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read transfer_items"      ON transfer_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read waste_logs"          ON waste_logs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read customers"           ON customers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read sales"               ON sales FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read sale_items"          ON sale_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read sale_split_payments" ON sale_split_payments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read stock_movements"     ON stock_movements FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth users can read customer_payments"   ON customer_payments FOR SELECT TO authenticated USING (TRUE);

-- Políticas de escritura para operaciones diarias de POS y Caja
CREATE POLICY "Auth users can insert sales"               ON sales FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth users can update sales"               ON sales FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Auth users can insert sale_items"          ON sale_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth users can insert sale_split_payments" ON sale_split_payments FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth users can insert stock_movements"     ON stock_movements FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth users can insert cash_registers"      ON cash_registers FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth users can update cash_registers"      ON cash_registers FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Auth users can insert cash_movements"      ON cash_movements FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Auth users can insert waste_logs"          ON waste_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Políticas de Notificaciones y Asistencia
CREATE POLICY "Users can read own notifications"          ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own notifications"        ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can read attendance_records"         ON attendance_records FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can insert attendance_records"       ON attendance_records FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Users can update attendance_records"       ON attendance_records FOR UPDATE TO authenticated USING (TRUE);

-- =============================================================================
-- VISTAS ANALÍTICAS
-- =============================================================================

-- Vista: Productos con stock crítico o agotado (con soporte decimal)
CREATE OR REPLACE VIEW v_critical_stock AS
SELECT
  p.id,
  p.sku,
  p.plu_code,
  p.name,
  p.presentation,
  p.stock,
  p.min_stock,
  (p.stock - p.min_stock) AS stock_diff,
  w.name AS warehouse_name,
  c.name AS category_name
FROM products p
LEFT JOIN warehouses w ON w.id = p.warehouse_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE
  AND p.stock <= p.min_stock
ORDER BY p.stock ASC;

COMMENT ON VIEW v_critical_stock IS 'Productos con stock en nivel crítico o agotados';

-- Vista: Resumen de ventas diario para Dashboard
CREATE OR REPLACE VIEW v_daily_sales_summary AS
SELECT
  DATE(sale_date)                                                     AS sale_day,
  COUNT(*)                                                            AS total_sales,
  COUNT(*) FILTER (WHERE status = 'completed')                        AS completed_sales,
  COUNT(*) FILTER (WHERE status = 'voided')                           AS voided_sales,
  COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)         AS total_revenue,
  COALESCE(SUM(discount_total) FILTER (WHERE status = 'completed'), 0) AS total_discounts
FROM sales
GROUP BY DATE(sale_date)
ORDER BY sale_day DESC;

COMMENT ON VIEW v_daily_sales_summary IS 'Resumen diario de ventas para el panel de control';

-- Vista: Extracto contable unificado de cuentas corrientes
CREATE OR REPLACE VIEW v_customer_account_movements AS
SELECT
  s.id,
  s.customer_id,
  s.sale_date AS date,
  'VENTA'::VARCHAR(10) AS type,
  s.ticket_number AS doc,
  s.total AS debit,
  0::NUMERIC(14,2) AS credit,
  s.notes
FROM sales s
WHERE s.payment_method = 'cuenta_corriente' AND s.status = 'completed'
UNION ALL
SELECT
  p.id,
  p.customer_id,
  p.paid_at AS date,
  'COBRO'::VARCHAR(10) AS type,
  'REC-' || SUBSTRING(p.id::TEXT, 1, 8) AS doc,
  0::NUMERIC(14,2) AS debit,
  p.amount AS credit,
  p.notes
FROM customer_payments p
ORDER BY date DESC;

COMMENT ON VIEW v_customer_account_movements IS 'Historial unificado de fiados y cobros de clientes';

-- Vista: Resumen de Arqueo y Control de Caja
CREATE OR REPLACE VIEW v_cash_register_summary AS
SELECT
  cr.id,
  cr.register_number,
  w.name AS warehouse_name,
  u.full_name AS opened_by_name,
  cr.shift_name,
  cr.opening_amount,
  cr.expected_cash,
  cr.actual_cash,
  cr.difference,
  cr.total_cash,
  cr.total_card,
  cr.total_qr,
  cr.total_account,
  cr.is_open,
  cr.opened_at,
  cr.closed_at
FROM cash_registers cr
JOIN warehouses w ON w.id = cr.warehouse_id
JOIN users u ON u.id = cr.opened_by
ORDER BY cr.opened_at DESC;

COMMENT ON VIEW v_cash_register_summary IS 'Resumen de sesiones y arqueo de turnos de caja';

-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================
