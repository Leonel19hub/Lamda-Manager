-- =============================================================================
-- Lambda Manager — PostgreSQL Schema
-- Sistema POS, Control de Stock y Gestión Administrativa
-- Despensa con Verdulería (Argentina)
-- =============================================================================

-- ===================== ENUMS =====================

CREATE TYPE user_role AS ENUM ('EMPLEADO', 'GERENTE', 'DUEÑO');
CREATE TYPE sale_type AS ENUM ('unit', 'weight');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer_qr', 'card', 'account');
CREATE TYPE transfer_status AS ENUM ('pending', 'in_transit', 'received', 'cancelled');
CREATE TYPE cash_movement_type AS ENUM ('income', 'expense', 'adjustment');
CREATE TYPE account_movement_type AS ENUM ('purchase', 'payment', 'adjustment', 'credit_note');

-- ===================== SUCURSALES =====================

CREATE TABLE branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  address       VARCHAR(255),
  phone         VARCHAR(30),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== USUARIOS =====================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(200) UNIQUE,
  pin           VARCHAR(10),                -- PIN rápido para fichaje
  role          user_role NOT NULL DEFAULT 'EMPLEADO',
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  branch_id     UUID REFERENCES branches(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== FICHAJE DE EMPLEADOS =====================

CREATE TABLE attendance_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  clock_in      TIMESTAMPTZ NOT NULL,
  clock_out     TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== CATEGORÍAS =====================

CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  icon          VARCHAR(50),                -- nombre de icono Lucide
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== PRODUCTOS =====================

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  description   VARCHAR(500),
  barcode       VARCHAR(50) UNIQUE,         -- EAN-13 o NULL si es por peso
  plu_code      VARCHAR(10),                -- Código PLU para verdulería
  category_id   UUID REFERENCES categories(id),
  sale_type     sale_type NOT NULL DEFAULT 'unit',    -- 'unit' o 'weight'
  
  -- Precios
  cost_price    DECIMAL(12,2) NOT NULL DEFAULT 0,     -- Último costo
  sell_price    DECIMAL(12,2) NOT NULL DEFAULT 0,     -- Precio de venta
  margin_pct    DECIMAL(5,2),                         -- Margen % configurado
  
  -- Bultos / Cajones
  pack_name     VARCHAR(50),                -- "Cajón", "Pack", "Bolsa"
  units_per_pack INT DEFAULT 1,             -- Unidades por bulto
  
  -- Impuestos
  iva_rate      DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  
  -- Metadata
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_plu ON products(plu_code);
CREATE INDEX idx_products_category ON products(category_id);

-- ===================== PROVEEDORES =====================

CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  cuit          VARCHAR(20),
  phone         VARCHAR(30),
  email         VARCHAR(200),
  address       VARCHAR(255),
  contact_name  VARCHAR(150),
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== PRODUCTO-PROVEEDOR (N:M) =====================

CREATE TABLE product_suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_code   VARCHAR(50),              -- Código del proveedor para este producto
  last_cost       DECIMAL(12,2),
  last_purchase   TIMESTAMPTZ,
  is_preferred    BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(product_id, supplier_id)
);

-- ===================== STOCK POR SUCURSAL =====================

CREATE TABLE branch_stock (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  current_stock DECIMAL(12,3) NOT NULL DEFAULT 0,   -- En unidades o kg
  min_stock     DECIMAL(12,3) NOT NULL DEFAULT 0,   -- Alerta de stock mínimo
  max_stock     DECIMAL(12,3),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, branch_id)
);

CREATE INDEX idx_branch_stock_product ON branch_stock(product_id);
CREATE INDEX idx_branch_stock_branch ON branch_stock(branch_id);

-- ===================== TRASLADOS ENTRE SUCURSALES =====================

CREATE TABLE inventory_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(20) NOT NULL UNIQUE,
  from_branch_id  UUID NOT NULL REFERENCES branches(id),
  to_branch_id    UUID NOT NULL REFERENCES branches(id),
  status          transfer_status NOT NULL DEFAULT 'pending',
  created_by      UUID NOT NULL REFERENCES users(id),
  received_by     UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at     TIMESTAMPTZ
);

CREATE TABLE transfer_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id     UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity_sent   DECIMAL(12,3) NOT NULL,
  quantity_received DECIMAL(12,3)
);

