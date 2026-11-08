import type { CapsuleStatus, TimeCapsule } from '@/types/capsule'
import { toDate } from '@/utils/date'

/**
 * 时光胶囊的纯时间逻辑：不碰存储、不碰界面，
 * 所有函数都接收外部传入的 now，方便用可控日期做测试。
 */

export const QUICK_UNLOCK_DAYS = [7, 30, 90] as const
export type QuickUnlockDays = (typeof QUICK_UNLOCK_DAYS)[number]

/** 按日历日相加：保留封存时刻的钟点，「7 天后」就是同一时刻。 */
export function unlockDateFor(days: number, from: Date): Date {
  const date = new Date(from.getTime())
  date.setDate(date.getDate() + days)
  return date
}

/** 到期判定只看真实时钟：已开启优先，其次与 unlockAt 比较。 */
export function capsuleStatus(
  capsule: Pick<TimeCapsule, 'unlockAt' | 'openedAt'>,
  now: Date,
): CapsuleStatus {
  if (capsule.openedAt) return 'opened'
  const unlock = toDate(capsule.unlockAt)
  /* 开启日期读不出来时按封存处理：宁可多等，不可提前泄内容 */
  if (!unlock) return 'sealed'
  return now.getTime() >= unlock.getTime() ? 'ready' : 'sealed'
}

export function remainingMs(capsule: Pick<TimeCapsule, 'unlockAt'>, now: Date): number {
  const unlock = toDate(capsule.unlockAt)
  return unlock ? unlock.getTime() - now.getTime() : 0
}

/** 剩余时间的口语化表达：只保留最有意义的两档单位。 */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return '已到开启时间'
  const totalMinutes = Math.floor(ms / 60_000)
  if (totalMinutes < 1) return '不到 1 分钟'
  if (totalMinutes < 60) return `${totalMinutes} 分钟`
  const hours = Math.floor(totalMinutes / 60)
  if (hours < 24) {
    const minutes = totalMinutes % 60
    return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
  }
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest > 0 ? `${days} 天 ${rest} 小时` : `${days} 天`
}
