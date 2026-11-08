import { useMemo, useState } from 'react'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui'
import { QUICK_UNLOCK_DAYS, unlockDateFor } from '@/features/capsule/capsuleTime'
import { useCapsuleStore } from '@/stores/useCapsuleStore'
import { cn } from '@/utils/cn'
import { formatFullDate } from '@/utils/date'

const CONTENT_MAX = 600

interface CapsuleFormProps {
  /** 页面每 30 秒自走的当前时刻：预览与提交共用同一时钟来源 */
  now: Date
  onSealed: (message: string) => void
}

export function CapsuleForm({ now, onSealed }: CapsuleFormProps) {
  const createCapsule = useCapsuleStore((state) => state.createCapsule)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [days, setDays] = useState<(typeof QUICK_UNLOCK_DAYS)[number]>(7)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(() => unlockDateFor(days, now), [days, now])

  const submit = () => {
    if (content.trim().length === 0) {
      setError('先写一点什么吧，一句话也可以。')
      return
    }
    const capsule = createCapsule({
      title,
      content,
      unlockAt: unlockDateFor(days, new Date()).toISOString(),
    })
    onSealed(`胶囊已封存，会在 ${formatFullDate(capsule.unlockAt)} 醒来。`)
    setTitle('')
    setContent('')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-100">胶囊标题</span>
        <span className="text-xs text-ink-700">可以不写，默认叫「未命名的胶囊」。</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={40}
          placeholder="例如：给三个月后的自己"
          className="h-11 rounded-md bg-white/4 px-3.5 text-sm text-ink-100 placeholder:text-ink-700 focus:bg-white/6"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink-100">写给未来自己的话</span>
          <span className="font-display text-xs text-ink-700">
            {content.length} / {CONTENT_MAX}
          </span>
        </span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, CONTENT_MAX))}
          rows={5}
          placeholder="此刻的念头、担心、或一件很小的好事。封存后到期前谁都看不到，包括你自己。"
          className="resize-y rounded-md bg-white/4 px-3.5 py-3 text-sm leading-relaxed text-ink-100 placeholder:text-ink-700 focus:bg-white/6"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-100" id="capsule-unlock-label">
          开启日期
        </span>
        <div
          role="radiogroup"
          aria-labelledby="capsule-unlock-label"
          className="grid grid-cols-3 gap-2"
        >
          {QUICK_UNLOCK_DAYS.map((option) => {
            const selected = option === days
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDays(option)}
                className={cn(
                  'h-11 cursor-pointer rounded-md text-sm font-medium transition-colors duration-200 ease-soft',
                  selected
                    ? 'bg-iris-500/25 text-iris-200 ring-1 ring-iris-300/50 ring-inset'
                    : 'bg-white/4 text-ink-300 hover:bg-white/8 hover:text-ink-100',
                )}
              >
                {option} 天后
              </button>
            )
          })}
        </div>
        <p className="text-xs leading-relaxed text-ink-500">
          具体开启时间：{formatFullDate(preview.toISOString())}
          ，到点之前内容不会显示在任何普通界面里。
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-blush-300">
          {error}
        </p>
      ) : null}

      <Button block onClick={submit}>
        <Lock className="size-4" strokeWidth={1.9} aria-hidden />
        封存胶囊
      </Button>
    </div>
  )
}
