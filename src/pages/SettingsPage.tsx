import { useState } from 'react'
import {
  Check,
  Database,
  Download,
  Palette,
  Settings,
  ShieldCheck,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'

import { Badge, Button, PageHeader } from '@/components/ui'
import { ChoiceGroup } from '@/features/settings/components/ChoiceGroup'
import { SettingsRow } from '@/features/settings/components/SettingsRow'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { Toggle } from '@/features/settings/components/Toggle'
import { VolumeSlider } from '@/features/settings/components/VolumeSlider'
import { sound } from '@/features/sound/soundManager'
import { useDocumentTitle } from '@/hooks'
import { clearAllData, downloadExport } from '@/services/dataTransfer'
import { useSettingsStore, type StarDensity } from '@/stores/useSettingsStore'

const DENSITY_OPTIONS: { value: StarDensity; label: string }[] = [
  { value: 'low', label: '稀疏' },
  { value: 'normal', label: '适中' },
  { value: 'high', label: '繁星' },
]

const USAGE_LINES = [
  '在「心情记录」选一种最接近此刻的感受，补一句话和场景标签；可以选「解读」跑一次本地规则解读，也可以只保存。',
  '保存后星球环境会按当天全部记录综合变化：哪种心情最多就是那天的主色，次数相同听较晚那条；每条记录仍会亮起一颗与自己关联的记忆星，点星球上的星或「记忆星」页都能回到那条记录。',
  '「时光胶囊」写给未来的自己：封存后正文在任何普通界面都不显示，到了开启日期才会醒来。',
  '「情绪档案」把全部本地记录汇总成七天节奏、心情分布、高频标签与关键词、心情日历和记忆星回顾。',
  '动效不再单独设置：系统开启「减少动态效果」时，星点闪烁、星云漂浮与过渡动画会自动收敛。',
]

const STORAGE_LINES = [
  '全部数据保存在当前浏览器的 localStorage 中，键名为 moodplanet:records、moodplanet:planet、moodplanet:capsules 与 moodplanet:settings。',
  '没有服务器、没有账号：清除浏览器数据、使用无痕窗口、更换设备或浏览器，都会让这里的内容消失。',
  '换环境之前，建议先用「导出备份」下载一份 JSON 自己保管；当前版本支持导出，暂不支持从文件导入。',
  '万一存储损坏，应用会把原文挪到备份键并在页面上告诉你，不会悄悄覆盖你的数据。',
]

const PRIVACY_LINES = [
  '不联网、不注册、无埋点：情绪解读由本机关键词规则生成，不调用任何大模型或外部服务。',
  '记录与胶囊的正文不会上传到任何地方；导出文件在本地生成，由你自己保管。',
  '这里不是医疗或心理服务，解读只是温和的陪伴，不能替代专业意见。',
]

const ABOUT_ROWS = [
  { label: '版本', value: 'v0.6.0 · 情绪档案与整体完善' },
  { label: '数据存储', value: '浏览器本地，暂不上传' },
  { label: '构建工具', value: 'Vite + React + TypeScript' },
] as const

function DocList({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 px-5 py-4 sm:px-6">
      {lines.map((line) => (
        <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-300">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-iris-400/60" />
          {line}
        </li>
      ))}
    </ul>
  )
}

export default function SettingsPage() {
  useDocumentTitle('设置')

  const meteorShower = useSettingsStore((s) => s.meteorShower)
  const starDensity = useSettingsStore((s) => s.starDensity)
  const setMeteorShower = useSettingsStore((s) => s.setMeteorShower)
  const setStarDensity = useSettingsStore((s) => s.setStarDensity)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const soundVolume = useSettingsStore((s) => s.soundVolume)
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled)
  const setSoundVolume = useSettingsStore((s) => s.setSoundVolume)

  const [notice, setNotice] = useState<string | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)

  const handleExport = () => {
    const name = downloadExport()
    setNotice(`已导出 ${name}。文件只存在你自己的下载目录里。`)
  }

  const handleClear = () => {
    clearAllData()
    setConfirmingClear(false)
    setNotice('本机数据已全部清空，星球回到了最初的夜空。')
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        icon={Settings}
        title="设置"
        description="外观、动效与数据偏好。这些设置会保存在本机浏览器里。"
      />

      {notice ? (
        <div
          role="status"
          className="glass-panel flex items-start gap-3 border-mint-400/30 px-4 py-3.5"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-mint-400" strokeWidth={1.9} aria-hidden />
          <p className="flex-1 text-sm leading-relaxed text-ink-300">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="关闭提示"
            className="-mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-500 transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-100"
          >
            <X className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      ) : null}

      <SettingsSection
        title="外观与动效"
        description="调整星空背景的密度与动效强度。"
      >
        <SettingsRow
          label="背景流星雨"
          description="在星空间点缀少量划过的流星。系统开启「减少动态效果」时不会显示。"
          control={
            <Toggle
              label="背景流星雨"
              checked={meteorShower}
              onChange={setMeteorShower}
            />
          }
        />
        <SettingsRow
          label="星空密度"
          description="星点越多越有沉浸感，低密度在老旧设备上更流畅。"
          control={
            <ChoiceGroup
              label="星空密度"
              value={starDensity}
              options={DENSITY_OPTIONS}
              onChange={setStarDensity}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="声音"
        description="交互音效由本机实时合成：不加载音频文件，也不联网。"
      >
        <SettingsRow
          label="交互音效"
          description="按钮、伙伴互动、记录与胶囊的轻柔反馈音。关闭后立即静音，包括正在播放的声音。"
          control={
            <Toggle
              label="交互音效"
              checked={soundEnabled}
              onChange={setSoundEnabled}
            />
          }
        />
        <SettingsRow
          label="音量"
          description="默认 60%，拖动立即生效。"
          control={
            <VolumeSlider
              value={soundVolume}
              disabled={!soundEnabled}
              onChange={setSoundVolume}
            />
          }
        />
        <SettingsRow
          label="试听"
          description="一段由轻到亮的三音小样：气泡、风铃、星铃。"
          control={
            <Button
              variant="secondary"
              size="sm"
              data-sound="none"
              disabled={!soundEnabled}
              onClick={() => sound.preview()}
            >
              <Volume2 className="size-4" strokeWidth={1.75} aria-hidden />
              试听音效
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="数据"
        description="所有记录目前只保存在这台设备的浏览器中。"
      >
        <SettingsRow
          label="存储位置"
          description="更换浏览器或清除站点数据都会导致记录丢失。"
          control={<Badge tone="mint">仅本地</Badge>}
        />
        <SettingsRow
          label="导出备份"
          description="生成包含记录、星球状态、胶囊与设置的 JSON 文件，下载到本机。"
          control={
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="size-4" strokeWidth={1.75} aria-hidden />
              导出 JSON
            </Button>
          }
        />
        <SettingsRow
          label="清空全部数据"
          description="记录、记忆星、胶囊与偏好设置一起删除，不可撤销。"
          control={
            confirmingClear ? (
              <div role="group" aria-label="清空二次确认" className="flex items-center gap-2">
                <span className="text-xs text-blush-300">无法恢复</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="取消清空"
                  onClick={() => setConfirmingClear(false)}
                >
                  <X className="size-4" strokeWidth={1.9} aria-hidden />
                  取消
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="确认清空全部数据"
                  onClick={handleClear}
                >
                  <Check className="size-4" strokeWidth={1.9} aria-hidden />
                  确认清空
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmingClear(true)}>
                <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                清空全部数据
              </Button>
            )
          }
        />
      </SettingsSection>

      <SettingsSection title="使用说明" description="这颗星球的玩法，一分钟读完。">
        <DocList lines={USAGE_LINES} />
      </SettingsSection>

      <SettingsSection title="本地存储说明" description="数据在哪里、什么时候会消失。">
        <DocList lines={STORAGE_LINES} />
      </SettingsSection>

      <SettingsSection title="隐私说明" description="你的心情只属于你。">
        <div className="flex items-center gap-3 px-5 pt-4 sm:px-6">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-mint-400/12 text-mint-400"
          >
            <ShieldCheck className="size-5" strokeWidth={1.75} />
          </span>
          <p className="text-sm leading-relaxed text-ink-300">
            MoodPlanet 是一个纯本地应用：没有后端、没有账号体系，也没有任何统计脚本。
          </p>
        </div>
        <DocList lines={PRIVACY_LINES} />
      </SettingsSection>

      <SettingsSection title="关于">
        <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-lg bg-iris-400/12 text-iris-300"
          >
            <Palette className="size-5" strokeWidth={1.75} />
          </span>
          <p className="text-sm leading-relaxed text-ink-300">
            心情记录、本地解读、星球生态、时光胶囊与情绪档案已经全部接通：一切只保存在这台设备的浏览器里，解读不联网、也不调用任何大模型。
          </p>
        </div>

        {ABOUT_ROWS.map((row) => (
          <SettingsRow
            key={row.label}
            label={row.label}
            control={<span className="text-sm text-ink-500">{row.value}</span>}
          />
        ))}

        <div className="flex items-center gap-2 px-5 py-4 sm:px-6">
          <Database className="size-4 shrink-0 text-ink-700" strokeWidth={1.75} aria-hidden />
          <span className="text-xs text-ink-700">
            导出文件为纯 JSON 文本，可以用任何文本编辑器打开查看内容。
          </span>
        </div>
      </SettingsSection>
    </div>
  )
}
