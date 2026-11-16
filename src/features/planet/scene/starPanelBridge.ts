import type { Object3D } from 'three'

/**
 * 记忆星弹窗的帧同步桥：场景侧注册星的 Object3D，弹窗侧注册自己的 DOM 节点，
 * tracker 在 R3F 现有帧循环里查表投影并直接写样式——不开新动画循环，也不走 React 状态。
 * 与 companionAnchor 同一思路，只是把「读」的那一半也收进帧里，省掉气泡那条 rAF。
 */
const starObjects = new Map<string, Object3D>()

export interface StarPanelNodes {
  root: HTMLDivElement
  panel: HTMLDivElement
  svg: SVGSVGElement
  line: SVGLineElement
  dot: SVGCircleElement
}

let panelNodes: StarPanelNodes | null = null

export function registerStarObject(recordId: string, object: Object3D): void {
  starObjects.set(recordId, object)
}

/* 卸载时只摘自己那份：避免 StrictMode / 快速重挂载把新注册误删 */
export function unregisterStarObject(recordId: string, object: Object3D): void {
  if (starObjects.get(recordId) === object) starObjects.delete(recordId)
}

export function getStarObject(recordId: string): Object3D | undefined {
  return starObjects.get(recordId)
}

export function registerStarPanelNodes(nodes: StarPanelNodes): void {
  panelNodes = nodes
}

export function unregisterStarPanelNodes(nodes: StarPanelNodes): void {
  if (panelNodes === nodes) panelNodes = null
}

export function getStarPanelNodes(): StarPanelNodes | null {
  return panelNodes
}

/* 大小面板与详情面板各占一个槽：store 里两者互斥，但注册互不覆盖 */
let sizePanelNodes: StarPanelNodes | null = null

export function registerSizePanelNodes(nodes: StarPanelNodes): void {
  sizePanelNodes = nodes
}

export function unregisterSizePanelNodes(nodes: StarPanelNodes): void {
  if (sizePanelNodes === nodes) sizePanelNodes = null
}

export function getSizePanelNodes(): StarPanelNodes | null {
  return sizePanelNodes
}