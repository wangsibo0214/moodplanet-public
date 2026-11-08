import { lazy, Suspense, useMemo } from 'react'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useMediaQuery } from '@/hooks'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { CapsuleStatus } from '@/types/capsule'
import { isWebGLAvailable } from '@/utils/webgl'

const CapsuleCanvas = lazy(() => import('./CapsuleCanvas'))

function StageNote({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center px-6">
      <p className="text-center text-xs text-ink-700">{text}</p>
    </div>
  )
}

interface CapsuleStageProps {
  status: CapsuleStatus | null
}

/** 胶囊页的 3D 小舞台：渲染不出来时只是一块安静的玻璃，不影响封存与开启。 */
export function CapsuleStage({ status }: CapsuleStageProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const calm = reduceMotion || prefersReducedMotion

  /* 探测只在挂载时做一次；探测用的上下文会立即释放 */
  const webgl = useMemo(() => isWebGLAvailable(), [])

  return (
    <div className="relative h-[220px] overflow-hidden rounded-card bg-cosmos-950/40 ring-1 ring-hairline sm:h-[260px]">
      {webgl ? (
        <ErrorBoundary
          label="3D 时光胶囊"
          fallback={<StageNote text="3D 胶囊这一次没能升起来，封存与开启都不受影响。" />}
        >
          <Suspense fallback={<StageNote text="胶囊正在升起…" />}>
            <CapsuleCanvas status={status} calm={calm} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <StageNote text="这台设备暂时无法渲染 3D 胶囊，封存与开启照常可用。" />
      )}

      <div className="pointer-events-none absolute inset-0 shadow-inset-hairline" />
    </div>
  )
}
