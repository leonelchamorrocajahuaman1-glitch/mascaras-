# Imágenes para SPIDER MASKS — qué generar con ChatGPT y dónde colocarlas

> **Importante:** ninguna de estas imágenes ha sido generada todavía. La web funciona sin ellas:
> mientras no existan, cada hueco muestra **renders reales del modelo 3D procedural**
> (`public/images/renders/`) o el propio visor 3D. En cuanto copies un archivo con el nombre
> exacto indicado, la web lo detecta y lo usa automáticamente (no hay que tocar código).

## Reglas comunes para todas las imágenes

- **Formato de entrega:** WebP (o JPG/PNG convertidos a WebP). Calidad 80–85.
- **Peso orientativo:** < 400 KB por imagen (las de producto < 300 KB).
- **Estética:** fondo negro profundo, iluminación roja ambiental, contraluz rojo, reflejos blancos, gris metálico. Nada de fondos claros ni escenas genéricas.
- **Coherencia con el modelo 3D (diseño original SPIDER MASKS):** máscara de cabeza completa con **placas celulares irregulares en relieve** y una cresta central que nace en la frente, y un **visor de seis ojos**: dos ranuras finas y afiladas que suben hacia las sienes, con marco oscuro, y dos pequeñas lentes redondas encima de cada ranura.
- **Diseño propio, no un personaje:** no pidas máscaras de personajes existentes ni patrones de telaraña de cómics; usa siempre esta descripción original para que las imágenes coincidan con el modelo 3D y no reproduzcan propiedad intelectual de terceros.
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
Ultra-realistic studio product photograph of an original futuristic full-head mask, displayed on an invisible stand, three-quarter view turned slightly to the left, vertical 4:5 composition, mask centered and filling about 65% of the frame height. [VARIANTE] An arachnid-inspired visor with six eyes: two thin, sharp, glowing slit lenses angled upward toward the temples with dark raised frames, and two small round lenses above each slit. The surface is covered in irregular raised cellular armor plates, with a single central crest running from the forehead over the top of the head. Pitch-black seamless background, cinematic low-key lighting: soft cool key light from top-left, strong crimson red rim lights from both sides behind the mask, subtle red ambient glow, crisp white specular highlights. Luxury collectible presentation, macro-level material detail, sharp focus, 85mm lens, f/8, no text, no logo, no watermark, no people.
```

Bloques `[VARIANTE]`:

- **classic-red:** `Deep crimson red mask with fine woven grain, dark near-black raised plate borders, white slit lenses.`
- **black-symbiote:** `Glossy liquid-black lacquered mask with mirror-like reflections, wider white slit lenses, almost invisible dark-grey plate borders only revealed where light grazes the surface.`
- **iron-edition:** `Metallic candy-red armored mask with brushed-metal finish, raised polished silver plate ridges, gunmetal grey lens frames, faint white glow inside the lenses.`
- **future-vision:** `Dark graphite technical mask whose plate borders are thin glowing red light seams like a circuit, softly glowing red-white lenses, red light bloom on the surface.`
- **stealth-edition:** `Matte absolute-black mask with charcoal-grey plate borders, smoked dark-grey half-closed slit lenses with a thin glowing red edge.`
- **custom-series:** `Pearl white mask with crimson red raised plate borders and crimson lens frames, glossy black lenses, premium configurable edition look.`

---

## 2. Hero — póster de respaldo (prioridad MEDIA)

- **Archivo:** `public/images/hero/hero-poster.webp`
- **Sección:** pantalla inicial. Solo se muestra si el navegador **no** admite WebGL (en el resto de casos se ve la máscara 3D en tiempo real).
- **Dimensiones:** 2560 × 1440 px — **16:9 horizontal**.
- **Composición:** máscara frontal centrada, mirando a cámara, que ocupe ~60 % del alto; laterales oscuros y vacíos (ahí la web superpone el título gigante y los textos).

```
Cinematic front-facing hero shot of an original red full-head futuristic mask with raised dark cellular armor plates, a central forehead crest and a six-eyed visor (two thin glowing slit lenses angled upward plus two small round lenses above each), perfectly centered and looking straight at the camera, horizontal 16:9 frame, mask filling 60% of the height, wide empty pitch-black space on both sides. Dramatic low-key lighting, intense crimson red rim light outlining the silhouette, red volumetric haze behind the head, tiny floating dust particles lit in red, glossy white reflections on the lenses. Futuristic luxury film poster mood, ultra-detailed, no text, no logo, no watermark.
```

## 3. Imagen para redes sociales (prioridad BAJA)

- **Archivo:** `public/images/hero/og-image.jpg` (JPG, no WebP: algunas redes no leen WebP).
- **Uso:** vista previa al compartir el enlace (Open Graph).
- **Dimensiones:** 1200 × 630 px (1.91:1). Máscara a la derecha, mitad izquierda negra vacía.

```
Wide 1200x630 banner, original red full-head futuristic mask with raised dark cellular plates and a six-eyed slit visor placed on the right third, facing slightly left, left half pure black empty space, crimson rim lighting and red haze, premium cinematic product shot, no text, no logo.
```

---

## 4. The Details — 6 primeros planos (prioridad MEDIA)

Se muestran dentro de cada capítulo de la sección *The Details*, junto al visor 3D macro.

- **Dimensiones:** 1600 × 1000 px — **16:10 horizontal**.

| Archivo | Capítulo | Prompt |
|---|---|---|
| `public/images/details/eyes.webp` | Los ojos | `Extreme macro close-up of one thin glowing slit lens and the two small round lenses above it on an original red futuristic mask, dark raised lens frames, micro-perforated lens surface catching a sharp white highlight, red surface with raised dark plate borders around it, shallow depth of field, black background, crimson rim light, cinematic, 16:10, no text.` |
| `public/images/details/web-pattern.webp` | Las placas | `Macro photograph of a red mask surface covered in irregular raised cellular armor plates with a central crest running over the forehead, grazing light from the side revealing the relief, deep shadows, red ambient glow, 16:10, no text.` |
| `public/images/details/textures.webp` | Texturas | `Extreme macro of deep red woven technical fabric with fine grain and a single raised black plate border crossing diagonally, raking light revealing every fiber, dark moody background, 16:10, no text.` |
| `public/images/details/materials.webp` | Materiales | `Side-by-side macro of three material swatches shaped like mask fragments: matte red fabric, glossy black lacquer and brushed metallic red with silver ridges, arranged on black velvet, red rim lighting, luxury studio photography, 16:10, no text.` |
| `public/images/details/reflections.webp` | Reflejos | `Glossy liquid-black futuristic mask in profile with mirror-like reflections of thin red and white light strips sweeping across the curved surface, faint dark cellular plate pattern, pitch black background, high-contrast cinematic lighting, 16:10, no text.` |
| `public/images/details/tech.webp` | Tecnología | `Close-up of a dark graphite futuristic mask with glowing red light seams between cellular plates like a circuit, narrowed glowing slit lenses, soft red bloom and haze, sci-fi product shot, black background, 16:10, no text.` |

---

## 5. Fondo de la tienda (prioridad BAJA)

- **Archivo:** `public/images/backgrounds/store-backdrop.webp`
- **Sección:** cabecera de `/shop` (se muestra al 40 % de opacidad bajo el título "THE STORE").
- **Dimensiones:** 2400 × 1200 px (2:1).

```
Dark luxury showroom interior with a row of illuminated display pedestals holding red futuristic masks seen far in the background, heavy black shadows, crimson red light strips on the ceiling and floor reflections, haze, extremely low-key cinematic atmosphere, mostly black image with red accents, wide 2:1, no text, no logo.
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
