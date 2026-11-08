/**
 * 伙伴头顶与脚底的屏幕坐标（canvas CSS 像素，与舞台同框）。
 * 场景每帧写入、气泡用 rAF 读取：绕开 React 重渲染，拖动星球时气泡也能跟上。
 */
export const companionAnchor = { x: 0, y: 0, bottomY: 0, onScreen: false }