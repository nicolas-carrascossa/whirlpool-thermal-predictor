/** Textura CFD discreta aplicada somente às superfícies de cada área medida. */
import * as THREE from 'three'

export const CFD_PROGRAM_KEY = 'thermal-cfd-zone-v2'

const VERTEX_HEADER = 'varying vec3 vCfdWorldPosition;\n'
const VERTEX_WORLD_POSITION = `
#include <worldpos_vertex>
vCfdWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
`

const FRAGMENT_HEADER = `
varying vec3 vCfdWorldPosition;

float cfdHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float cfdNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(cfdHash(i), cfdHash(i + vec3(1, 0, 0)), f.x),
        mix(cfdHash(i + vec3(0, 1, 0)), cfdHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(cfdHash(i + vec3(0, 0, 1)), cfdHash(i + vec3(1, 0, 1)), f.x),
        mix(cfdHash(i + vec3(0, 1, 1)), cfdHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

float cfdField(vec3 p) {
  float broad = cfdNoise(p * 0.20);
  float medium = cfdNoise(p * 0.47 + vec3(3.7, 1.2, 6.1));
  float fine = cfdNoise(p * 1.05 + vec3(7.4, 4.2, 2.8));
  return broad * 0.58 + medium * 0.29 + fine * 0.13;
}
`

const COLOR_FRAGMENT = `
#include <color_fragment>
// A cor base vem da temperatura média real da área. Este campo só varia
// discretamente o brilho, sem deslocar a leitura para outra faixa de calor.
float cfdTexture = cfdField(vCfdWorldPosition);
float cfdShade = mix(0.94, 1.045, cfdTexture);
diffuseColor.rgb *= cfdShade;
`

/** A textura CFD só é usada nos meshes de zona, nunca no corpo inteiro. */
export function configureCfdHeatmap(material: THREE.MeshStandardMaterial, enabled: boolean): void {
  material.onBeforeCompile = enabled
    ? (shader) => {
        shader.vertexShader =
          VERTEX_HEADER + shader.vertexShader.replace('#include <worldpos_vertex>', VERTEX_WORLD_POSITION)
        shader.fragmentShader =
          FRAGMENT_HEADER + shader.fragmentShader.replace('#include <color_fragment>', COLOR_FRAGMENT)
      }
    : () => {}
  material.customProgramCacheKey = () => (enabled ? CFD_PROGRAM_KEY : 'standard')
  material.needsUpdate = true
}
