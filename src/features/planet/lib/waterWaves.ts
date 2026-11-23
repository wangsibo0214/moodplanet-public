/**
 * 低多边形海面波浪：三组沿不同轴传播的正弦波叠加。
 * CPU 镜像与 GLSL 由同一份常量生成，两边波形永远一致。
 * time 取 EnvRuntime.time：calm 时它不推进，波浪自然停驻。
 */

export const WAVE_AMPLITUDE = 0.0055
export const WAVE_SPEED = 0.55

export interface WaveTerm {
  axis: readonly [number, number, number]
  freq: number
  speed: number
  weight: number
}

function norm(x: number, y: number, z: number): readonly [number, number, number] {
  const len = Math.hypot(x, y, z)
  return [x / len, y / len, z / len]
}

export const WAVE_TERMS: readonly WaveTerm[] = [
  { axis: norm(1, 0.3, 0.2), freq: 9, speed: 1, weight: 1 },
  { axis: norm(-0.4, 0.2, 1), freq: 14, speed: 1.35, weight: 0.55 },
  { axis: norm(0.3, 1, -0.5), freq: 21, speed: 0.8, weight: 0.3 },
]

const WEIGHT_SUM = WAVE_TERMS.reduce((sum, term) => sum + term.weight, 0)

export function waveHeight(dir: { x: number; y: number; z: number }, time: number): number {
  let sum = 0
  for (const term of WAVE_TERMS) {
    const phase =
      (dir.x * term.axis[0] + dir.y * term.axis[1] + dir.z * term.axis[2]) * term.freq +
      time * WAVE_SPEED * term.speed
    sum += term.weight * Math.sin(phase)
  }
  return (sum / WEIGHT_SUM) * WAVE_AMPLITUDE
}

const glslFloat = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n))

/** 从同一份常量生成 GLSL 波函数，注入海面顶点着色器。 */
export function buildWaveGLSL(): string {
  const terms = WAVE_TERMS.map((term) => {
    const [x, y, z] = term.axis
    return `${glslFloat(term.weight)} * sin(dot(d, vec3(${glslFloat(x)}, ${glslFloat(y)}, ${glslFloat(z)})) * ${glslFloat(term.freq)} + t * ${glslFloat(WAVE_SPEED * term.speed)})`
  })
  return `float seaWave(vec3 d, float t) { return ${glslFloat(WAVE_AMPLITUDE)} * (${terms.join(' + ')}) / ${glslFloat(WEIGHT_SUM)}; }`
}