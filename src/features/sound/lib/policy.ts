/**
 * 播放策略纯逻辑：同音冷却 + 声部上限。
 * 抽成纯函数是为了可单测： manager 只负责 WebAudio，取舍规则都在这里。
 */

import type { SoundName } from './synth'

/** 同一音效的最小间隔（毫秒）：连点不会叠成一片 */
export const COOLDOWN_MS: Record<SoundName, number> = {
  click: 90,
  pop: 160,
  whoosh: 200,
  chime: 260,
  bubble: 130,
  success: 500,
  sparkle: 500,
  bell: 600,
  confirm: 450,
}

/** 优先级：提醒类 > 反馈类 > 环境类。声部满时只挤掉同级或更低级 */
export const PRIORITY: Record<SoundName, number> = {
  click: 1,
  whoosh: 1,
  pop: 2,
  bubble: 2,
  confirm: 2,
  chime: 3,
  success: 3,
  sparkle: 3,
  bell: 3,
}

/** 同时发声上限：再多就互相掩蔽，听感会乱 */
export const MAX_VOICES = 4

export function canPlay(lastPlayedAt: number | undefined, now: number, name: SoundName): boolean {
  if (lastPlayedAt === undefined) return true
  return now - lastPlayedAt >= COOLDOWN_MS[name]
}

export interface VoiceLike {
  name: SoundName
  startedAt: number
}

export type VoiceDecision = { kind: 'ok' } | { kind: 'steal'; index: number } | { kind: 'drop' }

/** 声部已满时的取舍：挤掉「优先级不高于来者」里最老的一声；全都更高则放弃来者 */
export function resolveVoice(voices: readonly VoiceLike[], incoming: SoundName): VoiceDecision {
  if (voices.length < MAX_VOICES) return { kind: 'ok' }
  const ceiling = PRIORITY[incoming]
  let index = -1
  for (let i = 0; i < voices.length; i++) {
    if (PRIORITY[voices[i].name] > ceiling) continue
    if (index === -1 || voices[i].startedAt < voices[index].startedAt) index = i
  }
  return index === -1 ? { kind: 'drop' } : { kind: 'steal', index }
}
