# SPIDER MASKS — *Behind the mask.*

Experiencia web cinematográfica dedicada a las máscaras arácnidas: máscara 3D en tiempo real como protagonista, animaciones ligadas al scroll, laboratorio 3D interactivo, tienda funcional con carrito y pedidos, y panel de administración.

> Los precios son ficticios y **no hay pasarela de pago**: los pedidos se registran como "No pagado" sin ningún cobro.
> La máscara 3D, las fotos de producto, la ilustración y el logotipo son un **diseño original de SPIDER MASKS** (visor de seis ojos y placas celulares). No reproducen personajes con licencia. Si subes modelos o fotos de terceros, comprueba que tienes derecho a usarlos, sobre todo para venderlos.

**Publicar en Internet:** guía paso a paso (Vercel + Supabase) en **[`docs/DESPLIEGUE-VERCEL.md`](docs/DESPLIEGUE-VERCEL.md)**.

## Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript |
| Estilos | Tailwind CSS 4 · fuentes autoalojadas (Big Shoulders Display, Space Grotesk, JetBrains Mono) |
| 3D | Three.js · React Three Fiber · drei · postprocessing (bloom) |
| Animación | GSAP + ScrollTrigger · Lenis (scroll suave) |
| Estado | Zustand (carrito persistente en `localStorage`) |
| Datos | Base de datos local en JSON **o** Supabase (PostgreSQL + Storage) |
| Seguridad | Sesión JWT (jose) en cookie httpOnly · contraseñas scrypt · validación zod |

## Puesta en marcha en Windows

