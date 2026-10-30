// Pruebas de extremo a extremo de la tienda y el panel contra un servidor en marcha.
//
// Uso (con `npm run dev` o `npm run start` en otra terminal):
//   PowerShell:  $env:ADMIN_TEST_PASSWORD="tu-clave"; npm run test:e2e
//   bash:        ADMIN_TEST_PASSWORD="tu-clave" npm run test:e2e
// Variables opcionales: BASE_URL (http://localhost:3000), ADMIN_TEST_EMAIL (ADMIN_EMAIL de .env.local),
//                       TEST_GLB (ruta a un .glb real para probar la subida y el visor de modelos 3D).
//
// Todos los datos que crea llevan el prefijo [PRUEBA] o el dominio @spidermasks.test y se eliminan al final.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const env = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const OWNER_EMAIL = process.env.ADMIN_TEST_EMAIL ?? env.match(/^ADMIN_EMAIL=(.*)$/m)?.[1]?.trim();
const OWNER_PASSWORD = process.env.ADMIN_TEST_PASSWORD;
const TEST_GLB = process.env.TEST_GLB;
const RUN = Date.now().toString(36);

if (!OWNER_EMAIL || !OWNER_PASSWORD) {
  console.error("Falta ADMIN_TEST_PASSWORD (y ADMIN_TEST_EMAIL si no hay .env.local). Ver cabecera del script.");
  process.exit(2);
}

let passed = 0;
let failed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✖ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const section = (t) => console.log(`\n▸ ${t}`);

/** Cliente HTTP con su propia cookie de sesión y cabecera Origin (como un navegador). */
function client() {
  let cookie = "";
  return async function req(method, url, body, { form = false, origin = true } = {}) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (origin) headers.origin = typeof origin === "string" ? origin : BASE;
    let payload;
    if (form) payload = body;
    else if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(BASE + url, { method, headers, body: payload, redirect: "manual" });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) if (c.startsWith("sm_admin_session=")) cookie = c.split(";")[0];
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text, location: res.headers.get("location") };
  };
}

const anon = client();
const owner = client();
const staff = client();
const created = { categoryId: null, productId: null, modelId: null, staffId: null };

async function stockOf(productId, variantIdx = 0) {
  const r = await owner("GET", "/api/admin/products");
  return r.json.products.find((p) => p.id === productId)?.variants[variantIdx]?.stock;
}

