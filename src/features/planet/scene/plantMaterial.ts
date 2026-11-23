import * as THREE from 'three'

/**
 * 植被材质：在 MeshStandardMaterial 上注入一段顶点位移，
 * 让草、花、树冠跟着「微风」摆，让花头跟着「开放度」长大。
 *
 * 走 GPU 而不是每帧改实例矩阵：220 株草 + 64 棵树如果逐帧重算矩阵，
 * 每帧要上传几十 KB 的 instanceMatrix，在手机上就是白掉的帧率。
 */

export interface PlantUniforms {
  uTime: { value: number }
  /** 微风幅度 0–1 */
  uWind: { value: number }
  /** 花朵开放度 0–1，只有花头材质会真的用到 */
  uBloom: { value: number }
}

export function createPlantUniforms(): PlantUniforms {
  return { uTime: { value: 0 }, uWind: { value: 0 }, uBloom: { value: 0 } }
}

const UNIFORM_GLSL = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform float uBloom;
`

/**
 * 位移量按「实例原点」错开相位，同一片草不会整齐地一起倒；
 * 幅度乘上顶点自身高度，所以根部不动、梢部摆得最多。
 * 实例矩阵里已经带了缩放，位移会跟着一起缩放，大植株自然摆得更大。
 */
const SWAY_GLSL = /* glsl */ `
#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 plantOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 plantOrigin = vec3(0.0);
#endif
  float plantHeight = max(transformed.y, 0.0);
  float windPhase = uTime * 1.7 + plantOrigin.x * 9.0 + plantOrigin.z * 7.0 + plantOrigin.y * 5.0;
  transformed.x += sin(windPhase) * uWind * 1.5 * plantHeight;
  transformed.z += cos(windPhase * 0.83) * uWind * 1.0 * plantHeight;
  transformed *= 1.0 + uBloom * 0.85;
`

/**
 * @param blooms 是否参与「花朵开放」：只有花头需要，树干跟着一起胀会很怪。
 */
export function createPlantMaterial(
  blooms: boolean,
  uniforms: PlantUniforms,
): THREE.MeshStandardMaterial {
  /* 材质底色留白，颜色全部交给 instanceColor，这样多个实例网格可以共用一份材质 */
  const material = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
  })

  if (blooms) {
    /* 花开到最满时透出一点暖光，让「开放」不只靠尺寸变化来表达 */
    material.emissive = new THREE.Color('#FFD9A0')
    material.emissiveIntensity = 0
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uWind = uniforms.uWind
    shader.uniforms.uBloom = uniforms.uBloom
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${UNIFORM_GLSL}\nvoid main() {`)
      .replace('#include <begin_vertex>', SWAY_GLSL)
  }

  /* onBeforeCompile 的函数体两份材质完全相同，默认的缓存键会撞在一起，
     导致后一份复用前一份的程序、uBloom 白注入。必须显式区分。 */
  material.customProgramCacheKey = () =>
    blooms ? 'moodplanet-plant-bloom' : 'moodplanet-plant-plain'

  return material
}

/**
 * 岩石材质：不注入任何顶点位移。石头不该随风摆，也不该跟着花开度胀缩——
 * 它是一份静态的 MeshStandardMaterial，颜色同样交给 instanceColor。
 */
export function createRockMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  })
}
