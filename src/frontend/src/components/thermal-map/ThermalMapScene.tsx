import { ContactShadows, OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import type { SensorPrediction, StoveConfig } from '@/contract/v1'

import type { ZoneAggregate } from './aggregate'
import { cutZForDepth, DEFAULT_CUT_DEPTH } from './cutPlane'
import { framingBoundsFor } from './explode'
import { ExplodeLayer } from './ExplodeLayer'
import { cameraPlacementForBounds, type CameraPlacement, type FitOptions } from './fitCamera'
import { C } from './materials'
import { OrientationMarkers, PartChangeCallout } from './SceneAnnotations'
import { CoolingDuctTrim } from './CoolingDuctTrim'
import { VentBayParts } from './MainVentParts'
import { Blower } from './parts/Blower'
import { CoilSupport } from './parts/CoilSupport'
import { ControlBoard } from './parts/ControlBoard'
import { DeflectorPlate } from './parts/DeflectorPlate'
import { HousingLid } from './parts/HousingLid'
import { OvenGlow } from './parts/OvenGlow'
import { partStateFromConfig, type PartId } from './parts'
import { SensorPins, type SensorPin } from './SensorPins'
import { StoveProvider, type OpeningState, type StoveView } from './StoveContext'
import { FLOOR_Y, StoveBody } from './StoveBody'
import { ZoneCallout } from './ZoneCallout'
import type { ZoneStatus } from './zoneStatus'
import {
  BAY_ZONE_KEYS,
  CONSOLE_BOUNDS,
  REAR_ZONE_KEYS,
  STOVE_BOUNDS,
  TOP_ZONE_KEYS,
  ZONE_MESHES,
  type Bounds,
} from './zoneGeometry'
import { ZoneMesh } from './ZoneMesh'

export type CameraPreset = 'front' | 'back' | 'console' | 'iso'

/**
 * Caixa usada para enquadrar (Fase 1d, etapa A). É a do fogão fechado
 * **acrescida** do espaço que as aberturas ocupam (cooktop levantado, porta
 * do forno abaixada): assim o enquadramento não salta a cada toggle e o fogão
 * inteiro — pés e faixa do console incluídos — cabe com folga.
 */
export const FRAMING_BOUNDS: Bounds = {
  min: [STOVE_BOUNDS.min[0], STOVE_BOUNDS.min[1], STOVE_BOUNDS.min[2]],
  max: [STOVE_BOUNDS.max[0], STOVE_BOUNDS.max[1] + 6, STOVE_BOUNDS.max[2] + 6],
}

/**
 * Cada preset é uma direção + a caixa a enquadrar; a distância vem do
 * fit-to-view, nunca de uma posição fixa (era daí que vinha a câmera fechada
 * demais da 1c).
 */
export const CAMERA_PRESETS: Record<
  CameraPreset,
  { azimuthDeg: number; elevationDeg: number; bounds: Bounds; margin: number }
> = {
  // a margem maior que 1,15 abre espaço para os callouts em volta do fogão
  front: { azimuthDeg: 0, elevationDeg: 12, bounds: FRAMING_BOUNDS, margin: 1.28 },
  back: { azimuthDeg: 180, elevationDeg: 16, bounds: FRAMING_BOUNDS, margin: 1.28 },
  console: { azimuthDeg: 18, elevationDeg: 38, bounds: CONSOLE_BOUNDS, margin: 1.45 },
  iso: { azimuthDeg: 35, elevationDeg: 22, bounds: FRAMING_BOUNDS, margin: 1.28 },
}

/** A margem dos presets é uma esfera folgada; no enquadramento justo ela encolhe a ~1,0. */
const TIGHT_MARGIN_SCALE = 0.78

export interface ZoneLabelDatum {
  zoneKey: string
  label: string
  value: string
  status: ZoneStatus
}

interface ThermalMapSceneProps {
  colorFor: (zoneKey: string) => string
  isZoneActive: (zoneKey: string) => boolean
  onHoverZone: (key: string) => void
  onUnhoverZone: (key: string) => void
  onClickZone: (key: string) => void
  tooltipFor: (zoneKey: string) => React.ReactNode
  view: StoveView
  cutDepth: number
  /** Afastamento das camadas na vista explodida, 0–100 %. */
  explodeAmount: number
  config: StoveConfig
  openings: OpeningState
  highlightPart: PartId | null
  onHoverPart: (partId: PartId | null) => void
  autoRotate: boolean
  reducedMotion: boolean
  cameraPreset: CameraPreset
  /** Muda para forçar o reenquadramento no preset atual ("Recentralizar"). */
  recenterToken: number
  /** Rótulos de zona visíveis (já filtrados por "Alertas / Todos / Nenhum"). */
  zoneLabels: ZoneLabelDatum[]
  /** Exibe os textos auxiliares da cena quando o usuário habilita os rótulos. */
  showAnnotations: boolean
  selectedKeyArea: string | null
  sensorPins: SensorPin[]
  onSelectSensor?: (tcNumber: number) => void
  /**
   * Largura (px) coberta por um painel sobre a borda direita do canvas. O
   * centro óptico é deslocado para o meio da área livre, e o enquadramento
   * usa só essa área: o fogão não fica atrás do painel.
   */
  rightInset?: number
  /** Enquadramento justo: o fogão preenche a área livre (sem folga para callouts). */
  tightFraming?: boolean
}

interface ControlsLike {
  target: THREE.Vector3
  update: () => void
}

/** Enquadramento do preset atual para o tamanho de viewport corrente. */
function placementFor(
  preset: CameraPreset,
  camera: THREE.PerspectiveCamera,
  explodeAmount: number,
  aspect: number,
  tight: boolean,
): CameraPlacement {
  const p = CAMERA_PRESETS[preset]
  const options: FitOptions = {
    azimuthDeg: p.azimuthDeg,
    elevationDeg: p.elevationDeg,
    margin: tight ? Math.max(1, p.margin * TIGHT_MARGIN_SCALE) : p.margin,
    fovDeg: camera.fov,
    aspect,
  }
  const bounds = framingBoundsFor(p.bounds, explodeAmount)
  return cameraPlacementForBounds(bounds.min, bounds.max, options)
}

/**
 * Fit-to-view: enquadra na montagem, a cada preset, a cada "Recentralizar" e
 * a cada mudança de tamanho do contêiner. O usuário interrompe ao interagir.
 */
function CameraRig({
  preset,
  recenterToken,
  interrupted,
  explodeAmount,
  rightInset,
  tight,
}: {
  preset: CameraPreset
  recenterToken: number
  interrupted: boolean
  /** Afastamento efetivo da vista explodida (0 quando desligada). */
  explodeAmount: number
  rightInset: number
  tight: boolean
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null
  const size = useThree((s) => s.size)
  const wantPos = useRef(new THREE.Vector3())
  const wantTarget = useRef(new THREE.Vector3())
  const animating = useRef(true)
  const first = useRef(true)
  // Lido na hora do enquadramento, sem entrar nas dependências: arrastar o
  // slider não deve reenquadrar a cada tick — só preset/recentralizar/resize.
  const explodeRef = useRef(explodeAmount)
  useEffect(() => {
    explodeRef.current = explodeAmount
  }, [explodeAmount])

  // Desloca a projeção em vez de mover a câmera: a órbita continua em torno
  // do fogão, só a imagem é empurrada para a área livre.
  const inset = Math.min(Math.max(rightInset, 0), size.width * 0.6)
  useEffect(() => {
    if (inset > 0) camera.setViewOffset(size.width, size.height, inset / 2, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }, [camera, inset, size.width, size.height])

  useEffect(() => {
    const freeAspect = (size.width - inset) / Math.max(size.height, 1)
    const placement = placementFor(preset, camera, explodeRef.current, freeAspect, tight)
    wantPos.current.set(...placement.position)
    wantTarget.current.set(...placement.target)
    animating.current = true
    // na primeira montagem e ao redimensionar, salta direto (sem animação):
    // o card não deve "voar" enquanto o layout se acomoda
    if (first.current) {
      first.current = false
      camera.position.copy(wantPos.current)
      camera.lookAt(wantTarget.current)
      camera.updateProjectionMatrix()
      if (controls) {
        controls.target.copy(wantTarget.current)
        controls.update()
      }
      animating.current = false
    }
  }, [preset, recenterToken, camera, controls, size.width, size.height, inset, tight])

  useFrame((_, delta) => {
    if (interrupted) animating.current = false
    if (!animating.current) return
    const f = 1 - Math.exp(-6 * Math.min(delta, 0.1))
    camera.position.lerp(wantPos.current, f)
    if (controls) {
      controls.target.lerp(wantTarget.current, f)
      controls.update()
    }
    if (camera.position.distanceTo(wantPos.current) < 0.05) animating.current = false
  })

  return null
}

function ClippingSetup({ enabled }: { enabled: boolean }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.localClippingEnabled = enabled
  }, [gl, enabled])
  return null
}

export function ThermalMapScene({
  colorFor,
  isZoneActive,
  onHoverZone,
  onUnhoverZone,
  onClickZone,
  tooltipFor,
  view,
  cutDepth,
  explodeAmount,
  config,
  openings,
  highlightPart,
  onHoverPart,
  autoRotate,
  reducedMotion,
  cameraPreset,
  recenterToken,
  zoneLabels,
  showAnnotations,
  selectedKeyArea,
  sensorPins,
  onSelectSensor,
  rightInset = 0,
  tightFraming = false,
}: ThermalMapSceneProps) {
  const clipPlanes = useMemo(
    () => [new THREE.Plane(new THREE.Vector3(0, 0, -1), cutZForDepth(DEFAULT_CUT_DEPTH))],
    [],
  )
  // O plano é mutado no lugar: os materiais guardam a referência, então o
  // slider muda o corte sem recriar material nem disparar re-render da cena.
  useEffect(() => {
    clipPlanes[0].constant = cutZForDepth(cutDepth)
  }, [clipPlanes, cutDepth])

  // A auto-rotação para na primeira interação do usuário e só volta ao
  // recentralizar ou trocar de preset de câmera.
  const [userInteracted, setUserInteracted] = useState(false)
  const [hoveredPart, setHoveredPart] = useState<PartId | null>(null)
  useEffect(() => {
    setUserInteracted(false)
  }, [cameraPreset, recenterToken])

  const parts = useMemo(() => partStateFromConfig(config), [config])
  const handleHoverPart = useMemo(
    () => (partId: PartId | null) => {
      setHoveredPart(partId)
      onHoverPart(partId)
    },
    [onHoverPart],
  )
  const ctx = useMemo(
    () => ({
      view,
      clipPlanes,
      cutDepth,
      explodeAmount,
      config,
      parts,
      openings,
      highlightPart,
      hoveredPart,
      reducedMotion,
      onHoverPart: handleHoverPart,
    }),
    [
      view,
      clipPlanes,
      cutDepth,
      explodeAmount,
      config,
      parts,
      openings,
      highlightPart,
      hoveredPart,
      reducedMotion,
      handleHoverPart,
    ],
  )

  const zoneNodes = ZONE_MESHES.map((def, i) => (
    <ZoneMesh
      key={`${def.zoneKey}-${i}`}
      def={def}
      color={colorFor(def.zoneKey)}
      isZoneActive={isZoneActive(def.zoneKey)}
      onHoverZone={onHoverZone}
      onUnhoverZone={onUnhoverZone}
      onClickZone={onClickZone}
      tooltip={tooltipFor(def.zoneKey)}
    />
  ))

  const calloutFor = (datum: ZoneLabelDatum) => (
    <ZoneCallout
      key={datum.zoneKey}
      zoneKey={datum.zoneKey}
      label={datum.label}
      value={datum.value}
      status={datum.status}
      selected={selectedKeyArea === datum.zoneKey}
      hovered={isZoneActive(datum.zoneKey) && selectedKeyArea !== datum.zoneKey}
      onHover={onHoverZone}
      onUnhover={onUnhoverZone}
      onSelect={onClickZone}
    />
  )

  const isTop = (key: string) => TOP_ZONE_KEYS.has(key)
  const isBay = (key: string) => BAY_ZONE_KEYS.has(key)
  const isRear = (key: string) => REAR_ZONE_KEYS.has(key)
  const isBody = (key: string) => !isTop(key) && !isBay(key) && !isRear(key)

  // Zonas, rótulos e pinos de cada camada animada entram no mesmo grupo da
  // peça — o `<Openable>`/camada do cooktop (via `topExtras`) ou a camada da
  // baía — para subir junto com ela sem dessincronizar.
  const layerExtras = (belongs: (key: string) => boolean) => (
    <>
      {ZONE_MESHES.map((def, i) => (belongs(def.zoneKey) ? zoneNodes[i] : null))}
      {zoneLabels.filter((z) => belongs(z.zoneKey)).map(calloutFor)}
      <SensorPins
        pins={sensorPins.filter((p) => belongs(p.sensor.key_area))}
        onSelectSensor={onSelectSensor}
      />
    </>
  )

  const effectiveExplode = openings.explode ? explodeAmount : 0

  return (
    <StoveProvider value={ctx}>
      <ClippingSetup enabled={view === 'cutaway'} />
      <CameraRig
        preset={cameraPreset}
        recenterToken={recenterToken}
        interrupted={userInteracted}
        explodeAmount={effectiveExplode}
        rightInset={rightInset}
        tight={tightFraming}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={16}
        maxDistance={200}
        maxPolarAngle={Math.PI * 0.52}
        autoRotate={autoRotate && !userInteracted}
        autoRotateSpeed={0.5}
        onStart={() => setUserInteracted(true)}
      />

      {/*
        Iluminação de estúdio neutra (Fase 1d, etapa E) — substitui
        `<Environment preset="studio">` do drei (bloqueado: baixa HDR de CDN).
        Rig de 4 luzes: hemisfério + chave/preenchimento/contraluz.
      */}
      <hemisphereLight args={[0xffffff, 0xdee0e3, 0.6]} />
      <directionalLight color={0xfff4e6} intensity={1.1} position={[22, 30, 18]} />
      <directionalLight color={0xffffff} intensity={0.35} position={[-24, 14, 18]} />
      <directionalLight color={0xffffff} intensity={0.3} position={[0, 14, -30]} />

      <ContactShadows
        position={[0, FLOOR_Y - 0.02, 0]}
        scale={70}
        far={16}
        blur={2.6}
        opacity={0.32}
        color={C.edge}
        resolution={512}
      />

      <StoveBody topExtras={layerExtras(isTop)} rearExtras={layerExtras(isRear)} />
      {showAnnotations && <OrientationMarkers />}

      {/* Baía da eletrônica sob o cooktop: peças + zonas IPC sobem juntas na vista explodida. */}
      <ExplodeLayer layer="bay">
        <HousingLid />
        <ControlBoard />
        <Blower />
        <DeflectorPlate />
        <CoolingDuctTrim />
        <VentBayParts />
        {layerExtras(isBay)}
      </ExplodeLayer>

      <CoilSupport />
      <OvenGlow showBadge={showAnnotations} />

      {layerExtras(isBody)}
      <PartChangeCallout />
    </StoveProvider>
  )
}

export type { ZoneAggregate, SensorPrediction }
export { cutZForDepth }
