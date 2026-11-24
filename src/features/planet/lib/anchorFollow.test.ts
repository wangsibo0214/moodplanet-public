import { describe, expect, it, vi } from 'vitest'

import { startAnchorFollow } from './anchorFollow'

function fakeScheduler() {
  let nextId = 0
  const callbacks: FrameRequestCallback[] = []
  const request = vi.fn((callback: FrameRequestCallback) => {
    nextId += 1
    callbacks[nextId] = callback
    return nextId
  })
  const cancel = vi.fn()
  return { request, cancel, callbacks }
}

describe('startAnchorFollow', () => {
  it('reduce 下只摆一次，不排期也不取消', () => {
    const scheduler = fakeScheduler()
    const place = vi.fn()
    const stop = startAnchorFollow({ calm: true, place, firstFrame: 'async', ...scheduler })

    expect(place).toHaveBeenCalledTimes(1)
    expect(scheduler.request).not.toHaveBeenCalled()
    stop()
    expect(scheduler.cancel).not.toHaveBeenCalled()
  })

  it('非 reduce + 首帧异步：首帧前不摆位，卸载取消最后一帧', () => {
    const scheduler = fakeScheduler()
    const place = vi.fn()
    const stop = startAnchorFollow({ calm: false, place, firstFrame: 'async', ...scheduler })

    expect(place).not.toHaveBeenCalled()
    expect(scheduler.request).toHaveBeenCalledTimes(1)
    scheduler.callbacks[1]?.(0)
    expect(place).toHaveBeenCalledTimes(1)
    expect(scheduler.request).toHaveBeenCalledTimes(2)
    stop()
    expect(scheduler.cancel).toHaveBeenCalledWith(2)
  })

  it('非 reduce + 首帧同步：先摆一次再排下一帧', () => {
    const scheduler = fakeScheduler()
    const place = vi.fn()
    startAnchorFollow({ calm: false, place, firstFrame: 'sync', ...scheduler })

    expect(place).toHaveBeenCalledTimes(1)
    expect(scheduler.request).toHaveBeenCalledTimes(1)
    scheduler.callbacks[1]?.(0)
    expect(place).toHaveBeenCalledTimes(2)
    expect(scheduler.request).toHaveBeenCalledTimes(2)
  })

  it('place 返回 false 时停止排期', () => {
    const scheduler = fakeScheduler()
    const place = vi.fn(() => false)
    startAnchorFollow({ calm: false, place, firstFrame: 'async', ...scheduler })

    expect(scheduler.request).toHaveBeenCalledTimes(1)
    scheduler.callbacks[1]?.(0)
    expect(place).toHaveBeenCalledTimes(1)
    expect(scheduler.request).toHaveBeenCalledTimes(1)
  })
})
