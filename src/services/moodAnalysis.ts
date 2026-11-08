import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import type { MoodAnalysis, MoodKey, PlanetSuggestion, TagKey } from '@/types/mood'

/**
 * 本地规则情绪解读。
 *
 * 这里没有任何模型、没有网络请求：全部结果来自下面两张可维护的表
 * （CONTENT_RULES 决定主题与反馈，CONTENT_DICTIONARY 决定关键词）。
 * 它不是心理评估，也不会给出诊断——界面文案必须一直如实说明这一点。
 */

/** 界面与结果卡都要挂上这句，避免被误认为大模型分析或专业意见。 */
export const ANALYSIS_DISCLAIMER =
  '以上解读由本地关键词规则生成，不是心理评估，也不能替代专业意见。'

export interface AnalysisInput {
  mood: MoodKey
  content: string
  tags: TagKey[]
}

interface ContentRule {
  id: string
  /** 命中其中任意一个词即算匹配 */
  any: string[]
  /** 若存在，则还须命中其中一个词；用于区分同主题的不同语境 */
  also?: string[]
  theme: string
  /** 规则自带的主题关键词，排在关键词首位 */
  themeKeywords: string[]
  feedback: string
}

/**
 * 规则按数组顺序取第一条命中项，所以「更需要被接住」的语境排在最前，
 * 「被小事点亮」这类轻量语境排在后面。
 */
const CONTENT_RULES: ContentRule[] = [
  {
    id: 'need-support',
    any: ['撑不住', '撑不下去', '喘不过气', '想哭', '崩溃', '绝望', '好难', '扛不住', '难受得'],
    theme: '需要被接住的时刻',
    themeKeywords: ['需要支持', '情绪波动'],
    feedback: '这段时间真的很不容易，你能把它写下来，已经是在照顾自己了。',
  },
  {
    id: 'exercise',
    any: ['跑步', '跑完', '运动', '健身', '散步', '走路', '骑车', '游泳', '打球'],
    theme: '身体动起来的一天',
    themeKeywords: ['运动', '身体感'],
    feedback: '身体活动过之后，情绪常常也会跟着松一点，记得补点水。',
  },
  {
    id: 'rest-after-effort-night',
    any: ['完成', '做完', '搞定', '终于', '收尾', '交上'],
    also: ['晚上', '夜里', '今晚', '睡前', '夜晚'],
    theme: '任务完成后的放松与满足',
    themeKeywords: ['充实', '完成感'],
    feedback: '今天辛苦了，可以暂时放下待办事项，好好享受属于自己的夜晚。',
  },
  {
    id: 'rest-after-effort',
    any: ['完成', '做完', '搞定', '终于', '收尾', '交上'],
    theme: '任务完成后的放松与满足',
    themeKeywords: ['充实', '完成感'],
    feedback: '今天辛苦了，可以先把手上的事放一放，给自己一段什么都不做的时间。',
  },
  {
    id: 'pressure',
    any: ['加班', '考试', '截止', 'ddl', 'deadline', '汇报', '面试', '赶'],
    theme: '被时间和任务推着走',
    themeKeywords: ['压力', '节奏'],
    feedback: '事情一件一件来就好，现在的进度可能比你以为的要多了。',
  },
  {
    id: 'social',
    any: ['朋友', '聊天', '聚会', '见面', '家人', '同事', '一起'],
    theme: '和人相处带来的温度',
    themeKeywords: ['连接', '相处'],
    feedback: '有人愿意听你说话，是很好的事；你也同样值得被这样对待。',
  },
  {
    id: 'rest',
    any: ['休息', '睡', '躺着', '放松', '发呆', '假期', '周末'],
    theme: '把节奏慢下来',
    themeKeywords: ['休息', '松弛'],
    feedback: '慢下来的这段时间不是浪费，是你在给自己充电。',
  },
  {
    id: 'small-joy',
    any: ['阳光', '音乐', '好吃', '咖啡', '奶茶', '花', '电影', '猫', '狗', '风景', '甜'],
    theme: '被小事点亮的一天',
    themeKeywords: ['小确幸', '愉悦'],
    feedback: '这些细小的喜欢，值得被你认真记住一次。',
  },
  {
    id: 'learning',
    any: ['学习', '看书', '作业', '课程', '笔记', '代码', '项目'],
    theme: '一点点积累的过程',
    themeKeywords: ['投入', '积累'],
    feedback: '今天为以后攒下的东西，会慢慢显现出来的。',
  },
]

/**
 * 关键词词典：按「越贴近自我照顾越靠前」排序，扫描顺序即输出顺序。
 * 只做关键词提取，不据此推断用户的心理状态。
 */
const CONTENT_DICTIONARY: ReadonlyArray<readonly [word: string, keyword: string]> = [
  ['休息', '休息'],
  ['睡', '睡眠'],
  ['放松', '放松'],
  ['完成', '完成感'],
  ['累', '疲惫'],
  ['压力', '压力'],
  ['紧张', '紧张'],
  ['焦虑', '焦虑'],
  ['开心', '开心'],
  ['高兴', '开心'],
  ['兴奋', '兴奋'],
  ['期待', '期待'],
  ['难过', '难过'],
  ['委屈', '委屈'],
  ['孤独', '孤独'],
  ['感动', '感动'],
  ['感谢', '感激'],
  ['朋友', '相处'],
  ['一个人', '独处'],
  ['运动', '运动'],
  ['跑步', '跑步'],
  ['散步', '散步'],
]

