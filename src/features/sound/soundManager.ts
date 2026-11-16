import { canPlay, resolveVoice } from './lib/policy'
import { SOUND_NAMES, SOUND_SAMPLE_RATE, renderSound, type SoundName } from './lib/synth'

/**
 * 全局音效管理器（单例）。
 *
 * - 资源：九种音效由 lib/synth 纯函数在本机渲染成 AudioBuffer，无音频文件、无网络请求。
 * - 自动播放策略：AudioContext 懒创建，且只在用户手势（pointerdown/keydown）里解锁；
 *   上下文仍处 suspended 时直接放弃本次播放，不尝试绕过浏览器限制。
 * - 静音：configure(false) 立即 stopAll，正在响的声音也停。
 * - 音量：主 GainNode 实时 setTargetAtTime，拖动滑块即刻生效。
 * - 防疲劳：同音冷却 + 4 声部上限（规则在 lib/policy，可单测）。
 * - 释放：dispose() 停声、断监听、关上下文；App 卸载 / HMR 时调用。
 */

interface Voice {
  name: SoundName
  source: AudioBufferSourceNode
  startedAt: number
}

/** 感知音量曲线：平方映射，60% 听起来是「适中」而不是「过半响」 */
function volumeCurve(volume: number): number {
  const v = Math.min(1, Math.max(0, volume))
  return v * v
}

class SoundManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<SoundName, AudioBuffer>()
  private voices: Voice[] = []
  private lastPlayed = new Map<SoundName, number>()
  private previewTimers: number[] = []
  private enabled = true
  private volume = 0.6
  private disposed = true
  private gestureBound = false

  private readonly onGesture = () => {
    this.unlock()
  }

  /** App 挂载时调用：绑定一次性手势解锁监听（StrictMode 重挂载也安全） */
  init(): void {
    this.disposed = false
    if (this.gestureBound) return
    this.gestureBound = true
    window.addEventListener('pointerdown', this.onGesture, { capture: true, once: true })
    window.addEventListener('keydown', this.onGesture, { capture: true, once: true })
  }

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled
    this.volume = Math.min(1, Math.max(0, volume))
    if (this.ctx && this.master) {
      const target = enabled ? volumeCurve(this.volume) : 0
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02)
    }
    if (!enabled) this.stopAll()
  }

  /** 用户手势里调用：创建/恢复上下文。失败一律静默降级为无声 */
  unlock(): void {
    if (this.disposed) return
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  }

  play(name: SoundName): void {
    if (!this.enabled || this.disposed) return
    const now = performance.now()
    if (!canPlay(this.lastPlayed.get(name), now, name)) return
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    if (ctx.state !== 'running') {
      /* 没有用户激活时 resume 不会成功：放弃本次，等下一次手势后的交互 */
      void ctx.resume().catch(() => {})
      if ((ctx.state as AudioContextState) !== 'running') return
    }
    const buffer = this.buffers.get(name)
    if (!buffer) return
    const decision = resolveVoice(this.voices, name)
    if (decision.kind === 'drop') return
    if (decision.kind === 'steal') this.stopVoice(decision.index)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.master)
    const voice: Voice = { name, source, startedAt: now }
    source.onended = () => {
      this.voices = this.voices.filter((item) => item !== voice)
      source.disconnect()
    }
    this.voices.push(voice)
    this.lastPlayed.set(name, now)
    try {
      source.start()
    } catch {
      this.voices = this.voices.filter((item) => item !== voice)
      source.disconnect()
    }
  }

  /** 设置页试听：pop → chime → bell 三音小样，展示由轻到亮的层次 */
  preview(): void {
    if (!this.enabled || this.disposed) return
    this.play('pop')
    this.previewTimers.push(
      window.setTimeout(() => this.play('chime'), 240),
      window.setTimeout(() => this.play('bell'), 560),
    )
  }

  stopAll(): void {
    for (let i = this.voices.length - 1; i >= 0; i--) this.stopVoice(i)
    this.voices = []
  }

  /** 卸载释放：停声、清预览定时器、断手势监听、关闭上下文 */
  dispose(): void {
    this.disposed = true
    for (const id of this.previewTimers) window.clearTimeout(id)
    this.previewTimers = []
    this.stopAll()
    if (this.gestureBound) {
      window.removeEventListener('pointerdown', this.onGesture, { capture: true })
      window.removeEventListener('keydown', this.onGesture, { capture: true })
      this.gestureBound = false
    }
    this.buffers.clear()
    this.lastPlayed.clear()
    if (this.ctx) {
      void this.ctx.close().catch(() => {})
      this.ctx = null
      this.master = null
    }
  }

  private stopVoice(index: number): void {
    const voice = this.voices[index]
    if (!voice) return
    try {
      voice.source.stop()
    } catch {
      /* 已自然结束的 source 再 stop 会抛：忽略 */
    }
    voice.source.disconnect()
    this.voices.splice(index, 1)
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.gain.value = this.enabled ? volumeCurve(this.volume) : 0
      master.connect(ctx.destination)
      this.ctx = ctx
      this.master = master
      for (const name of SOUND_NAMES) {
        try {
          const data = renderSound(name, SOUND_SAMPLE_RATE)
          const buffer = ctx.createBuffer(1, data.length, SOUND_SAMPLE_RATE)
          buffer.copyToChannel(data, 0)
          this.buffers.set(name, buffer)
        } catch {
          /* 单种音效渲染失败只缺席它自己，不影响其余 */
        }
      }
    } catch {
      this.ctx = null
      this.master = null
      return null
    }
    return this.ctx
  }
}

export const sound = new SoundManager()
