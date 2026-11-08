import { cn } from '@/utils/cn'

interface PlanetIllustrationProps {
  /** 关闭漂浮与闪烁动画 */
  calm?: boolean
  className?: string
}

/**
 * 纯 CSS 星球，只用在 WebGL 不可用或 3D 场景出错的降级界面里。
 * 用百分比定位，容器多宽它就多大。
 */
export function PlanetIllustration({ calm = false, className }: PlanetIllustrationProps) {
  return (
    <div
      className={cn('relative mx-auto aspect-square w-full max-w-60', className)}
      aria-hidden
    >
      <div
        className={cn(
          'absolute inset-0 rounded-full bg-iris-500/18 blur-2xl',
          !calm && 'animate-drift',
        )}
      />
      <div
        className={cn(
          'absolute inset-[9%] rounded-full shadow-glow-iris',
          !calm && 'animate-drift [animation-delay:-3s]',
        )}
        style={{
          backgroundImage:
            'radial-gradient(circle at 32% 26%, #D8CEFF 0%, #A48FF2 26%, #7257CB 52%, #4E9BDD 78%, #2A5F90 100%)',
        }}
      />
      <div className="absolute inset-x-[-14%] top-1/2 h-[34%] -translate-y-1/2 rotate-[-18deg] rounded-[50%] border border-iris-200/30" />
      <div className="absolute inset-x-[-6%] top-1/2 h-[46%] -translate-y-1/2 rotate-[-18deg] rounded-[50%] border border-astro-300/15" />
      {!calm && (
        <>
          <span className="absolute top-[13%] right-[18%] size-1.5 animate-twinkle rounded-full bg-butter-300" />
          <span className="absolute bottom-[22%] left-[9%] size-1 animate-twinkle rounded-full bg-mint-300 [animation-delay:-2s]" />
        </>
      )}
    </div>
  )
}
