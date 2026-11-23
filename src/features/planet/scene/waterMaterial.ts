import * as THREE from 'three'

import { buildWaveGLSL } from '../lib/waterWaves'

/**
 * 海面材质：W1 低多边形波浪常开（顶点沿法线位移，flatShading 由导数得面法线，
 * 位移后无需手动重算法线）；W2「粼粼海面」的岸线泡沫、菲涅尔边缘、阳光碎光
 * 全部乘 uShimmer——门控为 0 时逐项归零，画面与 W1 基线逐位一致。
 */

export interface SeaUniforms {
  uTime: { value: number }
  uShimmer: { value: number }
  uGlow: { value: number }
  uShore: { value: THREE.Texture }
}

export function createSeaUniforms(shore: THREE.Texture): SeaUniforms {
  return {
    uTime: { value: 0 },
    uShimmer: { value: 0 },
    uGlow: { value: 0.75 },
    uShore: { value: shore },
  }
}

const UNIFORM_GLSL = /* glsl */ `
uniform float uTime;
uniform float uShimmer;
uniform float uGlow;
uniform sampler2D uShore;
`

const SEA_ADD_GLSL = /* glsl */ `
vec3 seaDir = normalize(vSeaPos);
float shoreU = atan(seaDir.z, seaDir.x) / 6.28318530718 + 0.5;
float shoreV = asin(clamp(seaDir.y, -1.0, 1.0)) / 3.14159265359 + 0.5;
float shore = texture2D(uShore, vec2(shoreU, shoreV)).r;
float foam = smoothstep(0.4, 0.44, shore) * (1.0 - smoothstep(0.48, 0.56, shore));
float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
float glint = pow(max(sin(seaDir.x * 57.0 + uTime * 1.3) * sin(seaDir.y * 49.0 - uTime * 1.7) * sin(seaDir.z * 63.0 + uTime * 1.1), 0.0), 24.0);
vec3 seaAdd = uShimmer * (foam * vec3(0.85, 0.93, 1.0) * 0.34 + fres * vec3(0.3, 0.5, 0.75) * 0.35 + glint * vec3(1.0, 0.95, 0.8) * (0.35 + 0.65 * uGlow) * 0.9);
`

/** 深浅水色：近岸偏青绿、深海偏藏蓝，乘在底色上；不门控，属于海面基线观感。 */
const SEA_DEPTH_GLSL = /* glsl */ `
vec3 depthDir = normalize(vSeaPos);
float depthU = atan(depthDir.z, depthDir.x) / 6.28318530718 + 0.5;
float depthV = asin(clamp(depthDir.y, -1.0, 1.0)) / 3.14159265359 + 0.5;
float depthShore = texture2D(uShore, vec2(depthU, depthV)).r;
diffuseColor.rgb *= mix(vec3(0.45, 0.6, 0.95), vec3(1.3, 1.45, 1.15), smoothstep(0.06, 0.5, depthShore));
`

export function createSeaMaterial(uniforms: SeaUniforms): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: '#3F8CC9',
    emissive: '#123A5E',
    /* 自发光收一档、透明度放一档：海床的青绿浅滩才透得出来，
       否则整片海被均匀的自发光蓝 wash 成一块塑料 */
    emissiveIntensity: 0.28,
    roughness: 0.16,
    metalness: 0.05,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    flatShading: true,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uShimmer = uniforms.uShimmer
    shader.uniforms.uGlow = uniforms.uGlow
    shader.uniforms.uShore = uniforms.uShore
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${UNIFORM_GLSL}\nvarying vec3 vSeaPos;\n${buildWaveGLSL()}\nvoid main() {`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
transformed += normal * seaWave(normalize(position), uTime);
vSeaPos = position;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${UNIFORM_GLSL}\nvarying vec3 vSeaPos;\nvoid main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${SEA_DEPTH_GLSL}`)
      .replace(
        'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
        `${SEA_ADD_GLSL}
vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance + seaAdd;`,
      )
  }

  material.customProgramCacheKey = () => 'moodplanet-sea'

  return material
}