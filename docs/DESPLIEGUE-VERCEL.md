# Publicar SPIDER MASKS en Internet (Vercel + Supabase)

**Arquitectura recomendada**
- **Vercel** aloja la web: Next.js 16, páginas, API, panel y protección del panel.
- **Supabase** guarda los datos: PostgreSQL para productos, pedidos, clientes, inventario, usuarios del panel y configuración, y Storage para fotos y modelos 3D.

> **Por qué no basta con Vercel:** su sistema de archivos es de solo lectura, así que la base local `data/db.json` no puede guardar pedidos ni cambios. Si publicas sin Supabase, la web **arranca en modo solo lectura**: el catálogo se ve, pero no se aceptan pedidos y el panel no puede guardar cambios. Lo indica `/api/health`.

## 0. Antes de empezar

- Cuenta de **GitHub** con acceso al repositorio `leonelchamorrocajahuaman1-glitch/mascaras-`.
- La rama por defecto del repositorio es `claude/trusting-babbage-yy4pzy`: Vercel la usará como rama de **producción**.
- Planes gratuitos, a tener en cuenta:
  - **Vercel Hobby** es para uso **personal y no comercial**. Para vender de verdad, Vercel exige el plan **Pro**.
  - **Supabase Free** pausa el proyecto tras una semana sin actividad (se reactiva desde su panel) y limita cada archivo de Storage a **50 MB**.

## 1. Crear la base de datos en Supabase

1. Entra en https://supabase.com e inicia sesión. Puedes hacerlo con tu cuenta de GitHub.
2. **New project**. Elige un nombre, una contraseña de base de datos (guárdala) y la región más cercana a tus clientes.
3. Cuando el proyecto esté listo: **SQL Editor → New query**. Pega **todo** el contenido de `supabase/schema.sql` y pulsa **Run**. Debe terminar sin errores; puedes ejecutarlo de nuevo sin riesgo. Este script:
   - crea las tablas, con RLS activado y sin acceso público;
   - crea las funciones atómicas de pedidos y stock;
   - crea los buckets `product-images` y `models`.
4. **Project Settings → API**. Copia:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`;
   - **service_role** (secret) → será `SUPABASE_SERVICE_ROLE_KEY`. Esta clave es **secreta**: solo va en Vercel y en tu `.env.local`, nunca en GitHub ni en el navegador.

## 2. Generar las credenciales del panel para producción

En tu PC, dentro de la carpeta del proyecto:

```bash
npm run env:production -- "tu-email@dominio.com" "una-contraseña-larga-y-única"
```

Muestra `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`. No escribe ningún archivo. Usa una contraseña distinta de la de tu PC.

## 3. Importar el proyecto en Vercel (desde tu navegador)

1. Entra en https://vercel.com y pulsa **Sign Up / Log in → Continue with GitHub**. Autoriza a Vercel cuando GitHub lo pida.
2. **Add New… → Project**. En *Import Git Repository*, si no aparece `mascaras-`, pulsa **Adjust GitHub App Permissions** y da acceso a ese repositorio.
3. Pulsa **Import** en `mascaras-`. Deja los valores que Vercel detecta:
   - *Framework Preset*: **Next.js**;
   - *Root Directory*: `./`;
   - *Build Command*: `npm run build` (lo fija `vercel.json`);
   - *Output Directory*: automático (no lo cambies).
4. Despliega **Environment Variables** y añade estas cinco (entorno *Production*; puedes marcar también *Preview*):

| Variable | Valor | ¿Secreta? |
|---|---|---|
| `ADMIN_EMAIL` | el que diste en el paso 2 | no |
| `ADMIN_PASSWORD_HASH` | línea generada en el paso 2 | sí |
| `SESSION_SECRET` | línea generada en el paso 2 | sí |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase | no (es pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role de Supabase | **sí, muy importante** |

5. Pulsa **Deploy** y espera a que el build termine (2-4 minutos).
6. Vercel te dará una URL pública del tipo `https://mascaras-xxxx.vercel.app`. Esa es tu web en Internet.

