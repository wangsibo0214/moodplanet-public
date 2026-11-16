import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Lock, MailOpen, Trash2, Unlock, X } from 'lucide-react'

import { Button, EmptyState } from '@/components/ui'
import { capsuleStatus, formatRemaining, remainingMs } from '@/features/capsule/capsuleTime'
import type { CapsuleStatus, TimeCapsule } from '@/types/capsule'
import { cn } from '@/utils/cn'
import { formatFullDate, formatRecordTime, toDate } from '@/utils/date'

const STATUS_META: Record<CapsuleStatus, { label: string; className: string }> = {
  sealed: { label: '封存中', className: 'text-iris-300' },
  ready: { label: '待开启', className: 'text-butter-300' },
  opened: { label: '已开启', className: 'text-mint-300' },
}

const STATUS_ICON: Record<CapsuleStatus, typeof Lock> = {
  sealed: Lock,
  ready: Unlock,
  opened: MailOpen,
}

const RANK: Record<CapsuleStatus, number> = { ready: 0, sealed: 1, opened: 2 }

interface CapsuleListProps {
  capsules: TimeCapsule[]
  now: Date
  calm: boolean
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

/**
 * 胶囊列表。未到期的胶囊只露出标题与两个日期，正文根本不进 DOM；
 * 到期才出现开启入口，开启后正文与开启时间一起留在卡片里。
 */
export function CapsuleList({ capsules, now, calm, onOpen, onDelete }: CapsuleListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [justOpenedId, setJustOpenedId] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const entries = useMemo(
    () =>
      capsules
        .map((capsule) => ({ capsule, status: capsuleStatus(capsule, now) }))
        .sort((a, b) => {
          if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status]
          if (a.status === 'opened') {
            const left = toDate(a.capsule.openedAt ?? '')?.getTime() ?? 0
            const right = toDate(b.capsule.openedAt ?? '')?.getTime() ?? 0
            return right - left
          }
          const left = toDate(a.capsule.unlockAt)?.getTime() ?? 0
          const right = toDate(b.capsule.unlockAt)?.getTime() ?? 0
          return left - right
        }),
    [capsules, now],
  )

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Lock}
        title="胶囊匣是空的"
        description="写一段话给未来的自己，选一个开启日期。在此之前它会一直封存在这里，不会被打扰。"
      />
    )
  }

  const handleOpen = (id: string) => {
    onOpen(id)
    setJustOpenedId(id)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setJustOpenedId(null), 900)
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map(({ capsule, status }) => {
        const meta = STATUS_META[status]
        const Icon = STATUS_ICON[status]
        const confirming = confirmId === capsule.id
        return (
          <li
            key={capsule.id}
            className="relative overflow-hidden rounded-md bg-white/3 py-4 pr-4 pl-5"
          >
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-0 left-0 w-1',
                status === 'sealed' && 'bg-iris-400/60',
                status === 'ready' && 'bg-butter-400/70',
                status === 'opened' && 'bg-mint-400/60',
              )}
            />

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className={cn('flex items-center gap-1.5 text-sm font-medium', meta.className)}>
                <Icon className="size-3.5" strokeWidth={1.9} aria-hidden />
                {meta.label}
              </span>
              <span className="font-display text-sm font-semibold text-ink-100">
                {capsule.title}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-ink-700">
              封存于 {formatRecordTime(capsule.createdAt)} ·{' '}
              {status === 'opened'
                ? `原定 ${formatFullDate(capsule.unlockAt)} 开启`
                : `将于 ${formatFullDate(capsule.unlockAt)} 开启`}
            </p>

            {status === 'sealed' ? (
              <p className="mt-2.5 text-sm text-iris-300">
                还有 {formatRemaining(remainingMs(capsule, now))}
                <span className="ml-2 text-xs text-ink-700">正文在沉睡，到期前不会显示。</span>
              </p>
            ) : null}

            {status === 'ready' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm text-butter-300">它等到了今天，准备好再打开。</p>
                <Button
                  size="sm"
                  data-sound="none"
                  onClick={() => handleOpen(capsule.id)}
                  aria-label={`开启胶囊 ${capsule.title}`}
                >
                  <Unlock className="size-4" strokeWidth={1.9} aria-hidden />
                  开启胶囊
                </Button>
              </div>
            ) : null}

            {status === 'opened' && capsule.openedAt ? (
              <div
                className={cn('mt-3 flex flex-col gap-2', !calm && justOpenedId === capsule.id && 'stagger-rise')}
              >
                <p className="text-xs text-ink-700">开启于 {formatRecordTime(capsule.openedAt)}</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-300">
                  {capsule.content}
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-end">
              {confirming ? (
                <div role="group" aria-label="确认删除这个胶囊" className="flex items-center gap-2">
                  <span className="mr-auto text-xs text-ink-500 sm:mr-0">删掉就找不回来了</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmId(null)}
                    aria-label="取消删除"
                  >
                    <X className="size-4" strokeWidth={1.9} aria-hidden />
                    取消
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfirmId(null)
                      onDelete(capsule.id)
                    }}
                    aria-label="确认删除这个胶囊"
                  >
                    <Check className="size-4" strokeWidth={1.9} aria-hidden />
                    确认删除
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmId(capsule.id)}
                  aria-label={`删除胶囊 ${capsule.title}`}
                >
                  <Trash2 className="size-4" strokeWidth={1.9} aria-hidden />
                  删除
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
