export type MaskKey =
  | "classic-red"
  | "black-symbiote"
  | "iron-edition"
  | "future-vision"
  | "stealth-edition"
  | "custom-series";

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
  category: MaskKey;
  tagline: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  images: string[];
  /** Clave del modelo 3D procedural que representa al producto. */
  modelKey: MaskKey;
  /** Archivo GLB/GLTF real en /public/models (prioritario sobre el procedural). */
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

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendiente",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export interface Customer {
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

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  /** Sin pasarela de pago integrada todos los pedidos quedan como "demo_unpaid". */
  paymentStatus: "demo_unpaid" | "paid" | "refunded";
  customer: Customer;
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderInput {
  customer: Customer;
  items: Array<{ productId: string; variantId: string; quantity: number }>;
}
