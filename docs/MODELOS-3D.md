# Modelos 3D reales (GLB) — descarga desde Tripo e integración

La web ya está preparada para mostrar archivos **GLB/GLTF reales**: los detecta automáticamente en `public/models/`, los valida y los muestra en la ficha de producto, en la **Galería 3D** (`/shop/3d`), en el **3D Mask Lab** y en el panel (**Admin → Modelos 3D**).

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

## 2. Copiar los archivos al proyecto

1. Renombra cada archivo **sin espacios ni tildes**, en minúsculas. Por ejemplo: `mascara-clasica.glb`, `mascara-negra.glb`.
2. Cópialos en la carpeta `public/models/` del proyecto.
3. (Recomendado) Crea `public/models/models.json` con los datos de cada archivo. Tienes una plantilla en `public/models/models.example.json`:

```json
{
  "mascara-clasica.glb": {
    "name": "Máscara clásica",
    "author": "Nombre del autor en Tripo",
    "sourceUrl": "https://studio.tripo3d.ai/...",
    "license": "Licencia indicada en la página del modelo",
    "rotationY": 0,
    "rotationX": 0
  }
}
```

Usa `rotationY` (por ejemplo `180`) si el modelo aparece de espaldas, y `rotationX` (por ejemplo `-90`) si aparece tumbado. El tamaño y el centrado se ajustan solos.

## 3. Validar

```bash
npm run models:check
```

El comando comprueba que cada archivo sea un glTF 2.0 válido y completo (no un archivo renombrado ni corrupto), que contenga mallas y que las extensiones estén soportadas. También muestra el tamaño y los materiales, y avisa si un archivo pesa demasiado o le falta la licencia. La misma información aparece en **Admin → Modelos 3D**, con una vista previa interactiva.

Si pesa más de unos 8 MB, optimízalo:

```bash
npx @gltf-transform/cli optimize entrada.glb salida.glb --texture-compress webp
```

Los GLB comprimidos con **Draco** o **Meshopt** funcionan sin conexión externa: el decodificador Draco se sirve desde `public/draco/`.

## 4. Asignar cada modelo a un producto

1. `npm run dev` y entra en http://localhost:3000/admin.
2. **Productos → editar** el producto → campo **"Modelo 3D (GLB real)"** → elige el archivo → **Guardar cambios**.
3. A partir de ese momento:
   - **Ficha del producto**: pestañas *Vista 3D / Foto*. Se puede girar con el ratón o el dedo, ampliar con la rueda, el pellizco o los botones +/−, y saltar a los ángulos Frente, 3/4, Perfil, Detrás y Arriba.
   - **Galería 3D** (`/shop/3d`): catálogo con una vista previa 3D por cada máscara que tenga modelo. Todas las tarjetas comparten un único lienzo WebGL, así que funciona bien aunque haya muchas.
   - **3D Mask Lab**: cada archivo válido aparece en la lista como `GLB01`, `GLB02`… También se puede abrir directamente con `/lab?glb=/models/archivo.glb`.

Si un archivo falla al cargar, la web muestra el error en ese visor sin romper el resto de la página.

## Si quieres que Claude descargue los modelos

El entorno de Claude Code en la nube necesita tener permitido el dominio `studio.tripo3d.ai` (configuración del entorno → *Network access*). Aun así, las descargas que requieren tu sesión de Tripo deben hacerse desde tu navegador. Lo más sencillo es descargarlos tú y subirlos a la carpeta `public/models/` del repositorio (con `git` o arrastrándolos en GitHub). Después Claude puede validarlos, asignarlos y ajustar su orientación.
