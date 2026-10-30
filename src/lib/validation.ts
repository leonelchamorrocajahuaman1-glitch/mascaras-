import { z } from "zod";
import { MASK_KEYS } from "./masks";
import { ORDER_STATUSES, PAYMENT_METHODS } from "./types";

const cents = z.number().int().min(0).max(10_000_000);
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones");

const imageUrl = z
  .string()
  .max(500)
  .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "URL de imagen no válida");

/** Modelos: archivos de public/models, subidos al panel (/api/model-files) o Supabase Storage. */
export const modelUrlSchema = z
  .string()
  .max(500)
  .refine(
    (v) => /^\/models\/[A-Za-z0-9._%-]+\.(glb|gltf)$/i.test(v) || /^\/api\/model-files\/[a-z0-9-]+\/[A-Za-z0-9._%-]+\.(glb|gltf)$/i.test(v) || /^https:\/\/[^\s]+\.(glb|gltf)$/i.test(v),
    "Modelo 3D no válido",
  );

export const productInputSchema = z
  .object({
    slug,
    name: z.string().trim().min(2).max(80),
    category: slug,
    tagline: z.string().trim().max(140),
    description: z.string().trim().max(2000),
    priceCents: cents,
    compareAtCents: cents.nullable(),
    images: z.array(imageUrl).max(8),
    modelKey: z.enum(MASK_KEYS),
    modelUrl: modelUrlSchema.nullable().default(null),
    featured: z.boolean(),
    active: z.boolean(),
    variants: z
      .array(
        z.object({
          id: z.string().max(64).optional(),
          name: z.string().trim().min(1).max(60),
          sku: z.string().trim().min(1).max(40),
          stock: z.number().int().min(0).max(100_000),
          priceCents: cents.nullable(),
        }),
      )
      .min(1, "Añade al menos una variante")
      .max(30),
  })
  .refine((p) => p.compareAtCents === null || p.compareAtCents > p.priceCents, {
    message: "El precio anterior debe ser mayor que el precio actual (o déjalo vacío)",
    path: ["compareAtCents"],
  });

export const productPatchSchema = z
  .object({
    active: z.boolean().optional(),
    featured: z.boolean().optional(),
    modelUrl: modelUrlSchema.nullable().optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Nada que actualizar");

export const categoryInputSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export const placeOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(160),
    phone: z.string().trim().max(40).default(""),
    address: z.string().trim().min(4).max(200),
    city: z.string().trim().min(2).max(80),
    country: z.string().trim().min(2).max(80),
    notes: z.string().trim().max(500).default(""),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(64),
        variantId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1, "El carrito está vacío")
    .max(40),
});

export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(300).optional() });

export const orderPaymentSchema = z.object({
  action: z.enum(["paid", "refunded", "unpaid"]),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).default(""),
});

export const customerPatchSchema = z
  .object({
    status: z.enum(["active", "suspended"]).optional(),
    suspendedReason: z.string().trim().max(300).nullable().optional(),
    adminNotes: z.string().trim().max(2000).optional(),
  })
  .refine((c) => c.status !== "suspended" || (c.suspendedReason && c.suspendedReason.length >= 3), {
    message: "Indica el motivo de la suspensión",
    path: ["suspendedReason"],
  });

export const stockAdjustSchema = z.object({
  variantId: z.string().min(1).max(64),
  mode: z.enum(["in", "out", "set"]),
  quantity: z.number().int().min(0).max(100_000),
  reason: z.enum(["restock", "return", "damage", "adjustment", "initial"]),
  note: z.string().trim().max(300).default(""),
});

export const modelMetaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  author: z.string().trim().max(120).default(""),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//.test(v), "La URL de origen debe empezar por http(s)://")
    .default(""),
  license: z.string().trim().max(160).default(""),
  rotationX: z.number().min(-360).max(360).default(0),
  rotationY: z.number().min(-360).max(360).default(0),
});

export const settingsSchema = z
  .object({
    storeName: z.string().trim().min(2).max(60),
    contactEmail: z.union([z.literal(""), z.email().max(160)]),
    shippingCents: cents,
    freeShippingFromCents: cents,
    lowStockThreshold: z.number().int().min(0).max(1000),
    maxQuantityPerItem: z.number().int().min(1).max(100),
    ordersEnabled: z.boolean(),
    checkoutNotice: z.string().trim().max(600),
  })
  .partial();

const password = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(200)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Usa letras y números");

export const adminUserCreateSchema = z.object({
  email: z.email().max(160),
  name: z.string().trim().min(2).max(80),
  role: z.enum(["admin", "staff"]),
  password,
});

export const adminUserPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(["admin", "staff"]).optional(),
    active: z.boolean().optional(),
    password: password.optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Nada que actualizar");

export const loginSchema = z.object({
  email: z.string().trim().max(160),
  password: z.string().min(1).max(200),
});

export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "datos"}: ${issue.message}` : "Datos no válidos";
}
