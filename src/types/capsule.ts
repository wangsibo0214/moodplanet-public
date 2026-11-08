/**
 * 胶囊的三种状态。
 * status 永远由 openedAt / unlockAt 对照真实时钟推导，
 * 信封里存的只是写入那一刻的快照，读取时一律重算。
 */
export type CapsuleStatus = 'sealed' | 'ready' | 'opened'

export interface TimeCapsule {
  id: string
  title: string
  content: string
  createdAt: string
  unlockAt: string
  status: CapsuleStatus
  openedAt: string | null
}
