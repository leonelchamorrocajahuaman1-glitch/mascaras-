# SPIDER MASKS — *Behind the mask.*

Experiencia web cinematográfica dedicada a las máscaras arácnidas: máscara 3D en tiempo real como protagonista, animaciones ligadas al scroll, laboratorio 3D interactivo, tienda funcional con carrito y pedidos, y panel de administración.

> Proyecto de demostración. Los precios son ficticios y **no hay pasarela de pago**: los pedidos se registran como "pendiente de pago" sin ningún cobro. Spider-Man es una marca de Marvel; para vender productos con esa marca se necesita licencia.

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

Otros comandos: `npm run typecheck`, `npm run db:reset` (vuelve al catálogo inicial), `npm run admin:hash -- "nueva-clave"` (genera un nuevo hash de contraseña).

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

**Panel de administración (`/admin`)**
- Inicio de sesión seguro, resumen (pedidos, ventas demo, stock bajo).
- Productos: crear, editar, eliminar, precios, precio anterior, visibilidad, destacado, variantes con stock y precio propio, subida/orden de imágenes.
- Pedidos: listado con filtros y búsqueda, detalle, cambio de estado (cancelar repone stock; reactivar lo vuelve a descontar).

## Seguridad

- Ninguna clave privada llega al navegador: `.env.local` solo se lee en el servidor y está en `.gitignore`.
- Contraseña de administrador almacenada como hash **scrypt**; comparación en tiempo constante.
- Sesión firmada (HS256) en cookie `httpOnly`, `SameSite=Lax`, 8 h de duración.
- Doble verificación: `src/proxy.ts` bloquea `/admin` y `/api/admin` sin sesión, y cada ruta/página del panel vuelve a comprobarla en el servidor.
- Protección CSRF por comprobación de `Origin` en todas las peticiones de escritura del panel.
- Límite de intentos de inicio de sesión (5 cada 15 min por IP) y de pedidos.
- Subidas: solo JPG/PNG/WebP/AVIF detectados por firma binaria (no por extensión), máx. 5 MB, nombre aleatorio; SVG rechazado.
- Precios y stock **siempre** se calculan en el servidor; el carrito del navegador no es de confianza.
- Limitación conocida: cerrar sesión borra la cookie, pero un token copiado seguiría siendo válido hasta caducar (sesión sin estado). Cambiar `SESSION_SECRET` invalida todas las sesiones.

## Base de datos

Tienda y panel comparten siempre el mismo repositorio de datos (`src/lib/db`):

- **Local (por defecto):** `data/db.json`, creado automáticamente con el catálogo demo. Las imágenes subidas van a `data/uploads/` y se sirven por `/api/uploads/...`. Ideal para desarrollo en Windows sin servicios externos (válido para un único servidor).
- **Supabase (producción):**
  1. Crea un proyecto en https://supabase.com.
  2. En *SQL Editor*, ejecuta el contenido de `supabase/schema.sql` (tablas, RLS, funciones atómicas `place_order` y `set_order_status`, bucket `product-images`).
  3. En `.env.local` rellena `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (*Project Settings → API*; la service role es secreta y solo la usa el servidor).
  4. Reinicia `npm run dev`, entra en `/admin` y pulsa **Importar catálogo de demostración**.

## Imágenes

Las imágenes definitivas se generan con ChatGPT. **Todavía no se ha generado ninguna**: la lista completa con sección, dimensiones, características y el prompt exacto de cada una está en **[`docs/PROMPTS-IMAGENES.md`](docs/PROMPTS-IMAGENES.md)**.

Mientras tanto, la web usa **renders reales del modelo 3D** (`public/images/renders/`, generados con la herramienta `/studio`, disponible solo en desarrollo). Cuando copies una imagen con el nombre indicado, sustituye al render automáticamente.

## Modelos 3D

La máscara que ves es un **modelo 3D procedural real** (malla esculpida de ~90 000 vértices + shader propio de telaraña, lentes y marcos), no una imagen. Si consigues modelos profesionales, el laboratorio los usa automáticamente:

- **Formato:** `.glb` (glTF binario, todo en un archivo). También vale `.gltf`, pero GLB es más sencillo.
- **Ubicación y nombres:** `public/models/classic-red.glb`, `black-symbiote.glb`, `iron-edition.glb`, `future-vision.glb`, `stealth-edition.glb`, `custom-series.glb`. Puedes añadir solo algunos; los que falten siguen siendo procedurales.
- **Orientación:** la cara mirando a +Z, eje Y hacia arriba. El visor centra y escala el modelo automáticamente.
- **Recolorear:** nombra los materiales (o mallas) con `base`, `web` y `lens` para que los selectores de color funcionen.
- **Peso:** objetivo < 5 MB. Optimiza con `npx @gltf-transform/cli optimize entrada.glb salida.glb --texture-compress webp` (texturas 2K máximo). Si usas compresión Draco, drei descarga el decodificador desde el CDN de Google la primera vez.
- **Dónde conseguirlos:** encárgalo a un artista 3D o usa Blender (exporta *File → Export → glTF 2.0 (.glb)*). Revisa la licencia de cualquier modelo descargado; no uses modelos con copyright sin permiso.

## Pagos

No hay ninguna pasarela integrada y la web lo indica en el checkout, la confirmación y el panel. Para cobrar de verdad habría que integrar, por ejemplo, Stripe Checkout: crear la sesión de pago en el servidor a partir del pedido, y marcar `paymentStatus = "paid"` solo desde el webhook firmado de Stripe.

## Estructura

```
src/
├─ app/
│  ├─ (site)/            portada, shop, lab, cart, checkout, order (con cabecera, preloader, scroll suave)
│  ├─ admin/             login + (panel) protegido: resumen, productos, pedidos
│  ├─ api/               products, orders, uploads y admin/* (login, logout, products, orders, upload, seed)
│  └─ (tools)/studio     renders de producto (solo desarrollo)
├─ components/
│  ├─ experience/        preloader, cabecera, menú, cursor, telón, Lenis, marquee…
│  ├─ home/              Hero, Collection, Details, ShopCta
│  ├─ lab/               MaskLab (interfaz del visor)
│  ├─ three/             geometría, shader, escenas, luces, partículas, cargador GLB, ilustración SVG
│  ├─ shop/              catálogo, ficha, carrito, checkout
│  └─ admin/             formularios y tablas del panel
├─ lib/                  config, tipos, máscaras, db (local/supabase), auth, validación, stores
└─ proxy.ts              protección de /admin y /api/admin
supabase/schema.sql      esquema para Supabase
docs/PROMPTS-IMAGENES.md imágenes a generar con ChatGPT
```

## Rendimiento y accesibilidad

- Cada lienzo 3D se pausa cuando sale de pantalla; el laboratorio de la portada se monta solo al acercarse.
- Calidad adaptativa: menos densidad de malla, partículas y resolución en móviles o equipos con pocos núcleos.
- Sin WebGL: ilustración vectorial (o `hero-poster.webp` si existe) y aviso en el laboratorio.
- `prefers-reduced-motion`: sin scroll suave, sin animaciones de entrada ni grano animado.
- Enlace "Saltar al contenido", foco visible, menú y carrito cerrables con Escape, controles del visor con botones accesibles, etiquetas ARIA.
