/**
 * Flange do duto de resfriamento (zona `IPC Cooling`): moldura de chapa com
 * quatro parafusos em volta da boca voltada para o blower. Decoração rente à
 * zona — a zona continua sendo a superfície de dado, com os pinos nascendo dela.
 */
import { C } from './materials'
import { BAY, ZONE_MESHES } from './zoneGeometry'

const DUCT = ZONE_MESHES.find((z) => z.zoneKey === 'IPC Cooling')

const BAR = 0.28
const FLANGE_T = 0.22

export function CoolingDuctTrim() {
  if (!DUCT) return null
  const [, h, d] = DUCT.args
  const [cx, , cz] = DUCT.position
  const faceX = cx + DUCT.args[0] / 2
  const x = faceX + FLANGE_T / 2
  const mat = <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.7} />
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[x, BAY.yCenter, cz + (s * (d + BAR)) / 2]}>
            <boxGeometry args={[FLANGE_T, h + BAR * 2, BAR]} />
            {mat}
          </mesh>
          <mesh position={[x, BAY.yCenter + (s * (h + BAR)) / 2, cz]}>
            <boxGeometry args={[FLANGE_T, BAR, d]} />
            {mat}
          </mesh>
        </group>
      ))}
      {[-1, 1].map((sy) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sy}${sz}`}
            position={[faceX + FLANGE_T + 0.03, BAY.yCenter + (sy * (h + BAR)) / 2, cz + (sz * (d + BAR)) / 2]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
            <meshStandardMaterial color={C.wire} roughness={0.35} metalness={0.8} />
          </mesh>
        )),
      )}
    </group>
  )
}