Requisitos: **Node.js 20.9 o superior** (recomendado 22 LTS, https://nodejs.org) y Git.

En PowerShell o CMD, dentro de la carpeta del proyecto:

```bash
npm install
```

```bash
npm run setup
```

`npm run setup` crea `.env.local` con un secreto de sesión aleatorio y una contraseña de administrador **que se muestra una sola vez** (guárdala). Para elegir tu propia contraseña: `npm run setup -- "mi-clave-segura"`.

```bash
npm run dev
```

Abre http://localhost:3000 (web) y http://localhost:3000/admin (panel).

Para probar la versión optimizada de producción:

```bash
npm run build
```

```bash
npm run start
```

Otros comandos: `npm run typecheck`, `npm run models:check` (valida los GLB de `public/models`), `npm run env:production` (variables para Vercel), `npm run db:migrate-to-supabase` (copia el catálogo local a Supabase, con simulación previa), `npm run db:reset` (vuelve al catálogo inicial), `npm run admin:hash -- "nueva-clave"` (genera un nuevo hash de contraseña).

## Qué incluye

**Portada (`/`)**
- Preloader con contador que espera a que la escena 3D esté lista y se abre como unos párpados.
- Hero a pantalla completa: máscara 3D con iluminación roja, partículas, título gigante detrás de la máscara (profundidad real), mirada que sigue al cursor, parallax por capas, telaraña que "se teje" desde el centro y lentes que se encienden y parpadean.
- Scroll: la máscara gira y se desplaza mientras aparece el manifiesto palabra a palabra.
- **Mask Collection**: recorrido horizontal fijado (pin) en escritorio, revelados con clip-path, parallax interno de imagen y efecto de escaneo al pasar el cursor. En móvil se convierte en recorrido vertical.
- **3D Mask Lab** (también en `/lab`): girar con ratón o dedo, zoom con rueda/pellizco o botones, cambiar entre 6 modelos, cambiar colores en los modelos que lo permiten (Classic Red, Future Vision, Custom Series), activar/desactivar luz principal, contraluz rojo, ambiente, bloom, auto-rotación y lentes entrecerradas, restablecer vista y descargar captura PNG. En la portada se activa con un clic para no "secuestrar" el scroll.
- **The Details**: visor 3D fijo que viaja con planos macro (ojos, red, texturas, materiales, reflejos, tecnología) mientras avanzan los capítulos.
- Telón animado entre páginas, cursor personalizado, botones magnéticos, menú a pantalla completa, grano de película.

**Tienda**
- `/shop`: búsqueda, filtros por colección, solo disponibles, precio máximo, ordenación, vista en filas (con vista previa flotante) o galería. Los filtros se guardan en la URL.
- `/shop/[slug]`: variantes con stock, cantidad, añadir al carrito, enlace al modelo en el laboratorio.
- Carrito lateral y `/cart`: modificar cantidades, eliminar, total automático, envío gratis desde un umbral, persistencia. Al abrir el carrito o el checkout se revalidan precios y stock con el servidor.
- `/checkout` → `/order/[id]`: el servidor recalcula precios, valida y descuenta stock de forma atómica y registra el pedido.

**Panel de administración (`/admin`)** — guía completa en **[`docs/ADMIN.md`](docs/ADMIN.md)**
- **Acceso** (`/admin/login`) con roles: Propietario (definido en `.env.local`), Administrador y Personal. No hay registro público.
- **Dashboard**: ventas totales, ingresos del día y del mes, cobrado, pedidos, productos disponibles, stock bajo, agotados, últimos pedidos y gráfico de ventas por día o mes (con vista de tabla).
- **Productos** (`/admin/productos`): crear, editar, eliminar con confirmación, activar/desactivar, destacar, precios y descuentos, variantes y stock, fotos; búsqueda, filtros y orden. **Categorías** (`/admin/productos/categorias`).
- **Modelos 3D** (`/admin/modelos-3d`): subir `.glb`/`.gltf` con validación, visor 3D, autor/origen/licencia/rotación, asignar, cambiar o quitar en productos, cobertura de productos con y sin modelo.
- **Pedidos** (`/admin/pedidos`): filtros, ficha con cliente, artículos, totales, método y estado de pago, estados (pendiente → confirmado → preparando → enviado → entregado / cancelado) e historial. El cliente ve el estado en su página de pedido.
- **Clientes** (`/admin/clientes`): búsqueda, historial de pedidos, notas y suspensión.
- **Inventario** (`/admin/inventario`): stock por variante, entradas/salidas/recuentos con motivo, alertas y historial de movimientos.
- **Configuración** (`/admin/configuracion`): envío, umbral de stock, máximo por artículo, pausar pedidos, aviso del checkout y usuarios del panel.

## Seguridad

- Ninguna clave privada llega al navegador: `.env.local` solo se lee en el servidor y está en `.gitignore`.
- Contraseñas (propietario y usuarios del panel) con hash **scrypt**; comparación en tiempo constante y tiempo de respuesta igualado aunque el email no exista.
- Sesión firmada (HS256) en cookie `httpOnly`, `SameSite=Strict`, 8 h. En cada petición el servidor comprueba que el usuario sigue existiendo y activo y lee su rol actual de la base de datos. Cambiar contraseña o rol, o desactivar a un usuario, invalida sus sesiones al instante.
- Triple barrera: `src/proxy.ts` bloquea `/admin` y `/api/admin` sin token válido; cada página del panel exige sesión y permiso; cada ruta de la API comprueba sesión, **permiso del rol** y `Origin` (CSRF).
- Límite de intentos de inicio de sesión (5 cada 15 min por IP) y de pedidos.
- Subidas de imágenes: JPG/PNG/WebP/AVIF detectados por firma binaria, máx. 5 MB, nombre aleatorio; SVG rechazado. Modelos 3D: validados como glTF 2.0 antes de guardarse, máx. 60 MB, nombres restringidos.
- Precios, envío, límites y stock **siempre** se calculan en el servidor; el carrito del navegador no es de confianza.

## Base de datos

Tienda y panel comparten siempre el mismo repositorio de datos (`src/lib/db`): productos, categorías, precios, stock, pedidos, clientes, movimientos de inventario, modelos 3D, usuarios del panel y configuración.

- **Local (por defecto):** `data/db.json`, creado automáticamente con el catálogo inicial y migrado solo al actualizar (las bases antiguas conservan sus datos). Imágenes subidas en `data/uploads/` y modelos subidos en `data/models/`. Ideal para un único servidor en tu PC.
- **Supabase (producción):**
  1. Crea un proyecto en https://supabase.com.
  2. En *SQL Editor*, ejecuta **todo** `supabase/schema.sql`. Es idempotente: crea tablas, migra una base anterior, activa RLS y crea las funciones atómicas (`place_order`, `set_order_status`, `adjust_stock`) y los buckets `product-images` y `models`.
  3. En `.env.local` rellena `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (*Project Settings → API*; la service role es secreta y solo la usa el servidor).
  4. Reinicia `npm run dev`, entra en `/admin` y pulsa **Importar catálogo inicial**.
  - RLS: todas las tablas tienen RLS activado **sin políticas** para `anon` y `authenticated`, así que nadie puede leer ni escribir directamente con la clave pública. Todo pasa por el servidor, que comprueba sesión y permisos. Los clientes no tienen cuentas de Supabase: solo ven su pedido a través de un enlace con un identificador imposible de adivinar.
  - El adaptador de Supabase **no se ha probado contra un proyecto real** en este entorno (las pruebas automáticas usan la base local). Ejecuta `npm run test:e2e` después de configurarlo.

## Imágenes

Las imágenes definitivas se generan con ChatGPT. **Todavía no se ha generado ninguna**: la lista completa con sección, dimensiones, características y el prompt exacto de cada una está en **[`docs/PROMPTS-IMAGENES.md`](docs/PROMPTS-IMAGENES.md)**.

Mientras tanto, la web usa **renders reales del modelo 3D original** (`public/images/renders/*-original.webp`, generados con la herramienta `/studio`, disponible solo en desarrollo). Cuando copies una imagen con el nombre indicado, sustituye al render automáticamente.

## Modelos 3D

La web muestra **archivos GLB/GLTF reales**. Guía completa (descarga desde Tripo, licencias, subida y asignación): **[`docs/MODELOS-3D.md`](docs/MODELOS-3D.md)**.

- Súbelos desde **Admin → Modelos 3D**, o cópialos en `public/models/` (se registran automáticamente). Se validan antes de usarse; `npm run models:check` valida los de la carpeta.
- Asigna cada modelo a un producto (en Modelos 3D o en la ficha del producto). Con él se muestra:
  - una vista 3D en la ficha del producto: girar, ampliar y ángulos predefinidos;
  - una tarjeta 3D interactiva en la **Galería 3D** (`/shop/3d`);
  - una entrada en el **3D Mask Lab**.
- Draco y Meshopt funcionan sin CDN: el decodificador va en `public/draco/`.
- Ahora mismo **no hay ningún modelo en el proyecto**: los de Tripo hay que descargarlos manualmente.

## Pagos

No hay pasarela de pago integrada; la web lo indica en el checkout, en la página del pedido y en el panel. Los pedidos se crean como **No pagado** con método "Sin pasarela de pago". Cuando recibas un pago por otro medio (transferencia, efectivo, TPV), regístralo en la ficha del pedido con su referencia; queda en el historial con quién lo hizo. Para cobrar en línea habría que integrar, por ejemplo, Stripe Checkout y marcar el pago **solo** desde su webhook firmado.

## Pruebas

```bash
npm run test:e2e
```

Requiere el servidor en marcha (`npm run dev` o `npm run start`) y la contraseña del propietario en `ADMIN_TEST_PASSWORD`. En PowerShell:

```bash
$env:ADMIN_TEST_PASSWORD="tu-contraseña"; npm run test:e2e
```

Opcional: `$env:TEST_GLB="C:\ruta\modelo.glb"` para probar también la subida y el visor de un GLB real, y `$env:BASE_URL="http://localhost:3001"` si usas otro puerto.

Recorre la tienda, la protección del panel, CRUD de productos y categorías con su reflejo en la tienda, modelos 3D, flujo de pedidos y stock (incluida la cancelación doble), inventario, clientes suspendidos, permisos por rol y el dashboard. Los datos que crea llevan `[PRUEBA]` o `@spidermasks.test` y se borran al final.

## Estructura

```
src/
├─ app/
│  ├─ (site)/            portada, shop, lab, cart, checkout, order (con cabecera, preloader, scroll suave)
│  ├─ admin/             login + (panel): dashboard, productos, modelos-3d, pedidos, clientes, inventario, configuracion
│  ├─ api/               products, orders, uploads, model-files y admin/* (una ruta por módulo, con permisos)
│  └─ (tools)/studio     renders de producto (solo desarrollo)
├─ components/
│  ├─ experience/        preloader, cabecera, menú, cursor, telón, Lenis, marquee…
│  ├─ home/              Hero, Collection, Details, ShopCta
│  ├─ lab/               MaskLab (interfaz del visor)
│  ├─ three/             geometría, shader, escenas, luces, partículas, cargador GLB, ilustración SVG
│  ├─ shop/              catálogo, ficha, carrito, checkout
│  └─ admin/             formularios y tablas del panel
├─ lib/                  config, tipos, máscaras, db (local/supabase), auth + permisos, validación, stats, stores
└─ proxy.ts              protección de /admin y /api/admin
supabase/schema.sql      esquema + migración para Supabase
scripts/test-admin.mjs   pruebas de extremo a extremo (npm run test:e2e)
docs/ADMIN.md            guía del panel de administración
docs/PROMPTS-IMAGENES.md imágenes a generar con ChatGPT
```

## Rendimiento y accesibilidad

- Cada lienzo 3D se pausa cuando sale de pantalla; el laboratorio de la portada se monta solo al acercarse.
- Calidad adaptativa: menos densidad de malla, partículas y resolución en móviles o equipos con pocos núcleos.
- Sin WebGL: ilustración vectorial (o `hero-poster.webp` si existe) y aviso en el laboratorio.
- `prefers-reduced-motion`: sin scroll suave, sin animaciones de entrada ni grano animado.
- Enlace "Saltar al contenido", foco visible, menú y carrito cerrables con Escape, controles del visor con botones accesibles, etiquetas ARIA.
