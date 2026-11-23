import type { MoodKey, MoodRecord } from '@/types/mood'
import { localDayKey, toDate } from '@/utils/date'

/**
 * 文字版当日总结。
 *
 * 与 dayMood.synthesizeDay 的分工：synthesizeDay 只数心情标题、供星球环境色使用，
 * 保持原样不动；本模块改读每条记录保存时已由本地规则从正文算出的 theme / keywords，
 * 对当天「全部」记录聚合（不是只看最后一条），得出主题、关键词与整体倾向。
 * 纯函数、零依赖、零网络：同样的输入永远得到同样的结果。
 * 它不是心理评估，界面消费时须沿用 ANALYSIS_DISCLAIMER 的口径。
 */

export type DaySentiment = 'positive' | 'negative' | 'neutral'

export interface DayThemeCount {
  theme: string
  count: number
}

export interface DayKeywordCount {
  keyword: string
  count: number
}

export interface DayTextSummary {
  dayKey: string
  /** 当天全部记录数 */
  total: number
  /** 其中跑过本地文字分析的记录数 */
  analyzedTotal: number
  /** 主题按次数倒序；并列时较晚记录的主题在前 */
  themes: DayThemeCount[]
  topTheme: string | null
  /** 关键词按次数倒序、同次数按字典序，保证确定性 */
  keywords: DayKeywordCount[]
  topKeywords: string[]
  /** 当天每条记录配价的平均，范围 [-2, 2] */
  score: number
  sentiment: DaySentiment
}

/** 心情本身的基调：文字缺席时仍有一个温和的先验。 */
const MOOD_VALENCE: Record<MoodKey, number> = {
  joy: 1,
  excited: 1,
  calm: 0,
  tired: -0.5,
  anxious: -0.5,
  sad: -1,
}

/** 文字关键词的基调，键与 moodAnalysis 词典产出的关键词标签一致。 */
const KEYWORD_VALENCE: Record<string, number> = {
  开心: 1,
  兴奋: 1,
  期待: 1,
  感动: 1,
  感激: 1,
  完成感: 1,
  放松: 0.5,
  休息: 0.5,
  睡眠: 0.5,
  运动: 0.5,
  跑步: 0.5,
  散步: 0.5,
  相处: 0.5,
  独处: 0,
  疲惫: -1,
  压力: -1,
  紧张: -1,
  焦虑: -1,
  难过: -1,
  委屈: -1,
  孤独: -1,
}

/** 整体倾向的判定阈值：平均分越过 ±0.25 才说偏正 / 偏负，其余算中性。 */
export const SENTIMENT_POSITIVE_MIN = 0.25
export const SENTIMENT_NEGATIVE_MAX = -0.25

/** 总结句里最多点名的关键词数。 */
export const DAY_KEYWORD_LIMIT = 4

const SENTIMENT_LABEL: Record<DaySentiment, string> = {
  positive: '正向',
  negative: '负向',
  neutral: '中性',
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 单条记录的配价：心情先验 + 文字关键词的平均基调（夹到 [-1, 1]）。 */
export function recordValence(record: MoodRecord): number {
  const words = record.keywords
  let textPart = 0
  if (words.length > 0) {
    const sum = words.reduce((acc, word) => acc + (KEYWORD_VALENCE[word] ?? 0), 0)
    textPart = clamp(sum / words.length, -1, 1)
  }
  return MOOD_VALENCE[record.mood] + textPart
}

export function sentimentOf(score: number): DaySentiment {
  if (score > SENTIMENT_POSITIVE_MIN) return 'positive'
  if (score < SENTIMENT_NEGATIVE_MAX) return 'negative'
  return 'neutral'
}

/** 综合某一天（本地日键）全部记录的文字信号；当天没有有效记录时返回 null。 */
export function synthesizeDayText(
  records: readonly MoodRecord[],
  dayKey: string,
): DayTextSummary | null {
  const ofDay: { record: MoodRecord; time: number }[] = []
  for (const record of records) {
    const created = toDate(record.createdAt)
    if (!created || localDayKey(created) !== dayKey) continue
    ofDay.push({ record, time: created.getTime() })
  }
  if (ofDay.length === 0) return null

  const themeTally = new Map<string, { count: number; latestTime: number }>()
  const keywordTally = new Map<string, number>()
  let scoreSum = 0
  let analyzedTotal = 0

  for (const { record, time } of ofDay) {
    scoreSum += recordValence(record)
    if (record.analyzed) analyzedTotal += 1

    const theme = record.theme.trim()
    if (theme) {
      const entry = themeTally.get(theme) ?? { count: 0, latestTime: 0 }
      entry.count += 1
      entry.latestTime = Math.max(entry.latestTime, time)
      themeTally.set(theme, entry)
    }
    for (const word of record.keywords) {
      if (!word) continue
      keywordTally.set(word, (keywordTally.get(word) ?? 0) + 1)
    }
  }

  const themes: DayThemeCount[] = [...themeTally.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].latestTime - a[1].latestTime)
    .map(([theme, entry]) => ({ theme, count: entry.count }))

  const keywords: DayKeywordCount[] = [...keywordTally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .map(([keyword, count]) => ({ keyword, count }))

  const score = scoreSum / ofDay.length

  return {
    dayKey,
    total: ofDay.length,
    analyzedTotal,
    themes,
    topTheme: themes[0]?.theme ?? null,
    keywords,
    topKeywords: keywords.slice(0, DAY_KEYWORD_LIMIT).map((entry) => entry.keyword),
    score,
    sentiment: sentimentOf(score),
  }
}

/** 综合今天的全部记录；今天还没写时为 null。 */
export function synthesizeTodayText(
  records: readonly MoodRecord[],
  now: Date,
): DayTextSummary | null {
  return synthesizeDayText(records, localDayKey(now))
}

/** 把总结写成一句如实的话：点主题或关键词 + 整体倾向，不报心情标题频次。 */
export function daySummaryLine(summary: DayTextSummary): string {
  const head = `今天共 ${summary.total} 条记录，`
  const tail = `整体偏${SENTIMENT_LABEL[summary.sentiment]}。`
  if (summary.topTheme) return `${head}文字里最常落在「${summary.topTheme}」，${tail}`
  if (summary.topKeywords.length > 0) {
    return `${head}文字里反复提到 ${summary.topKeywords.join('、')}，${tail}`
  }
  return `${head}${tail}`
}