/**
 * 九种交互音效的原创合成配方：纯函数渲染单声道 PCM，不依赖任何音频文件。
 * 全部声音走「正弦泛音 + 软起音 + 指数衰减」的治愈系路线，峰值统一压到 0.35 以下，
 * 首尾强制淡入淡出，避免爆音。随机成分用固定种子，保证每次渲染逐位一致。
 */

export type SoundName =
  | 'click'
  | 'pop'
  | 'whoosh'
  | 'chime'
  | 'bubble'
  | 'success'
  | 'sparkle'
  | 'bell'
  | 'confirm'

export const SOUND_NAMES: readonly SoundName[] = [
  'click',
  'pop',
  'whoosh',
  'chime',
  'bubble',
  'success',
  'sparkle',
  'bell',
  'confirm',
]

/** 渲染采样率：足够覆盖铃类泛音，又比 44.1k 省一半内存 */
export const SOUND_SAMPLE_RATE = 22050

export const SOUND_DURATIONS: Record<SoundName, number> = {
  click: 0.09,
  pop: 0.16,
  whoosh: 0.34,
  chime: 0.75,
  bubble: 0.18,
  success: 0.85,
  sparkle: 0.95,
  bell: 1.15,
  confirm: 0.24,
}

/** 归一化后的峰值：越「提醒」的声音越响一点，但都留在轻柔区间 */
export const SOUND_PEAKS: Record<SoundName, number> = {
  click: 0.22,
  pop: 0.26,
  whoosh: 0.16,
  chime: 0.28,
  bubble: 0.24,
  success: 0.3,
  sparkle: 0.24,
  bell: 0.3,
  confirm: 0.2,
}

const TAU = Math.PI * 2

/** 固定种子 PRNG：sparkle 的「随机」星点每次听起来都一样 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface ToneOptions {
  /** 起始秒 */
  at: number
  /** 持续秒 */
  dur: number
  /** 基频 Hz */
  freq: number
  /** 结束时的频率倍率（滑音），默认 1 */
  glide?: number
  /** 泛音列 [频率倍率, 幅度]，默认纯音 */
  partials?: readonly (readonly [number, number])[]
  /** 起音秒 */
  attack?: number
  /** 指数衰减时间常数秒 */
  decay: number
  gain: number
}

/** 往缓冲里叠加一个带软起音与指数衰减的泛音音粒 */
function addTone(buf: Float32Array, sr: number, o: ToneOptions): void {
  const partials = o.partials ?? [[1, 1]]
  const attack = o.attack ?? 0.006
  const glide = o.glide ?? 1
  const start = Math.max(0, Math.round(o.at * sr))
  const end = Math.min(buf.length, Math.round((o.at + o.dur) * sr))
  for (let i = start; i < end; i++) {
    const t = (i - start) / sr
    const progress = t / o.dur
    /* 频率按指数滑向 glide 倍：听感是「咻」而不是线性哨音 */
    const freq = o.freq * Math.pow(glide, progress)
    const phase = TAU * freq * t
    let sample = 0
    for (const [ratio, amp] of partials) sample += Math.sin(phase * ratio) * amp
    const attackEnv = Math.min(1, t / attack)
    /* 起音也用 smoothstep，避免线性斜坡的折点 */
    const smooth = attackEnv * attackEnv * (3 - 2 * attackEnv)
    buf[i] += sample * smooth * Math.exp(-t / o.decay) * o.gain
  }
}

/** 带通噪声：whoosh 的风感与 sparkle 的高频 shimmer 共用 */
function addSweptNoise(
  buf: Float32Array,
  sr: number,
  o: { at: number; dur: number; from: number; to: number; q: number; gain: number; seed: number },
): void {
  const rand = mulberry32(o.seed)
  const start = Math.max(0, Math.round(o.at * sr))
  const end = Math.min(buf.length, Math.round((o.at + o.dur) * sr))
  let lp = 0
  let hp = 0
  for (let i = start; i < end; i++) {
    const t = (i - start) / sr
    const progress = t / o.dur
    /* 中心频率先升后降：一口气拂过的形状 */
    const center = o.from + (o.to - o.from) * Math.sin(progress * Math.PI)
    const alpha = Math.min(0.9, TAU * center / sr / o.q)
    const white = rand() * 2 - 1
    lp += alpha * (white - lp)
    hp = white - lp
    const env = Math.pow(Math.sin(progress * Math.PI), 1.5)
    buf[i] += hp * env * o.gain
  }
}

/** 首尾 4ms 强制淡边 + 峰值归一化：任何配方都不会爆音或留下直流台阶 */
function finish(buf: Float32Array<ArrayBuffer>, sr: number, peak: number): Float32Array<ArrayBuffer> {
  const edge = Math.max(1, Math.round(0.004 * sr))
  for (let i = 0; i < edge; i++) {
    const w = i / edge
    /* +0 把 -0 归一成 +0：淡边乘零可能留下负零，听感无差但断言会咬 */
    buf[i] = buf[i] * w + 0
    buf[buf.length - 1 - i] = buf[buf.length - 1 - i] * w + 0
  }
  let max = 0
  for (const sample of buf) max = Math.max(max, Math.abs(sample))
  if (max > 0) {
    const scale = peak / max
    for (let i = 0; i < buf.length; i++) buf[i] *= scale
  }
  return buf
}

