import type {
  AdminUser,
  Category,
  CategoryInput,
  Customer,
  CustomerStatus,
  ModelAsset,
  ModelMetaInput,
  Order,
  OrderStatus,
  PaymentMethod,
  PlaceOrderInput,
  Product,
  ProductInput,
  StockAdjustInput,
  StockMovement,
  StoreSettings,
} from "../types";

export class DbError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type NewModelAsset = Omit<ModelAsset, "id" | "createdAt" | "updatedAt">;

/**
 * Única fuente de datos de la tienda y del panel. Dos implementaciones:
 * archivo JSON local (desarrollo) y Supabase (producción).
 * Todas las operaciones que tocan stock son atómicas.
 */
export interface Repository {
  readonly kind: "local" | "supabase";

  // Configuración
  getSettings(): Promise<StoreSettings>;
  updateSettings(patch: Partial<Omit<StoreSettings, "updatedAt">>): Promise<StoreSettings>;

  // Categorías
  listCategories(opts?: { includeInactive?: boolean }): Promise<Category[]>;
  createCategory(input: CategoryInput): Promise<Category>;
  updateCategory(id: string, input: CategoryInput): Promise<Category>;
  /** Falla si algún producto usa la categoría. */
  deleteCategory(id: string): Promise<void>;

  // Productos
  listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  getProductBySlug(slug: string): Promise<Product | null>;
  /** El stock de las variantes se registra como movimiento "initial"/"adjustment" con el actor indicado. */
  createProduct(input: ProductInput, actor: string): Promise<Product>;
  updateProduct(id: string, input: ProductInput, actor: string): Promise<Product>;
  patchProduct(id: string, patch: Partial<Pick<Product, "active" | "featured" | "modelUrl">>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  /** Quita el modelo de todos los productos que usan esa URL. Devuelve cuántos se modificaron. */
  unassignModel(url: string): Promise<number>;

  // Pedidos
  /** Valida cliente y stock, recalcula precios, descuenta stock (movimiento "sale") y registra/actualiza el cliente. */
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  /** Cancelar repone stock; reactivar un cancelado lo vuelve a descontar. Nunca se descuenta dos veces. */
  updateOrderStatus(id: string, status: OrderStatus, actor: string, note?: string): Promise<Order>;
  /** Registra un cobro confirmado manualmente (transferencia, efectivo…) o un reembolso. */
  recordPayment(id: string, input: { action: "paid" | "refunded" | "unpaid"; method: PaymentMethod; reference: string }, actor: string): Promise<Order>;
  deleteTestOrders(): Promise<number>;

  // Clientes
  listCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | null>;
  updateCustomer(id: string, patch: { status?: CustomerStatus; suspendedReason?: string | null; adminNotes?: string }): Promise<Customer>;

  // Inventario
  adjustStock(input: StockAdjustInput, actor: string): Promise<StockMovement>;
  listMovements(opts?: { variantId?: string; productId?: string; limit?: number }): Promise<StockMovement[]>;

  // Modelos 3D
  listModelAssets(): Promise<ModelAsset[]>;
  upsertModelAsset(asset: NewModelAsset): Promise<ModelAsset>;
  updateModelMeta(id: string, meta: ModelMetaInput): Promise<ModelAsset>;
  deleteModelAsset(id: string): Promise<ModelAsset>;
  /** Guarda los archivos de un modelo subido y devuelve la URL del archivo principal. */
  saveModelFiles(files: { name: string; data: Buffer }[], mainFile: string): Promise<{ url: string; folder: string }>;
  removeModelFiles(asset: ModelAsset): Promise<void>;

  // Usuarios del panel
  listAdminUsers(): Promise<AdminUser[]>;
  getAdminUserById(id: string): Promise<AdminUser | null>;
  getAdminUserByEmail(email: string): Promise<AdminUser | null>;
  createAdminUser(input: Pick<AdminUser, "email" | "name" | "role" | "passwordHash">): Promise<AdminUser>;
  updateAdminUser(id: string, patch: Partial<Pick<AdminUser, "name" | "role" | "active" | "passwordHash" | "lastLoginAt">>): Promise<AdminUser>;
  deleteAdminUser(id: string): Promise<void>;

  // Archivos
  saveImage(data: Buffer, ext: string, mime: string): Promise<string>;
}
