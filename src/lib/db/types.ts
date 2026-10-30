import type { Order, OrderStatus, PlaceOrderInput, Product, ProductInput } from "../types";

export class DbError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface Repository {
  readonly kind: "local" | "supabase";
  listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  getProductBySlug(slug: string): Promise<Product | null>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  /** Valida existencias, recalcula precios en el servidor y descuenta stock. */
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  /** Cambia el estado. Al cancelar se repone el stock; al reactivar se vuelve a descontar. */
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
  saveImage(data: Buffer, ext: string, mime: string): Promise<string>;
}
