import type { CapsuleStatus, TimeCapsule } from '@/types/capsule'
import { formatFullDate, formatRecordTime } from '@/utils/date'

const STATUS_LABEL: Record<CapsuleStatus, string> = {
  sealed: '封存中',
  ready: '待开启',
  opened: '已开启',
}

/**
 * 胶囊可供检索的字段。正文只在「已开启」时进入搜索——
 * 封存中与待开启的正文沉睡，既不进 DOM 也不能被搜出来，守住胶囊的隐私语义。
 */
export function capsuleSearchFields(capsule: TimeCapsule, status: CapsuleStatus): string[] {
  const fields = [
    capsule.title,
    STATUS_LABEL[status],
    formatRecordTime(capsule.createdAt),
    formatFullDate(capsule.createdAt),
    formatFullDate(capsule.unlockAt),
  ]
  if (status === 'opened') {
    fields.push(capsule.content)
    if (capsule.openedAt) fields.push(formatRecordTime(capsule.openedAt))
  }
  return fields
}