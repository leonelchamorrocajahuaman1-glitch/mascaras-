import { z } from "zod";
import { MASK_KEYS } from "./masks";
import { ORDER_STATUSES } from "./types";
import { siteConfig } from "./config";

const cents = z.number().int().min(0).max(10_000_000);

const imageUrl = z
  .string()
  .max(500)
  .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "URL de imagen no válida");

export const productInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones"),
  name: z.string().trim().min(2).max(80),
  category: z.enum(MASK_KEYS),
  tagline: z.string().trim().max(140),
  description: z.string().trim().max(2000),
  priceCents: cents,
  compareAtCents: cents.nullable(),
  images: z.array(imageUrl).max(8),
  modelKey: z.enum(MASK_KEYS),
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
        quantity: z.number().int().min(1).max(siteConfig.maxQuantityPerItem),
      }),
    )
    .min(1, "El carrito está vacío")
    .max(40),
});

export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

export const loginSchema = z.object({
  email: z.string().trim().max(160),
  password: z.string().min(1).max(200),
});

export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "datos"}: ${issue.message}` : "Datos no válidos";
}
