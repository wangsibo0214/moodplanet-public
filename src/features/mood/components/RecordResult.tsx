import { HeartHandshake, Quote, Sparkles } from 'lucide-react'

import { Badge, Card } from '@/components/ui'
import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import { ANALYSIS_DISCLAIMER } from '@/services/moodAnalysis'
import type { MoodRecord } from '@/types/mood'
import { formatRecordTime } from '@/utils/date'

import { PlanetPreview } from './PlanetPreview'

interface RecordResultProps {
  record: MoodRecord
  /** 卡片标题：新保存的叫「刚刚收下的心情」，历史里叫「这条记录的解读」 */
  title?: string
}

/** 保存后的结果展示：心情、主题、关键词、反馈、关怀建议与星球变化预览。 */
export function RecordResult({ record, title = '刚刚收下的心情' }: RecordResultProps) {
  const mood = MOOD_MAP[record.mood]

  return (
    <Card className="stagger-rise overflow-hidden">
      <div
        aria-hidden
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${mood.hex}, ${mood.hex}33)` }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-50">{title}</h2>
          <p className="mt-1 text-xs text-ink-700">{formatRecordTime(record.createdAt)}</p>
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
          style={{
            backgroundColor: `${mood.hex}1f`,
            color: mood.hex,
            border: `1px solid ${mood.hex}59`,
          }}
        >
          <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: mood.hex }} />
          {mood.label}
        </span>
      </div>

      {record.content.trim() ? (
        <blockquote className="mt-4 border-l-2 border-hairline-strong pl-3.5 text-sm leading-relaxed text-ink-300">
          <Quote className="mb-1 size-3.5 text-ink-700" strokeWidth={1.8} aria-hidden />
          {record.content}
        </blockquote>
      ) : null}

      {record.tags.length > 0 ? (
        <ul className="mt-3.5 flex flex-wrap gap-1.5">
          {record.tags.map((tag) => (
            <li key={tag}>
              <Badge tone="neutral">{TAG_MAP[tag].label}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {record.analyzed ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-white/3 p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-ink-700">
              <Sparkles className="size-3.5 text-butter-300" strokeWidth={1.8} aria-hidden />
              情绪主题
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-ink-50">{record.theme}</dd>
          </div>
          <div className="rounded-md bg-white/3 p-3.5">
            <dt className="text-xs text-ink-700">关键词</dt>
            <dd className="mt-2 flex flex-wrap gap-1.5">
              {record.keywords.length > 0 ? (
                record.keywords.map((word) => (
                  <Badge key={word} tone="iris">
                    {word}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-ink-500">这次没有提取到关键词</span>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-5 rounded-md bg-white/3 px-3.5 py-3 text-sm text-ink-500">
          这条记录按你的选择原样收下了，没有跑本地解读。想看看的时候，编辑一次就能补上。
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <p className="text-xs text-ink-700">温和反馈</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-100">{record.feedback}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-ink-700">
            <HeartHandshake className="size-3.5 text-mint-300" strokeWidth={1.8} aria-hidden />
            自我关怀建议
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-100">{record.suggestion}</p>
        </div>
      </div>

      {record.planet ? (
        <div className="mt-5 rounded-md bg-white/3 p-3.5">
          <p className="text-xs text-ink-700">星球变化预览</p>
          <div className="mt-2.5">
            <PlanetPreview planet={record.planet} moodLabel={mood.label} />
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-ink-700">{ANALYSIS_DISCLAIMER}</p>
    </Card>
  )
}