const RECIPES: Record<SoundName, (buf: Float32Array, sr: number) => void> = {
  /* 普通按钮：木鱼般的轻点，高频短促但不刺 */
  click(buf, sr) {
    addTone(buf, sr, { at: 0, dur: 0.09, freq: 1900, glide: 0.68, decay: 0.02, gain: 1 })
    addSweptNoise(buf, sr, { at: 0, dur: 0.02, from: 2400, to: 1600, q: 1.2, gain: 0.18, seed: 11 })
  },
  /* 菜单展开：气泡上浮的「啵」 */
  pop(buf, sr) {
    addTone(buf, sr, {
      at: 0,
      dur: 0.16,
      freq: 320,
      glide: 2,
      partials: [
        [1, 1],
        [2, 0.3],
      ],
      attack: 0.006,
      decay: 0.045,
      gain: 1,
    })
  },
  /* 菜单收起：一口气拂过的风 */
  whoosh(buf, sr) {
    addSweptNoise(buf, sr, { at: 0, dur: 0.34, from: 480, to: 1500, q: 1.6, gain: 1, seed: 23 })
  },
  /* 选中动作：五声音阶三连风铃 */
  chime(buf, sr) {
    const notes = [659.25, 783.99, 987.77]
    notes.forEach((freq, i) => {
      addTone(buf, sr, {
        at: i * 0.07,
        dur: 0.75 - i * 0.07,
        freq,
        partials: [
          [1, 1],
          [2.01, 0.25],
          [3, 0.08],
        ],
        attack: 0.008,
        decay: 0.22,
        gain: 0.8 - i * 0.12,
      })
    })
  },
  /* 戳伙伴：水滴倒放的圆泡 */
  bubble(buf, sr) {
    addTone(buf, sr, {
      at: 0,
      dur: 0.18,
      freq: 620,
      glide: 0.42,
      partials: [
        [1, 1],
        [2, 0.22],
      ],
      attack: 0.005,
      decay: 0.05,
      gain: 1,
    })
  },
  /* 记录保存：C 大三和弦琶音，暖而稳 */
  success(buf, sr) {
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      addTone(buf, sr, {
        at: i * 0.09,
        dur: 0.85 - i * 0.09,
        freq,
        partials: [
          [1, 1],
          [2, 0.35],
          [3, 0.12],
        ],
        attack: 0.012,
        decay: i === 2 ? 0.38 : 0.28,
        gain: 0.85 - i * 0.1,
      })
    })
  },
  /* 封存胶囊：高音星点洒落 + 一层细 shimmer */
  sparkle(buf, sr) {
    const rand = mulberry32(7)
    const scale = [1046.5, 1174.66, 1318.51, 1567.98, 1760]
    for (let i = 0; i < 5; i++) {
      const freq = scale[Math.floor(rand() * scale.length)]
      addTone(buf, sr, {
        at: i * 0.09 + rand() * 0.03,
        dur: 0.95 - i * 0.09,
        freq,
        partials: [
          [1, 1],
          [2.7, 0.15],
        ],
        attack: 0.004,
        decay: 0.16,
        gain: 0.7 - i * 0.08,
      })
    }
    addSweptNoise(buf, sr, { at: 0.05, dur: 0.8, from: 3200, to: 5200, q: 2.4, gain: 0.05, seed: 31 })
  },
  /* 开启胶囊：非谐波泛音的清澈星铃，余韵最长 */
  bell(buf, sr) {
    const partials: [number, number][] = [
      [1, 1],
      [2, 0.5],
      [2.98, 0.32],
      [4.2, 0.18],
      [5.4, 0.08],
    ]
    partials.forEach(([ratio, amp], i) => {
      addTone(buf, sr, {
        at: 0,
        dur: 1.15,
        freq: 880 * ratio,
        attack: 0.003,
        decay: 0.5 / (1 + i * 0.7),
        gain: amp,
      })
    })
    addSweptNoise(buf, sr, { at: 0, dur: 0.012, from: 4000, to: 2600, q: 1.4, gain: 0.1, seed: 41 })
  },
  /* 设置落盘：两音轻确认，不抢戏 */
  confirm(buf, sr) {
    addTone(buf, sr, { at: 0, dur: 0.1, freq: 783.99, attack: 0.005, decay: 0.045, gain: 0.8 })
    addTone(buf, sr, { at: 0.09, dur: 0.15, freq: 1046.5, attack: 0.005, decay: 0.07, gain: 0.9 })
  },
}

/** 渲染一种音效为单声道 Float32 PCM；纯函数、确定性、无副作用 */
export function renderSound(
  name: SoundName,
  sampleRate: number = SOUND_SAMPLE_RATE,
): Float32Array<ArrayBuffer> {
  const buf = new Float32Array(Math.round(SOUND_DURATIONS[name] * sampleRate))
  RECIPES[name](buf, sampleRate)
  return finish(buf, sampleRate, SOUND_PEAKS[name])
}
