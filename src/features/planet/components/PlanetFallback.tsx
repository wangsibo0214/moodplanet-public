import { Link } from 'react-router-dom'
import { NotebookPen, RotateCw } from 'lucide-react'

import { Button, buttonClasses } from '@/components/ui'

import { PlanetIllustration } from './PlanetIllustration'

interface PlanetFallbackProps {
  title: string
  description: string
  calm: boolean
  onRetry?: () => void
}

/**
 * 3D 不可用时的降级界面。
 * 关键是：星球换一种方式呈现，但记录心情的主线功能一个都不少。
 */
export function PlanetFallback({ title, description, calm, onRetry }: PlanetFallbackProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 p-6 text-center">
      <PlanetIllustration calm={calm} className="max-w-44" />
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="font-display text-base font-semibold text-ink-50">{title}</h2>
        <p className="text-sm leading-relaxed text-ink-300">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/record" className={buttonClasses('primary', 'md')}>
          <NotebookPen className="size-4" strokeWidth={1.9} aria-hidden />
          记录此刻的心情
        </Link>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RotateCw className="size-4" strokeWidth={1.9} aria-hidden />
            重试 3D 星球
          </Button>
        )}
      </div>
    </div>
  )
}