const MAX_KEYWORDS = 4

/** 文字少到这个程度就当作理解不充分，直接走中性模板 */
const MIN_CONTENT_FOR_RULES = 6

/** 情绪兜底反馈：没有规则命中，或文字太短时使用 */
const MOOD_FALLBACK_FEEDBACK: Record<MoodKey, string> = {
  joy: '看起来今天是不错的一天，能感觉到你的心情挺亮的。',
  calm: '平平静静的一天，也是一种很好的状态。',
  tired: '今天好像消耗了不少力气，先照顾一下自己。',
  anxious: '思绪有点多的时候，写下来已经是在整理它们了。',
  sad: '难过的时候，也可以只是难过一下下，不用急着好起来。',
  excited: '今天好像有什么让你很起劲的事，替你高兴。',
}

const MOOD_FALLBACK_THEME = '把它写下来的一天'

/** 自我关怀建议的情绪基调句 */
const MOOD_CARE_LINE: Record<MoodKey, string> = {
  joy: '把这份开心写下来，以后翻回去还能再亮一次。',
  calm: '现在这样就刚刚好，不需要再多做点什么来证明。',
  tired: '今天可以先把标准降一点，早点休息，剩下的事明天再说。',
  anxious: '试着只挑出最要紧的那一件，其他的先放回清单里。',
  sad: '如果想说说，可以找一个让你安心的人；不想说也没关系。',
  excited: '兴奋的时候容易停不下来，记得也留一点时间给身体。',
}

/** 「需要支持」类规则额外附上的求助提示：只提途径，不做任何判断 */
const SUPPORT_LINE = '如果这份重量太大，可以试着和信任的人说一说，或寻求专业支持：你不需要一个人扛。'

const PLANET_BY_MOOD: Record<MoodKey, { glow: number; note: string }> = {
  joy: { glow: 0.9, note: '星球会染上一层奶油黄，云隙的光更亮一点。' },
  calm: { glow: 0.62, note: '星球转为薄荷绿的柔光，自转慢下来。' },
  tired: { glow: 0.42, note: '星球光晕调暗，夜空里多出几颗安静的星。' },
  anxious: { glow: 0.74, note: '星球边缘泛起淡紫的波纹，像在提醒你可以慢一点。' },
  sad: { glow: 0.4, note: '星球覆上星空蓝的薄雾，光晕柔而低。' },
  excited: { glow: 0.95, note: '星球闪出粉色高光，周围的粒子更活跃。' },
}

function matchRule(text: string): ContentRule | null {
  for (const rule of CONTENT_RULES) {
    const hit = rule.any.some((word) => text.includes(word))
    if (!hit) continue
    if (rule.also && !rule.also.some((word) => text.includes(word))) continue
    return rule
  }
  return null
}

function extractKeywords(text: string, seed: string[], moodKey: MoodKey): string[] {
  const out: string[] = []
  const push = (word: string) => {
    if (word && !out.includes(word)) out.push(word)
  }

  for (const word of seed) push(word)
  push(MOOD_MAP[moodKey].label)
  for (const [word, keyword] of CONTENT_DICTIONARY) {
    if (out.length >= MAX_KEYWORDS) break
    if (text.includes(word)) push(keyword)
  }

  return out.slice(0, MAX_KEYWORDS)
}

function buildSuggestion(mood: MoodKey, tags: TagKey[], rule: ContentRule | null): string {
  const lines = [MOOD_CARE_LINE[mood]]
  if (rule?.id === 'need-support') lines.push(SUPPORT_LINE)
  else if (tags.length > 0) lines.push(TAG_MAP[tags[0]].careLine)
  return lines.join('')
}

function buildPlanet(mood: MoodKey): PlanetSuggestion {
  const meta = MOOD_MAP[mood]
  const { glow, note } = PLANET_BY_MOOD[mood]
  return { tint: meta.hex, glow, note }
}

/**
 * 输入心情、文字、标签，输出一份温和的解读。
 * 纯函数：同样的输入永远得到同样的结果，方便测试与后续替换实现。
 */
export function analyzeMood(input: AnalysisInput): MoodAnalysis {
  const { mood, tags } = input
  const text = input.content.trim()

  /* 文字太短时规则命中不可靠，一律走中性模板，避免仅凭一两个词下判断 */
  const rule = text.length >= MIN_CONTENT_FOR_RULES ? matchRule(text) : null

  if (!rule) {
    return {
      theme: MOOD_FALLBACK_THEME,
      keywords: extractKeywords(text, [], mood),
      feedback: MOOD_FALLBACK_FEEDBACK[mood],
      suggestion: buildSuggestion(mood, tags, null),
      planet: buildPlanet(mood),
    }
  }

  return {
    theme: rule.theme,
    keywords: extractKeywords(text, rule.themeKeywords, mood),
    feedback: rule.feedback,
    suggestion: buildSuggestion(mood, tags, rule),
    planet: buildPlanet(mood),
  }
}

/** 用户选择「只保存」时，用这份中性文案填充记录，保证字段结构一致。 */
export function neutralAnalysis(input: AnalysisInput): MoodAnalysis {
  const { mood, tags } = input
  return {
    theme: '',
    keywords: [],
    feedback: '这条记录先原样收下了，等你想再看看时，随时可以补一次解读。',
    suggestion: buildSuggestion(mood, tags, null),
    planet: buildPlanet(mood),
  }
}
