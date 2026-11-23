import { useSettingsStore } from '@/stores/useSettingsStore'

import { SOUND_NAMES, type SoundName } from './lib/synth'
import { sound } from './soundManager'

/**
 * 音效系统接线：设置同步、全局按钮 Click、手势解锁。
 * 返回清理函数，App 卸载时停声并释放上下文。
 */

function isSoundName(value: string): value is SoundName {
  return (SOUND_NAMES as readonly string[]).includes(value)
}

/** 这些设置落盘时给一声轻确认；音量/开关本身不响，避免拖滑块时连环 beep */
function isConfirmableChange(
  prev: { meteorShower: boolean; starDensity: string; navCollapsed: boolean },
  next: { meteorShower: boolean; starDensity: string; navCollapsed: boolean },
): boolean {
  return (
    prev.meteorShower !== next.meteorShower ||
    prev.starDensity !== next.starDensity ||
    prev.navCollapsed !== next.navCollapsed
  )
}

export function startSoundSystem(): () => void {
  sound.init()

  const apply = (state: { soundEnabled: boolean; soundVolume: number }) => {
    sound.configure(state.soundEnabled, state.soundVolume)
  }
  apply(useSettingsStore.getState())

  let prev = useSettingsStore.getState()
  const unsubscribe = useSettingsStore.subscribe((next) => {
    apply(next)
    if (next.soundEnabled && !prev.soundEnabled) sound.play('confirm')
    else if (isConfirmableChange(prev, next)) sound.play('confirm')
    prev = next
  })

  /* 普通按钮统一轻柔 Click；带 data-sound 的按钮走专属音或明确静音 */
  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const el = target.closest('button, [role="button"]')
    if (!el) return
    const cue = el.getAttribute('data-sound')
    if (cue === 'none') return
    sound.play(cue !== null && isSoundName(cue) ? cue : 'click')
  }
  document.addEventListener('click', onClick, true)

  return () => {
    document.removeEventListener('click', onClick, true)
    unsubscribe()
    sound.dispose()
  }
}
