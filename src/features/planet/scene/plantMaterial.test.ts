import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  createPlantMaterial,
  createPlantUniforms,
  createRockMaterial,
} from '@/features/planet/scene/plantMaterial'

type Compile = THREE.MeshStandardMaterial['onBeforeCompile']
type Shader = Parameters<Compile>[0]
type Renderer = Parameters<Compile>[1]

function fakeShader(source: string): Shader {
  return { vertexShader: source, uniforms: {} } as unknown as Shader
}

describe('岩石材质：静态，不注入任何位移', () => {
  it('onBeforeCompile 不改顶点着色器、不挂任何 uniform', () => {
    const material = createRockMaterial()
    const source = 'void main() {\n#include <begin_vertex>\n}'
    const shader = fakeShader(source)
    material.onBeforeCompile(shader, null as unknown as Renderer)
    expect(shader.vertexShader).toBe(source)
    expect(Object.keys(shader.uniforms)).toHaveLength(0)
  })

  it('对照：植物材质确实注入风摆与开放度（证明上面的静止不是测错了对象）', () => {
    const material = createPlantMaterial(false, createPlantUniforms())
    const shader = fakeShader('void main() {\n#include <begin_vertex>\n}')
    material.onBeforeCompile(shader, null as unknown as Renderer)
    expect(shader.vertexShader).toContain('uWind')
    expect(shader.vertexShader).toContain('uBloom')
    expect(shader.uniforms.uTime).toBeDefined()
  })

  it('底色留白交给 instanceColor，平面着色读作石头', () => {
    const material = createRockMaterial()
    expect(material.color.getHexString()).toBe('ffffff')
    expect(material.flatShading).toBe(true)
    expect(material.roughness).toBeGreaterThan(0.9)
  })
})