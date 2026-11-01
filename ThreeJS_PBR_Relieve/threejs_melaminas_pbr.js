/**
 * Enssamble Melaminas HD - Integración automática de Relieve PBR en Three.js
 * Diseñado para modelos exportados desde SketchUp (.glb / .gltf / .obj / .dae)
 */
import * as THREE from 'three';

export async function aplicarRelieveMelaminasThreeJS(rootObject3D, renderer, pbrBaseUrl = './ThreeJS_PBR_Relieve') {
  const res = await fetch(`${pbrBaseUrl}/catalogo_153_materiales_pbr.json`);
  const catalogo = await res.json();
  const loader = new THREE.TextureLoader();
  const maxAnisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 16;
  const cacheMapas = {};

  function cargarMapa(filename, isLinear = true) {
    if (!cacheMapas[filename]) {
      const tex = loader.load(`${pbrBaseUrl}/${filename}`);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = maxAnisotropy;
      if (isLinear && 'NoColorSpace' in THREE) {
        tex.colorSpace = THREE.NoColorSpace;
      }
      cacheMapas[filename] = tex;
    }
    return cacheMapas[filename];
  }

  // Crear índice rápido por nombre limpio y archivo
  const indice = {};
  for (const [matName, meta] of Object.entries(catalogo)) {
    indice[matName.toLowerCase()] = meta;
    const stem = meta.skm_file.replace('.skm', '').toLowerCase();
    indice[stem] = meta;
    const shortName = stem.split('_').slice(1).join('_').toLowerCase();
    if (shortName) indice[shortName] = meta;
  }

  rootObject3D.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const materiales = Array.isArray(node.material) ? node.material : [node.material];

    materiales.forEach((mat) => {
      if (mat.map) {
        mat.map.anisotropy = maxAnisotropy;
        mat.map.wrapS = THREE.RepeatWrapping;
        mat.map.wrapT = THREE.RepeatWrapping;
        if ('SRGBColorSpace' in THREE) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
        }
        mat.map.needsUpdate = true;
      }

      const rawName = (mat.name || '').toLowerCase().trim();
      let meta = indice[rawName];
      if (!meta) {
        for (const [key, val] of Object.entries(indice)) {
          if (rawName.includes(key) || key.includes(rawName)) {
            meta = val;
            break;
          }
        }
      }

      // Valores por defecto si el nombre fue renombrado en SketchUp
      const normalFile = meta ? meta.normal_map : 'normal_wood_fine.jpg';
      const roughFile = meta ? meta.roughness_map : 'roughness_wood_fine.jpg';
      const nScale = meta ? meta.normalScale : 0.65;
      const roughness = meta ? meta.roughness : 0.60;
      const metalness = meta ? meta.metalness : 0.0;

      if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
        mat.normalMap = cargarMapa(normalFile, true);
        mat.normalScale = new THREE.Vector2(nScale, nScale);
        mat.roughnessMap = cargarMapa(roughFile, true);
        mat.roughness = roughness;
        mat.metalness = metalness;
        if (mat.map) {
          // Usar el mismo mapa de alta definición como bumpMap sutil adicional para las vetas macro
          mat.bumpMap = mat.map;
          mat.bumpScale = meta ? meta.bumpScale : 0.008;
        }
        mat.needsUpdate = true;
      }
    });
  });
}
