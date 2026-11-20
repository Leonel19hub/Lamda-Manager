// ============================================================================
// Lambda Manager — TypeScript Types
// Mirrors the PostgreSQL schema for frontend use
// ============================================================================

export * from './result'

// ---- Enums ----

export type UserRole = 'EMPLEADO' | 'GERENTE' | 'DUEÑO';
export type SaleType = 'unit' | 'weight';
export type PaymentMethod =
  | 'efectivo'
  | 'debito'
  | 'credito'
  | 'transferencia_qr'
  | 'mixto'
  | 'cuenta_corriente';
export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';
export type CashMovementType =
  | 'apertura'
  | 'ingreso'
  | 'egreso'
  | 'retiro'
  | 'ajuste'
  // Backward compatibility aliases
  | 'income'
  | 'expense'
  | 'adjustment';
export type AccountMovementType = 'purchase' | 'payment' | 'adjustment' | 'credit_note';

// ---- Entities ----

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  fullName: string;
  email?: string;
  pin?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'active' | 'completed' | 'flagged';

export interface AttendanceRecord {
  id: string;
  userId: string;
  branchId: string;
  warehouseId?: string;
  checkIn?: string;
  clockIn: string;
  checkOut?: string;
  clockOut?: string;
  totalHours?: number;
  isManualEntry?: boolean;
  editedBy?: string;
  notes?: string;
  status?: AttendanceStatus;
  createdAt: string;
  updatedAt?: string;
  // Joined
  user?: User;
}

export type AttendanceLog = AttendanceRecord;

export interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  barcode?: string;
  pluCode?: string;
  categoryId?: string;
  saleType: SaleType;
  presentation?: 'unidad' | 'kg' | 'pack' | 'litro';
  costPrice: number;
  sellPrice: number;
  marginPct?: number;
  packName?: string;
  unitsPerPack: number;
  ivaRate?: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  category?: Category;
  stock?: BranchStock;
}

export interface Supplier {
  id: string;
  name: string;
  cuit?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  supplierCode?: string;
  lastCost?: number;
  lastPurchase?: string;
  isPreferred: boolean;
  // Joined
  product?: Product;
  supplier?: Supplier;
}

export interface BranchStock {
  id: string;
  productId: string;
  branchId: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  updatedAt: string;
}

export interface InventoryTransfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  status: TransferStatus;
  createdBy: string;
  receivedBy?: string;
  notes?: string;
  createdAt: string;
  receivedAt?: string;
  // Joined
  items?: TransferItem[];
  fromBranch?: Branch;
  toBranch?: Branch;
}

export interface TransferItem {
  id: string;
  transferId: string;
  productId: string;
  quantitySent: number;
  quantityReceived?: number;
  // Joined
  product?: Product;
}

export type CustomerType = 'persona' | 'empresa';

export interface Customer {
  id: string;
  name?: string;
  fullName: string;
  type?: CustomerType;
  dni?: string;
  dniCuit?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number;
  balance?: number;
  totalSpent?: number;
  purchaseCount?: number;
  lastPurchaseAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  amount: number;
  notes?: string;
  userId?: string;
  userName?: string;
  paidAt: string;
  createdAt: string;
}

export interface CustomerAccountMovement {
  id: string;
  customerId: string;
  date: string;
  type: 'VENTA' | 'COBRO' | 'AJUSTE' | AccountMovementType;
  doc: string;
  debit: number;
  credit: number;
  notes?: string;
  amount?: number;
  description?: string;
  saleId?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface CashRegister {
  id: string;
  registerNumber: string;
  branchId: string;
  warehouseId?: string;
  warehouseName?: string;
  openedBy: string;
  openedByName?: string;
  closedBy?: string;
  closedByName?: string;
  shiftName?: string;
  openingAmount: number;
  expectedCash: number;
  actualCash?: number;
  totalCash?: number;
  totalCard: number;
  totalTransfer: number;
  totalQr?: number;
  totalAccount: number;
  difference?: number;
  openedAt: string;
  closedAt?: string;
  isOpen: boolean;
  notes?: string;
  // Joined
  openedByUser?: User;
}

export interface CashMovement {
  id: string;
  registerId: string;
  type: CashMovementType;
  amount: number;
  description: string;
  createdBy?: string;
  createdAt: string;
}

export interface SplitPaymentItem {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface Sale {
  id: string;
  ticketNumber: string;
  branchId?: string;
  warehouseId?: string;
  warehouseName?: string;
  registerId: string;
  customerId?: string;
  customerName?: string;
  customerDni?: string;
  sellerId?: string;
  cashierId?: string;
  cashierName?: string;
  cashierRole?: UserRole;
  subtotal: number;
  discountAmount?: number;
  discountTotal?: number;
  discountPct?: number;
  rounding?: number;
  total: number;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPaymentItem[];
  amountPaid?: number;
  cashReceived?: number;
  changeGiven?: number;
  cashChange?: number;
  isVoided?: boolean;
  status?: 'completed' | 'voided' | 'refunded';
  voidedReason?: string;
  notes?: string;
  createdAt: string;
  // Joined
  items?: SaleItem[];
  customer?: Customer;
  seller?: User;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productSku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  costPrice?: number;
  subtotal: number;
  total?: number;
  saleType: SaleType;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  branchId: string;
  receivedBy: string;
  subtotal: number;
  total: number;
  notes?: string;
  receivedAt: string;
  createdAt: string;
  // Joined
  items?: PurchaseItem[];
  supplier?: Supplier;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName?: string;
  packsReceived?: number;
  unitsPerPack?: number;
  unitsReceived: number;
  unitCost: number;
  totalCost: number;
  oldCost?: number;
  newCost?: number;
  oldSellPrice?: number;
  newSellPrice?: number;
  // Joined
  product?: Product;
}

export interface WasteLog {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  reason: string;
  notes?: string;
  registeredBy: string;
  createdAt: string;
  // Joined
  product?: Product;
  registeredByUser?: User;
}

// ---- POS Cart Types ----

export interface CartItem {
  id: string;             // unique within cart
  productId: string;
  productName: string;
  productSku?: string;
  saleType: SaleType;
  quantity: number;       // units or kg
  unitPrice: number;
  costPrice: number;
  discountPercent?: number;
  subtotal: number;
  barcode?: string;
  pluCode?: string;
}

// ---- Dashboard Types ----

export interface DashboardKPI {
  totalSalesToday: number;
  totalSalesYesterday: number;
  ticketCount: number;
  averageTicket: number;
  totalWaste: number;
  lowStockCount: number;
  totalCashInRegister: number;
  totalAccountsReceivable: number;
}

export interface HourlySalesData {
  hour: string;
  amount: number;
}

export interface CategorySalesData {
  category: string;
  amount: number;
  percentage: number;
}
