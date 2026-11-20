// ============================================================================
// Lambda Manager — TypeScript Types
// Mirrors the PostgreSQL schema for frontend use
// ============================================================================

export * from './result'

// ---- Enums ----

export type UserRole = 'EMPLEADO' | 'GERENTE' | 'DUEÑO';
export type SaleType = 'unit' | 'weight';
export type PaymentMethod = 'cash' | 'transfer_qr' | 'card' | 'account';
export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';
export type CashMovementType = 'income' | 'expense' | 'adjustment';
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

export interface AttendanceLog {
  id: string;
  userId: string;
  branchId: string;
  clockIn: string;
  clockOut?: string;
  notes?: string;
  createdAt: string;
  // Joined
  user?: User;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  pluCode?: string;
  categoryId?: string;
  saleType: SaleType;
  costPrice: number;
  sellPrice: number;
  marginPct?: number;
  packName?: string;
  unitsPerPack: number;
  ivaRate: number;
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

export interface Customer {
  id: string;
  fullName: string;
  dni?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAccountMovement {
  id: string;
  customerId: string;
  type: AccountMovementType;
  amount: number;
  description?: string;
  saleId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  registerNumber: string;
  branchId: string;
  openedBy: string;
  closedBy?: string;
  shiftName?: string;
  openingAmount: number;
  expectedCash: number;
  actualCash?: number;
  totalCard: number;
  totalTransfer: number;
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

export interface Sale {
  id: string;
  ticketNumber: string;
  branchId: string;
  registerId: string;
  customerId?: string;
  sellerId: string;
  subtotal: number;
  discountAmount: number;
  discountPct?: number;
  rounding: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid?: number;
  changeGiven?: number;
  isVoided: boolean;
  voidedReason?: string;
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
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
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
  saleType: SaleType;
  quantity: number;       // units or kg
  unitPrice: number;
  costPrice: number;
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
