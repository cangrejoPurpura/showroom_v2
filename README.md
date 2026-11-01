# sebasCocina 3D — Visor Interactivo Three.js con Relieve PBR

Repositorio listo para publicar en **GitHub** y **GitHub Pages** con el modelo `sebasCocina.skp` y sus melaminas mejoradas en alta definición (`1536×3310` px) con mapas de relieve PBR.

## Características incluidas
- **Modelo 3D exacto de `sebasCocina.skp`**: 38 piezas con dimensiones milimétricas reales (`1906 × 900 × 600 mm`), frentes en **FAPLAC `012_Camellia` (`140BAR Camellia`)** con orientación de veta real (horizontal en los 3 frentes de cajón y vertical en las puertas), mesada en **FAPLAC `148_Amberes` (`058DMT Amberes`)**, estructura interior en **FAPLAC `064_Sauco` (`212BAR Sauco`)**, cajones interiores en **`W954 Blanco`** y banquina/zócalo en **`F638 ST10 Chromix plata`**.
- **Ambientación Arquitectónica**:
  - Habitación con paredes en tono **Greige mate** y zócalo perimetral.
  - Piso **Porcelanato Calacatta 120×60 cm** con proporción física real (`1.20 m × 0.60 m` por placa), vetas minerales y juntas biseladas con mapa normal.
- **Iluminación Neutra 5500K + Spots sobre Bajo Mesada**:
  - Iluminación ambiental balanceada a **5500K** (`#FFFDF8`).
  - **3 luminarias spot cenitales** dirigidas sobre los módulos del Bajo Mesada con sombras suaves (`PCFSoftShadowMap`).
- **Interactividad y Navegación**:
  - **Puntos concéntricos (`◎`)** sobre cada uno de los **5 elementos que se abren** (Puerta Izquierda, Puerta Derecha, Cajón Superior, Cajón Intermedio y Cajón Olla Inferior).
  - **Engranaje en la esquina superior derecha (`⚙️`)** para mostrar u ocultar la GUI de configuración.
  - **Caminata en primera persona**: Teclas `W`, `A`, `S`, `D` y flechas direccionales (`↑`, `←`, `↓`, `→`).
  - **Giro 360°**: Manteniendo presionada la **ruedita del mouse** (botón central) y arrastrando.
  - **Zoom**: Ruedita del mouse hacia arriba y hacia abajo (permite acercarse al milímetro para inspeccionar el poro y relieve de las texturas).

## Cómo publicar en GitHub Pages
1. Sube todos los archivos de esta carpeta a la raíz de tu repositorio en GitHub.
2. En tu repositorio de GitHub, ve a **Settings > Pages**.
3. En **Build and deployment > Branch**, selecciona `main` (o `master`) y carpeta `/ (root)`, y haz clic en **Save**.
4. Tu visor 3D quedará publicado en `https://<tu-usuario>.github.io/<tu-repositorio>/`.
