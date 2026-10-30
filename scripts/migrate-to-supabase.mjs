// Copia el catálogo de la base local (data/db.json) a Supabase.
//
//   npm run db:migrate-to-supabase            → SIMULACIÓN: muestra qué haría, no escribe nada
//   npm run db:migrate-to-supabase -- --apply → copia de verdad
//
// Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local (o del entorno).
// Solo AÑADE lo que falta (por slug/url); nunca modifica ni borra datos existentes en Supabase.
// Copia: configuración (si Supabase aún no tiene), categorías, productos + variantes, fotos subidas
// (data/uploads → bucket product-images) y modelos 3D subidos (data/models → bucket models).
// No copia pedidos, clientes ni movimientos: en local suelen ser pruebas; los reales nacen en producción.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const envFile = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const env = (k) => process.env[k] ?? envFile.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^['"]|['"]$/g, "");
const URL_ = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");

if (!existsSync("data/db.json")) {
  console.log("No existe data/db.json: no hay datos locales que migrar.");
  process.exit(0);
}
if (!URL_ || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (en .env.local o en el entorno).");
  process.exit(1);
}

const local = JSON.parse(readFileSync("data/db.json", "utf8"));
const sb = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const log = (...a) => console.log(APPLY ? "  ✔" : "  ·", ...a);
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};
const TYPES = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", avif: "image/avif", glb: "model/gltf-binary", gltf: "model/gltf+json", bin: "application/octet-stream", jpeg: "image/jpeg", ktx2: "image/ktx2" };

