/**
 * 检测当前环境能否创建 WebGL 上下文。
 * 探测用的临时上下文会主动释放，避免反复进出主页时耗尽浏览器的上下文配额。
 */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
