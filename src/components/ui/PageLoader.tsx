export function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50dvh] items-center justify-center"
    >
      <span className="sr-only">页面加载中</span>
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-hairline-strong border-t-iris-400"
      />
    </div>
  )
}
