# Enssamble Melaminas HD (1536x3310 px) — Guía para SketchUp y Three.js

## 1. Qué incluye esta actualización
- **Super-Resolución 2x (4x píxeles totales)**: Las 153 texturas pasaron de `768×1655` px (con compresión JPEG 8×8 borrosa) a **`1536×3310` px** con submuestreo de color 4:4:4 (`subsampling=0`), preservando exactamente las dimensiones físicas (`xScale` y `yScale`) y el tono original de cada tablero FAPLAC y EGGER.
- **Eliminación de bordes defectuosos de catálogo**: Se repararon automáticamente las líneas de borde superior/inferior/lateral presentes en 52 texturas originales que generaban costuras visibles al repetir el material.
- **Reconstrucción de Micro-Relieve por Familia de Acabado**:
  - **Maderas (`001`–`066`)**: Poro profundo (`WTX`, `ST22`, `ST37` Halifax, `ST40` Casella) y poro natural (`NAT`, `ST10`, `ST12`, `ST19`, `MES`, `NOR`, `IMP`, `BAR`) con traqueidas y cavidades de veta nítidas al hacer zoom.
  - **Unicolores Texturados (`067`–`124`)**: Recreación del micro-poro real según acabado (`ST14`/`TXT` cáscara de naranja/texturado, `ST19`/`MES` poro madera sobre color liso, `ST20` micro-cepillado, `DMT`/`IMP` relieve étnico/diamante, `ST9`/`PM`/`TAC` mate sedoso, y `PG`/`Gloss` alto brillo).
  - **Textiles / Hilados (`125`–`137`)**: Trama y urdimbre tejida de alta definición para Lino, Textil, Yute y Seda.
  - **Piedras y Hormigones (`138`–`149`)**: Micro-granulometría mineral y cavidades pétreas (Travertino, Hormigón Chicago, Pietra Grigia, Chromix, Urban Concept).
  - **Metales (`063`, `150`–`153`)**: Líneas continuas de cepillado metálico anisotrópico sin bloques JPEG.

## 2. Cómo usar en SketchUp
1. Extrae la carpeta `Enssamble Melaminas` (con los 153 archivos `.skm` y `.enssamble_v11_synced`) en tu carpeta de materiales de SketchUp / Enssamble.
2. En SketchUp, ve a **Preferencias > OpenGL** y activa **"Usar tamaño máximo de textura" (Use maximum texture size)** para que el visor de SketchUp muestre la resolución completa al hacer zoom.
3. Al exportar tu modelo a `.glb` / `.gltf` para Three.js, las texturas exportadas ya irán en alta resolución (`1536×3310` px) con el micro-relieve integrado.

## 3. Cómo activar el relieve PBR en Three.js
Copia la carpeta `ThreeJS_PBR_Relieve` a tu proyecto web e importa el helper incluido:

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { aplicarRelieveMelaminasThreeJS } from './ThreeJS_PBR_Relieve/threejs_melaminas_pbr.js';

const loader = new GLTFLoader();
loader.load('mueble_sketchup.glb', async (gltf) => {
  await aplicarRelieveMelaminasThreeJS(gltf.scene, renderer, './ThreeJS_PBR_Relieve');
  scene.add(gltf.scene);
});
```
