import { useEffect, useMemo, useRef, useState } from 'react'
import { useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

import { sound } from '@/features/sound/soundManager'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { between, createRandom } from '@/utils/random'

import {
  DANCE_DURATION,
  HEART_DURATION,
  SLEEP_DURATION,
  SIT_DURATION,
  dancePose,
  heartPose,
  sitPose,
  sleepPose,
} from '../lib/actions'
import { breathGate, breathWave } from '../lib/breath'
import {
  FIDGET_DURATION,
  FIDGET_FIRST_MAX,
  FIDGET_FIRST_MIN,
  fidgetAmplitude,
  fidgetGate,
  fidgetLiftHeight,
  fidgetRollAngle,
  scheduleFidget,
} from '../lib/fidget'
import {
  GLOW_DURATION,
  GLOW_RESTART_MAX,
  bulbScale,
  chargeAmount,
  chargeScales,
  glowIntensity,
  glowShape,
} from '../lib/glow'
import {
  ROLL_DURATION,
  ROLL_PIVOT_Y,
  rollLift,
  rollSpinAngle,
  rollSquash,
} from '../lib/roll'
import { ANTENNA_WARM_MIX, antennaIntensity, swayAngle, warmGlowGate } from '../lib/warmth'
import { companionAnchor } from './companionAnchor'
import { CAMERA_POS, findCompanionAnchor } from './companionPlacement'
import type { EnvRuntime } from './moodEnvironment'

const UP = new THREE.Vector3(0, 1, 0)
/** 伙伴在星球尺度下偏小，放大一点才读得出是个角色 */
const COMPANION_SCALE = 1.35
/** 被点醒之后清醒多久（秒）：疲惫时戳它，它会抬头一下再慢慢睡回去 */
const WAKE_DURATION = 2.6
/** 触摸长按多久弹出环绕动作菜单 */
const LONG_PRESS_MS = 450
/** 长按期间手指允许的最大位移（px），超过视为拖动星球、撤销长按 */
const LONG_PRESS_MOVE_PX = 10
/** 右键按下到抬起的位移阈值（px），与点击的 delta 口径一致 */
const RIGHT_DRAG_PX = 5
/** 触角灯的两档灯色：常规金 → 难过时更暖的橙。逐帧 copy/lerp 复用，不新建 Color */
const ANTENNA_EMISSIVE = new THREE.Color('#F2B84B')
const ANTENNA_EMISSIVE_WARM = new THREE.Color('#FFB27A')

/**
 * 以地表法线为 +Y、切平面内指向相机的方向为 +Z 直接建基。
 * 绕法线自转 steer 不动 +Z，所以不能用「先对齐再自转」的做法摆正脸。
 */
function faceQuaternion(dir: THREE.Vector3, position: THREE.Vector3): THREE.Quaternion {
  const yAxis = dir.clone()
  const zAxis = CAMERA_POS.clone().sub(position)
  zAxis.addScaledVector(yAxis, -zAxis.dot(yAxis))
  if (zAxis.lengthSq() < 1e-6) zAxis.copy(UP).addScaledVector(yAxis, -yAxis.dot(UP))
  zAxis.normalize()
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis)
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis),
  )
}

interface ActionClock {
  active: boolean
  t: number
  duration: number
}

const IDLE: ActionClock = { active: false, t: 0, duration: 0 }

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

interface CompanionProps {
  /** 关闭持续动画（用户开了减少动效，或系统 prefers-reduced-motion） */
  calm: boolean
  env: EnvRuntime
}

