import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { seedProducts } from "../seed";
import { DEFAULT_SETTINGS, seedCategories } from "../defaults";
import { siteConfig } from "../config";
import type {
  AdminUser,
  Category,
  Customer,
  ModelAsset,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductInput,
  StockMovement,
  StockReason,
  StoreSettings,
} from "../types";
import { DbError, type Repository } from "./types";
import { isReadOnlyDeployment, READ_ONLY_MESSAGE } from "./env";

/**
 * Base de datos local en un archivo JSON (data/db.json).
 * Pensada para desarrollo y tiendas pequeñas con un único servidor (Windows/macOS/Linux).
 * Para producción con varios servidores configura Supabase (ver README).
 */

interface DbShape {
  version: 2;
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  orderSeq: number;
  customers: Customer[];
  movements: StockMovement[];
  models: ModelAsset[];
  adminUsers: AdminUser[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const MODEL_UPLOAD_DIR = path.join(DATA_DIR, "models");

const g = globalThis as unknown as { __smDbLock?: Promise<unknown> };
const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url")}`;

function fresh(): DbShape {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS, updatedAt: now() },
    categories: seedCategories(),
    products: seedProducts(),
    orders: [],
    orderSeq: 1000,
    customers: [],
    movements: [],
    models: [],
    adminUsers: [],
  };
}

/** Migra bases de datos creadas por versiones anteriores sin perder información. */
function migrate(raw: Partial<DbShape> & { version?: number }): DbShape {
  const db = raw as DbShape;
  db.settings = { ...DEFAULT_SETTINGS, updatedAt: now(), ...(raw.settings ?? {}) };
  db.categories ??= seedCategories();
  db.customers ??= [];
  db.movements ??= [];
  db.models ??= [];
  db.adminUsers ??= [];
  db.orders ??= [];
  db.orderSeq ??= 1000;
  for (const p of db.products) p.modelUrl ??= null;
  for (const o of db.orders) {
    const legacy = o as Order & { paymentStatus: string };
    if ((legacy.paymentStatus as string) === "demo_unpaid") o.paymentStatus = "unpaid";
    o.paymentMethod ??= "none";
    o.paymentRef ??= null;
    o.paidAt ??= null;
    o.customerId ??= null;
    o.history ??= [{ type: "status", status: o.status, by: "sistema", at: o.createdAt }];
    o.isTest ??= false;
  }
  // Asegura que toda categoría usada por un producto exista.
  for (const p of db.products) {
    if (!db.categories.some((c) => c.slug === p.category)) {
      db.categories.push({ id: newId("cat"), slug: p.category, name: p.category, description: "", sortOrder: db.categories.length, active: true, createdAt: now(), updatedAt: now() });
    }
  }
  db.version = 2;
  return db;
}

const g2 = globalThis as unknown as { __smReadOnlyDb?: DbShape; __smDbInit?: Promise<void> };

/** Crea data/db.json una sola vez aunque lleguen varias peticiones a la vez en el primer arranque. */
function ensureDbFile() {
  g2.__smDbInit ??= (async () => {
    try {
      await fs.access(DB_FILE);
    } catch {
      await writeDb(fresh());
    }
  })().catch((err) => {
    g2.__smDbInit = undefined;
    throw err;
  });
  return g2.__smDbInit;
}

async function readDb(): Promise<DbShape> {
  if (isReadOnlyDeployment()) {
    // Solo lectura: catálogo inicial en memoria, pedidos desactivados (no se puede escribir en disco).
    if (!g2.__smReadOnlyDb) {
      g2.__smReadOnlyDb = fresh();
      g2.__smReadOnlyDb.settings.ordersEnabled = false;
      g2.__smReadOnlyDb.settings.checkoutNotice = "La tienda está en modo de solo lectura mientras se configura la base de datos. No se pueden registrar pedidos todavía.";
    }
    return structuredClone(g2.__smReadOnlyDb);
  }
  await ensureDbFile();
  return migrate(JSON.parse(await fs.readFile(DB_FILE, "utf8")));
}

