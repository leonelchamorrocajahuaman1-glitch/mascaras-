# Modelos 3D reales (GLB) — descarga desde Tripo e integración

La web muestra archivos **GLB/GLTF reales** en la ficha de producto, en la **Galería 3D** (`/shop/3d`) y en el **3D Mask Lab**. Se gestionan desde **Admin → Modelos 3D** (`/admin/modelos-3d`): subida con validación, visor 3D, autor/origen/licencia, rotación y asignación a productos.

> Los modelos de Tripo **no se han descargado** desde el entorno de desarrollo: su red bloquea `studio.tripo3d.ai`, y la descarga suele requerir tu sesión. Hay que descargarlos desde tu navegador siguiendo estos pasos.

## 1. Descargar los modelos desde tu navegador

1. Abre la galería: https://studio.tripo3d.ai/es/3d-model-gallery/spiderman-mask?sorted=recommended
2. Entra en cada modelo que te interese y busca la opción de **descarga/exportación**.
   - Si te pide **iniciar sesión**, hazlo con tu propia cuenta de Tripo. Es el momento de hacerlo: la descarga queda asociada a tu cuenta.
   - Si un modelo no ofrece descarga (o solo permite verlo), **no está disponible para descargar**: no intentes obtenerlo por otras vías.
3. Elige el formato **GLB** (preferido). Si solo hay GLTF, descarga también los `.bin` y las texturas que lo acompañen; si solo hay FBX/OBJ, conviértelo a GLB con Blender (*File → Import* y después *File → Export → glTF 2.0 (.glb)*).
4. **Revisa y anota la licencia** que indique la página de cada modelo (uso personal, comercial, atribución…) y el nombre del autor.

### Sobre derechos

- La licencia de un modelo de la comunidad solo cubre el trabajo de su autor. **Spider-Man y sus máscaras son propiedad intelectual de Marvel/Disney**: un modelo de fans no te da derecho a vender réplicas ni a usar el personaje comercialmente. Para una tienda real necesitas una licencia oficial, o diseños propios.
- Mientras sea una demostración privada o un portafolio, conserva la atribución al autor (la web la muestra si la indicas en `models.json`).

## 2. Subirlos al panel (recomendado)

1. `npm run dev` y entra en http://localhost:3000/admin/modelos-3d.
2. **Subir modelo**: elige el `.glb`, o el `.gltf` junto con sus `.bin` y texturas. El nombre de archivo no puede tener espacios ni tildes. Máximo 60 MB.
3. Rellena **autor**, **origen** (URL de la página del modelo) y **licencia**. Opcionalmente, asígnalo ya a un producto.
4. El servidor comprueba el archivo **antes de guardarlo**: que sea glTF 2.0, que esté completo, que tenga mallas y que use extensiones soportadas. Si falla, verás el motivo exacto.
5. En la tarjeta del modelo:
   - **Ver en 3D**: gíralo, amplíalo y prueba los ángulos.
   - Si aparece de espaldas o tumbado, ajusta la **rotación** en *Editar datos* (Y = 180 o X = -90).
6. **Asignar**, **cambiar** o **quitar** el modelo de un producto (al quitarlo, el producto se conserva). El bloque *Cobertura 3D* muestra qué productos tienen modelo y cuáles no.

### Alternativa: copiar a `public/models/`

También puedes copiar los `.glb` en `public/models/`: se registran solos al abrir *Modelos 3D*. Puedes precargar sus datos en `public/models/models.json`, con el formato de `public/models/models.example.json`, o editarlos después en el panel. Para validar los archivos de esa carpeta:

```bash
npm run models:check
```

Si un modelo pesa más de unos 8 MB, optimízalo:

```bash
npx @gltf-transform/cli optimize entrada.glb salida.glb --texture-compress webp
```

Los GLB comprimidos con **Draco** o **Meshopt** funcionan sin conexión externa: el decodificador Draco se sirve desde `public/draco/`.

## Si quieres que Claude descargue los modelos

El entorno de Claude Code en la nube necesita tener permitido el dominio `studio.tripo3d.ai` (configuración del entorno → *Network access*). Aun así, las descargas que requieren tu sesión de Tripo deben hacerse desde tu navegador. Lo más sencillo es descargarlos tú y subirlos a la carpeta `public/models/` del repositorio (con `git` o arrastrándolos en GitHub). Después Claude puede validarlos, asignarlos y ajustar su orientación.

## Asignación automática con `models.json`

En `public/models/models.json` cada archivo puede indicar a qué producto debe asignarse con `assignTo` (lista de slugs):

```json
{
  "spider-man.glb": { "name": "Máscara clásica — modelo 3D", "author": "", "sourceUrl": "", "license": "", "rotationX": 0, "rotationY": 0, "assignTo": ["classic-red"] },
  "spider-man_symbiote.glb": { "name": "Máscara simbionte — modelo 3D", "author": "", "sourceUrl": "", "license": "", "rotationX": 0, "rotationY": 0, "assignTo": ["black-symbiote"] }
}
```

- **Cuándo se aplica:** la primera vez que la web registra el archivo, o al usar *Importar catálogo inicial*. Funciona igual en tu PC y en Vercel/Supabase.
- **Qué hace:** solo rellena productos **sin** modelo. Nunca sustituye una asignación hecha a mano ni crea productos. Si quitas el modelo desde el panel, no se vuelve a poner solo.
- **Si el modelo aparece girado:** ajusta `rotationY` (por ejemplo `180`) o `rotationX` (por ejemplo `-90`) aquí, o en *Admin → Modelos 3D → Editar datos*.
- **Autor y licencia:** rellénalos con los datos reales del origen de cada modelo.

### Cómo añadir `spider-man.glb` y `spider-man_symbiote.glb`

1. Copia ambos archivos, con esos nombres exactos, en `public/models/`. Desde GitHub también puedes subirlos con **Add file → Upload files** dentro de la carpeta `public/models` de la rama `claude/trusting-babbage-yy4pzy`.
2. Valídalos:
   ```bash
   npm run models:check
   ```
   Comprueba que tengan mallas y texturas y que no estén corruptos.
3. Haz commit y push, o espera al siguiente despliegue de Vercel. Al abrir la tienda, cada modelo se asigna a su producto y aparece en la ficha (pestañas *Vista 3D / Foto*), en `/shop/3d` y en el 3D Mask Lab.

GitHub rechaza archivos de más de 100 MB y Supabase Free limita cada archivo a 50 MB. Si pesan mucho, optimízalos primero con `gltf-transform`.