export function Companion({ calm, env }: CompanionProps) {
  const pokeCompanion = usePlanetStore((state) => state.pokeCompanion)
  const openCompanionMenu = usePlanetStore((state) => state.openCompanionMenu)
  const action = usePlanetStore((state) => state.companionAction)

  const placement = useMemo(() => {
    const anchor = findCompanionAnchor()
    const position = anchor.dir.clone().multiplyScalar(anchor.radius)
    return { position, quaternion: faceQuaternion(anchor.dir, position) }
  }, [])

  const twirlRef = useRef<THREE.Group>(null)
  const rollRef = useRef<THREE.Group>(null)
  const waveRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const blushLeftRef = useRef<THREE.MeshStandardMaterial>(null)
  const blushRightRef = useRef<THREE.MeshStandardMaterial>(null)
  const bobRef = useRef<THREE.Group>(null)
  const rootRef = useRef<THREE.Group>(null)
  const leftEyeRef = useRef<THREE.Group>(null)
  const rightEyeRef = useRef<THREE.Group>(null)
  const antennaRef = useRef<THREE.MeshStandardMaterial>(null)
  const antennaBulbRef = useRef<THREE.Mesh>(null)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const headWorld = useRef(new THREE.Vector3())
  const projected = useRef(new THREE.Vector3())
  const toCamera = useRef(new THREE.Vector3())
  const hop = useRef<ActionClock>({ ...IDLE })
  const twirl = useRef<ActionClock>({ ...IDLE })
  const wave = useRef<ActionClock>({ ...IDLE })
  const glow = useRef<ActionClock>({ ...IDLE })
  const roll = useRef<ActionClock>({ ...IDLE })
  const sit = useRef<ActionClock>({ ...IDLE })
  const sleep = useRef<ActionClock>({ ...IDLE })
  const dance = useRef<ActionClock>({ ...IDLE })
  const heart = useRef<ActionClock>({ ...IDLE })
  const fidget = useRef<ActionClock>({ ...IDLE })
  /* 初始就等于当前 seq：挂载时不会把上一次点击的动作重放一遍 */
  const lastSeq = useRef(action?.seq ?? 0)
  const wake = useRef(0)
  const blinkAtRef = useRef(2.6)
  const blinkUntilRef = useRef(-1)
  const hoverScaleRef = useRef(1)
  /* 长按状态：timer 为 0 表示没在计时；fired 表示这次抬手不该再触发点击互动 */
  const press = useRef({ timer: 0, active: false, fired: false })
  const pressStart = useRef({ x: 0, y: 0 })
  const rightStart = useRef<{ x: number; y: number } | null>(null)
  const [random] = useState(() => createRandom(0xb1f00))
  /* 雀跃单独一个随机实例：不共用上面那条随机流，眨眼节奏才不会因为多了个调度器而错位 */
  const [fidgetRandom] = useState(() => createRandom(0xf1d99))
  /* 首次雀跃落在几秒之后，且每次打开不在同一秒：定格的同一时刻看着像 tic，不像忍不住 */
  const [fidgetFirstAt] = useState(() => between(fidgetRandom, FIDGET_FIRST_MIN, FIDGET_FIRST_MAX))
  const fidgetAtRef = useRef(fidgetFirstAt)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((_, rawDt) => {
    const bob = bobRef.current
    if (!bob) return
    const dt = Math.min(rawDt, 0.05)
    const t = env.time

    const seq = action?.seq ?? 0
    if (seq !== lastSeq.current) {
      lastSeq.current = seq
      /* 灯已经亮起来了就不要再从头播：一帧之内从峰值打回静息值就是骤闪，此时改播轻跳作为回应 */
      const glowLive = glow.current.active
        ? glowShape(Math.min(1, glow.current.t / glow.current.duration))
        : 0
      const kind = action?.kind
      const isMenuKind = kind === 'sit' || kind === 'sleep' || kind === 'dance' || kind === 'heart'
      /* 菜单动作是用户明确点的，独占身体：先把在播的大动作全部收掉，姿态才不会互相打架。
         反过来戳伙伴抽中的大动作也要收掉四个新动作，同一时间身体只演一件事。 */
      sit.current = { ...IDLE }
      sleep.current = { ...IDLE }
      dance.current = { ...IDLE }
      heart.current = { ...IDLE }
      if (isMenuKind) {
        twirl.current = { ...IDLE }
        roll.current = { ...IDLE }
        wave.current = { ...IDLE }
      }
      /* 转圈、打滚、挥手、充电幅度大，减少动效下退回轻跳；跳一下是对点击的直接回应，保留 */
      /* 转圈与打滚都要独占身体的旋转：另一个还在翻就先不接手，改成跳一下，两条转轴叠起来会像醉汉 */
      /* 同一种翻滚也不从头重播：翻到一半把角度打回 0 就是一帧之内的姿态瞬移，实测跳 317 度 */
      if (kind === 'twirl' && !calm && !roll.current.active)
        twirl.current = { active: true, t: 0, duration: 0.95 }
      else if (kind === 'roll' && !calm && !twirl.current.active && !roll.current.active)
        roll.current = { active: true, t: 0, duration: ROLL_DURATION }
      else if (kind === 'wave' && !calm) wave.current = { active: true, t: 0, duration: 1.2 }
      else if (kind === 'glowPulse' && !calm && glowLive < GLOW_RESTART_MAX)
        glow.current = { active: true, t: 0, duration: GLOW_DURATION }
      else if (kind === 'sit' && !calm) sit.current = { active: true, t: 0, duration: SIT_DURATION }
      else if (kind === 'sleep' && !calm)
        sleep.current = { active: true, t: 0, duration: SLEEP_DURATION }
      else if (kind === 'dance' && !calm)
        dance.current = { active: true, t: 0, duration: DANCE_DURATION }
      else if (kind === 'heart' && !calm)
        heart.current = { active: true, t: 0, duration: HEART_DURATION }
      else hop.current = { active: true, t: 0, duration: 0.62 }
      /* 连点时抽中别的动作就先收手：手还在挥、身体却在转圈会互相打架 */
      if (kind !== 'wave') wave.current = { ...IDLE }
      /* 被戳一下就醒一会儿，然后再慢慢睡回去 */
      wake.current = 1
    }

    if (!calm) wake.current = Math.max(0, wake.current - dt / WAKE_DURATION)
    /* 疲惫时 rest 逼近 1；刚被点醒时压回 0 */
    const rest = env.values.rest * (1 - wake.current)

    /* 同频呼吸仅焦虑开启；被点醒时幅度减半 */
    const gate = breathGate(env.values.pulse)
    const breath = breathWave(t) * gate * (1 - wake.current * 0.5)
    /* 暖光守候仅难过开启 */
    const warmth = warmGlowGate(env.values.warmGlow)
    /* 雀跃微动作只在星光明显闪的心情里排期（joy / excited），其余心情不开门 */
    const twinkle = fidgetGate(env.values.starTwinkle)
    const twinkleAmplitude = fidgetAmplitude(env.values.starTwinkle)

    if (!calm && rest < 0.5 && t > blinkUntilRef.current && t > blinkAtRef.current) {
      blinkUntilRef.current = t + 0.14
      blinkAtRef.current = t + between(random, 2.6, 5)
    }
    /* 休息时眼睛是闭着的，眨眼逻辑让位给 rest；「睡觉」动作的深度在后面叠乘 */
    const awakeOpen = calm || rest >= 0.5 || t >= blinkUntilRef.current ? 1 : 0.12
    const eyeScale = awakeOpen * (1 - rest) + 0.06 * rest

    if (hop.current.active) {
      hop.current.t += dt
      if (hop.current.t >= hop.current.duration) hop.current.active = false
    }
    const hopProgress = hop.current.active ? hop.current.t / hop.current.duration : 1
    const hopStretch = hop.current.active ? Math.sin(hopProgress * Math.PI) : 0
    const hopY = hopStretch * 0.09

    if (twirlRef.current) {
      if (twirl.current.active) {
        twirl.current.t += dt
        if (twirl.current.t >= twirl.current.duration) twirl.current.active = false
      }
      twirlRef.current.rotation.y = twirl.current.active
        ? easeInOutQuad(Math.min(1, twirl.current.t / twirl.current.duration)) * Math.PI * 2
        : 0
    }

    if (wave.current.active) {
      wave.current.t += dt
      if (wave.current.t >= wave.current.duration) wave.current.active = false
    }
    /* 1.2s：举到肩侧 → 以肩为轴三个来回 → 放下。包络窗两端都回到 0，起止不跳变 */
    const waveActive = wave.current.active
    const waveProgress = waveActive ? Math.min(1, wave.current.t / wave.current.duration) : 1
    const waveEnvelope = waveActive ? Math.sin(waveProgress * Math.PI) : 0
    const waveSwing = Math.sin(waveProgress * Math.PI * 6) * 0.45
    /* 手臂的实际写入统一放在姿态合成处：跳舞与比心也要用这两条胳膊 */

    /* 充电先推进，雀跃才知道此刻到底忙不忙（同一帧里少差一轮） */
    if (glow.current.active) {
      glow.current.t += dt
      if (glow.current.t >= glow.current.duration) glow.current.active = false
    }
    const glowActive = glow.current.active
    const glowProgress = glowActive ? Math.min(1, glow.current.t / glow.current.duration) : 0
    const glowCurve = glowActive ? glowShape(glowProgress) : 0
    /* 1.4s：下蹲蓄力 → 触角灯亮到 2.2 → 指数衰减回静息值，同时身体回弹 */
    const crouch = chargeScales(chargeAmount(glowProgress))

    /* 打滚与充电一样先推进，雀跃才不会插进一次翻滚中间 */
    if (roll.current.active) {
      roll.current.t += dt
      if (roll.current.t >= roll.current.duration) roll.current.active = false
    }
    /* 没在播时经过秒数取 0：角度、离地、压平三个因子分别落在 0 / 0 / 1，逐位等于身体原样 */
    const rollElapsed = roll.current.active ? Math.min(ROLL_DURATION, roll.current.t) : 0
    const flat = rollSquash(rollElapsed)
    if (rollRef.current) {
      rollRef.current.rotation.x = rollSpinAngle(rollElapsed)
      /* 轴心抬到身体中心才翻得开，包裹组因此要多做一次反向平移把几何挪回原处（见 JSX） */
      rollRef.current.position.y = ROLL_PIVOT_Y + rollLift(rollElapsed)
    }

    /* 四个菜单动作同样先推进再取数：没在播时经过秒数取 0，每个因子逐位等于静息姿态 */
    if (sit.current.active) {
      sit.current.t += dt
      if (sit.current.t >= sit.current.duration) sit.current.active = false
    }
    if (sleep.current.active) {
      sleep.current.t += dt
      if (sleep.current.t >= sleep.current.duration) sleep.current.active = false
    }
    if (dance.current.active) {
      dance.current.t += dt
      if (dance.current.t >= dance.current.duration) dance.current.active = false
    }
    if (heart.current.active) {
      heart.current.t += dt
      if (heart.current.t >= heart.current.duration) heart.current.active = false
    }
    const sitting = sitPose(sit.current.active ? Math.min(SIT_DURATION, sit.current.t) : 0)
    const sleeping = sleepPose(sleep.current.active ? Math.min(SLEEP_DURATION, sleep.current.t) : 0)
    const dancing = dancePose(dance.current.active ? Math.min(DANCE_DURATION, dance.current.t) : 0)
    const hearting = heartPose(heart.current.active ? Math.min(HEART_DURATION, heart.current.t) : 0)

    /* 雀跃是待机级动作：排期规则在 lib 里，这里只负责推进与取数 */
    if (fidget.current.active) {
      fidget.current.t += dt
      if (fidget.current.t >= fidget.current.duration) fidget.current.active = false
    } else {
      const plan = scheduleFidget({
        time: t,
        calm,
        gate: twinkle,
        busy:
          hop.current.active ||
          twirl.current.active ||
          roll.current.active ||
          wave.current.active ||
          glow.current.active ||
          sit.current.active ||
          sleep.current.active ||
          dance.current.active ||
          heart.current.active,
        wake: wake.current,
        nextAt: fidgetAtRef.current,
        random: fidgetRandom,
      })
      fidgetAtRef.current = plan.nextAt
      if (plan.fire) fidget.current = { active: true, t: 0, duration: FIDGET_DURATION }
    }
    /* 没在播时贡献严格取 0，其余心情的公式因此逐位不变 */
    const fidgetActive = fidget.current.active
    const fidgetProgress = fidgetActive ? Math.min(1, fidget.current.t / fidget.current.duration) : 0
    const fidgetRoll = fidgetActive ? fidgetRollAngle(fidgetProgress, twinkleAmplitude) : 0
    const fidgetLift = fidgetActive ? fidgetLiftHeight(fidgetProgress, twinkleAmplitude) : 0

    /* 身体朝抬手的一侧微微侧倾，动作才不像只有手在动；雀跃的轻摇、跳舞的摆、比心的歪头走同一条通道 */
    bob.rotation.z = -0.05 * waveEnvelope + fidgetRoll + dancing.sway + hearting.tiltZ

    hoverScaleRef.current = THREE.MathUtils.damp(hoverScaleRef.current, hovered ? 1.07 : 1, 9, dt)
    const squash = hoverScaleRef.current

    /* 醒着是轻快的上下浮动，睡着换成慢一倍的呼吸起伏。calm 时 env.time 不推进，两者都停在 0。 */
    /* 焦虑门控开启时，清醒浮动按比例换成同频呼吸的慢节律 */
    const awakeY = (Math.sin(t * 1.6) * 0.006 * (1 - gate) + breath * 0.008) * (1 - rest)
    const restY = Math.sin(t * 0.75) * 0.004 * rest
    /* 坐下往下沉、跳舞往上弹、睡觉随慢呼吸轻微起伏，三者都只在自己播放时贡献非零值 */
    bob.position.y =
      awakeY + restY + hopY + fidgetLift - sitting.sink + dancing.bounce + sleeping.breath
    /* 跳舞拧身体叠加在原有朝向摇摆上；不跳时 spin 为 0，逐位不变 */
    bob.rotation.y = (calm ? 0 : swayAngle(t, warmth, rest)) + dancing.spin
    /* 打盹时头往前低一点，比只闭眼更容易读出来是在休息；坐下与睡觉各自再压低一点 */
    bob.rotation.x = 0.3 * rest + sitting.tiltX + sleeping.tiltX
    const heartBeat = 1 + hearting.pulse
    bob.scale.set(
      squash * (1 - hopStretch * 0.07) * crouch.xz * flat.xz * sitting.xz * heartBeat,
      squash *
        (1 + hopStretch * 0.12) *
        (1 - rest * 0.06) *
        (1 + breath * 0.022) *
        crouch.y *
        flat.y *
        sitting.squashY *
        heartBeat,
      squash * (1 - hopStretch * 0.07) * crouch.xz * flat.xz * sitting.xz * heartBeat,
    )

    /* 眼睛：睡觉动作把眼皮压到近乎全闭，其余情况沿用清醒/休息的口径 */
    const closedEye = eyeScale * sleeping.eyeOpen
    if (leftEyeRef.current) leftEyeRef.current.scale.y = closedEye
    if (rightEyeRef.current) rightEyeRef.current.scale.y = closedEye

    /* 手臂合成：挥手只动右手；跳舞与比心两只手一起举。取各通道里抬得最高的那个角度，
       同一时间至多一个通道非零（seq 块里已互斥），max 只是防抖的写法，不会互相抵消。 */
    const rightArm = Math.max((1.15 + waveSwing) * waveEnvelope, dancing.arm * 1.5, hearting.arm)
    const leftArm = Math.max(dancing.arm * 1.5, hearting.arm)
    if (waveRef.current) waveRef.current.rotation.z = rightArm
    /* 左手 pivot 与右手镜像，抬同样的角度要往反方向转 */
    if (leftArmRef.current) leftArmRef.current.rotation.z = -leftArm

    /* 腮红随比心加深：不比心时 opacity 恰为原值 0.75，逐位不变 */
    const blushOpacity = 0.75 + 0.25 * hearting.blush
    if (blushLeftRef.current) blushLeftRef.current.opacity = blushOpacity
    if (blushRightRef.current) blushRightRef.current.opacity = blushOpacity

    if (antennaRef.current) {
      /* 触角的小灯在伙伴休息时暗下去，等于给整个场景一个「安静了」的信号；难过时再抬一档；睡觉动作再压一档 */
      const baseIntensity = antennaIntensity(rest, breath, warmth) * (1 - sleeping.glowDim)
      /* 充电期间在这盏灯的静息值之上叠加脉冲，起止都落回原值，不会闪断 */
      antennaRef.current.emissiveIntensity = glowActive
        ? glowIntensity(baseIntensity, glowCurve)
        : baseIntensity
      /* 难过时灯色往暖橙靠：它不吵你，但这盏灯更不肯暗下去 */
      antennaRef.current.emissive
        .copy(ANTENNA_EMISSIVE)
        .lerp(ANTENNA_EMISSIVE_WARM, warmth * ANTENNA_WARM_MIX)
    }
    /* 灯球跟着脉冲放大一点，光才像是从这颗球里涨出来的 */
    if (antennaBulbRef.current) antennaBulbRef.current.scale.setScalar(bulbScale(glowCurve))

    /* 把头顶投影成屏幕坐标，供气泡锚定；转到背面半球时标记不可锚 */
    const root = rootRef.current
    if (root) {
      root.updateWorldMatrix(true, false)
      headWorld.current.set(0, 0.26, 0).applyMatrix4(root.matrixWorld)
      projected.current.copy(headWorld.current).project(camera)
      companionAnchor.x = (projected.current.x * 0.5 + 0.5) * size.width
      companionAnchor.y = (-projected.current.y * 0.5 + 0.5) * size.height
      toCamera.current.copy(camera.position).normalize()
      /* 顶部挂点本就在轮廓边缘（点积≈0.07），阈值必须低于它；转去背面才收回气泡 */
      companionAnchor.onScreen =
        projected.current.z < 1 && headWorld.current.normalize().dot(toCamera.current) > 0
      /* 脚底也投影一份：气泡翻到角色下方时从脚底起算，才不会盖住角色本身 */
      projected.current.set(0, 0, 0).applyMatrix4(root.matrixWorld).project(camera)
      companionAnchor.bottomY = (-projected.current.y * 0.5 + 0.5) * size.height
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    /* delta 是按下到抬起的指针位移，拖拽转星球时不应该触发互动 */
    if (event.delta > 5) return
    /* 长按已经弹出过菜单：抬手时浏览器补发的 click 不能再戳一下伙伴 */
    if (press.current.fired) {
      press.current.fired = false
      return
    }
    event.stopPropagation()
    /* 动作由 store 决定：解锁了「转个圈」才可能转，否则只是跳一下 */
    sound.play('bubble')
    pokeCompanion()
  }

  /* 右键：按下时记位置，contextmenu 时比对位移——右键拖动同样会转星球，拖完不该弹菜单 */
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const native = event.nativeEvent
    if (native.button === 2) {
      rightStart.current = { x: native.clientX, y: native.clientY }
      return
    }
    /* 长按只对触摸/触控笔生效：鼠标左键按住不动不是「长按」，交给点击与拖拽 */
    if (native.pointerType === 'mouse') return
    pressStart.current = { x: native.clientX, y: native.clientY }
    press.current.fired = false
    if (press.current.timer !== 0) window.clearTimeout(press.current.timer)
    press.current.active = true
    press.current.timer = window.setTimeout(() => {
      press.current.timer = 0
      press.current.active = false
      press.current.fired = true
      openCompanionMenu()
    }, LONG_PRESS_MS)
  }

  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    const native = event.nativeEvent
    const start = rightStart.current
    rightStart.current = null
    /* 位移超阈值视为右键拖动（在转星球），放行浏览器默认行为，不弹菜单也不拦截 */
    if (!start || Math.hypot(native.clientX - start.x, native.clientY - start.y) > RIGHT_DRAG_PX)
      return
    event.stopPropagation()
    /* 只在命中伙伴时压掉浏览器右键菜单；点在星球或空白处照旧 */
    native.preventDefault()
    openCompanionMenu()
  }

  /* 长按期间手指划走、抬起或系统取消，都要撤掉定时器；卸载时一并清理 */
  useEffect(() => {
    const cancel = () => {
      if (press.current.timer !== 0) {
        window.clearTimeout(press.current.timer)
        press.current.timer = 0
      }
      press.current.active = false
    }
    const onMove = (event: PointerEvent) => {
      if (!press.current.active) return
      const start = pressStart.current
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_MOVE_PX)
        cancel()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cancel)
    window.addEventListener('pointercancel', cancel)
    return () => {
      cancel()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [openCompanionMenu])

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
  }

  const handleOut = () => setHovered(false)

  return (
    <group
      ref={rootRef}
      name="companion"
      position={placement.position}
      quaternion={placement.quaternion}
      scale={COMPANION_SCALE}
    >
      <group ref={twirlRef}>
        {/* 打滚外包一层以身体中心为轴的 pivot，内层再反向平移把几何挪回原处：不翻时两层互相抵消 */}
        <group ref={rollRef} position={[0, ROLL_PIVOT_Y, 0]}>
          <group position={[0, -ROLL_PIVOT_Y, 0]}>
            <group
              ref={bobRef}
              onClick={handleClick}
              onPointerDown={handlePointerDown}
              onContextMenu={handleContextMenu}
              onPointerOver={handleOver}
              onPointerOut={handleOut}
            >
              {/* 身体 */}
              <mesh castShadow position={[0, 0.085, 0]} scale={[1, 0.94, 0.96]}>
                <sphereGeometry args={[0.085, 20, 14]} />
                <meshStandardMaterial color="#FFF4E4" roughness={0.62} metalness={0} />
              </mesh>
              {/* 肚皮 */}
              <mesh position={[0, 0.076, 0.055]} scale={[1, 0.92, 0.55]}>
                <sphereGeometry args={[0.058, 16, 12]} />
                <meshStandardMaterial color="#FFE9CE" roughness={0.72} metalness={0} />
              </mesh>

              {/* 眼睛：整组一起缩放 y 来完成眨眼与闭眼 */}
              <group ref={leftEyeRef} position={[-0.032, 0.115, 0.066]}>
                <mesh>
                  <sphereGeometry args={[0.0135, 10, 8]} />
                  <meshStandardMaterial color="#2E2648" roughness={0.35} metalness={0} />
                </mesh>
                <mesh position={[0.004, 0.005, 0.011]}>
                  <sphereGeometry args={[0.0045, 6, 5]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
              </group>
              <group ref={rightEyeRef} position={[0.032, 0.115, 0.066]}>
                <mesh>
                  <sphereGeometry args={[0.0135, 10, 8]} />
                  <meshStandardMaterial color="#2E2648" roughness={0.35} metalness={0} />
                </mesh>
                <mesh position={[0.004, 0.005, 0.011]}>
                  <sphereGeometry args={[0.0045, 6, 5]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
              </group>

              {/* 腮红 */}
              <mesh position={[-0.055, 0.095, 0.062]} scale={[1, 0.55, 0.3]}>
                <sphereGeometry args={[0.019, 10, 7]} />
                <meshStandardMaterial
                  ref={blushLeftRef}
                  color="#FFA3BE"
                  roughness={0.8}
                  transparent
                  opacity={0.75}
                  depthWrite={false}
                />
              </mesh>
              <mesh position={[0.055, 0.095, 0.062]} scale={[1, 0.55, 0.3]}>
                <sphereGeometry args={[0.019, 10, 7]} />
                <meshStandardMaterial
                  ref={blushRightRef}
                  color="#FFA3BE"
                  roughness={0.8}
                  transparent
                  opacity={0.75}
                  depthWrite={false}
                />
              </mesh>

              {/* 触角 */}
              <mesh position={[0, 0.19, 0]}>
                <capsuleGeometry args={[0.005, 0.045, 3, 6]} />
                <meshStandardMaterial color="#FFF4E4" roughness={0.62} metalness={0} />
              </mesh>
              <mesh ref={antennaBulbRef} position={[0, 0.226, 0]}>
                <sphereGeometry args={[0.015, 10, 8]} />
                <meshStandardMaterial
                  ref={antennaRef}
                  color="#FFD170"
                  emissive="#F2B84B"
                  emissiveIntensity={0.9}
                  roughness={0.4}
                />
              </mesh>

              {/* 脚 */}
              <mesh castShadow position={[-0.036, 0.014, 0.008]} scale={[1.2, 0.6, 1.4]}>
                <sphereGeometry args={[0.026, 10, 8]} />
                <meshStandardMaterial color="#FFE9CE" roughness={0.7} metalness={0} />
              </mesh>
              <mesh castShadow position={[0.036, 0.014, 0.008]} scale={[1.2, 0.6, 1.4]}>
                <sphereGeometry args={[0.026, 10, 8]} />
                <meshStandardMaterial color="#FFE9CE" roughness={0.7} metalness={0} />
              </mesh>
              {/* 左手外包一层与右手镜像的肩轴 pivot：静止时不转，手还在原来的位置 */}
              <group ref={leftArmRef} position={[-0.062, 0.105, 0.012]}>
                <mesh position={[-0.026, -0.017, 0]} scale={[1, 0.9, 0.9]}>
                  <sphereGeometry args={[0.021, 10, 8]} />
                  <meshStandardMaterial color="#FFE9CE" roughness={0.7} metalness={0} />
                </mesh>
              </group>
              {/* 右手外包一层以肩为轴的 pivot：静止时 pivot 不转，手还在原来的位置 */}
              <group ref={waveRef} position={[0.062, 0.105, 0.012]}>
                <mesh position={[0.026, -0.017, 0]} scale={[1, 0.9, 0.9]}>
                  <sphereGeometry args={[0.021, 10, 8]} />
                  <meshStandardMaterial color="#FFE9CE" roughness={0.7} metalness={0} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
