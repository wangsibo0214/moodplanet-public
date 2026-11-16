import type { CSSProperties } from 'react'
import { Volume1 } from 'lucide-react'

export interface VolumeSliderProps {
  /** 0–1 */
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}

/** 音量滑块：轨道填充色走 iris→butter 渐变，拇指与焦点环沿用星球配色。 */
export function VolumeSlider({ value, disabled = false, onChange }: VolumeSliderProps) {
  const percent = Math.round(value * 100)
  return (
    <div className="flex w-48 items-center gap-3 sm:w-56">
      <Volume1 className="size-4 shrink-0 text-ink-500" strokeWidth={1.9} aria-hidden />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={disabled}
        aria-label="音效音量"
        aria-valuetext={`${percent}%`}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="sound-slider min-w-0 flex-1"
        style={{ '--sound-fill': `${percent}%` } as CSSProperties}
      />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-300">{percent}%</span>
    </div>
  )
}
