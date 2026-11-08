import { Star } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle, PageHeader } from '@/components/ui'
import { MemoryStarList } from '@/features/memory/components/MemoryStarList'
import { useDocumentTitle } from '@/hooks'
import { usePlanetStore } from '@/stores/usePlanetStore'

export default function MemoryStarPage() {
  useDocumentTitle('记忆星')

  const starCount = usePlanetStore((state) => state.stars.length)
  const status = usePlanetStore((state) => state.status)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        icon={Star}
        title="记忆星"
        description="每成功保存一条心情记录，星球上就会亮起一颗记忆星。点开任意一颗，就能回到当时写下的那句话。"
      />

      <Card>
        <CardHeader>
          <CardTitle>我的星空</CardTitle>
          <CardDescription>
            现在共有 {starCount} 颗记忆星，全部与本机保存的记录一一对应；记录删除后，对应的星也会一起消失。
          </CardDescription>
        </CardHeader>
        <div className="mt-5">
          {status === 'loading' ? (
            <p className="text-xs text-ink-700">正在读取本机保存的星球状态…</p>
          ) : (
            <MemoryStarList />
          )}
        </div>
      </Card>
    </div>
  )
}