async function main() {
  console.log(`Migración local → Supabase (${APPLY ? "APLICANDO" : "simulación; añade --apply para copiar"})\n`);
  must(await sb.from("products").select("id").limit(1), "No se puede leer la tabla products. ¿Ejecutaste supabase/schema.sql?");

  // Configuración: solo si Supabase todavía no tiene datos guardados.
  const settingsRow = must(await sb.from("store_settings").select("data").eq("id", 1).maybeSingle(), "store_settings");
  if (local.settings && (!settingsRow || !Object.keys(settingsRow.data ?? {}).length)) {
    const { updatedAt: _u, ...data } = local.settings;
    log("Configuración de la tienda");
    if (APPLY) must(await sb.from("store_settings").upsert({ id: 1, data, updated_at: new Date().toISOString() }), "store_settings");
  } else console.log("  = Configuración: Supabase ya tiene la suya (no se toca)");

  // Categorías
  const remoteCats = new Set(must(await sb.from("categories").select("slug"), "categories").map((c) => c.slug));
  for (const c of local.categories ?? []) {
    if (remoteCats.has(c.slug)) continue;
    log(`Categoría ${c.slug}`);
    if (APPLY) must(await sb.from("categories").insert({ slug: c.slug, name: c.name, description: c.description ?? "", sort_order: c.sortOrder ?? 0, active: c.active !== false }), `categoría ${c.slug}`);
  }

  // Modelos 3D subidos al panel local → bucket "models"
  const modelUrlMap = new Map();
  const remoteModels = new Set(must(await sb.from("model_assets").select("url"), "model_assets").map((m) => m.url));
  for (const m of local.models ?? []) {
    if (m.source !== "upload") continue;
    const folder = m.url.split("/")[3];
    const dir = path.join("data", "models", folder ?? "");
    if (!folder || !existsSync(dir)) {
      console.log(`  ! Modelo ${m.name}: no se encuentran sus archivos en ${dir}`);
      continue;
    }
    const publicUrl = sb.storage.from("models").getPublicUrl(`${folder}/${m.fileName}`).data.publicUrl;
    modelUrlMap.set(m.url, publicUrl);
    if (remoteModels.has(publicUrl)) continue;
    log(`Modelo 3D ${m.name} (${readdirSync(dir).join(", ")})`);
    if (APPLY) {
      for (const f of readdirSync(dir)) {
        must(await sb.storage.from("models").upload(`${folder}/${f}`, readFileSync(path.join(dir, f)), { contentType: TYPES[f.split(".").pop().toLowerCase()] ?? "application/octet-stream", upsert: false }), `subir ${f}`);
      }
      must(
        await sb.from("model_assets").insert({
          file_name: m.fileName, url: publicUrl, source: "supabase", name: m.name, author: m.author ?? "", source_url: m.sourceUrl ?? "", license: m.license ?? "",
          rotation_x: m.rotationX ?? 0, rotation_y: m.rotationY ?? 0, size_bytes: m.sizeBytes ?? 0, valid: m.valid, issues: m.issues ?? [], warnings: m.warnings ?? [], stats: m.stats ?? {},
        }),
        `registrar modelo ${m.name}`,
      );
    }
  }

  // Productos (+ fotos subidas y variantes)
  const remoteSlugs = new Set(must(await sb.from("products").select("slug"), "products").map((p) => p.slug));
  for (const p of local.products ?? []) {
    if (remoteSlugs.has(p.slug)) {
      console.log(`  = Producto ${p.slug}: ya existe en Supabase (no se toca)`);
      continue;
    }
    const images = [];
    for (const img of p.images ?? []) {
      if (!img.startsWith("/api/uploads/")) {
        images.push(img);
        continue;
      }
      const name = img.split("/").pop();
      const file = path.join("data", "uploads", name);
      if (!existsSync(file)) {
        console.log(`  ! Foto ${name} de ${p.slug} no encontrada; se omite`);
        continue;
      }
      if (APPLY) {
        const up = await sb.storage.from("product-images").upload(name, readFileSync(file), { contentType: TYPES[name.split(".").pop()] ?? "image/webp", upsert: false });
        if (up.error && !/exists/i.test(up.error.message)) throw new Error(`subir foto ${name}: ${up.error.message}`);
      }
      images.push(sb.storage.from("product-images").getPublicUrl(name).data.publicUrl);
    }
    const modelUrl = p.modelUrl ? (modelUrlMap.get(p.modelUrl) ?? (p.modelUrl.startsWith("/models/") ? p.modelUrl : null)) : null;
    log(`Producto ${p.slug} (${p.variants.length} variantes, ${images.length} fotos${modelUrl ? ", con modelo 3D" : ""})`);
    if (!APPLY) continue;
    const row = must(
      await sb
        .from("products")
        .insert({
          slug: p.slug, name: p.name, category: p.category, tagline: p.tagline ?? "", description: p.description ?? "", price_cents: p.priceCents,
          compare_at_cents: p.compareAtCents, images, model_key: p.modelKey, model_url: modelUrl, featured: p.featured, active: p.active,
        })
        .select("id")
        .single(),
      `producto ${p.slug}`,
    );
    for (const [position, v] of p.variants.entries()) {
      must(await sb.from("product_variants").insert({ product_id: row.id, name: v.name, sku: v.sku, stock: v.stock, price_cents: v.priceCents, position }), `variante ${v.sku}`);
      if (v.stock > 0) {
        must(
          await sb.from("stock_movements").insert({ product_id: row.id, variant_id: null, product_name: p.name, variant_name: v.name, sku: v.sku, delta: v.stock, stock_after: v.stock, reason: "initial", note: "Migrado desde la base local", actor: "migración" }),
          `movimiento ${v.sku}`,
        );
      }
    }
  }

  const skipped = (local.orders?.length ?? 0) + (local.customers?.length ?? 0);
  if (skipped) console.log(`\n  · No se copian ${local.orders?.length ?? 0} pedido(s) ni ${local.customers?.length ?? 0} cliente(s) locales (normalmente son pruebas).`);
  console.log(APPLY ? "\nMigración completada." : "\nSimulación terminada. Si está todo bien, ejecuta: npm run db:migrate-to-supabase -- --apply");
}

main().catch((e) => {
  console.error(`\n✖ ${e.message}`);
  process.exit(1);
});
