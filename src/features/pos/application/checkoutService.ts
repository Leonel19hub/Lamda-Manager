import {
  ok,
  fail,
  type Result,
  type ValidationError,
  type Sale,
  type SaleItem,
  type UserRole,
  type CashRegister,
} from '@/types'
import { validateSaleEligibility } from '../domain/validators'
import { usePosStore } from '@/stores/usePosStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useCustomerStore } from '@/stores/useCustomerStore'
import { useCashRegisterStore } from '@/stores/useCashRegisterStore'

export interface CheckoutContext {
  cashierId: string
  cashierName: string
  cashierRole: UserRole
  activeRegister: CashRegister | null
  activeBranch?: { id: string; name: string } | null
  warehouseId?: string
  warehouseName?: string
}

/**
 * Application service that coordinates the transactional checkout workflow:
 * 1. Pre-validates eligibility (pure check).
 * 2. Captures in-memory snapshots of involved stores (inventory, customer, cash register).
 * 3. Sequentially updates stores: inventory deductions -> customer on-account debt -> cash register record -> POS cart commit.
 * 4. Rolls back all mutated stores if an unexpected error occurs, leaving the POS cart intact.
 *
 * Conforms to ADR-1, RF-02.1 to RF-02.5, and RF-03.1 to RF-03.2.
 */
export function executePosCheckout(
  ctx: CheckoutContext
): Result<Sale, ValidationError> {
  const posStore = usePosStore.getState()
  const currentTotal = posStore.total()
  const currentSubtotal = posStore.subtotal()
  const currentChange = posStore.change()

  // 1. Pre-validation (pure / read-only)
  const eligibility = validateSaleEligibility({
    items: posStore.items,
    paymentMethod: posStore.paymentMethod,
    selectedCustomer: posStore.selectedCustomer,
    activeRegister: ctx.activeRegister,
    total: currentTotal,
    amountPaid: posStore.amountPaid,
    splitPayments: posStore.splitPayments,
  })

  if (!eligibility.success) {
    return eligibility
  }

  // 2. Capture in-memory snapshots for rollback
  const inventoryStore = useInventoryStore.getState()
  const productsSnapshot = inventoryStore.products.map((p) => ({
    ...p,
    stock: p.stock ? { ...p.stock } : undefined,
  }))

  const customerStore = useCustomerStore.getState()
  const targetCustomer = posStore.selectedCustomer
    ? customerStore.customers.find((c) => c.id === posStore.selectedCustomer!.id)
    : null
  const customerSnapshot = targetCustomer ? { ...targetCustomer } : null

  const cashRegisterStore = useCashRegisterStore.getState()
  const registerSnapshot = cashRegisterStore.currentRegister
    ? { ...cashRegisterStore.currentRegister }
    : null

  // 3. Construct Sale and SaleItem records
  const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const saleItems: SaleItem[] = posStore.items.map((i) => ({
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    saleId,
    productId: i.productId,
    productSku: i.productSku || i.pluCode || i.barcode || 'SKU-GEN',
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discountPercent: i.discountPercent || 0,
    costPrice: i.costPrice,
    subtotal: i.subtotal,
    total: i.subtotal,
    saleType: i.saleType,
  }))

  const finalSale: Sale = {
    id: saleId,
    ticketNumber: posStore.ticketNumber,
    registerId: ctx.activeRegister?.id || 'reg-01',
    branchId: ctx.activeBranch?.id || ctx.activeRegister?.branchId || 'branch-01',
    warehouseId: ctx.warehouseId || ctx.activeBranch?.id || 'branch-01',
    warehouseName: ctx.warehouseName || ctx.activeBranch?.name || 'Sucursal Principal',
    customerId: posStore.selectedCustomer?.id,
    customerName: posStore.selectedCustomer?.fullName || 'Consumidor Final',
    customerDni: posStore.selectedCustomer?.dni || posStore.selectedCustomer?.dniCuit,
    cashierId: ctx.cashierId,
    cashierName: ctx.cashierName,
    cashierRole: ctx.cashierRole,
    subtotal: currentSubtotal,
    discountTotal: 0,
    rounding: Math.round((currentTotal - currentSubtotal) * 100) / 100,
    total: currentTotal,
    paymentMethod: posStore.paymentMethod,
    splitPayments: posStore.paymentMethod === 'mixto' ? posStore.splitPayments : undefined,
    cashReceived: posStore.paymentMethod === 'efectivo' ? posStore.amountPaid : undefined,
    cashChange: posStore.paymentMethod === 'efectivo' ? currentChange : undefined,
    status: 'completed',
    createdAt: new Date().toISOString(),
    items: saleItems,
  }

  // 4. Sequential mutations inside try/catch with guaranteed rollback
  let inventoryDeducted = false
  let customerCharged = false
  let registerRecorded = false

  try {
    // Step 4.1: Deduct inventory stock
    for (const item of posStore.items) {
      const deductRes = useInventoryStore
        .getState()
        .deductProductStock(item.productId, item.quantity, ctx.warehouseId)
      if (!deductRes.success) {
        throw new Error(deductRes.error.message || 'Error al descontar stock del producto.')
      }
    }
    inventoryDeducted = true

    // Step 4.2: Impute customer account debt if applicable (cuenta_corriente or mixto with cuenta_corriente)
    let amountToCharge = 0
    if (posStore.paymentMethod === 'cuenta_corriente') {
      amountToCharge = currentTotal
    } else if (posStore.paymentMethod === 'mixto') {
      const splitAcc = posStore.splitPayments.find((p) => p.method === 'cuenta_corriente')
      if (splitAcc && splitAcc.amount > 0) {
        amountToCharge = splitAcc.amount
      }
    }

    if (amountToCharge > 0 && posStore.selectedCustomer) {
      useCustomerStore
        .getState()
        .chargeAccount(
          posStore.selectedCustomer.id,
          amountToCharge,
          posStore.ticketNumber,
          'Venta a cuenta corriente en POS'
        )
      customerCharged = true
    }

    // Step 4.3: Record sale in cash register drawer
    useCashRegisterStore.getState().recordSale(finalSale)
    registerRecorded = true

    // Step 4.4: Commit ticket and reset cart in POS store
    usePosStore.getState().commitSale(finalSale)

    return ok(finalSale)
  } catch (error) {
    // Revert mutations in reverse order
    if (registerRecorded && registerSnapshot) {
      useCashRegisterStore.getState().revertRegister(registerSnapshot)
    }
    if (customerCharged && customerSnapshot) {
      useCustomerStore.getState().restoreCustomer(customerSnapshot)
    }
    if (inventoryDeducted) {
      useInventoryStore.getState().restoreProducts(productsSnapshot)
    }
    // Note: usePosStore cart is intentionally kept intact so the cashier does not lose the scanned items

    return fail({
      code: 'CHECKOUT_TRANSACTION_FAILED',
      message:
        error instanceof Error
          ? error.message
          : 'Error inesperado durante la transacción de cobro. Se revirtieron los cambios.',
    })
  }
}
