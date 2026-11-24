export interface AnchorFollowOptions {
  calm: boolean
  place: () => boolean | void
  firstFrame: 'sync' | 'async'
  request: (callback: FrameRequestCallback) => number
  cancel: (id: number) => void
}

/** reduce 下只同步摆一次；否则持续跟随，place 返回 false 时停止排期。 */
export function startAnchorFollow({
  calm,
  place,
  firstFrame,
  request,
  cancel,
}: AnchorFollowOptions): () => void {
  let frame = 0
  const loop = () => {
    if (place() === false) return
    if (!calm) frame = request(loop)
  }

  if (calm) {
    place()
  } else if (firstFrame === 'sync') {
    if (place() !== false) frame = request(loop)
  } else {
    frame = request(loop)
  }

  return () => {
    if (frame !== 0) cancel(frame)
  }
}
