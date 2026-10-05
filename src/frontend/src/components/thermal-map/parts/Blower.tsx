import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { useStove } from '../StoveContext'
import { BLOWER } from '../zoneGeometry'
import { BlowerBody } from './BlowerBody'
import { PartGroup } from './PartGroup'

/**
 * Blower de resfriamento: voluta, rotor, motor e pés. O rotor gira (parado com
 * "reduzir movimento"). O fluxo de ar não é desenhado: as setas cinza que o
 * representavam eram lidas como parafusos soltos na baía.
 */
export function Blower() {
  const { reducedMotion } = useStove()
  const fan = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    if (fan.current && !reducedMotion) fan.current.rotation.z += delta * 6
  })

  return (
    <PartGroup partId="blower" tooltipAt={[BLOWER.x, BLOWER.y + 2.8, BLOWER.z]}>
      <BlowerBody fan={fan} />
    </PartGroup>
  )
}
