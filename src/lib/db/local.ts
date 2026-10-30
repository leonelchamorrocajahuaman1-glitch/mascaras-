import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { seedProducts } from "../seed";
import { shippingFor, siteConfig } from "../config";
import type { Order, OrderItem, OrderStatus, PlaceOrderInput, Product, ProductInput } from "../types";
import { DbError, type Repository } from "./types";

/**
 * Base de datos local en un archivo JSON (data/db.json).
 * Pensada para desarrollo en Windows/macOS/Linux sin servicios externos.
 * Para producción configura Supabase (ver README).
 */

interface DbShape {
  version: 1;
  products: Product[];
  orders: Order[];
  orderSeq: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const g = globalThis as unknown as { __smDbLock?: Promise<unknown> };

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as DbShape;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    const fresh: DbShape = { version: 1, products: seedProducts(), orders: [], orderSeq: 1000 };
    await writeDb(fresh);
    return fresh;
  }
}

async function writeDb(db: DbShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
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

/** Serializa las escrituras para evitar condiciones de carrera dentro del proceso. */
function withLock<T>(fn: (db: DbShape) => Promise<T>): Promise<T> {
  const run = (g.__smDbLock ?? Promise.resolve()).then(async () => fn(await readDb()));
  g.__smDbLock = run.catch(() => undefined);
  return run;
}

function id(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

function buildProduct(input: ProductInput, existing?: Product): Product {
  const now = new Date().toISOString();
  return {
    ...input,
    id: existing?.id ?? id("prd"),
    variants: input.variants.map((v) => ({ ...v, id: v.id && existing?.variants.some((e) => e.id === v.id) ? v.id : id("var") })),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function assertUniqueSlug(db: DbShape, slug: string, selfId?: string) {
  if (db.products.some((p) => p.slug === slug && p.id !== selfId)) {
    throw new DbError(`Ya existe un producto con el slug "${slug}".`, 409);
  }
}

function adjustStock(db: DbShape, items: OrderItem[], sign: 1 | -1) {
  for (const item of items) {
    const variant = db.products.find((p) => p.id === item.productId)?.variants.find((v) => v.id === item.variantId);
    if (!variant) continue;
    if (sign === -1 && variant.stock < item.quantity) {
      throw new DbError(`Sin existencias suficientes para ${item.productName} (${item.variantName}).`, 409);
    }
    variant.stock += sign * item.quantity;
  }
}

export const localRepository: Repository = {
  kind: "local",

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

  createProduct(input) {
    return withLock(async (db) => {
      assertUniqueSlug(db, input.slug);
      const product = buildProduct(input);
      db.products.push(product);
      await writeDb(db);
      return product;
    });
  },

  updateProduct(pid, input) {
    return withLock(async (db) => {
      const idx = db.products.findIndex((p) => p.id === pid);
      if (idx === -1) throw new DbError("Producto no encontrado.", 404);
      assertUniqueSlug(db, input.slug, pid);
      const product = buildProduct(input, db.products[idx]);
      db.products[idx] = product;
      await writeDb(db);
      return product;
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

  placeOrder(input: PlaceOrderInput) {
    return withLock(async (db) => {
      const items: OrderItem[] = [];
      for (const line of input.items) {
        const product = db.products.find((p) => p.id === line.productId && p.active);
        const variant = product?.variants.find((v) => v.id === line.variantId);
        if (!product || !variant) throw new DbError("Uno de los productos ya no está disponible.", 409);
        const existing = items.find((i) => i.variantId === variant.id);
        if (existing) {
          existing.quantity += line.quantity;
          continue;
        }
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
      adjustStock(db, items, -1);

      const subtotal = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
      const shipping = shippingFor(subtotal);
      const now = new Date().toISOString();
      db.orderSeq += 1;
      const order: Order = {
        id: randomUUID(),
        number: db.orderSeq,
        status: "pending",
        paymentStatus: "demo_unpaid",
        customer: input.customer,
        items,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
        currency: siteConfig.currency,
        createdAt: now,
        updatedAt: now,
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

  updateOrderStatus(oid, status: OrderStatus) {
    return withLock(async (db) => {
      const order = db.orders.find((o) => o.id === oid);
      if (!order) throw new DbError("Pedido no encontrado.", 404);
      if (order.status !== status) {
        if (status === "cancelled") adjustStock(db, order.items, 1);
        else if (order.status === "cancelled") adjustStock(db, order.items, -1);
        order.status = status;
        order.updatedAt = new Date().toISOString();
        await writeDb(db);
      }
      return order;
    });
  },

  async saveImage(data, ext) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), data);
    return `/api/uploads/${name}`;
  },
};
