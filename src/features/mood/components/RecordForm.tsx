import { useState } from 'react'
import { NotebookPen, Sparkles, X } from 'lucide-react'

import { Button, Card } from '@/components/ui'
import type { MoodKey, TagKey } from '@/types/mood'

import { MoodPicker } from './MoodPicker'
import { TagPicker } from './TagPicker'

export interface RecordFormValues {
  mood: MoodKey
  content: string
  tags: TagKey[]
}

interface RecordFormProps {
  initial?: Partial<RecordFormValues>
  /** analyzed=true 走本地规则解读，false 表示用户选择「只保存」 */
  onSubmit: (values: RecordFormValues, analyzed: boolean) => void
  onCancel?: () => void
  mode?: 'create' | 'edit'
  /** 编辑一条已有解读的记录时，「只保存」会丢掉解读，按钮文案要提前说清 */
  initialAnalyzed?: boolean
}

const MAX_CONTENT = 600

/** 情绪记录表单：心情（必填）+ 文字（可空）+ 标签（可空）+ 两种保存方式。 */
export function RecordForm({
  initial,
  onSubmit,
  onCancel,
  mode = 'create',
  initialAnalyzed = false,
}: RecordFormProps) {
  const [mood, setMood] = useState<MoodKey | null>(initial?.mood ?? null)
  const [content, setContent] = useState(initial?.content ?? '')
  const [tags, setTags] = useState<TagKey[]>(initial?.tags ?? [])

  const submit = (analyzed: boolean) => {
    if (!mood) return
    onSubmit({ mood, content: content.trim(), tags }, analyzed)
  }

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="record-mood-label">
          <h2 id="record-mood-label" className="text-sm font-semibold text-ink-100">
            此刻最接近哪种感受
          </h2>
          <p className="mt-1 text-xs text-ink-700">
            必选一项。六种情绪没有好坏之分，选最像的那个就好。
          </p>
          <MoodPicker
            value={mood}
            onChange={setMood}
            labelledBy="record-mood-label"
          />
        </section>

        <section aria-labelledby="record-content-label">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="record-content-label" className="text-sm font-semibold text-ink-100">
              想说的话
            </h2>
            <span className="font-display text-xs text-ink-700">
              {content.length} / {MAX_CONTENT}
            </span>
          </div>
          <p id="record-content-hint" className="mt-1 text-xs text-ink-700">
            可以不写。写得越具体，本地规则能读出的东西越多；只有一两个字时会用中性模板。
          </p>
          <textarea
            value={content}
            maxLength={MAX_CONTENT}
            onChange={(event) => setContent(event.target.value)}
            aria-labelledby="record-content-label"
            aria-describedby="record-content-hint"
            rows={4}
            placeholder="今天发生了什么？身体是什么感觉？"
            className="mt-3 w-full resize-y rounded-md bg-white/4 px-4 py-3 text-sm leading-relaxed text-ink-50 ring-1 ring-hairline ring-inset transition-colors duration-200 ease-soft placeholder:text-ink-700 hover:ring-hairline-strong focus:ring-iris-300/60 focus:outline-none"
          />
        </section>

        <section aria-labelledby="record-tags-label">
          <h2 id="record-tags-label" className="text-sm font-semibold text-ink-100">
            和哪些事情有关
          </h2>
          <p className="mt-1 text-xs text-ink-700">
            可多选，也可以不选。标签只影响关怀建议的措辞，不会被用来判断你的状态。
          </p>
          <TagPicker value={tags} onChange={setTags} labelledBy="record-tags-label" />
        </section>

        <div className="flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-700 sm:max-w-xs">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-butter-300" strokeWidth={1.8} aria-hidden />
            解读由本地关键词规则生成，不调用任何大模型或外部服务。
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {onCancel ? (
              <Button variant="ghost" size="md" onClick={onCancel}>
                <X className="size-4" strokeWidth={1.9} aria-hidden />
                取消
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="md"
              disabled={!mood}
              data-sound="none"
              onClick={() => submit(false)}
            >
              <NotebookPen className="size-4" strokeWidth={1.9} aria-hidden />
              {mode === 'edit' && initialAnalyzed ? '只保存，不保留解读' : '只保存'}
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!mood}
              data-sound="none"
              onClick={() => submit(true)}
            >
              <Sparkles className="size-4" strokeWidth={1.9} aria-hidden />
              {mode === 'edit' ? '保存修改并解读' : '保存并生成解读'}
            </Button>
          </div>
        </div>

        {!mood ? (
          <p role="status" className="-mt-3 text-xs text-ink-500">
            先选一种心情，保存按钮就会亮起来。
          </p>
        ) : null}
      </div>
    </Card>
  )
}
