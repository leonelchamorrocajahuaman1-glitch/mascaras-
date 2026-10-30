import "server-only";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { siteConfig } from "../config";
import type { MaskKey, Order, OrderStatus, Product, ProductInput } from "../types";
import { DbError, type Repository } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

let client: SupabaseClient | null = null;
function sb() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const PRODUCT_SELECT = "*, product_variants(*)";
const BUCKET = "product-images";

function toProduct(row: any): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as MaskKey,
    tagline: row.tagline,
    description: row.description,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents,
    images: row.images ?? [],
    modelKey: row.model_key as MaskKey,
    modelUrl: row.model_url ?? null,
    featured: row.featured,
    active: row.active,
    variants: (row.product_variants ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((v: any) => ({ id: v.id, name: v.name, sku: v.sku, stock: v.stock, priceCents: v.price_cents })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOrder(row: any): Order {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    paymentStatus: row.payment_status,
    customer: row.customer,
    items: (row.order_items ?? []).map((i: any) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      productName: i.product_name,
      variantName: i.variant_name,
      sku: i.sku,
      image: i.image,
      unitPriceCents: i.unit_price_cents,
      quantity: i.quantity,
    })),
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function check<T>(res: { data: T; error: any }): T {
  if (res.error) {
    if (res.error.code === "23505") throw new DbError("Ya existe un registro con ese valor único (slug).", 409);
    throw new DbError(res.error.message ?? "Error de base de datos", 500);
  }
  return res.data;
}

function productRow(input: ProductInput) {
  return {
    slug: input.slug,
    name: input.name,
    category: input.category,
    tagline: input.tagline,
    description: input.description,
    price_cents: input.priceCents,
    compare_at_cents: input.compareAtCents,
    images: input.images,
    model_key: input.modelKey,
    model_url: input.modelUrl,
    featured: input.featured,
    active: input.active,
  };
}

async function syncVariants(productId: string, variants: ProductInput["variants"]) {
  const existing = check(await sb().from("product_variants").select("id").eq("product_id", productId)) as { id: string }[];
  const keep = new Set(variants.map((v) => v.id).filter(Boolean));
  const remove = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (remove.length) check(await sb().from("product_variants").delete().in("id", remove));
  for (const [position, v] of variants.entries()) {
    const row = { product_id: productId, name: v.name, sku: v.sku, stock: v.stock, price_cents: v.priceCents, position };
    if (v.id && existing.some((e) => e.id === v.id)) {
      check(await sb().from("product_variants").update(row).eq("id", v.id));
    } else {
      check(await sb().from("product_variants").insert(row));
    }
  }
}

export const supabaseRepository: Repository = {
  kind: "supabase",

  async listProducts(opts) {
    let q = sb().from("products").select(PRODUCT_SELECT).order("created_at");
    if (!opts?.includeInactive) q = q.eq("active", true);
    return (check(await q) as any[]).map(toProduct);
  },

  async getProductById(id) {
    const data = check(await sb().from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle());
    return data ? toProduct(data) : null;
  },

  async getProductBySlug(slug) {
    const data = check(await sb().from("products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle());
    return data ? toProduct(data) : null;
  },

  async createProduct(input) {
    const row = check(await sb().from("products").insert(productRow(input)).select("id").single()) as { id: string };
    await syncVariants(row.id, input.variants);
    return (await this.getProductById(row.id))!;
  },

  async updateProduct(id, input) {
    check(await sb().from("products").update({ ...productRow(input), updated_at: new Date().toISOString() }).eq("id", id));
    await syncVariants(id, input.variants);
    const product = await this.getProductById(id);
    if (!product) throw new DbError("Producto no encontrado.", 404);
    return product;
  },

  async deleteProduct(id) {
    check(await sb().from("products").delete().eq("id", id));
  },

  async placeOrder(input) {
    const res = await sb().rpc("place_order", {
      p_customer: input.customer,
      p_items: input.items,
      p_shipping_rule: {
        flat: siteConfig.shippingCents,
        freeFrom: siteConfig.freeShippingFromCents,
        currency: siteConfig.currency,
      },
    });
    if (res.error) {
      const msg: string = res.error.message ?? "";
      if (msg.startsWith("OUT_OF_STOCK")) throw new DbError(`Sin existencias suficientes: ${msg.split(":")[1] ?? ""}`.trim(), 409);
      if (msg.includes("PRODUCT_UNAVAILABLE")) throw new DbError("Uno de los productos ya no está disponible.", 409);
      throw new DbError("No se pudo registrar el pedido.", 500);
    }
    return (await this.getOrder(res.data as string))!;
  },

  async listOrders() {
    const data = check(await sb().from("orders").select("*, order_items(*)").order("created_at", { ascending: false }));
    return (data as any[]).map(toOrder);
  },

  async getOrder(id) {
    const data = check(await sb().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle());
    return data ? toOrder(data) : null;
  },

  async updateOrderStatus(id, status: OrderStatus) {
    const res = await sb().rpc("set_order_status", { p_order_id: id, p_status: status });
    if (res.error) {
      if (res.error.message.includes("OUT_OF_STOCK")) throw new DbError("No hay stock para reactivar el pedido.", 409);
      if (res.error.message.includes("ORDER_NOT_FOUND")) throw new DbError("Pedido no encontrado.", 404);
      throw new DbError(res.error.message, 500);
    }
    return (await this.getOrder(id))!;
  },

  async saveImage(data, ext, mime) {
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${ext}`;
    check(await sb().storage.from(BUCKET).upload(name, data, { contentType: mime, upsert: false }));
    return sb().storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  },
};
