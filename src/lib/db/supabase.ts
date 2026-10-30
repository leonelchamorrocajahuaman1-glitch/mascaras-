import "server-only";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "../defaults";
import type { AdminUser, Category, Customer, MaskKey, ModelAsset, Order, OrderEvent, Product, ProductInput, StockMovement, StoreSettings } from "../types";
import { DbError, type Repository } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

let client: SupabaseClient | null = null;
/** Cliente con la service role: SOLO en el servidor (este módulo importa "server-only"). */
export function supabaseAdmin() {
  return sb();
}
function sb() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const PRODUCT_SELECT = "*, product_variants(*)";
const ORDER_SELECT = "*, order_items(*)";
const IMAGE_BUCKET = "product-images";
const MODEL_BUCKET = "models";
const now = () => new Date().toISOString();

function check<T>(res: { data: T; error: any }): T {
  if (res.error) {
    if (res.error.code === "23505") throw new DbError("Ya existe un registro con ese valor único.", 409);
    if (res.error.code === "23503") throw new DbError("El registro está en uso por otros datos.", 409);
    throw new DbError(res.error.message ?? "Error de base de datos", 500);
  }
  return res.data;
}

/** Traduce los errores lanzados por las funciones SQL (RAISE EXCEPTION 'CODIGO:detalle'). */
function rpcError(error: any): never {
  const msg: string = error?.message ?? "";
  const [code, detail] = msg.split(":");
  const map: Record<string, [string, number]> = {
    OUT_OF_STOCK: [`Sin existencias suficientes${detail ? `: ${detail}` : ""}.`, 409],
    PRODUCT_UNAVAILABLE: ["Uno de los productos ya no está disponible.", 409],
    ORDERS_DISABLED: ["La tienda no está aceptando pedidos en este momento.", 503],
    CUSTOMER_SUSPENDED: ["Esta cuenta de cliente está suspendida. Contacta con la tienda.", 403],
    MAX_QUANTITY: [`Máximo ${detail} unidades por artículo.`, 400],
    ORDER_NOT_FOUND: ["Pedido no encontrado.", 404],
    VARIANT_NOT_FOUND: ["Variante no encontrada.", 404],
    NO_CHANGE: ["La cantidad no cambia el stock.", 400],
  };
  const hit = map[code];
  if (hit) throw new DbError(hit[0], hit[1]);
  throw new DbError(msg || "Error de base de datos", 500);
}

/* ───── Mapeos fila ↔ dominio ───── */

const toCategory = (r: any): Category => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  sortOrder: r.sort_order,
  active: r.active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toProduct = (row: any): Product => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: row.category,
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
});

