import type { StateStorage } from 'zustand/middleware'

const PREFIX = 'moodplanet:'

/** 需要自己处理存储异常（而不是静默降级）的模块，用这个前缀拼 key。 */
export const STORAGE_PREFIX = PREFIX

/**
 * localStorage 适配器。
 * 隐私模式、配额超限或 SSR 环境下 window 不可用时静默降级为内存外无状态，
 * 不让存储异常冒泡打断界面渲染。
 */
export const appStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(PREFIX + name)
    } catch {
      return null
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(PREFIX + name, value)
    } catch {
      /* 忽略写入失败：设置项丢失不影响主流程 */
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(PREFIX + name)
    } catch {
      /* 忽略 */
    }
  },
}
