import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Hourglass, Info, X } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle, PageHeader } from '@/components/ui'
import { CapsuleForm } from '@/features/capsule/components/CapsuleForm'
import { CapsuleList } from '@/features/capsule/components/CapsuleList'
import { CapsuleStage } from '@/features/capsule/components/CapsuleStage'
import { capsuleStatus } from '@/features/capsule/capsuleTime'
import { useDocumentTitle, useMediaQuery } from '@/hooks'
import { useCapsuleStore } from '@/stores/useCapsuleStore'

const CAPSULE_STEPS = [
  { step: '01', title: '写下此刻', detail: '一段话、一个念头，或一件很小的好事。' },
  { step: '02', title: '选开启日', detail: '7 天、30 天、90 天，到点之前谁都看不到正文。' },
  { step: '03', title: '封存等待', detail: '到期那天它会自己醒来，开启时间会被记下来。' },
] as const

export default function TimeCapsulePage() {
  useDocumentTitle('时光胶囊')

  const capsules = useCapsuleStore((state) => state.capsules)
  const status = useCapsuleStore((state) => state.status)
  const hydrate = useCapsuleStore((state) => state.hydrate)
  const openCapsule = useCapsuleStore((state) => state.openCapsule)
  const deleteCapsule = useCapsuleStore((state) => state.deleteCapsule)
  const loadError = useCapsuleStore((state) => state.loadError)
  const saveError = useCapsuleStore((state) => state.saveError)
  const dismissErrors = useCapsuleStore((state) => state.dismissErrors)

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const calm = prefersReducedMotion

  /* 剩余时间每分钟自己走一次，不靠手动刷新 */
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    /* 后台标签页的定时器会被浏览器节流：回到前台立刻补一次，到期状态不用等下一拍 */
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const [notice, setNotice] = useState<string | null>(null)

  /* 3D 小舞台跟着「最值得看的那颗」走：有待开启就先照它 */
  const focusStatus = useMemo(() => {
    const live = capsules.map((capsule) => capsuleStatus(capsule, now))
    if (live.includes('ready')) return 'ready' as const
    if (live.includes('sealed')) return 'sealed' as const
    if (live.includes('opened')) return 'opened' as const
    return null
  }, [capsules, now])

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        icon={Hourglass}
        title="时光胶囊"
        description="写一段话给未来的自己，选定日期后封存。到期那天它会自己打开。"
      />

      <div className="glass-panel flex items-start gap-3 border-astro-400/25 px-4 py-3.5">
        <Info className="mt-0.5 size-4 shrink-0 text-astro-300" strokeWidth={1.8} aria-hidden />
        <p className="text-sm leading-relaxed text-ink-300">
          胶囊只保存在当前浏览器本地。清除浏览器数据、使用无痕窗口或更换设备，都会让这里的内容消失。
        </p>
      </div>

      <CapsuleStage status={focusStatus} />

      {notice ? (
        <div
          role="status"
          className="glass-panel flex items-start gap-3 border-mint-400/30 px-4 py-3.5"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-mint-300" strokeWidth={1.9} aria-hidden />
          <p className="flex-1 text-sm leading-relaxed text-ink-300">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="关闭提示"
            className="-mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-500 transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-100"
          >
            <X className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      ) : null}

      {loadError || saveError ? (
        <div
          role="status"
          className="glass-panel flex items-start gap-3 border-butter-400/30 px-4 py-3.5"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-butter-300"
            strokeWidth={1.8}
            aria-hidden
          />
          <div className="flex-1 space-y-1 text-sm leading-relaxed text-ink-300">
            {loadError ? <p>{loadError}</p> : null}
            {saveError ? <p>{saveError}</p> : null}
          </div>
          <button
            type="button"
            onClick={dismissErrors}
            aria-label="关闭提示"
            className="-mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-500 transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-100"
          >
            <X className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>封一颗新胶囊</CardTitle>
            <CardDescription>到期之前，正文不会出现在任何普通界面里。</CardDescription>
          </CardHeader>
          <div className="mt-5">
            <CapsuleForm now={now} onSealed={setNotice} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>胶囊匣</CardTitle>
            <CardDescription>封存中、待开启与已开启的胶囊都会列在这里。</CardDescription>
          </CardHeader>
          <div className="mt-5">
            {status === 'loading' ? (
              <p className="text-xs text-ink-700">正在读取本机保存的胶囊…</p>
            ) : (
              <CapsuleList
                capsules={capsules}
                now={now}
                calm={calm}
                onOpen={openCapsule}
                onDelete={deleteCapsule}
              />
            )}
          </div>
        </Card>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {CAPSULE_STEPS.map((item) => (
          <Card key={item.step} className="flex flex-col gap-2">
            <span className="font-display text-sm font-semibold text-iris-400">{item.step}</span>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.detail}</CardDescription>
          </Card>
        ))}
      </section>
    </div>
  )
}
