export type MaskKey =
  | "classic-red"
  | "black-symbiote"
  | "iron-edition"
  | "future-vision"
  | "stealth-edition"
  | "custom-series";

/* ───────────── Catálogo ───────────── */

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryInput = Pick<Category, "slug" | "name" | "description" | "sortOrder" | "active">;

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  stock: number;
  /** Precio en céntimos. `null` usa el precio del producto. */
  priceCents: number | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Slug de la categoría (tabla de categorías). */
  category: string;
  tagline: string;
  description: string;
  priceCents: number;
  /** Precio anterior: si es mayor que el precio, la tienda muestra el descuento. */
  compareAtCents: number | null;
  images: string[];
  /** Estilo del modelo 3D procedural usado en el laboratorio. */
  modelKey: MaskKey;
  /** Archivo GLB/GLTF real (prioritario sobre el procedural). */
  modelUrl: string | null;
  featured: boolean;
  active: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt" | "variants"> & {
  variants: Array<Omit<ProductVariant, "id"> & { id?: string }>;
};

/* ───────────── Pedidos ───────────── */

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "No pagado",
  paid: "Pagado",
  refunded: "Reembolsado",
};

/**
 * "none" = pedido registrado sin pasarela de pago (no se ha cobrado nada).
 * Los demás métodos solo se asignan cuando el administrador registra un cobro recibido fuera de la web.
 */
export const PAYMENT_METHODS = ["none", "bank_transfer", "cash", "card_terminal", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  none: "Sin pasarela de pago",
  bank_transfer: "Transferencia bancaria",
  cash: "Efectivo",
  card_terminal: "Datáfono / TPV",
  other: "Otro",
};

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderEvent {
  type: "status" | "payment" | "note";
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  note?: string;
  by: string;
  at: string;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  /** Referencia del cobro (nº de transferencia, recibo…). */
  paymentRef: string | null;
  paidAt: string | null;
  customerId: string | null;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  history: OrderEvent[];
  /** true si el pedido se creó con datos de prueba (tests automáticos). */
  isTest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderInput {
  customer: CustomerInfo;
  items: Array<{ productId: string; variantId: string; quantity: number }>;
  isTest?: boolean;
}

/* ───────────── Clientes ───────────── */

export type CustomerStatus = "active" | "suspended";

/** Cliente registrado automáticamente a partir de sus pedidos (la tienda no tiene cuentas con contraseña). */
export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  status: CustomerStatus;
  suspendedReason: string | null;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

/* ───────────── Inventario ───────────── */

export const STOCK_REASONS = ["sale", "cancel", "reactivate", "restock", "return", "damage", "adjustment", "initial"] as const;
export type StockReason = (typeof STOCK_REASONS)[number];
export const STOCK_REASON_LABEL: Record<StockReason, string> = {
  sale: "Venta",
  cancel: "Cancelación (reposición)",
  reactivate: "Pedido reactivado",
  restock: "Entrada de mercancía",
  return: "Devolución",
  damage: "Merma / daño",
  adjustment: "Ajuste de inventario",
  initial: "Stock inicial",
};

export interface StockMovement {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  delta: number;
  stockAfter: number;
  reason: StockReason;
  orderId: string | null;
  note: string;
  actor: string;
  createdAt: string;
}

export interface StockAdjustInput {
  variantId: string;
  /** in = entrada, out = salida, set = fijar cantidad exacta (recuento). */
  mode: "in" | "out" | "set";
  quantity: number;
  reason: Exclude<StockReason, "sale" | "cancel" | "reactivate">;
  note: string;
}

/* ───────────── Modelos 3D ───────────── */

export interface ModelStats {
  sizeMB: number;
  meshes: number;
  materials: string[];
  textures: number;
  animations: number;
  extensions: string[];
  generator: string;
}

export interface ModelAsset {
  id: string;
  fileName: string;
  /** URL pública con la que se carga el modelo. */
  url: string;
  /** public = copiado a /public/models · upload = subido desde el panel · supabase = Supabase Storage. */
  source: "public" | "upload" | "supabase";
  name: string;
  author: string;
  sourceUrl: string;
  license: string;
  rotationX: number;
  rotationY: number;
  sizeBytes: number;
  valid: boolean;
  issues: string[];
  warnings: string[];
  stats: ModelStats;
  createdAt: string;
  updatedAt: string;
}

export type ModelMetaInput = Pick<ModelAsset, "name" | "author" | "sourceUrl" | "license" | "rotationX" | "rotationY">;

/* ───────────── Administración ───────────── */

export const ADMIN_ROLES = ["owner", "admin", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  staff: "Personal",
};

/** Usuario del panel guardado en base de datos (el propietario se define en .env.local). */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Exclude<AdminRole, "owner">;
  passwordHash: string;
  active: boolean;
  /** Se incrementa al cambiar contraseña, rol o desactivar: invalida las sesiones abiertas. */
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export type PublicAdminUser = Omit<AdminUser, "passwordHash">;

export interface StoreSettings {
  storeName: string;
  contactEmail: string;
  shippingCents: number;
  freeShippingFromCents: number;
  lowStockThreshold: number;
  maxQuantityPerItem: number;
  /** Si es false, la tienda sigue visible pero no acepta pedidos nuevos. */
  ordersEnabled: boolean;
  /** Texto que ve el cliente al confirmar el pedido (instrucciones de pago fuera de la web). */
  checkoutNotice: string;
  updatedAt: string;
}
