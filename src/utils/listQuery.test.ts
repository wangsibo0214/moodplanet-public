import { describe, expect, it } from 'vitest'

import {
  clampPage,
  collectMonths,
  filterItems,
  inMonth,
  inTimeRange,
  isFiltering,
  matchKeyword,
  monthKeyOf,
  monthLabel,
  normalizeQuery,
  pageCountOf,
  pageTokens,
  paginate,
} from '@/utils/listQuery'

const NOW = new Date(2026, 10, 19, 12, 0, 0)
const iso = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString()

describe('normalizeQuery / matchKeyword', () => {
  it('修剪并转小写', () => {
    expect(normalizeQuery('  Hello  ')).toBe('hello')
  })

  it('空查询恒真', () => {
    expect(matchKeyword([], '')).toBe(true)
    expect(matchKeyword(['任意'], '   ')).toBe(true)
  })

  it('子串命中、大小写不敏感', () => {
    expect(matchKeyword(['今天去跑步'], '跑步')).toBe(true)
    expect(matchKeyword(['Hello World'], 'world')).toBe(true)
  })

  it('多词取 AND，缺一即不中', () => {
    expect(matchKeyword(['今天', '去跑步'], '今天 跑步')).toBe(true)
    expect(matchKeyword(['今天', '去跑步'], '今天 游泳')).toBe(false)
  })

  it('跨字段拼合后匹配', () => {
    expect(matchKeyword(['开心', '生活'], '开心 生活')).toBe(true)
  })
})

describe('月份', () => {
  it('monthKeyOf 取本地 YYYY-MM，无效返回 null', () => {
    expect(monthKeyOf(iso(2026, 11, 7))).toBe('2026-11')
    expect(monthKeyOf('not-a-date')).toBeNull()
  })

  it('monthLabel 渲染中文年月', () => {
    expect(monthLabel('2026-11')).toBe('2026 年 11 月')
  })

  it('inMonth 空串恒真，否则精确比对', () => {
    expect(inMonth(iso(2026, 11, 7), '')).toBe(true)
    expect(inMonth(iso(2026, 11, 7), '2026-11')).toBe(true)
    expect(inMonth(iso(2026, 10, 7), '2026-11')).toBe(false)
  })

  it('collectMonths 新→旧去重', () => {
    const items = [iso(2026, 9, 1), iso(2026, 11, 2), iso(2026, 11, 20), iso(2026, 10, 5)]
    expect(collectMonths(items, (x) => x)).toEqual(['2026-11', '2026-10', '2026-09'])
  })
})

describe('inTimeRange', () => {
  it('all 恒真，含无效时间', () => {
    expect(inTimeRange('bad', 'all', NOW)).toBe(true)
  })

  it('today 只认本地同一天', () => {
    expect(inTimeRange(iso(2026, 11, 19, 1), 'today', NOW)).toBe(true)
    expect(inTimeRange(iso(2026, 11, 18, 23), 'today', NOW)).toBe(false)
  })

  it('7d 滚动窗口含边界、排除更早与未来', () => {
    expect(inTimeRange(iso(2026, 11, 13), '7d', NOW)).toBe(true)
    expect(inTimeRange(iso(2026, 11, 11), '7d', NOW)).toBe(false)
    expect(inTimeRange(iso(2026, 11, 25), '7d', NOW)).toBe(false)
  })

  it('30d 窗口', () => {
    expect(inTimeRange(iso(2026, 10, 25), '30d', NOW)).toBe(true)
    expect(inTimeRange(iso(2026, 10, 1), '30d', NOW)).toBe(false)
  })

  it('year 只认同年', () => {
    expect(inTimeRange(iso(2026, 1, 1), 'year', NOW)).toBe(true)
    expect(inTimeRange(iso(2025, 12, 31), 'year', NOW)).toBe(false)
  })

  it('无效时间在非 all 档排除', () => {
    expect(inTimeRange('bad', 'today', NOW)).toBe(false)
  })
})

describe('filterItems / isFiltering', () => {
  const items = [
    { text: '今天去跑步', at: iso(2026, 11, 19) },
    { text: '昨天读了一本书', at: iso(2026, 11, 18) },
    { text: '上个月旅行', at: iso(2026, 10, 5) },
  ]
  const fields = (x: { text: string }) => [x.text]
  const time = (x: { at: string }) => x.at

  it('空状态原样返回', () => {
    expect(filterItems(items, { query: '', range: 'all', month: '' }, fields, time, NOW)).toHaveLength(3)
    expect(isFiltering({ query: '', range: 'all', month: '' })).toBe(false)
  })

  it('关键词与时间取交集', () => {
    const out = filterItems(items, { query: '跑步', range: 'today', month: '' }, fields, time, NOW)
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe('今天去跑步')
    expect(isFiltering({ query: '跑步', range: 'all', month: '' })).toBe(true)
  })

  it('月份单独收窄', () => {
    const out = filterItems(items, { query: '', range: 'all', month: '2026-10' }, fields, time, NOW)
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe('上个月旅行')
  })
})

describe('分页', () => {
  it('pageCountOf 至少 1 页', () => {
    expect(pageCountOf(0, 8)).toBe(1)
    expect(pageCountOf(8, 8)).toBe(1)
    expect(pageCountOf(9, 8)).toBe(2)
  })

  it('clampPage 夹取到合法区间', () => {
    expect(clampPage(0, 3)).toBe(1)
    expect(clampPage(9, 3)).toBe(3)
    expect(clampPage(2, 3)).toBe(2)
  })

  it('paginate 切出当前页，越界页夹取', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    expect(paginate(items, 1, 8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(paginate(items, 3, 8)).toEqual([16, 17, 18, 19])
    expect(paginate(items, 99, 8)).toEqual([16, 17, 18, 19])
  })

  it('pageTokens 小页数全列', () => {
    expect(pageTokens(1, 3)).toEqual([1, 2, 3])
  })

  it('pageTokens 大页数窗口化含首尾与 gap', () => {
    expect(pageTokens(1, 20)).toEqual([1, 2, 3, 4, 'gap', 20])
    expect(pageTokens(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
    expect(pageTokens(20, 20)).toEqual([1, 'gap', 17, 18, 19, 20])
  })
})