const toOrder = (row: any): Order => ({
  id: row.id,
  number: row.number,
  status: row.status,
  paymentStatus: row.payment_status,
  paymentMethod: row.payment_method ?? "none",
  paymentRef: row.payment_ref ?? null,
  paidAt: row.paid_at ?? null,
  customerId: row.customer_id ?? null,
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
  history: row.history ?? [],
  isTest: row.is_test ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toCustomer = (r: any): Customer => ({
  id: r.id,
  email: r.email,
  name: r.name,
  phone: r.phone,
  city: r.city,
  country: r.country,
  status: r.status,
  suspendedReason: r.suspended_reason,
  adminNotes: r.admin_notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toMovement = (r: any): StockMovement => ({
  id: r.id,
  productId: r.product_id,
  variantId: r.variant_id,
  productName: r.product_name,
  variantName: r.variant_name,
  sku: r.sku,
  delta: r.delta,
  stockAfter: r.stock_after,
  reason: r.reason,
  orderId: r.order_id,
  note: r.note,
  actor: r.actor,
  createdAt: r.created_at,
});

const toModel = (r: any): ModelAsset => ({
  id: r.id,
  fileName: r.file_name,
  url: r.url,
  source: r.source,
  name: r.name,
  author: r.author,
  sourceUrl: r.source_url,
  license: r.license,
  rotationX: r.rotation_x,
  rotationY: r.rotation_y,
  sizeBytes: r.size_bytes,
  valid: r.valid,
  issues: r.issues ?? [],
  warnings: r.warnings ?? [],
  stats: r.stats ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toAdmin = (r: any): AdminUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  passwordHash: r.password_hash,
  active: r.active,
  sessionVersion: r.session_version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  lastLoginAt: r.last_login_at,
});

const productRow = (input: ProductInput) => ({
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
});

async function logMovement(m: Omit<StockMovement, "id" | "createdAt">) {
  check(
    await sb().from("stock_movements").insert({
      product_id: m.productId,
      variant_id: m.variantId,
      product_name: m.productName,
      variant_name: m.variantName,
      sku: m.sku,
      delta: m.delta,
      stock_after: m.stockAfter,
      reason: m.reason,
      order_id: m.orderId,
      note: m.note,
      actor: m.actor,
    }),
  );
}

async function syncVariants(product: { id: string; name: string }, variants: ProductInput["variants"], actor: string) {
  const existing = check(await sb().from("product_variants").select("id, stock").eq("product_id", product.id)) as { id: string; stock: number }[];
  const keep = new Set(variants.map((v) => v.id).filter(Boolean));
  const remove = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (remove.length) check(await sb().from("product_variants").delete().in("id", remove));
  for (const [position, v] of variants.entries()) {
    const row = { product_id: product.id, name: v.name, sku: v.sku, stock: v.stock, price_cents: v.priceCents, position };
    const prev = v.id ? existing.find((e) => e.id === v.id) : undefined;
    let variantId = prev?.id;
    if (prev) check(await sb().from("product_variants").update(row).eq("id", prev.id));
    else variantId = (check(await sb().from("product_variants").insert(row).select("id").single()) as { id: string }).id;
    const delta = v.stock - (prev?.stock ?? 0);
    if (delta !== 0 && variantId) {
      await logMovement({
        productId: product.id,
        variantId,
        productName: product.name,
        variantName: v.name,
        sku: v.sku,
        delta,
        stockAfter: v.stock,
        reason: prev ? "adjustment" : "initial",
        orderId: null,
        note: prev ? "Editado desde la ficha del producto" : "",
        actor,
      });
    }
  }
}

async function appendHistory(id: string, event: OrderEvent, extra: Record<string, unknown> = {}) {
  const current = check(await sb().from("orders").select("history").eq("id", id).maybeSingle()) as { history: OrderEvent[] } | null;
  if (!current) throw new DbError("Pedido no encontrado.", 404);
  check(await sb().from("orders").update({ ...extra, history: [...(current.history ?? []), event], updated_at: now() }).eq("id", id));
}

export const supabaseRepository: Repository = {
  kind: "supabase",

  /* ───── Configuración ───── */
  async getSettings() {
    const row = check(await sb().from("store_settings").select("data, updated_at").eq("id", 1).maybeSingle()) as { data: Partial<StoreSettings>; updated_at: string } | null;
    return { ...DEFAULT_SETTINGS, ...(row?.data ?? {}), updatedAt: row?.updated_at ?? now() };
  },
  async updateSettings(patch) {
    const current = await this.getSettings();
    const { updatedAt: _u, ...rest } = { ...current, ...patch };
    check(await sb().from("store_settings").upsert({ id: 1, data: rest, updated_at: now() }));
    return this.getSettings();
  },

  /* ───── Categorías ───── */
  async listCategories(opts) {
    let q = sb().from("categories").select("*").order("sort_order").order("name");
    if (!opts?.includeInactive) q = q.eq("active", true);
    return (check(await q) as any[]).map(toCategory);
  },
  async createCategory(input) {
    const row = check(
      await sb().from("categories").insert({ slug: input.slug, name: input.name, description: input.description, sort_order: input.sortOrder, active: input.active }).select("*").single(),
    );
    return toCategory(row);
  },
  async updateCategory(id, input) {
    // products.category referencia categories.slug con ON UPDATE CASCADE.
    const row = check(
      await sb()
        .from("categories")
        .update({ slug: input.slug, name: input.name, description: input.description, sort_order: input.sortOrder, active: input.active, updated_at: now() })
        .eq("id", id)
        .select("*")
        .maybeSingle(),
    );
    if (!row) throw new DbError("Categoría no encontrada.", 404);
    return toCategory(row);
  },
  async deleteCategory(id) {
    const cat = check(await sb().from("categories").select("slug").eq("id", id).maybeSingle()) as { slug: string } | null;
    if (!cat) throw new DbError("Categoría no encontrada.", 404);
    const { count } = await sb().from("products").select("id", { count: "exact", head: true }).eq("category", cat.slug);
    if (count) throw new DbError(`No se puede eliminar: ${count} producto(s) usan esta categoría. Muévelos antes a otra.`, 409);
    check(await sb().from("categories").delete().eq("id", id));
  },

  /* ───── Productos ───── */
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
  async createProduct(input, actor) {
    const row = check(await sb().from("products").insert(productRow(input)).select("id").single()) as { id: string };
    await syncVariants({ id: row.id, name: input.name }, input.variants, actor);
    return (await this.getProductById(row.id))!;
  },
  async updateProduct(id, input, actor) {
    const found = check(await sb().from("products").update({ ...productRow(input), updated_at: now() }).eq("id", id).select("id"));
    if (!(found as any[]).length) throw new DbError("Producto no encontrado.", 404);
    await syncVariants({ id, name: input.name }, input.variants, actor);
    return (await this.getProductById(id))!;
  },
  async patchProduct(id, patch) {
    const row: Record<string, unknown> = { updated_at: now() };
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.featured !== undefined) row.featured = patch.featured;
    if (patch.modelUrl !== undefined) row.model_url = patch.modelUrl;
    const found = check(await sb().from("products").update(row).eq("id", id).select("id"));
    if (!(found as any[]).length) throw new DbError("Producto no encontrado.", 404);
    return (await this.getProductById(id))!;
  },
  async deleteProduct(id) {
    check(await sb().from("products").delete().eq("id", id));
  },
  async unassignModel(url) {
    const rows = check(await sb().from("products").update({ model_url: null, updated_at: now() }).eq("model_url", url).select("id"));
    return (rows as any[]).length;
  },

  /* ───── Pedidos ───── */
  async placeOrder(input) {
    const res = await sb().rpc("place_order", { p_customer: input.customer, p_items: input.items, p_is_test: Boolean(input.isTest) });
    if (res.error) rpcError(res.error);
    return (await this.getOrder(res.data as string))!;
  },
  async listOrders() {
    return (check(await sb().from("orders").select(ORDER_SELECT).order("created_at", { ascending: false })) as any[]).map(toOrder);
  },
  async getOrder(id) {
    const data = check(await sb().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle());
    return data ? toOrder(data) : null;
  },
  async updateOrderStatus(id, status, actor, note) {
    const res = await sb().rpc("set_order_status", { p_order_id: id, p_status: status, p_actor: actor, p_note: note ?? null });
    if (res.error) rpcError(res.error);
    return (await this.getOrder(id))!;
  },
  async recordPayment(id, { action, method, reference }, actor) {
    const order = await this.getOrder(id);
    if (!order) throw new DbError("Pedido no encontrado.", 404);
    if (action === "paid" && method === "none") throw new DbError("Indica el método con el que se recibió el pago.", 400);
    if (action === "refunded" && order.paymentStatus !== "paid") throw new DbError("Solo se puede reembolsar un pedido pagado.", 409);
    const extra: Record<string, unknown> = { payment_status: action };
    if (action === "paid") Object.assign(extra, { payment_method: method, payment_ref: reference || null, paid_at: now() });
    if (action === "unpaid") Object.assign(extra, { payment_method: "none", payment_ref: null, paid_at: null });
    await appendHistory(id, { type: "payment", paymentStatus: action, by: actor, at: now(), note: reference || undefined }, extra);
    return (await this.getOrder(id))!;
  },
  async deleteTestOrders() {
    const tests = (check(await sb().from("orders").select("id, status").eq("is_test", true)) as { id: string; status: string }[]) ?? [];
    for (const o of tests) {
      if (o.status !== "cancelled") {
        const res = await sb().rpc("set_order_status", { p_order_id: o.id, p_status: "cancelled", p_actor: "limpieza de pruebas", p_note: null });
        if (res.error) rpcError(res.error);
      }
    }
    if (tests.length) check(await sb().from("orders").delete().eq("is_test", true));
    return tests.length;
  },

  /* ───── Clientes ───── */
  async listCustomers() {
    return (check(await sb().from("customers").select("*").order("updated_at", { ascending: false })) as any[]).map(toCustomer);
  },
  async getCustomer(id) {
    const r = check(await sb().from("customers").select("*").eq("id", id).maybeSingle());
    return r ? toCustomer(r) : null;
  },
  async updateCustomer(id, patch) {
    const row: Record<string, unknown> = { updated_at: now() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.suspendedReason !== undefined) row.suspended_reason = patch.suspendedReason;
    if (patch.adminNotes !== undefined) row.admin_notes = patch.adminNotes;
    if (patch.status === "active") row.suspended_reason = null;
    const r = check(await sb().from("customers").update(row).eq("id", id).select("*").maybeSingle());
    if (!r) throw new DbError("Cliente no encontrado.", 404);
    return toCustomer(r);
  },

  /* ───── Inventario ───── */
  async adjustStock(input, actor) {
    const res = await sb().rpc("adjust_stock", {
      p_variant_id: input.variantId,
      p_mode: input.mode,
      p_quantity: input.quantity,
      p_reason: input.reason,
      p_note: input.note,
      p_actor: actor,
    });
    if (res.error) rpcError(res.error);
    const row = check(await sb().from("stock_movements").select("*").eq("id", res.data as string).single());
    return toMovement(row);
  },
  async listMovements(opts) {
    let q = sb().from("stock_movements").select("*").order("created_at", { ascending: false }).limit(opts?.limit ?? 200);
    if (opts?.variantId) q = q.eq("variant_id", opts.variantId);
    if (opts?.productId) q = q.eq("product_id", opts.productId);
    return (check(await q) as any[]).map(toMovement);
  },

  /* ───── Modelos 3D ───── */
  async listModelAssets() {
    return (check(await sb().from("model_assets").select("*").order("name")) as any[]).map(toModel);
  },
  async upsertModelAsset(a) {
    const existing = check(await sb().from("model_assets").select("id").eq("url", a.url).maybeSingle()) as { id: string } | null;
    const validation = { file_name: a.fileName, source: a.source, size_bytes: a.sizeBytes, valid: a.valid, issues: a.issues, warnings: a.warnings, stats: a.stats, updated_at: now() };
    if (existing) return toModel(check(await sb().from("model_assets").update(validation).eq("id", existing.id).select("*").single()));
    return toModel(
      check(
        await sb()
          .from("model_assets")
          .insert({ ...validation, url: a.url, name: a.name, author: a.author, source_url: a.sourceUrl, license: a.license, rotation_x: a.rotationX, rotation_y: a.rotationY })
          .select("*")
          .single(),
      ),
    );
  },
  async updateModelMeta(id, m) {
    const r = check(
      await sb()
        .from("model_assets")
        .update({ name: m.name, author: m.author, source_url: m.sourceUrl, license: m.license, rotation_x: m.rotationX, rotation_y: m.rotationY, updated_at: now() })
        .eq("id", id)
        .select("*")
        .maybeSingle(),
    );
    if (!r) throw new DbError("Modelo no encontrado.", 404);
    return toModel(r);
  },
  async deleteModelAsset(id) {
    const r = check(await sb().from("model_assets").select("*").eq("id", id).maybeSingle());
    if (!r) throw new DbError("Modelo no encontrado.", 404);
    const asset = toModel(r);
    await this.unassignModel(asset.url);
    check(await sb().from("model_assets").delete().eq("id", id));
    return asset;
  },
  async saveModelFiles(files, mainFile) {
    const folder = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
    for (const f of files) {
      const type = f.name.endsWith(".glb") ? "model/gltf-binary" : f.name.endsWith(".gltf") ? "model/gltf+json" : "application/octet-stream";
      check(await sb().storage.from(MODEL_BUCKET).upload(`${folder}/${f.name}`, f.data, { contentType: type, upsert: false }));
    }
    return { url: sb().storage.from(MODEL_BUCKET).getPublicUrl(`${folder}/${mainFile}`).data.publicUrl, folder };
  },
  async removeModelFiles(asset) {
    if (asset.source !== "supabase") return;
    const marker = `/${MODEL_BUCKET}/`;
    const folder = asset.url.slice(asset.url.indexOf(marker) + marker.length).split("/")[0];
    const listed = check(await sb().storage.from(MODEL_BUCKET).list(folder)) as { name: string }[];
    if (listed.length) check(await sb().storage.from(MODEL_BUCKET).remove(listed.map((f) => `${folder}/${f.name}`)));
  },

  /* ───── Usuarios del panel ───── */
  async listAdminUsers() {
    return (check(await sb().from("admin_users").select("*").order("created_at")) as any[]).map(toAdmin);
  },
  async getAdminUserById(id) {
    const r = check(await sb().from("admin_users").select("*").eq("id", id).maybeSingle());
    return r ? toAdmin(r) : null;
  },
  async getAdminUserByEmail(email) {
    const r = check(await sb().from("admin_users").select("*").eq("email", email.trim().toLowerCase()).maybeSingle());
    return r ? toAdmin(r) : null;
  },
  async createAdminUser(input) {
    const email = input.email.trim().toLowerCase();
    if (email === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) throw new DbError("Ese email pertenece al propietario.", 409);
    const r = check(await sb().from("admin_users").insert({ email, name: input.name, role: input.role, password_hash: input.passwordHash }).select("*").single());
    return toAdmin(r);
  },
  async updateAdminUser(id, patch) {
    const current = await this.getAdminUserById(id);
    if (!current) throw new DbError("Usuario no encontrado.", 404);
    const invalidates = patch.passwordHash !== undefined || (patch.role !== undefined && patch.role !== current.role) || patch.active === false;
    const row: Record<string, unknown> = { updated_at: now() };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.role !== undefined) row.role = patch.role;
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.passwordHash !== undefined) row.password_hash = patch.passwordHash;
    if (patch.lastLoginAt !== undefined) row.last_login_at = patch.lastLoginAt;
    if (invalidates) row.session_version = current.sessionVersion + 1;
    return toAdmin(check(await sb().from("admin_users").update(row).eq("id", id).select("*").single()));
  },

  async deleteAdminUser(id) {
    check(await sb().from("admin_users").delete().eq("id", id));
  },

  async saveImage(data, ext, mime) {
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${ext}`;
    check(await sb().storage.from(IMAGE_BUCKET).upload(name, data, { contentType: mime, upsert: false }));
    return sb().storage.from(IMAGE_BUCKET).getPublicUrl(name).data.publicUrl;
  },
};
