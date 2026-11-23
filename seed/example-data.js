/**
 * MoodPlanet 脱敏示例数据 —— 载入脚本
 *
 * 用途：clone 之后应用是空的，星球上看不出任何东西。跑这份脚本能得到
 * 12 条跨 10 天的示例记录（六种心情各 2 条）、解锁 12 项成长内容里的 9 项（4 个伙伴动作
 * 全开 + 5 项地表/装饰；灯塔/栈桥小船/粼粼海面需累计保存 15/18/20 条，本数据到不了）、1 个待开启胶囊。
 * 全部文案为虚构示例，不含任何真实用户的记录。
 *
 * 应用没有「导入」入口（dataTransfer.ts 只有导出和清空），所以只能直接写
 * localStorage：
 *   1. pnpm dev --port 5199，浏览器打开 http://localhost:5199
 *      （localStorage 按端口分域，另起端口就不会碰到你在 5173 上的记录）
 *   2. F12 → Console，把本文件全部内容粘贴进去，回车
 *   3. 页面自动刷新即生效
 *
 * 脚本会覆盖该端口下已有的全部 moodplanet:* 数据；想回到干净状态用设置页「清空全部数据」。
 */
;(() => {
  const STORAGE_PREFIX = 'moodplanet:'
  const SCHEMA_VERSION = 1

  const HEX = {
    joy: '#FFD170',
    calm: '#7BD9BC',
    tired: '#FFA57F',
    anxious: '#A48FF2',
    sad: '#6FB6F0',
    excited: '#FFA3BE',
  }

  const uuid = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
        })

  /** daysAgo 天前的 hour:minute，转成 ISO —— 示例数据跟着「今天」走，不会过期 */
  const at = (daysAgo, hour, minute) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }

  const analyzed = (mood, glow, theme, keywords, feedback, suggestion, note) => ({
    analyzed: true,
    theme,
    keywords,
    feedback,
    suggestion,
    planet: { tint: HEX[mood], glow, note },
  })

  const skipped = () => ({
    analyzed: false,
    theme: '',
    keywords: [],
    feedback: '',
    suggestion: '',
    planet: null,
  })

  /** 顺序必须是从旧到新：加载时不排序，直接按数组顺序建星 */
  const draft = [
    {
      daysAgo: 9,
      hour: 8,
      minute: 20,
      mood: 'calm',
      tags: ['life', 'rest'],
      content: '早上出门前把桌面收干净了，一天开始得比较稳。',
      ...analyzed(
        'calm',
        0.32,
        '秩序感',
        ['稳', '桌面'],
        '你把环境理顺了，情绪也跟着落下来。',
        '这种状态值得记住是怎么办到的。',
        '星球表面浮起一层薄薄的绿光。',
      ),
    },
    {
      daysAgo: 8,
      hour: 21,
      minute: 5,
      mood: 'tired',
      tags: ['work'],
      content: '连着开了三个会，脑子转不动了。',
      ...analyzed(
        'tired',
        0.18,
        '消耗',
        ['会', '转不动'],
        '电量低的时候不必逼自己高效。',
        '今晚早点收工，明天再排。',
        '星球转得慢了一些，光也暗下去。',
      ),
    },
    {
      daysAgo: 7,
      hour: 12,
      minute: 40,
      mood: 'joy',
      tags: ['life', 'social'],
      content: '中午和同事去外面吃饭，聊了很多没用的事，笑到肚子疼。',
      ...analyzed(
        'joy',
        0.74,
        '松弛的快乐',
        ['笑', '同事'],
        '这种快乐不靠成果，纯粹是人和人在一起。',
        '下周也留一次这样的中午。',
        '地表亮起一小片暖黄。',
      ),
    },
    {
      daysAgo: 6,
      hour: 23,
      minute: 15,
      mood: 'anxious',
      tags: ['work'],
      content: '明天要交的东西还差一截，越晚越静不下心。',
      ...analyzed(
        'anxious',
        0.41,
        '期限压力',
        ['还差一截', '越晚'],
        '你已经在担心了，说明这件事对你重要。',
        '先把最小的那块做完，进度会带着情绪走。',
        '星球外围的光晕有点不稳。',
      ),
    },
    {
      daysAgo: 5,
      hour: 7,
      minute: 50,
      mood: 'excited',
      tags: ['exercise', 'life'],
      content: '头一回早起跑步，跑到一半居然还想继续。',
      ...analyzed(
        'excited',
        0.86,
        '新鲜的劲头',
        ['头一回', '想继续'],
        '刚开始的那股劲最珍贵。',
        '别急着加量，先把这个节奏守住。',
        '星球上多了一串跳得很快的光点。',
      ),
    },
    {
      daysAgo: 4,
      hour: 19,
      minute: 30,
      mood: 'sad',
      tags: ['life'],
      content: '家里打电话过来，说完之后心里有点沉。',
      ...analyzed(
        'sad',
        0.22,
        '挂念',
        ['家里', '有点沉'],
        '有些情绪不用先解决，先让它在这儿待一会儿。',
        '要不要明天再打回去一次。',
        '星球沉进偏蓝的色调里。',
      ),
    },
    {
      daysAgo: 3,
      hour: 10,
      minute: 0,
      mood: 'joy',
      tags: ['study', 'work'],
      content: '把拖了两周的那件事做完了，交出去那一刻很轻。',
      ...analyzed(
        'joy',
        0.79,
        '完成感',
        ['做完', '很轻'],
        '拖得越久，交付之后的轻就越明显。',
        '记得给自己一点庆祝。',
        '星屑花亮了一下。',
      ),
    },
    {
      daysAgo: 2,
      hour: 15,
      minute: 45,
      mood: 'tired',
      tags: ['work', 'study'],
      content: '下午连着批了一堆东西，眼睛发花。',
      ...skipped(),
    },
    {
      daysAgo: 1,
      hour: 9,
      minute: 5,
      mood: 'anxious',
      tags: ['work'],
      content: '临时加了新任务，计划全乱了。',
      ...analyzed(
        'anxious',
        0.44,
        '被打乱',
        ['临时', '全乱'],
        '计划被冲掉的时候，先保住一件就够。',
        '今天只排三件，剩下的明天说。',
        '光晕有点晃。',
      ),
    },
    {
      daysAgo: 1,
      hour: 20,
      minute: 30,
      mood: 'sad',
      tags: ['life'],
      content: '想起一件没做好的旧事，闷了一晚上。',
      ...skipped(),
    },
    // 同一天的两条：验证「按当天全部记录综合」的口径
    {
      daysAgo: 0,
      hour: 8,
      minute: 30,
      mood: 'excited',
      tags: ['study'],
      content: '一早看到结果，忍不住想马上动手改。',
      ...analyzed(
        'excited',
        0.88,
        '冲动',
        ['马上', '想改'],
        '这股劲适合拿来开个头。',
        '先把想法记下来，别让它跑掉。',
        '星球上亮了好几处。',
      ),
    },
    {
      daysAgo: 0,
      hour: 11,
      minute: 20,
      mood: 'calm',
      tags: ['rest', 'life'],
      content: '忙完一段，坐下来喝了杯水。',
      ...skipped(),
    },
  ]

  const records = draft.map((r) => {
    const createdAt = at(r.daysAgo, r.hour, r.minute)
    return {
      id: `rec-${uuid()}`,
      mood: r.mood,
      content: r.content,
      tags: r.tags,
      keywords: r.keywords,
      theme: r.theme,
      feedback: r.feedback,
      suggestion: r.suggestion,
      planet: r.planet,
      analyzed: r.analyzed,
      createdAt,
      updatedAt: createdAt,
    }
  })

  const savedAt = new Date().toISOString()

  /*
    planet 信封里的 stars 留空是故意的：加载时记忆星一律按 records 重建
    （usePlanetStore.hydrate），手工播种轨道位反而多余。
    growth 的 totalSaved 取 max(播种值, 记录数)，interactions 只能靠播种，
    给到 42 是为了让四个伙伴动作（门槛 5 / 12 / 20 / 30）都能看到。
    unlocks 会被 evaluateUnlocks 重算，写不写都由门槛说了算。
  */
  const planet = {
    version: SCHEMA_VERSION,
    savedAt,
    stars: [],
    growth: { totalSaved: records.length, interactions: 42, unlocks: [] },
    environment: { mood: null, recordId: null, updatedAt: savedAt },
  }

  const capsuleCreated = at(6, 21, 0)
  const unlockDate = new Date()
  unlockDate.setDate(unlockDate.getDate() + 24)
  const capsules = {
    version: SCHEMA_VERSION,
    savedAt,
    // status 读盘时会被忽略并按 unlockAt 和当前时间重算，这里给个占位即可
    capsules: [
      {
        id: `cap-${uuid()}`,
        title: '给三周后的自己',
        content: '如果这段还在熬，那就先熬过今天这一天。',
        createdAt: capsuleCreated,
        unlockAt: unlockDate.toISOString(),
        status: 'sealed',
        openedAt: null,
      },
    ],
  }

  window.localStorage.setItem(
    STORAGE_PREFIX + 'records',
    JSON.stringify({ version: SCHEMA_VERSION, savedAt, records }),
  )
  window.localStorage.setItem(STORAGE_PREFIX + 'planet', JSON.stringify(planet))
  window.localStorage.setItem(STORAGE_PREFIX + 'capsules', JSON.stringify(capsules))

  console.log(
    `[seed] 已写入 ${records.length} 条记录 / ${capsules.capsules.length} 个胶囊，即将刷新。`,
  )
  location.reload()
})()
