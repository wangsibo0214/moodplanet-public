import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Archive, CalendarDays, Sparkles, Tags, X } from 'lucide-react'

import {
  buttonClasses,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  PageLoader,
} from '@/components/ui'
import {
  ChipCloud,
  MoodDistribution,
  StatCards,
  WeekChart,
} from '@/features/archive/components/ArchivePanels'
import { ArchiveRecordList } from '@/features/archive/components/ArchiveRecordList'
import { MoodCalendar } from '@/features/archive/components/MoodCalendar'
import { computeArchiveStats } from '@/features/archive/archiveStats'
import { MemoryStarList } from '@/features/memory/components/MemoryStarList'
import { useDocumentTitle } from '@/hooks'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'

export default function EmotionArchivePage() {
  useDocumentTitle('情绪档案')

  const records = useMoodStore((state) => state.records)
  const status = useMoodStore((state) => state.status)
  const loadError = useMoodStore((state) => state.loadError)
  const saveError = useMoodStore((state) => state.saveError)
  const dismissErrors = useMoodStore((state) => state.dismissErrors)
  const starCount = usePlanetStore((state) => state.stars.length)

  /* 统计跟着记录走；now 取进入页面那一刻，跨零点后重新进入会重算 */
  const [now] = useState(() => new Date())
  const stats = useMemo(() => computeArchiveStats(records, now), [records, now])

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        icon={Archive}
        title="情绪档案"
        description="把一段时间里的心情摊开来看：节奏、色调、反复出现的词，和那些被点亮的星。"
      />

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

      {status === 'loading' ? (
        <PageLoader />
      ) : stats.total === 0 ? (
        <EmptyState
          icon={Archive}
          title="档案还是空的"
          description="写下第一条心情之后，这里会开始累积只属于你的统计：七天节奏、心情分布、高频的词，以及记忆星回顾。"
          action={
            <Link to="/record" className={buttonClasses('primary', 'md')}>
              去写第一条
            </Link>
          }
        />
      ) : (
        <>
          <StatCards stats={stats} starCount={starCount} />

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>最近 7 天</CardTitle>
                <CardDescription>
                  共 {stats.weekTotal} 条记录，覆盖 {stats.weekActiveDays} 天；柱子颜色是当天最新的心情。
                </CardDescription>
              </CardHeader>
              <div className="mt-5">
                <WeekChart week={stats.week} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>心情分布</CardTitle>
                <CardDescription>六种心情各出现过多少次，全部来自本机保存的记录。</CardDescription>
              </CardHeader>
              <div className="mt-5">
                <MoodDistribution moodCounts={stats.moodCounts} />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Tags className="mr-1.5 inline size-4 text-astro-300" strokeWidth={1.8} aria-hidden />
                  高频标签
                </CardTitle>
              </CardHeader>
              <div className="mt-4">
                <ChipCloud
                  tags={stats.tagCounts}
                  emptyText="还没有打过标签。记录时选几个场景，这里就会慢慢长出你的高频场景。"
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <Sparkles className="mr-1.5 inline size-4 text-iris-300" strokeWidth={1.8} aria-hidden />
                  常见关键词
                </CardTitle>
              </CardHeader>
              <div className="mt-4">
                <ChipCloud
                  keywords={stats.keywordCounts}
                  emptyText="关键词来自保存时选择的本地解读；多解读几条，这里就会出现反复出现的词。"
                />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                <CalendarDays className="mr-1.5 inline size-4 text-mint-400" strokeWidth={1.8} aria-hidden />
                心情日历
              </CardTitle>
              <CardDescription>有记录的日期会点一颗对应心情的色点，点任意一天查看当天的记录。</CardDescription>
            </CardHeader>
            <div className="mt-5">
              <MoodCalendar records={records} />
            </div>
          </Card>

          <ArchiveRecordList records={records} />

          <Card>
            <CardHeader>
              <CardTitle>记忆星回顾</CardTitle>
              <CardDescription>
                每颗星都由一条真实记录点亮；点开任意一颗，回到当时写下的那句话。
              </CardDescription>
            </CardHeader>
            <div className="mt-5">
              <MemoryStarList />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
