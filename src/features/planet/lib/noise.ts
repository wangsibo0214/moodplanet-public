/**
 * 3D simplex 噪声（Ashima Arts / Stefan Gustavson 参考实现的 JS 移植）。
 *
 * 球面地形需要无接缝的连续噪声：value noise 在极点附近会出现明显网格感，
 * 2D 噪声按经纬展开也会在接缝处裂开，因此用 3D simplex 直接对方向向量采样。
 */

const GRAD3 = new Float32Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
  1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
  0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
])

const PERM = new Uint8Array(512)
const PERM_MOD12 = new Uint8Array(512)

/* 固定种子：星球形状必须每次一致，否则刷新后记忆星与树的位置会漂移。 */
const SEED = 0x4d504c41

function buildPermutation(seed: number): void {
  const source = new Uint8Array(256)
  for (let i = 0; i < 256; i++) source[i] = i

  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = source[i]
    source[i] = source[j]
    source[j] = swap
  }

  for (let i = 0; i < 512; i++) {
    PERM[i] = source[i & 255]
    PERM_MOD12[i] = PERM[i] % 12
  }
}

buildPermutation(SEED)

const F3 = 1 / 3
const G3 = 1 / 6

/** 返回约 -1..1 的噪声值。 */
export function noise3(xin: number, yin: number, zin: number): number {
  const skew = (xin + yin + zin) * F3
  const i = Math.floor(xin + skew)
  const j = Math.floor(yin + skew)
  const k = Math.floor(zin + skew)

  const unskew = (i + j + k) * G3
  const x0 = xin - (i - unskew)
  const y0 = yin - (j - unskew)
  const z0 = zin - (k - unskew)

  let i1 = 0
  let j1 = 0
  let k1 = 0
  let i2 = 0
  let j2 = 0
  let k2 = 0

  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1
    } else {
      i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1
    }
  } else {
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1
    } else {
      i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0
    }
  }

  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3

  const ii = i & 255
  const jj = j & 255
  const kk = k & 255

  let n = 0

  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
  if (t0 > 0) {
    const g = PERM_MOD12[ii + PERM[jj + PERM[kk]]] * 3
    t0 *= t0
    n += t0 * t0 * (GRAD3[g] * x0 + GRAD3[g + 1] * y0 + GRAD3[g + 2] * z0)
  }

  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
  if (t1 > 0) {
    const g = PERM_MOD12[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]] * 3
    t1 *= t1
    n += t1 * t1 * (GRAD3[g] * x1 + GRAD3[g + 1] * y1 + GRAD3[g + 2] * z1)
  }

  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
  if (t2 > 0) {
    const g = PERM_MOD12[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]] * 3
    t2 *= t2
    n += t2 * t2 * (GRAD3[g] * x2 + GRAD3[g + 1] * y2 + GRAD3[g + 2] * z2)
  }

  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
  if (t3 > 0) {
    const g = PERM_MOD12[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]] * 3
    t3 *= t3
    n += t3 * t3 * (GRAD3[g] * x3 + GRAD3[g + 1] * y3 + GRAD3[g + 2] * z3)
  }

  return 32 * n
}

/** 分形叠加，返回约 -1..1。 */
export function fbm3(
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5,
): number {
  let sum = 0
  let amplitude = 1
  let frequency = 1
  let norm = 0

  for (let o = 0; o < octaves; o++) {
    sum += noise3(x * frequency, y * frequency, z * frequency) * amplitude
    norm += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }

  return sum / norm
}
