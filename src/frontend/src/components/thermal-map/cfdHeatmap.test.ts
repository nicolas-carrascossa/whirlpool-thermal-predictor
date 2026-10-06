import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { CFD_PROGRAM_KEY, configureCfdHeatmap } from './cfdHeatmap'

describe('configureCfdHeatmap', () => {
  it('injeta o campo procedural quando ativo e restaura o programa padrão ao desligar', () => {
    const material = new THREE.MeshStandardMaterial()
    const shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: unknown }> } = {
      vertexShader: '#include <worldpos_vertex>',
      fragmentShader: '#include <color_fragment>',
      uniforms: {},
    }

    configureCfdHeatmap(material, true)
    material.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.vertexShader).toContain('vCfdWorldPosition')
    expect(shader.fragmentShader).toContain('cfdField')
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= cfdShade')
    expect(material.customProgramCacheKey()).toBe(CFD_PROGRAM_KEY)

    configureCfdHeatmap(material, false)
    expect(material.customProgramCacheKey()).toBe('standard')
  })
})
