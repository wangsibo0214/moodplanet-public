import { Orbit } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonClasses } from '@/components/ui'
import { useDocumentTitle } from '@/hooks'

export default function NotFoundPage() {
  useDocumentTitle('页面走丢了')

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center">
      <span
        aria-hidden
        className="grid size-16 place-items-center rounded-full bg-iris-400/12 text-iris-300 ring-1 ring-iris-400/25 ring-inset"
      >
        <Orbit className="size-7" strokeWidth={1.5} />
      </span>

      <div className="flex flex-col gap-2">
        <p className="font-display text-5xl font-semibold text-iris-300">404</p>
        <h1 className="text-xl font-semibold text-ink-50">这颗星球不在航线图上</h1>
        <p className="max-w-sm text-sm leading-relaxed text-ink-500">
          你要找的页面可能已经改名或从未存在。回到星球主页，从那里重新出发。
        </p>
      </div>

      <Link to="/" className={buttonClasses('primary', 'lg')}>
        回到星球主页
      </Link>
    </div>
  )
}
