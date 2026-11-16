import { smooth01 } from './gate'

/**
 * 环绕动作菜单新增的四个动作（坐下 / 睡觉 / 跳舞 / 比心）的算术。
 *
 * 与 roll 同一口径：全部按已经过秒数定义，两端都回到「什么都没发生」——
 * elapsed ≤ 0 与 elapsed ≥ DURATION 时每个因子都落在静息值上，
 * 动作起止不会在 Companion 的逐帧公式里留下台阶。
 */

/* ---------------- 坐下 ---------------- */

/** 整个动作的时长（秒） */
export const SIT_DURATION = 2.4
/** 坐下去用时（秒） */
export const SIT_DOWN = 0.45
/** 起身用时（秒）；中间是坐着保持段 */
export const SIT_UP = 0.5
/** 身体下沉量（世界坐标 -Y） */
export const SIT_SINK = 0.035
/** 坐到底时的纵向压扁比例 */
export const SIT_SQUASH = 0.16
/** 坐着时头往前倾的角度（弧度） */
export const SIT_TILT = 0.18

/** 坐下的深度 0→1→0：smooth01 保证坐下与起身两端速度趋零 */
export function sitSettle(elapsed: number): number {
  if (elapsed <= 0) return 0
  if (elapsed >= SIT_DURATION) return 0
  if (elapsed < SIT_DOWN) return smooth01(elapsed / SIT_DOWN)
  const upStart = SIT_DURATION - SIT_UP
  if (elapsed >= upStart) return 1 - smooth01((elapsed - upStart) / SIT_UP)
  return 1
}

export function sitPose(elapsed: number): { sink: number; squashY: number; xz: number; tiltX: number } {
  const settle = sitSettle(elapsed)
  return {
    sink: SIT_SINK * settle,
    squashY: 1 - SIT_SQUASH * settle,
    /* 压扁补一半体积，坐下去才不像被切掉一层（与 rollSquash 同口径） */
    xz: 1 + SIT_SQUASH * 0.5 * settle,
    tiltX: SIT_TILT * settle,
  }
}

/* ---------------- 睡觉 ---------------- */

export const SLEEP_DURATION = 4
/** 入睡用时（秒） */
export const SLEEP_IN = 0.7
/** 醒来用时（秒）；中间是熟睡段 */
export const SLEEP_OUT = 0.9
/** 熟睡时头低垂的角度（弧度），比打盹的 0.3 再深一点 */
export const SLEEP_TILT = 0.34
/** 熟睡时触角灯压暗的比例 */
export const SLEEP_DIM = 0.55
/** 慢呼吸的角频率（弧度/秒），约 0.55 次/秒 */
export const SLEEP_BREATH_RATE = 3.4
/** 慢呼吸的纵向起伏幅度 */
export const SLEEP_BREATH_AMP = 0.028

/** 睡眠深度 0→1→0：入睡着实、醒来回甘，两端速度趋零 */
export function sleepDepth(elapsed: number): number {
  if (elapsed <= 0) return 0
  if (elapsed >= SLEEP_DURATION) return 0
  if (elapsed < SLEEP_IN) return smooth01(elapsed / SLEEP_IN)
  const outStart = SLEEP_DURATION - SLEEP_OUT
  if (elapsed >= outStart) return 1 - smooth01((elapsed - outStart) / SLEEP_OUT)
  return 1
}

export function sleepPose(elapsed: number): {
  depth: number
  eyeOpen: number
  tiltX: number
  glowDim: number
  breath: number
} {
  const depth = sleepDepth(elapsed)
  return {
    depth,
    /* 闭眼沿用场景里 rest 的口径：全睡时留 0.06 的一线，眼皮不是消失 */
    eyeOpen: 1 - 0.94 * depth,
    tiltX: SLEEP_TILT * depth,
    glowDim: SLEEP_DIM * depth,
    /* 起伏乘深度：入睡过程里呼吸逐渐变深，醒来前逐渐变浅，两端严格为 0 */
    breath: Math.sin(elapsed * SLEEP_BREATH_RATE) * SLEEP_BREATH_AMP * depth,
  }
}

/* ---------------- 跳舞 ---------------- */

export const DANCE_DURATION = 2.8
/** 弹跳角频率：每秒两拍 */
export const DANCE_BEAT = Math.PI * 4
/** 每拍弹起的高度（世界坐标 +Y） */
export const DANCE_BOUNCE = 0.05
/** 左右摇摆的倾角幅度（弧度） */
export const DANCE_SWAY = 0.14
/** 身体左右拧转的幅度（弧度） */
export const DANCE_SPIN = 0.5

/** 整段动作的包络 0→1→0：起步与收尾都渐入渐出，不凭空起跳 */
export function danceEnvelope(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= DANCE_DURATION) return 0
  return Math.sin((elapsed / DANCE_DURATION) * Math.PI)
}

export function dancePose(elapsed: number): {
  bounce: number
  sway: number
  spin: number
  arm: number
} {
  const envelope = danceEnvelope(elapsed)
  /* 只取 sin 的正半周：落地不会沉到地里 */
  const bounce = Math.max(0, Math.sin(elapsed * DANCE_BEAT)) * DANCE_BOUNCE * envelope
  const halfBeat = Math.sin(elapsed * DANCE_BEAT * 0.5)
  return {
    bounce,
    sway: halfBeat * DANCE_SWAY * envelope,
    spin: halfBeat * DANCE_SPIN * envelope,
    /* 双手举着随包络起落 */
    arm: envelope,
  }
}

/* ---------------- 比心 ---------------- */

export const HEART_DURATION = 2.2
/** 举手用时（秒） */
export const HEART_RAISE = 0.4
/** 放下用时（秒）；中间是举着保持段 */
export const HEART_DROP = 0.5
/** 手臂举过头顶的肩轴角度（弧度），比挥手的 1.15 更靠上 */
export const HEART_ARM = 2.3
/** 举着时身体轻轻搏动的幅度 */
export const HEART_PULSE = 0.05
/** 搏动角频率 */
export const HEART_PULSE_RATE = Math.PI * 3
/** 头微微一歪 */
export const HEART_TILT = 0.08

/** 举手深度 0→1→0 */
export function heartLift(elapsed: number): number {
  if (elapsed <= 0) return 0
  if (elapsed >= HEART_DURATION) return 0
  if (elapsed < HEART_RAISE) return smooth01(elapsed / HEART_RAISE)
  const dropStart = HEART_DURATION - HEART_DROP
  if (elapsed >= dropStart) return 1 - smooth01((elapsed - dropStart) / HEART_DROP)
  return 1
}

export function heartPose(elapsed: number): {
  lift: number
  arm: number
  blush: number
  pulse: number
  tiltZ: number
} {
  const lift = heartLift(elapsed)
  return {
    lift,
    arm: HEART_ARM * lift,
    /* 腮红随举手加深，放下即还原 */
    blush: lift,
    pulse: Math.sin(elapsed * HEART_PULSE_RATE) * HEART_PULSE * lift,
    tiltZ: HEART_TILT * lift,
  }
}
