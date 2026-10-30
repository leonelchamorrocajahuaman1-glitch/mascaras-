# Imágenes para SPIDER MASKS — qué generar con ChatGPT y dónde colocarlas

> **Importante:** ninguna de estas imágenes ha sido generada todavía. La web funciona sin ellas:
> mientras no existan, cada hueco muestra **renders reales del modelo 3D procedural**
> (`public/images/renders/`) o el propio visor 3D. En cuanto copies un archivo con el nombre
> exacto indicado, la web lo detecta y lo usa automáticamente (no hay que tocar código).

## Reglas comunes para todas las imágenes

- **Formato de entrega:** WebP (o JPG/PNG convertidos a WebP). Calidad 80–85.
- **Peso orientativo:** < 400 KB por imagen (las de producto < 300 KB).
- **Estética:** fondo negro profundo, iluminación roja ambiental, contraluz rojo, reflejos blancos, gris metálico. Nada de fondos claros ni escenas genéricas.
- **Coherencia con el modelo 3D:** máscara de cabeza completa roja, telaraña en relieve oscuro con radios que nacen entre los ojos, **lentes blancas grandes, angulosas, con marco negro grueso** (la punta exterior de cada lente sube hacia la sien).
- **Marca registrada:** ChatGPT puede negarse a reproducir personajes con copyright. Por eso los prompts describen una "máscara de superhéroe con patrón de telaraña" sin nombrar al personaje. Si aun así la rechaza, elimina la palabra "superhero".
- **Sin texto, logotipos ni marcas de agua** en ninguna imagen (todo el texto lo pone la web).
- Si ChatGPT entrega PNG, conviértelo a WebP (por ejemplo con https://squoosh.app) y renómbralo exactamente como se indica.

---

## 1. Producto — 6 imágenes de la colección (prioridad ALTA)

| Archivo | Sección donde aparece |
|---|---|
| `public/images/masks/classic-red.webp` | Mask Collection (portada), tienda, ficha de producto, carrito |
| `public/images/masks/black-symbiote.webp` | ídem |
| `public/images/masks/iron-edition.webp` | ídem |
| `public/images/masks/future-vision.webp` | ídem |
| `public/images/masks/stealth-edition.webp` | ídem |
| `public/images/masks/custom-series.webp` | ídem |

- **Dimensiones:** 1600 × 2000 px — **proporción 4:5 vertical**.
- **Composición:** máscara centrada, girada ~20° hacia la izquierda (vista 3/4), ocupando el 65 % del alto; aire alrededor; fondo negro uniforme para fundirse con el marco oscuro de la web.

**Prompt base** (sustituye `[VARIANTE]` por el bloque de cada modelo):

```
Ultra-realistic studio product photograph of a full-head superhero mask with a spider-web pattern, displayed on an invisible stand, three-quarter view turned slightly to the left, vertical 4:5 composition, mask centered and filling about 65% of the frame height. [VARIANTE] Large angular white eye lenses with thick black raised frames, the outer tip of each lens rising toward the temple. Raised web lines radiating from between the eyes and wrapping around the head. Pitch-black seamless background, cinematic low-key lighting: soft cool key light from top-left, strong crimson red rim lights from both sides behind the mask, subtle red ambient glow, crisp white specular highlights. Luxury collectible presentation, macro-level material detail, sharp focus, 85mm lens, f/8, no text, no logo, no watermark, no people.
```

Bloques `[VARIANTE]`:

- **classic-red:** `Deep crimson red fabric-textured mask with fine woven grain, dark near-black raised web lines.`
- **black-symbiote:** `Glossy liquid-black lacquered mask with mirror-like reflections, extra-large white lenses, an almost invisible dark-grey web pattern only revealed where light grazes the surface.`
- **iron-edition:** `Metallic candy-red armored mask with brushed-metal finish, raised polished silver web ridges, gunmetal grey lens frames, faint white glow inside the lenses.`
- **future-vision:** `Dark graphite technical mask whose web lines are thin glowing red light strips like a circuit, softly glowing red-white lenses, red light bloom on the surface.`
- **stealth-edition:** `Matte absolute-black mask with charcoal-grey web lines, smoked dark-grey half-closed narrowed lenses with a thin glowing red edge.`
- **custom-series:** `Pearl white mask with crimson red raised web lines and crimson lens frames, glossy black lenses, premium configurable edition look.`

---

## 2. Hero — póster de respaldo (prioridad MEDIA)

- **Archivo:** `public/images/hero/hero-poster.webp`
- **Sección:** pantalla inicial. Solo se muestra si el navegador **no** admite WebGL (en el resto de casos se ve la máscara 3D en tiempo real).
- **Dimensiones:** 2560 × 1440 px — **16:9 horizontal**.
- **Composición:** máscara frontal centrada, mirando a cámara, que ocupe ~60 % del alto; laterales oscuros y vacíos (ahí la web superpone el título gigante y los textos).

```
Cinematic front-facing hero shot of a red full-head superhero mask with a raised dark spider-web pattern and large angular white lenses with thick black frames, perfectly centered and looking straight at the camera, horizontal 16:9 frame, mask filling 60% of the height, wide empty pitch-black space on both sides. Dramatic low-key lighting, intense crimson red rim light outlining the silhouette, red volumetric haze behind the head, tiny floating dust particles lit in red, glossy white reflections on the lenses. Futuristic luxury film poster mood, ultra-detailed, no text, no logo, no watermark.
```

## 3. Imagen para redes sociales (prioridad BAJA)

- **Archivo:** `public/images/hero/og-image.jpg` (JPG, no WebP: algunas redes no leen WebP).
- **Uso:** vista previa al compartir el enlace (Open Graph).
- **Dimensiones:** 1200 × 630 px (1.91:1). Máscara a la derecha, mitad izquierda negra vacía.

```
Wide 1200x630 banner, red full-head superhero mask with raised dark spider-web pattern and white angular lenses placed on the right third, facing slightly left, left half pure black empty space, crimson rim lighting and red haze, premium cinematic product shot, no text, no logo.
```

---

## 4. The Details — 6 primeros planos (prioridad MEDIA)

Se muestran dentro de cada capítulo de la sección *The Details*, junto al visor 3D macro.

- **Dimensiones:** 1600 × 1000 px — **16:10 horizontal**.

| Archivo | Capítulo | Prompt |
|---|---|---|
| `public/images/details/eyes.webp` | Los ojos | `Extreme macro close-up of one large angular white eye lens of a red superhero mask, thick black raised lens frame, micro-perforated lens surface catching a sharp white highlight, red fabric with raised dark web lines around it, shallow depth of field, black background, crimson rim light, cinematic, 16:10, no text.` |
| `public/images/details/web-pattern.webp` | La red | `Macro photograph of a red mask surface showing raised dark spider-web lines converging between the eyes, curved web rings sagging between radial lines, grazing light from the side revealing the relief, deep shadows, red ambient glow, 16:10, no text.` |
| `public/images/details/textures.webp` | Texturas | `Extreme macro of deep red woven technical fabric with fine grain and a single raised black web ridge crossing diagonally, raking light revealing every fiber, dark moody background, 16:10, no text.` |
| `public/images/details/materials.webp` | Materiales | `Side-by-side macro of three material swatches shaped like mask fragments: matte red fabric, glossy black lacquer and brushed metallic red with silver ridges, arranged on black velvet, red rim lighting, luxury studio photography, 16:10, no text.` |
| `public/images/details/reflections.webp` | Reflejos | `Glossy liquid-black superhero mask in profile with mirror-like reflections of thin red and white light strips sweeping across the curved surface, faint dark web pattern, pitch black background, high-contrast cinematic lighting, 16:10, no text.` |
| `public/images/details/tech.webp` | Tecnología | `Close-up of a dark graphite futuristic mask with glowing red light lines forming a spider-web circuit, narrowed glowing lenses, soft red bloom and haze, sci-fi product shot, black background, 16:10, no text.` |

---

## 5. Fondo de la tienda (prioridad BAJA)

- **Archivo:** `public/images/backgrounds/store-backdrop.webp`
- **Sección:** cabecera de `/shop` (se muestra al 40 % de opacidad bajo el título "THE STORE").
- **Dimensiones:** 2400 × 1200 px (2:1).

```
Dark luxury showroom interior with a row of illuminated display pedestals holding red masks seen far in the background, heavy black shadows, crimson red light strips on the ceiling and floor reflections, haze, extremely low-key cinematic atmosphere, mostly black image with red accents, wide 2:1, no text, no logo.
```

---

## Resumen de rutas

```
public/
├─ images/
│  ├─ hero/          hero-poster.webp · og-image.jpg
│  ├─ masks/         classic-red.webp · black-symbiote.webp · iron-edition.webp
│  │                 future-vision.webp · stealth-edition.webp · custom-series.webp
│  ├─ details/       eyes.webp · web-pattern.webp · textures.webp
│  │                 materials.webp · reflections.webp · tech.webp
│  ├─ backgrounds/   store-backdrop.webp
│  └─ renders/       (ya incluidos: renders del modelo 3D usados como respaldo)
└─ models/           (opcional) <modelo>.glb — ver README, sección "Modelos 3D"
```

Las imágenes de producto también se pueden subir desde el **panel de administración** (Productos → editar → Imágenes); en ese caso no hace falta copiarlas a `public/`.