async function writeDb(db: DbShape) {
  if (isReadOnlyDeployment()) throw new DbError(READ_ONLY_MESSAGE, 503);
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Temporal único por escritura: el rename final es atómico y nunca deja un archivo a medias.
  const tmp = `${DB_FILE}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  const body = JSON.stringify(db, null, 2);
  await fs.writeFile(tmp, body, "utf8");
  try {
    await fs.rename(tmp, DB_FILE);
  } catch {
    // En Windows un antivirus puede bloquear el rename: escritura directa como respaldo.
    await fs.writeFile(DB_FILE, body, "utf8");
    await fs.rm(tmp, { force: true });
  }
}

/** Serializa lecturas-modificación-escritura: dos peticiones simultáneas nunca pisan el stock. */
function withLock<T>(fn: (db: DbShape) => Promise<T>): Promise<T> {
  const run = (g.__smDbLock ?? Promise.resolve()).then(async () => fn(await readDb()));
  g.__smDbLock = run.catch(() => undefined);
  return run;
}

function findVariant(db: DbShape, variantId: string) {
  for (const p of db.products) {
    const v = p.variants.find((x) => x.id === variantId);
    if (v) return { product: p, variant: v };
  }
  return null;
}

function logMovement(db: DbShape, product: Product, variantId: string, delta: number, reason: StockReason, actor: string, orderId: string | null = null, note = "") {
  const v = product.variants.find((x) => x.id === variantId)!;
  const m: StockMovement = {
    id: newId("mov"),
    productId: product.id,
    variantId,
    productName: product.name,
    variantName: v.name,
    sku: v.sku,
    delta,
    stockAfter: v.stock,
    reason,
    orderId,
    note,
    actor,
    createdAt: now(),
  };
  db.movements.unshift(m);
  if (db.movements.length > 5000) db.movements.length = 5000;
  return m;
}

/** Aplica el stock de un pedido. sign -1 descuenta, +1 repone. Valida antes de tocar nada. */
function applyOrderStock(db: DbShape, order: Pick<Order, "id" | "items">, sign: 1 | -1, reason: StockReason, actor: string) {
  if (sign === -1) {
    for (const item of order.items) {
      const found = findVariant(db, item.variantId);
      if (found && found.variant.stock < item.quantity) {
        throw new DbError(`Sin existencias suficientes para ${item.productName} (${item.variantName}): quedan ${found.variant.stock}.`, 409);
      }
    }
  }
  for (const item of order.items) {
    const found = findVariant(db, item.variantId);
    if (!found) continue;
    found.variant.stock += sign * item.quantity;
    logMovement(db, found.product, item.variantId, sign * item.quantity, reason, actor, order.id);
  }
}

function buildProduct(db: DbShape, input: ProductInput, actor: string, existing?: Product): Product {
  if (!db.categories.some((c) => c.slug === input.category)) throw new DbError(`La categoría "${input.category}" no existe.`, 400);
  const skus = input.variants.map((v) => v.sku.toLowerCase());
  if (new Set(skus).size !== skus.length) throw new DbError("Hay SKUs repetidos en las variantes.", 400);
  const product: Product = {
    ...input,
    id: existing?.id ?? newId("prd"),
    variants: input.variants.map((v) => ({
      ...v,
      id: v.id && existing?.variants.some((e) => e.id === v.id) ? v.id : newId("var"),
    })),
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  // Registra en el historial de inventario los cambios de stock hechos desde la ficha del producto.
  for (const v of product.variants) {
    const before = existing?.variants.find((e) => e.id === v.id)?.stock;
    if (before === undefined && v.stock > 0) logMovement(db, product, v.id, v.stock, "initial", actor);
    else if (before !== undefined && before !== v.stock) logMovement(db, product, v.id, v.stock - before, "adjustment", actor, null, "Editado desde la ficha del producto");
  }
  return product;
}

function assertUniqueSlug(db: DbShape, slug: string, selfId?: string) {
  if (db.products.some((p) => p.slug === slug && p.id !== selfId)) throw new DbError(`Ya existe un producto con el slug "${slug}".`, 409);
}

function upsertCustomer(db: DbShape, info: Order["customer"]): Customer {
  const email = info.email.trim().toLowerCase();
  let c = db.customers.find((x) => x.email === email);
  if (c?.status === "suspended") throw new DbError("Esta cuenta de cliente está suspendida. Contacta con la tienda.", 403);
  if (!c) {
    c = { id: newId("cus"), email, name: info.name, phone: info.phone, city: info.city, country: info.country, status: "active", suspendedReason: null, adminNotes: "", createdAt: now(), updatedAt: now() };
    db.customers.push(c);
  } else {
    Object.assign(c, { name: info.name, phone: info.phone || c.phone, city: info.city, country: info.country, updatedAt: now() });
  }
  return c;
}

const sortCategories = (a: Category, b: Category) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

export const localRepository: Repository = {
  kind: "local",

  /* ───── Configuración ───── */
  async getSettings() {
    return (await readDb()).settings;
  },
  updateSettings(patch) {
    return withLock(async (db) => {
      db.settings = { ...db.settings, ...patch, updatedAt: now() };
      await writeDb(db);
      return db.settings;
    });
  },

  /* ───── Categorías ───── */
  async listCategories(opts) {
    const db = await readDb();
    return (opts?.includeInactive ? db.categories : db.categories.filter((c) => c.active)).slice().sort(sortCategories);
  },
  createCategory(input) {
    return withLock(async (db) => {
      if (db.categories.some((c) => c.slug === input.slug)) throw new DbError(`Ya existe la categoría "${input.slug}".`, 409);
      const c: Category = { ...input, id: newId("cat"), createdAt: now(), updatedAt: now() };
      db.categories.push(c);
      await writeDb(db);
      return c;
    });
  },
  updateCategory(id, input) {
    return withLock(async (db) => {
      const c = db.categories.find((x) => x.id === id);
      if (!c) throw new DbError("Categoría no encontrada.", 404);
      if (db.categories.some((x) => x.slug === input.slug && x.id !== id)) throw new DbError(`Ya existe la categoría "${input.slug}".`, 409);
      // Si cambia el slug, se actualizan los productos que la usan.
      if (c.slug !== input.slug) for (const p of db.products) if (p.category === c.slug) p.category = input.slug;
      Object.assign(c, input, { updatedAt: now() });
      await writeDb(db);
      return c;
    });
  },
  deleteCategory(id) {
    return withLock(async (db) => {
      const c = db.categories.find((x) => x.id === id);
      if (!c) throw new DbError("Categoría no encontrada.", 404);
      const used = db.products.filter((p) => p.category === c.slug).length;
      if (used) throw new DbError(`No se puede eliminar: ${used} producto(s) usan esta categoría. Muévelos antes a otra.`, 409);
      db.categories = db.categories.filter((x) => x.id !== id);
      await writeDb(db);
    });
  },

  /* ───── Productos ───── */
  async listProducts(opts) {
    const db = await readDb();
    const list = opts?.includeInactive ? db.products : db.products.filter((p) => p.active);
    return list.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async getProductById(pid) {
    return (await readDb()).products.find((p) => p.id === pid) ?? null;
  },
  async getProductBySlug(slug) {
    return (await readDb()).products.find((p) => p.slug === slug) ?? null;
  },
  createProduct(input, actor) {
    return withLock(async (db) => {
      assertUniqueSlug(db, input.slug);
      const product = buildProduct(db, input, actor);
      db.products.push(product);
      await writeDb(db);
      return product;
    });
  },
  updateProduct(pid, input, actor) {
    return withLock(async (db) => {
      const idx = db.products.findIndex((p) => p.id === pid);
      if (idx === -1) throw new DbError("Producto no encontrado.", 404);
      assertUniqueSlug(db, input.slug, pid);
      db.products[idx] = buildProduct(db, input, actor, db.products[idx]);
      await writeDb(db);
      return db.products[idx];
    });
  },
  patchProduct(pid, patch) {
    return withLock(async (db) => {
      const p = db.products.find((x) => x.id === pid);
      if (!p) throw new DbError("Producto no encontrado.", 404);
      Object.assign(p, patch, { updatedAt: now() });
      await writeDb(db);
      return p;
    });
  },
  deleteProduct(pid) {
    return withLock(async (db) => {
      const before = db.products.length;
      db.products = db.products.filter((p) => p.id !== pid);
      if (db.products.length === before) throw new DbError("Producto no encontrado.", 404);
      await writeDb(db);
    });
  },
  unassignModel(url) {
    return withLock(async (db) => {
      let n = 0;
      for (const p of db.products) if (p.modelUrl === url) {
        p.modelUrl = null;
        p.updatedAt = now();
        n++;
      }
      if (n) await writeDb(db);
      return n;
    });
  },

  /* ───── Pedidos ───── */
  placeOrder(input) {
    return withLock(async (db) => {
      const s = db.settings;
      if (!s.ordersEnabled) throw new DbError("La tienda no está aceptando pedidos en este momento.", 503);
      const items: OrderItem[] = [];
      for (const line of input.items) {
        const product = db.products.find((p) => p.id === line.productId && p.active);
        const variant = product?.variants.find((v) => v.id === line.variantId);
        if (!product || !variant) throw new DbError("Uno de los productos ya no está disponible.", 409);
        const existing = items.find((i) => i.variantId === variant.id);
        if (existing) existing.quantity += line.quantity;
        else
          items.push({
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            sku: variant.sku,
            image: product.images[0] ?? null,
            unitPriceCents: variant.priceCents ?? product.priceCents,
            quantity: line.quantity,
          });
      }
      for (const i of items) if (i.quantity > s.maxQuantityPerItem) throw new DbError(`Máximo ${s.maxQuantityPerItem} unidades por artículo.`, 400);

      const customer = upsertCustomer(db, input.customer);
      const id = randomUUID();
      applyOrderStock(db, { id, items }, -1, "sale", input.isTest ? "prueba automática" : "tienda");

      const subtotal = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
      const shipping = subtotal >= s.freeShippingFromCents ? 0 : s.shippingCents;
      const ts = now();
      db.orderSeq += 1;
      const order: Order = {
        id,
        number: db.orderSeq,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: "none",
        paymentRef: null,
        paidAt: null,
        customerId: customer.id,
        customer: { ...input.customer, email: customer.email },
        items,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
        currency: siteConfig.currency,
        history: [{ type: "status", status: "pending", by: "tienda", at: ts }],
        isTest: Boolean(input.isTest),
        createdAt: ts,
        updatedAt: ts,
      };
      db.orders.unshift(order);
      await writeDb(db);
      return order;
    });
  },
  async listOrders() {
    return (await readDb()).orders;
  },
  async getOrder(oid) {
    return (await readDb()).orders.find((o) => o.id === oid) ?? null;
  },
  updateOrderStatus(oid, status: OrderStatus, actor, note) {
    return withLock(async (db) => {
      const order = db.orders.find((o) => o.id === oid);
      if (!order) throw new DbError("Pedido no encontrado.", 404);
      if (order.status === status) return order;
      // El stock solo cambia al entrar o salir de "cancelado": imposible descontarlo dos veces.
      if (status === "cancelled") applyOrderStock(db, order, 1, "cancel", actor);
      else if (order.status === "cancelled") applyOrderStock(db, order, -1, "reactivate", actor);
      order.status = status;
      order.updatedAt = now();
      order.history.push({ type: "status", status, by: actor, at: order.updatedAt, ...(note ? { note } : {}) });
      await writeDb(db);
      return order;
    });
  },
  recordPayment(oid, { action, method, reference }, actor) {
    return withLock(async (db) => {
      const order = db.orders.find((o) => o.id === oid);
      if (!order) throw new DbError("Pedido no encontrado.", 404);
      if (action === "paid" && method === "none") throw new DbError("Indica el método con el que se recibió el pago.", 400);
      if (action === "refunded" && order.paymentStatus !== "paid") throw new DbError("Solo se puede reembolsar un pedido pagado.", 409);
      order.paymentStatus = action;
      if (action === "paid") {
        order.paymentMethod = method;
        order.paymentRef = reference || null;
        order.paidAt = now();
      }
      if (action === "unpaid") {
        order.paymentMethod = "none";
        order.paymentRef = null;
        order.paidAt = null;
      }
      order.updatedAt = now();
      order.history.push({ type: "payment", paymentStatus: action, by: actor, at: order.updatedAt, note: reference || undefined });
      await writeDb(db);
      return order;
    });
  },
  deleteTestOrders() {
    return withLock(async (db) => {
      const tests = db.orders.filter((o) => o.isTest);
      for (const o of tests) if (o.status !== "cancelled") applyOrderStock(db, o, 1, "cancel", "limpieza de pruebas");
      db.orders = db.orders.filter((o) => !o.isTest);
      const testEmails = new Set(tests.map((o) => o.customer.email));
      db.customers = db.customers.filter((c) => !testEmails.has(c.email) || db.orders.some((o) => o.customer.email === c.email));
      await writeDb(db);
      return tests.length;
    });
  },

  /* ───── Clientes ───── */
  async listCustomers() {
    return (await readDb()).customers.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getCustomer(cid) {
    return (await readDb()).customers.find((c) => c.id === cid) ?? null;
  },
  updateCustomer(cid, patch) {
    return withLock(async (db) => {
      const c = db.customers.find((x) => x.id === cid);
      if (!c) throw new DbError("Cliente no encontrado.", 404);
      Object.assign(c, patch, { updatedAt: now() });
      if (c.status === "active") c.suspendedReason = null;
      await writeDb(db);
      return c;
    });
  },

  /* ───── Inventario ───── */
  adjustStock(input, actor) {
    return withLock(async (db) => {
      const found = findVariant(db, input.variantId);
      if (!found) throw new DbError("Variante no encontrada.", 404);
      const { product, variant } = found;
      const delta = input.mode === "in" ? input.quantity : input.mode === "out" ? -input.quantity : input.quantity - variant.stock;
      if (variant.stock + delta < 0) throw new DbError(`No puedes retirar ${-delta} unidades: solo hay ${variant.stock}.`, 409);
      if (delta === 0) throw new DbError("La cantidad no cambia el stock.", 400);
      variant.stock += delta;
      product.updatedAt = now();
      const m = logMovement(db, product, variant.id, delta, input.reason, actor, null, input.note);
      await writeDb(db);
      return m;
    });
  },
  async listMovements(opts) {
    let list = (await readDb()).movements;
    if (opts?.variantId) list = list.filter((m) => m.variantId === opts.variantId);
    if (opts?.productId) list = list.filter((m) => m.productId === opts.productId);
    return list.slice(0, opts?.limit ?? 200);
  },

  /* ───── Modelos 3D ───── */
  async listModelAssets() {
    return (await readDb()).models.slice().sort((a, b) => a.name.localeCompare(b.name));
  },
  upsertModelAsset(asset) {
    return withLock(async (db) => {
      const existing = db.models.find((m) => m.url === asset.url);
      if (existing) {
        // Conserva la metadata editada en el panel; refresca la validación del archivo.
        Object.assign(existing, {
          fileName: asset.fileName,
          source: asset.source,
          sizeBytes: asset.sizeBytes,
          valid: asset.valid,
          issues: asset.issues,
          warnings: asset.warnings,
          stats: asset.stats,
          updatedAt: now(),
        });
        await writeDb(db);
        return existing;
      }
      const m: ModelAsset = { ...asset, id: newId("mdl"), createdAt: now(), updatedAt: now() };
      db.models.push(m);
      await writeDb(db);
      return m;
    });
  },
  updateModelMeta(mid, meta) {
    return withLock(async (db) => {
      const m = db.models.find((x) => x.id === mid);
      if (!m) throw new DbError("Modelo no encontrado.", 404);
      Object.assign(m, meta, { updatedAt: now() });
      await writeDb(db);
      return m;
    });
  },
  deleteModelAsset(mid) {
    return withLock(async (db) => {
      const m = db.models.find((x) => x.id === mid);
      if (!m) throw new DbError("Modelo no encontrado.", 404);
      for (const p of db.products) if (p.modelUrl === m.url) p.modelUrl = null;
      db.models = db.models.filter((x) => x.id !== mid);
      await writeDb(db);
      return m;
    });
  },
  async saveModelFiles(files, mainFile) {
    if (isReadOnlyDeployment()) throw new DbError(READ_ONLY_MESSAGE, 503);
    const folder = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
    const dir = path.join(MODEL_UPLOAD_DIR, folder);
    await fs.mkdir(dir, { recursive: true });
    for (const f of files) await fs.writeFile(path.join(dir, f.name), f.data);
    return { url: `/api/model-files/${folder}/${encodeURIComponent(mainFile)}`, folder: dir };
  },
  async removeModelFiles(asset) {
    if (asset.source !== "upload") return; // Los archivos de public/models se borran a mano.
    const folder = asset.url.split("/")[3];
    if (folder && /^[a-z0-9-]+$/.test(folder)) await fs.rm(path.join(MODEL_UPLOAD_DIR, folder), { recursive: true, force: true });
  },

  /* ───── Usuarios del panel ───── */
  async listAdminUsers() {
    return (await readDb()).adminUsers;
  },
  async getAdminUserById(uid) {
    return (await readDb()).adminUsers.find((u) => u.id === uid) ?? null;
  },
  async getAdminUserByEmail(email) {
    return (await readDb()).adminUsers.find((u) => u.email === email.trim().toLowerCase()) ?? null;
  },
  createAdminUser(input) {
    return withLock(async (db) => {
      const email = input.email.trim().toLowerCase();
      if (db.adminUsers.some((u) => u.email === email)) throw new DbError("Ya existe un usuario con ese email.", 409);
      if (email === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) throw new DbError("Ese email pertenece al propietario.", 409);
      const u: AdminUser = { ...input, email, id: newId("usr"), active: true, sessionVersion: 1, createdAt: now(), updatedAt: now(), lastLoginAt: null };
      db.adminUsers.push(u);
      await writeDb(db);
      return u;
    });
  },
  updateAdminUser(uid, patch) {
    return withLock(async (db) => {
      const u = db.adminUsers.find((x) => x.id === uid);
      if (!u) throw new DbError("Usuario no encontrado.", 404);
      const invalidates = patch.passwordHash !== undefined || (patch.role !== undefined && patch.role !== u.role) || patch.active === false;
      Object.assign(u, patch, { updatedAt: now() });
      if (invalidates) u.sessionVersion += 1;
      await writeDb(db);
      return u;
    });
  },

  deleteAdminUser(uid) {
    return withLock(async (db) => {
      const before = db.adminUsers.length;
      db.adminUsers = db.adminUsers.filter((u) => u.id !== uid);
      if (db.adminUsers.length === before) throw new DbError("Usuario no encontrado.", 404);
      await writeDb(db);
    });
  },

  async saveImage(data, ext) {
    if (isReadOnlyDeployment()) throw new DbError(READ_ONLY_MESSAGE, 503);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), data);
    return `/api/uploads/${name}`;
  },
};
