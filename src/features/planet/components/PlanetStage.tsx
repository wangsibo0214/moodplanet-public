import { lazy, Suspense, useMemo } from 'react'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useMediaQuery } from '@/hooks'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { isWebGLAvailable } from '@/utils/webgl'

import { PlanetFallback } from './PlanetFallback'

const PlanetCanvas = lazy(() => import('./PlanetCanvas'))

/** 舞台高度：桌面上星球占满首屏主体，竖屏手机上留出下方快捷入口的空间。 */
const STAGE_CLASS =
  'relative h-[54vh] min-h-[340px] overflow-hidden rounded-card bg-cosmos-950/40 ring-1 ring-hairline lg:h-[70vh] lg:min-h-[460px] lg:max-h-[680px]'

function StageSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-24 animate-pulse rounded-full bg-iris-400/12 ring-1 ring-iris-400/20 ring-inset" />
        <p className="text-xs text-ink-700">正在生成星球…</p>
      </div>
    </div>
  )
}

export function PlanetStage() {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const calm = reduceMotion || prefersReducedMotion

  /* 探测只在挂载时做一次；探测用的上下文会立即释放，不会挤占 R3F 的配额 */
  const webgl = useMemo(() => isWebGLAvailable(), [])

  if (!webgl) {
    return (
      <div className={STAGE_CLASS}>
        <PlanetFallback
          calm={calm}
          title="这台设备暂时无法渲染 3D 星球"
          description="浏览器没有开启 WebGL，或者显卡驱动不允许。心情记录、记忆星和情绪档案都照常可用，星球会在支持的设备上等你。"
        />
      </div>
    )
  }

  return (
    <div className={STAGE_CLASS}>
      <ErrorBoundary
        label="3D 星球"
        fallback={
          <PlanetFallback
            calm={calm}
            title="星球这一次没能升起来"
            description="3D 场景渲染时出了一点问题，已经自动切回平面星球。你的记录功能不受影响，刷新页面通常会恢复。"
          />
        }
      >
        <Suspense fallback={<StageSkeleton />}>
          <PlanetCanvas
            calm={calm}
            quality={isNarrow ? 'reduced' : 'normal'}
            detail={isNarrow ? 9 : 13}
            /* 竖屏舞台横向视锥更窄，放宽 fov 才能让记忆星整圈轨道都留在画布里 */
            fov={isNarrow ? 48 : 42}
          />
        </Suspense>
      </ErrorBoundary>

      {/* 压边内阴影：让 canvas 与页面之间有一层明确的界面感 */}
      <div className="pointer-events-none absolute inset-0 shadow-inset-hairline" />
    </div>
  )
}
