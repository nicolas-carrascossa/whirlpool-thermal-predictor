/**
 * Enquadramento automático (Fase 1d, etapa A).
 *
 * `cameraPlacement` é **pura** (só números): dado o centro e o tamanho de uma
 * caixa, a abertura da câmera e a direção desejada, devolve onde a câmera
 * precisa estar para que a caixa inteira caiba na tela com uma margem.
 * `fitCameraToObject` é o invólucro que aplica isso a uma câmera three.js.
 *
 * Convenção de direção:
 * - `azimuthDeg` = 0 olha de frente (+Z); cresce girando para a direita (+X).
 * - `elevationDeg` = 0 olha na horizontal; cresce subindo (+Y).
 */

import * as THREE from 'three'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface FitOptions {
  /** Folga em volta da caixa: 1 = caixa encostando nas bordas. */
  margin?: number
  azimuthDeg?: number
  elevationDeg?: number
  /** Abertura vertical da câmera, em graus. */
  fovDeg?: number
  /** Largura / altura do viewport. */
  aspect?: number
}

export interface CameraPlacement {
  position: [number, number, number]
  target: [number, number, number]
  distance: number
}

export const DEFAULT_FIT: Required<Omit<FitOptions, 'azimuthDeg' | 'elevationDeg'>> = {
  margin: 1.15,
  fovDeg: 38,
  aspect: 4 / 3,
}

/** Vista padrão: isométrica ¾ frontal-direita, um pouco acima. */
export const DEFAULT_AZIMUTH_DEG = 35
export const DEFAULT_ELEVATION_DEG = 22

const DEG = Math.PI / 180

/**
 * Distância mínima para que uma esfera de raio `radius` caiba na tela.
 * Considera a abertura vertical **e** a horizontal (derivada do `aspect`) e
 * usa a mais restritiva — é o que garante que um fogão largo caiba num card
 * estreito.
 */
export function fitDistanceForRadius(
  radius: number,
  { margin = DEFAULT_FIT.margin, fovDeg = DEFAULT_FIT.fovDeg, aspect = DEFAULT_FIT.aspect }: FitOptions = {},
): number {
  const vHalf = (fovDeg * DEG) / 2
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(0.05, aspect))
  const half = Math.min(vHalf, hHalf)
  return (radius * Math.max(1, margin)) / Math.sin(half)
}

/** Vetor unitário da direção câmera → alvo invertida (de onde a câmera olha). */
export function directionFromAngles(azimuthDeg: number, elevationDeg: number): [number, number, number] {
  const az = azimuthDeg * DEG
  const el = elevationDeg * DEG
  const cosEl = Math.cos(el)
  return [Math.sin(az) * cosEl, Math.sin(el), Math.cos(az) * cosEl]
}

/** Meia-diagonal da caixa (raio da esfera que a envolve). */
export function boundingRadius(size: Vec3): number {
  return Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z) / 2
}

/**
 * Posição e alvo da câmera para enquadrar a caixa `center`/`size`.
 * Função pura — é ela que os testes exercitam.
 */
export function cameraPlacement(center: Vec3, size: Vec3, options: FitOptions = {}): CameraPlacement {
  const {
    azimuthDeg = DEFAULT_AZIMUTH_DEG,
    elevationDeg = DEFAULT_ELEVATION_DEG,
    margin = DEFAULT_FIT.margin,
    fovDeg = DEFAULT_FIT.fovDeg,
    aspect = DEFAULT_FIT.aspect,
  } = options

  const distance = fitDistanceForRadius(boundingRadius(size), { margin, fovDeg, aspect })
  const [dx, dy, dz] = directionFromAngles(azimuthDeg, elevationDeg)

  return {
    position: [center.x + dx * distance, center.y + dy * distance, center.z + dz * distance],
    target: [center.x, center.y, center.z],
    distance,
  }
}

/** Caixa (min/max em arrays) → `cameraPlacement`, sem depender de three.js. */
export function cameraPlacementForBounds(
  min: [number, number, number],
  max: [number, number, number],
  options: FitOptions = {},
): CameraPlacement {
  const center = { x: (min[0] + max[0]) / 2, y: (min[1] + max[1]) / 2, z: (min[2] + max[2]) / 2 }
  const size = { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] }
  return cameraPlacement(center, size, options)
}

interface ControlsLike {
  target: THREE.Vector3
  update: () => void
}

/**
 * Aplica o enquadramento a uma câmera three.js de verdade. Quando `controls`
 * é informado, o alvo do OrbitControls acompanha o centro da caixa.
 * Devolve o `CameraPlacement` usado (útil para animar em vez de saltar).
 */
export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: ControlsLike | null | undefined,
  box: THREE.Box3,
  options: FitOptions = {},
): CameraPlacement {
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  box.getCenter(center)
  box.getSize(size)

  const placement = cameraPlacement(center, size, {
    fovDeg: camera.fov,
    aspect: camera.aspect,
    ...options,
  })

  camera.position.set(...placement.position)
  camera.lookAt(center)
  camera.updateProjectionMatrix()
  if (controls) {
    controls.target.copy(center)
    controls.update()
  }
  return placement
}
