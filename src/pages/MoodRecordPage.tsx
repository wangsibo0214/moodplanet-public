import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, NotebookPen, X } from 'lucide-react'

import { PageHeader } from '@/components/ui'
import { RecordForm, type RecordFormValues } from '@/features/mood/components/RecordForm'
import { RecordHistory } from '@/features/mood/components/RecordHistory'
import { RecordResult } from '@/features/mood/components/RecordResult'
import { useDocumentTitle } from '@/hooks'
import { useMoodStore } from '@/stores/useMoodStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { MoodRecord } from '@/types/mood'

export default function MoodRecordPage() {
  useDocumentTitle('心情记录')

  const records = useMoodStore((s) => s.records)
  const status = useMoodStore((s) => s.status)
  const loadError = useMoodStore((s) => s.loadError)
  const saveError = useMoodStore((s) => s.saveError)
  const createRecord = useMoodStore((s) => s.createRecord)
  const updateRecord = useMoodStore((s) => s.updateRecord)
  const deleteRecord = useMoodStore((s) => s.deleteRecord)
  const dismissErrors = useMoodStore((s) => s.dismissErrors)
  const reduceMotion = useSettingsStore((s) => s.reduceMotion)

  const [editing, setEditing] = useState<MoodRecord | null>(null)
  const [lastSaved, setLastSaved] = useState<MoodRecord | null>(null)
  /* 编辑结束后需要把表单还原成空白，用 key 强制重建比逐字段清空更可靠 */
  const [formKey, setFormKey] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!lastSaved) return
    resultRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [lastSaved, reduceMotion])

  const handleSubmit = (values: RecordFormValues, analyzed: boolean) => {
    const draft = { ...values, analyzed }
    const saved = editing ? updateRecord(editing.id, draft) : createRecord(draft)
    if (!saved) return
    setLastSaved(saved)
    setEditing(null)
    setFormKey((key) => key + 1)
  }

  const handleEdit = (record: MoodRecord) => {
    setEditing(record)
    setFormKey((key) => key + 1)
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setFormKey((key) => key + 1)
  }

  const handleDelete = (id: string) => {
    deleteRecord(id)
    if (editing?.id === id) cancelEdit()
    if (lastSaved?.id === id) setLastSaved(null)
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        icon={NotebookPen}
        title="心情记录"
        description="选一种最接近此刻的感受，再补一句话。不必完整，也不必正面。解读全部在本机完成，不联网。"
      />

      {loadError || saveError ? (
        <div
          role="status"
          className="glass-panel flex items-start gap-3 border-butter-400/30 px-4 py-3.5"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-butter-300"
            strokeWidth={1.8}
            aria-hidden
          />
          <div className="flex-1 space-y-1 text-sm leading-relaxed text-ink-300">
            {loadError ? <p>{loadError}</p> : null}
            {saveError ? <p>{saveError}</p> : null}
          </div>
          <button
            type="button"
            onClick={dismissErrors}
            aria-label="关闭提示"
            className="-mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-500 transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-100"
          >
            <X className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <RecordForm
            key={`${editing?.id ?? 'new'}-${formKey}`}
            mode={editing ? 'edit' : 'create'}
            initial={editing ? { mood: editing.mood, content: editing.content, tags: editing.tags } : undefined}
            initialAnalyzed={editing?.analyzed ?? false}
            onSubmit={handleSubmit}
            onCancel={editing ? cancelEdit : undefined}
          />

          {lastSaved ? (
            <div ref={resultRef}>
              <RecordResult
                record={lastSaved}
                title={lastSaved.updatedAt === lastSaved.createdAt ? '刚刚收下的心情' : '这次修改后的解读'}
              />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {status === 'loading' ? (
            <p className="text-xs text-ink-700">正在读取本机保存的记录…</p>
          ) : null}
          <RecordHistory
            records={records}
            editingId={editing?.id ?? null}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}