-- ===================== CLIENTES =====================

CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(200) NOT NULL,
  dni           VARCHAR(20),
  phone         VARCHAR(30),
  email         VARCHAR(200),
  address       VARCHAR(255),
  credit_limit  DECIMAL(12,2) NOT NULL DEFAULT 0,     -- Límite de fiado
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Saldo actual (positivo = debe)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== MOVIMIENTOS CUENTA CORRIENTE =====================

CREATE TABLE customer_account_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          account_movement_type NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,     -- Positivo = cargo, Negativo = abono
  description   TEXT,
  sale_id       UUID,                       -- Referencia a venta si aplica
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== CAJAS =====================

CREATE TABLE cash_registers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_number VARCHAR(10) NOT NULL,     -- "Caja 01"
  branch_id       UUID NOT NULL REFERENCES branches(id),
  opened_by       UUID NOT NULL REFERENCES users(id),
  closed_by       UUID REFERENCES users(id),
  shift_name      VARCHAR(50),              -- "Turno Mañana", "Turno Tarde"
  
  -- Montos
  opening_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_cash   DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_cash     DECIMAL(12,2),
  total_card      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_transfer  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_account   DECIMAL(12,2) NOT NULL DEFAULT 0,  -- fiado
  difference      DECIMAL(12,2),            -- Diferencia en arqueo
  
  -- Timestamps
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  
  is_open         BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT
);

-- ===================== MOVIMIENTOS DE CAJA =====================

CREATE TABLE cash_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id     UUID NOT NULL REFERENCES cash_registers(id),
  type            cash_movement_type NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  description     TEXT NOT NULL,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== VENTAS =====================

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   VARCHAR(20) NOT NULL,       -- "0004-000892"
  branch_id       UUID NOT NULL REFERENCES branches(id),
  register_id     UUID NOT NULL REFERENCES cash_registers(id),
  customer_id     UUID REFERENCES customers(id),
  seller_id       UUID NOT NULL REFERENCES users(id),
  
  -- Totales
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_pct    DECIMAL(5,2),
  rounding        DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Pago
  payment_method  payment_method NOT NULL,
  amount_paid     DECIMAL(12,2),              -- Para cálculo de vuelto
  change_given    DECIMAL(12,2),              -- Vuelto
  
  is_voided       BOOLEAN NOT NULL DEFAULT false,
  voided_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_customer ON sales(customer_id);

-- ===================== ÍTEMS DE VENTA =====================

CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    VARCHAR(200) NOT NULL,      -- Snapshot del nombre
  quantity        DECIMAL(12,3) NOT NULL,     -- Unidades o kg
  unit_price      DECIMAL(12,2) NOT NULL,
  cost_price      DECIMAL(12,2) NOT NULL,     -- Snapshot del costo para margen
  subtotal        DECIMAL(12,2) NOT NULL,
  sale_type       sale_type NOT NULL
);

-- ===================== ÓRDENES DE COMPRA / RECEPCIÓN =====================

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    VARCHAR(20) NOT NULL UNIQUE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  received_by     UUID NOT NULL REFERENCES users(id),
  
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  notes           TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  
  -- Ingreso por bultos o unidades
  packs_received  DECIMAL(12,3),              -- Cantidad de bultos/cajones
  units_per_pack  INT,                        -- Equivalencia al momento
  units_received  DECIMAL(12,3) NOT NULL,     -- Total en unidades individuales
  
  unit_cost       DECIMAL(12,2) NOT NULL,     -- Costo unitario
  total_cost      DECIMAL(12,2) NOT NULL,
  
  -- Actualización de precio
  old_cost        DECIMAL(12,2),
  new_cost        DECIMAL(12,2),
  old_sell_price  DECIMAL(12,2),
  new_sell_price  DECIMAL(12,2)
);

-- ===================== MERMAS =====================

CREATE TABLE waste_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  quantity         DECIMAL(12,3) NOT NULL,    -- Unidades o kg dados de baja
  reason          VARCHAR(100) NOT NULL,      -- "Vencido", "Podrido", "Roto", etc.
  notes           TEXT,
  registered_by   UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waste_logs_product ON waste_logs(product_id);
CREATE INDEX idx_waste_logs_date ON waste_logs(created_at);

-- ===================== SEEDS INICIALES =====================
-- (Se manejan desde la capa de aplicación con datos mockeados)