> Si cambias una variable después, haz **Deployments → … → Redeploy**: `NEXT_PUBLIC_SUPABASE_URL` se usa también durante el build.

## 4. Comprobar el despliegue

1. Abre `https://TU-URL.vercel.app/api/health`. Debe devolver `"ok": true`, `"database": "supabase"` y `"readOnly": false`. Si no, el campo `detail` y los indicadores dicen qué falta, sin mostrar ningún secreto.
2. Abre `https://TU-URL.vercel.app/admin/login` y entra con el email y la contraseña del paso 2.
3. La base de datos de Supabase empieza vacía. Para llenarla, elige una opción:
   - **Dashboard → Importar catálogo inicial** (6 productos y 6 categorías), o
   - copiar tu catálogo local (paso 5).
4. Revisa en **Configuración** el envío, el umbral de stock y el aviso del checkout.
5. Haz un pedido de prueba con un email terminado en `@spidermasks.test`. Compruébalo en **Pedidos** y bórralo después en **Configuración → Borrar pedidos de prueba**.
6. Pruébalo desde el teléfono, con datos móviles.
7. (Opcional) Ejecuta las pruebas automáticas contra producción desde tu PC (PowerShell):
   ```bash
   $env:BASE_URL="https://TU-URL.vercel.app"; $env:ADMIN_TEST_EMAIL="tu-email@dominio.com"; $env:ADMIN_TEST_PASSWORD="tu-contraseña"; npm run test:e2e
   ```
   Crea y borra datos de prueba identificados con `[PRUEBA]` y `@spidermasks.test`.

## 5. (Opcional) Copiar tu catálogo local a Supabase

En tu PC, añade `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` a `.env.local` y ejecuta primero la **simulación**, que no escribe nada:

```bash
npm run db:migrate-to-supabase
```

Si la lista es correcta:

```bash
npm run db:migrate-to-supabase -- --apply
```

- Copia la configuración, las categorías, los productos con sus variantes y las fotos y modelos subidos en local.
- **Solo añade** lo que no existe en Supabase: nunca modifica ni borra datos ya guardados allí.
- No copia pedidos ni clientes locales.

> Ojo: si quitas las variables de Supabase de `.env.local`, tu PC vuelve a usar `data/db.json`. Si las dejas, tu PC trabaja directamente con la base de producción.

## 6. Modelos 3D y fotos en producción

- **Modelos 3D (Admin → Modelos 3D):** el navegador los sube **directamente a Supabase Storage** con un enlace firmado de un solo uso, y después el servidor los valida antes de registrarlos. Así se evita el límite de ~4,5 MB por petición de Vercel. El máximo es de 60 MB, o 50 MB por archivo con Supabase Free.
- **Fotos de producto:** máximo **4 MB** en Vercel. Usa WebP.
- **Archivos en `public/`:** los que añadas al repositorio (por ejemplo `public/models/*.glb`) se publican con cada despliegue; su validación se hace durante el build.

## 7. Actualizaciones y dominio propio

- Cada `git push` a la rama de producción vuelve a desplegar la web automáticamente.
- **Dominio propio (más adelante):** Vercel → Project → **Settings → Domains → Add**, y sigue las instrucciones DNS de tu proveedor del dominio.

## Seguridad en producción

- Los secretos solo existen en las variables de entorno de Vercel. `.env.local`, `data/` y las subidas locales están en `.gitignore`.
- Las cookies de sesión son `Secure`, `httpOnly` y `SameSite=Strict`.
- El panel tiene tres barreras: proxy, comprobación en cada página y permisos por rol en cada API.
- Supabase tiene RLS activado sin políticas públicas: nadie puede leer ni escribir con la clave pública. Todo pasa por el servidor.
- Los clientes solo ven su pedido mediante un enlace con un identificador UUID imposible de adivinar.
- Limitación conocida: el límite de intentos de login y de pedidos se guarda en la memoria de cada instancia de Vercel, así que es menos estricto que en un servidor único.