async function main() {
  console.log(`SPIDER MASKS · pruebas E2E contra ${BASE}`);

  section("1. Tienda pública");
  for (const p of ["/", "/shop", "/shop/3d", "/lab", "/cart", "/checkout"]) {
    const r = await anon("GET", p);
    check(`GET ${p} → 200`, r.status === 200, `status ${r.status}`);
  }

  section("2. Protección del panel");
  const r1 = await anon("GET", "/admin");
  check("/admin sin sesión redirige al login", r1.status === 307 && r1.location?.includes("/admin/login"), `status ${r1.status} ${r1.location}`);
  const r2 = await anon("GET", "/admin/productos");
  check("/admin/productos sin sesión redirige al login", r2.status === 307, `status ${r2.status}`);
  check("API de productos sin sesión → 401", (await anon("GET", "/api/admin/products")).status === 401);
  check("API de pedidos sin sesión → 401", (await anon("PATCH", "/api/admin/orders/x", { status: "shipped" })).status === 401);
  check("Login sin cabecera Origin → 403", (await anon("POST", "/api/admin/login", { email: OWNER_EMAIL, password: OWNER_PASSWORD }, { origin: false })).status === 403);
  check("Login con contraseña incorrecta → 401", (await anon("POST", "/api/admin/login", { email: OWNER_EMAIL, password: "incorrecta-123" })).status === 401);
  check("Cookie falsificada no da acceso", (await (async () => {
    const forged = client();
    return forged("GET", "/api/admin/products");
  })()).status === 401);
  const login = await owner("POST", "/api/admin/login", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
  check("Login del propietario → 200", login.status === 200 && login.json?.role === "owner", JSON.stringify(login.json));
  if (login.status !== 200) throw new Error("No se pudo iniciar sesión: revisa ADMIN_TEST_PASSWORD.");
  check("Panel accesible con sesión", (await owner("GET", "/admin")).status === 200);
  // CSRF: con una sesión válida, una petición de escritura desde otro dominio se rechaza.
  check("Escritura con sesión válida pero Origin ajeno → 403", (await owner("PUT", "/api/admin/settings", { lowStockThreshold: 1 }, { origin: "https://evil.example" })).status === 403);
  check("Escritura con sesión válida sin Origin → 403", (await owner("PUT", "/api/admin/settings", { lowStockThreshold: 1 }, { origin: false })).status === 403);

  section("3. Categorías y productos");
  const cat = await owner("POST", "/api/admin/categories", { slug: `prueba-${RUN}`, name: `[PRUEBA] Categoría ${RUN}`, description: "Datos de prueba", sortOrder: 99, active: true });
  check("Crear categoría", cat.status === 201, JSON.stringify(cat.json));
  created.categoryId = cat.json?.category?.id;
  const slug = `prueba-mascara-${RUN}`;
  const productBody = {
    name: `[PRUEBA] Máscara ${RUN}`,
    slug,
    category: `prueba-${RUN}`,
    modelKey: "classic-red",
    modelUrl: null,
    tagline: "Producto de prueba",
    description: "Creado por scripts/test-admin.mjs. Se elimina al terminar.",
    priceCents: 9900,
    compareAtCents: 12900,
    featured: false,
    active: true,
    images: [],
    variants: [
      { name: "Talla A", sku: `T-${RUN}-A`, stock: 5, priceCents: null },
      { name: "Talla B", sku: `T-${RUN}-B`, stock: 2, priceCents: 10900 },
    ],
  };
  const created1 = await owner("POST", "/api/admin/products", productBody);
  check("Crear producto", created1.status === 201, JSON.stringify(created1.json));
  const product = created1.json?.product;
  created.productId = product?.id;
  check("Validación: precio anterior menor que precio → 400", (await owner("POST", "/api/admin/products", { ...productBody, slug: `${slug}-x`, compareAtCents: 100 })).status === 400);
  check("Validación: slug duplicado → 409", (await owner("POST", "/api/admin/products", productBody)).status === 409);
  check("Validación: categoría inexistente → 400", (await owner("POST", "/api/admin/products", { ...productBody, slug: `${slug}-y`, category: "no-existe-xyz" })).status === 400);

  let shop = await anon("GET", "/shop");
  check("El producto nuevo aparece en /shop", shop.text.includes(`Máscara ${RUN}`));
  check("Su ficha pública responde 200", (await anon("GET", `/shop/${slug}`)).status === 200);
  check("La categoría nueva aparece como filtro en /shop", shop.text.includes(`Categoría ${RUN}`));

  const edited = await owner("PUT", `/api/admin/products/${product.id}`, { ...productBody, name: `[PRUEBA] Editada ${RUN}`, priceCents: 8900, variants: product.variants.map((v) => ({ ...v })) });
  check("Editar nombre y precio", edited.status === 200 && edited.json.product.priceCents === 8900, JSON.stringify(edited.json));
  const pdp = await anon("GET", `/shop/${slug}`);
  check("La tienda muestra el nombre editado", pdp.text.includes(`Editada ${RUN}`));
  check("La tienda muestra el precio editado ($89)", pdp.text.includes("$89"));

  check("Desactivar producto", (await owner("PATCH", `/api/admin/products/${product.id}`, { active: false })).status === 200);
  check("Producto desactivado → ficha pública 404", (await anon("GET", `/shop/${slug}`)).status === 404);
  shop = await anon("GET", "/shop");
  check("Producto desactivado no aparece en /shop", !shop.text.includes(`Editada ${RUN}`));
  check("Reactivar producto", (await owner("PATCH", `/api/admin/products/${product.id}`, { active: true })).status === 200);
  check("Marcar como destacado", (await owner("PATCH", `/api/admin/products/${product.id}`, { featured: true })).json?.product?.featured === true);

  section("4. Modelos 3D");
  const bad = new FormData();
  bad.append("files", new Blob([Buffer.from("esto no es un modelo")]), "roto.glb");
  const badRes = await owner("POST", "/api/admin/models", bad, { form: true });
  check("Archivo no válido rechazado con detalle (422)", badRes.status === 422 && Array.isArray(badRes.json?.issues), `status ${badRes.status}`);
  const badName = new FormData();
  badName.append("files", new Blob([Buffer.from("x")]), "mi modelo.glb");
  check("Nombre con espacios rechazado (400)", (await owner("POST", "/api/admin/models", badName, { form: true })).status === 400);

  if (TEST_GLB && existsSync(TEST_GLB)) {
    const fd = new FormData();
    fd.append("files", new Blob([readFileSync(TEST_GLB)]), path.basename(TEST_GLB).replace(/[^A-Za-z0-9._-]/g, "-"));
    fd.append("name", `[PRUEBA] Modelo ${RUN}`);
    fd.append("author", "Autor de prueba");
    fd.append("license", "Licencia de prueba");
    fd.append("productId", product.id);
    const up = await owner("POST", "/api/admin/models", fd, { form: true });
    check(`Subir GLB real (${path.basename(TEST_GLB)}) y asignarlo al producto`, up.status === 201 && up.json?.model?.valid === true, `status ${up.status} ${JSON.stringify(up.json)?.slice(0, 200)}`);
    const model = up.json?.model;
    created.modelId = model?.id;
    if (model) {
      const file = await fetch(BASE + model.url);
      const buf = Buffer.from(await file.arrayBuffer());
      check("El archivo del modelo se sirve (200, firma glTF)", file.status === 200 && buf.subarray(0, 4).toString() === "glTF", `status ${file.status}`);
      const after = await owner("GET", "/api/admin/products");
      check("El producto tiene el modelo asignado", after.json.products.find((p) => p.id === product.id)?.modelUrl === model.url);
      const pdp3d = await anon("GET", `/shop/${slug}`);
      check("La ficha pública incluye el visor 3D con ese modelo", pdp3d.text.includes(model.url) && pdp3d.text.includes("Vista 3D"));
      const gallery = await anon("GET", "/shop/3d");
      check("La Galería 3D incluye el producto", gallery.text.includes(`Editada ${RUN}`));
      check("Editar autor/licencia/rotación del modelo", (await owner("PATCH", `/api/admin/models/${model.id}`, { name: `[PRUEBA] Modelo ${RUN}`, author: "Autor editado", sourceUrl: "https://example.com/modelo", license: "CC0-1.0", rotationX: 0, rotationY: 180 })).json?.model?.rotationY === 180);
      check("Quitar el modelo sin borrar el producto", (await owner("PATCH", `/api/admin/products/${product.id}`, { modelUrl: null })).json?.product?.modelUrl === null);
      check("El producto sigue existiendo", (await anon("GET", `/shop/${slug}`)).status === 200);
      check("Volver a asignar el modelo", (await owner("PATCH", `/api/admin/products/${product.id}`, { modelUrl: model.url })).status === 200);
      check("No se puede asignar un modelo no registrado", (await owner("PATCH", `/api/admin/products/${product.id}`, { modelUrl: "/models/no-existe.glb" })).status === 400);
    }
  } else {
    console.log("  · Sin TEST_GLB: se omite la subida de un GLB real (indica la ruta a un .glb para probarla).");
  }

  section("5. Pedidos e inventario");
  const customer = { name: "[PRUEBA] Cliente", email: `cliente-${RUN}@spidermasks.test`, phone: "", address: "Calle de Prueba 1", city: "Ciudad", country: "País", notes: "Pedido de prueba automática" };
  const vA = product.variants[0].id;
  const order1 = await anon("POST", "/api/orders", { customer, items: [{ productId: product.id, variantId: vA, quantity: 2 }] });
  check("Crear pedido de prueba", order1.status === 201, JSON.stringify(order1.json));
  check("Stock descontado una vez (5 → 3)", (await stockOf(product.id)) === 3);
  check("Pedido que supera el stock → 409", (await anon("POST", "/api/orders", { customer, items: [{ productId: product.id, variantId: vA, quantity: 4 }] })).status === 409);
  check("Stock intacto tras pedido rechazado (3)", (await stockOf(product.id)) === 3);
  const oid = order1.json?.id;
  const orderPage = await anon("GET", `/order/${oid}`);
  check("El cliente ve su pedido como Pendiente", orderPage.status === 200 && orderPage.text.includes("Pendiente"));
  check("Pasar a Confirmado", (await owner("PATCH", `/api/admin/orders/${oid}`, { status: "confirmed" })).json?.order?.status === "confirmed");
  check("Pasar a Preparando", (await owner("PATCH", `/api/admin/orders/${oid}`, { status: "processing" })).json?.order?.status === "processing");
  check("Cambios de estado sin cancelar no tocan el stock (3)", (await stockOf(product.id)) === 3);
  check("Cancelar repone stock (3 → 5)", (await owner("PATCH", `/api/admin/orders/${oid}`, { status: "cancelled" })).status === 200 && (await stockOf(product.id)) === 5);
  await owner("PATCH", `/api/admin/orders/${oid}`, { status: "cancelled" });
  check("Cancelar dos veces no repone dos veces (5)", (await stockOf(product.id)) === 5);
  check("Reactivar descuenta de nuevo (5 → 3)", (await owner("PATCH", `/api/admin/orders/${oid}`, { status: "shipped", note: "Envío de prueba" })).status === 200 && (await stockOf(product.id)) === 3);
  check("El cliente ve el estado Enviado", (await anon("GET", `/order/${oid}`)).text.includes("Enviado"));
  check("No se puede marcar pagado sin método", (await owner("POST", `/api/admin/orders/${oid}/payment`, { action: "paid", method: "none", reference: "" })).status === 400);
  const paid = await owner("POST", `/api/admin/orders/${oid}/payment`, { action: "paid", method: "bank_transfer", reference: `REF-${RUN}` });
  check("Registrar cobro manual (transferencia)", paid.json?.order?.paymentStatus === "paid" && paid.json?.order?.paidAt);
  check("El cliente ve el pago como Pagado", (await anon("GET", `/order/${oid}`)).text.includes("Pagado"));

  const inv1 = await owner("POST", "/api/admin/inventory", { variantId: vA, mode: "in", quantity: 4, reason: "restock", note: "[PRUEBA] entrada" });
  check("Entrada de stock (+4 → 7)", inv1.status === 201 && inv1.json.movement.stockAfter === 7, JSON.stringify(inv1.json));
  check("Salida mayor que el stock → 409", (await owner("POST", "/api/admin/inventory", { variantId: vA, mode: "out", quantity: 50, reason: "damage", note: "" })).status === 409);
  check("Recuento fija el stock (→ 6)", (await owner("POST", "/api/admin/inventory", { variantId: vA, mode: "set", quantity: 6, reason: "adjustment", note: "[PRUEBA] recuento" })).json?.movement?.stockAfter === 6);
  const moves = await owner("GET", `/api/admin/inventory?variantId=${vA}`);
  const reasons = moves.json.movements.map((m) => m.reason);
  check("Historial registra venta, cancelación, reactivación, entrada y ajuste", ["sale", "cancel", "reactivate", "restock", "adjustment"].every((r) => reasons.includes(r)), reasons.join(","));

  section("6. Clientes");
  const customers = await owner("GET", "/admin/clientes");
  check("El cliente de prueba aparece en Clientes", customers.text.includes(customer.email));
  const cid = (await owner("GET", `/api/admin/products`)) && (await (async () => {
    const page = await owner("GET", `/admin/pedidos/${oid}`);
    return page.text.match(/\/admin\/clientes\/(cus_[A-Za-z0-9_-]+|[0-9a-f-]{36})/)?.[1];
  })());
  check("El pedido enlaza a la ficha del cliente", Boolean(cid));
  if (cid) {
    check("Suspender sin motivo → 400", (await owner("PATCH", `/api/admin/customers/${cid}`, { status: "suspended" })).status === 400);
    check("Suspender cliente", (await owner("PATCH", `/api/admin/customers/${cid}`, { status: "suspended", suspendedReason: "[PRUEBA] suspensión" })).json?.customer?.status === "suspended");
    check("Un cliente suspendido no puede comprar (403)", (await anon("POST", "/api/orders", { customer, items: [{ productId: product.id, variantId: vA, quantity: 1 }] })).status === 403);
    check("Reactivar cliente", (await owner("PATCH", `/api/admin/customers/${cid}`, { status: "active" })).json?.customer?.status === "active");
  }

  section("7. Roles y permisos");
  const staffEmail = `staff-${RUN}@spidermasks.test`;
  const staffPassword = `Prueba${RUN}2026`;
  const su = await owner("POST", "/api/admin/users", { email: staffEmail, name: "[PRUEBA] Personal", role: "staff", password: staffPassword });
  check("El propietario crea un usuario Personal", su.status === 201 && !("passwordHash" in (su.json?.user ?? {})), JSON.stringify(su.json));
  created.staffId = su.json?.user?.id;
  check("Contraseña débil rechazada", (await owner("POST", "/api/admin/users", { email: `x-${RUN}@spidermasks.test`, name: "X", role: "staff", password: "123" })).status === 400);
  check("Personal inicia sesión", (await staff("POST", "/api/admin/login", { email: staffEmail, password: staffPassword })).json?.role === "staff");
  check("Personal: ver productos ✔", (await staff("GET", "/api/admin/products")).status === 200);
  check("Personal: crear producto ✖ (403)", (await staff("POST", "/api/admin/products", { ...productBody, slug: `${slug}-staff` })).status === 403);
  check("Personal: borrar producto ✖ (403)", (await staff("DELETE", `/api/admin/products/${product.id}`)).status === 403);
  check("Personal: cambiar configuración ✖ (403)", (await staff("PUT", "/api/admin/settings", { lowStockThreshold: 1 })).status === 403);
  check("Personal: gestionar usuarios ✖ (403)", (await staff("GET", "/api/admin/users")).status === 403);
  check("Personal: registrar cobros ✖ (403)", (await staff("POST", `/api/admin/orders/${oid}/payment`, { action: "unpaid", method: "none", reference: "" })).status === 403);
  check("Personal: cambiar estado de pedido ✔", (await staff("PATCH", `/api/admin/orders/${oid}`, { status: "delivered" })).status === 200);
  check("Personal: ajustar inventario ✔", (await staff("POST", "/api/admin/inventory", { variantId: vA, mode: "in", quantity: 1, reason: "restock", note: "[PRUEBA] personal" })).status === 201);
  check("Personal: página de configuración de usuarios oculta", !(await staff("GET", "/admin/configuracion")).text.includes("Nuevo usuario"));
  check("Desactivar al usuario cierra su sesión", (await owner("PATCH", `/api/admin/users/${created.staffId}`, { active: false })).status === 200 && (await staff("GET", "/api/admin/products")).status === 401);
  check("Usuario desactivado no puede iniciar sesión", (await staff("POST", "/api/admin/login", { email: staffEmail, password: staffPassword })).status === 403);

  section("8. Dashboard");
  const dash = await owner("GET", "/admin");
  check("Dashboard responde con métricas y gráfico", dash.status === 200 && dash.text.includes("Ventas totales") && dash.text.includes("Ingresos del mes"));
}

async function cleanup() {
  section("Limpieza de datos de prueba");
  try {
    if (created.staffId) check("Eliminar usuario de prueba", (await owner("DELETE", `/api/admin/users/${created.staffId}`)).status === 200);
    const t = await owner("DELETE", "/api/admin/orders/test-data");
    check("Eliminar pedidos de prueba", t.status === 200, JSON.stringify(t.json));
    if (created.modelId) check("Eliminar modelo de prueba", (await owner("DELETE", `/api/admin/models/${created.modelId}`)).status === 200);
    if (created.productId) check("Eliminar producto de prueba", (await owner("DELETE", `/api/admin/products/${created.productId}`)).status === 200);
    if (created.categoryId) check("Eliminar categoría de prueba", (await owner("DELETE", `/api/admin/categories/${created.categoryId}`)).status === 200);
    check("Cerrar sesión", (await owner("POST", "/api/admin/logout")).status === 200 && (await owner("GET", "/api/admin/products")).status === 401);
  } catch (e) {
    console.log("  ✖ Error en la limpieza:", e.message);
    failed++;
  }
}

try {
  await main();
} catch (e) {
  failed++;
  console.log(`\n✖ Error inesperado: ${e.stack ?? e.message}`);
} finally {
  await cleanup();
  console.log(`\nResultado: ${passed} correctas, ${failed} fallidas.`);
  if (failures.length) console.log("Fallidas:\n - " + failures.join("\n - "));
  process.exit(failed ? 1 : 0);
}
