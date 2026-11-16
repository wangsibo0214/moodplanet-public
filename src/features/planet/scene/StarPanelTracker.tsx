import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { PANEL_GAP, PANEL_MARGIN, placeStarPanel } from '@/features/planet/lib/panelPlacement'
import { usePlanetStore } from '@/stores/usePlanetStore'

import {
  getSizePanelNodes,
  getStarObject,
  getStarPanelNodes,
  type StarPanelNodes,
} from './starPanelBridge'

/** 弹窗高度上限：除了 70vh，还留出半座舞台，保证星上下总有一侧放得下弹窗而不盖住它 */
function panelHeightCap(stageHeight: number): number {
  return Math.max(96, Math.min(window.innerHeight * 0.7, stageHeight / 2 - PANEL_GAP - PANEL_MARGIN))
}

/**
 * 每帧把锚定星的世界坐标投影成屏幕坐标，直接写进弹窗 DOM。
 * 挂在 MemoryStars 之后：星的公转/游走本帧已更新，getWorldPosition 再补齐父链矩阵。
 * 投影口径与伙伴气泡一致（canvas CSS 像素，与舞台同框）。
 * 详情与大小面板共用这一套投影与定位，只是锚定记录和 DOM 节点各自独立；
 * 面板关闭即摘除节点，这里查不到节点就直接返回，不再写任何样式。
 */
export function StarPanelTracker() {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const world = useRef(new THREE.Vector3())

  const syncPanel = (recordId: string | null, nodes: StarPanelNodes | null) => {
    if (!nodes) return
    const star = recordId === null ? undefined : getStarObject(recordId)
    if (!star) {
      nodes.root.style.visibility = 'hidden'
      nodes.svg.style.visibility = 'hidden'
      return
    }

    star.getWorldPosition(world.current)
    camera.updateMatrixWorld()
    world.current.project(camera)
    /* 星转到相机背后时收起弹窗，避免投影翻到屏幕另一侧 */
    if (world.current.z > 1) {
      nodes.root.style.visibility = 'hidden'
      nodes.svg.style.visibility = 'hidden'
      return
    }

    const x = (world.current.x * 0.5 + 0.5) * size.width
    const y = (-world.current.y * 0.5 + 0.5) * size.height
    const cap = `${panelHeightCap(size.height)}px`
    if (nodes.panel.style.maxHeight !== cap) nodes.panel.style.maxHeight = cap

    const placement = placeStarPanel(
      { x, y },
      { w: nodes.panel.offsetWidth, h: nodes.panel.offsetHeight },
      { w: size.width, h: size.height },
    )
    nodes.root.style.transform = `translate3d(${placement.left}px, ${placement.top}px, 0)`
    nodes.root.style.visibility = 'visible'
    nodes.root.dataset.side = placement.side
    nodes.root.dataset.vertical = placement.vertical
    nodes.svg.style.visibility = 'visible'
    nodes.line.setAttribute('x1', `${x}`)
    nodes.line.setAttribute('y1', `${y}`)
    nodes.line.setAttribute('x2', `${placement.attach.x}`)
    nodes.line.setAttribute('y2', `${placement.attach.y}`)
    nodes.dot.setAttribute('cx', `${x}`)
    nodes.dot.setAttribute('cy', `${y}`)
  }

  useFrame(() => {
    const state = usePlanetStore.getState()
    syncPanel(state.selectedRecordId, getStarPanelNodes())
    /* 大小面板按星 id 选中，桥按记录 id 查星体：这里换算一次 */
    const sizedRecordId =
      state.sizedStarId === null
        ? null
        : (state.stars.find((star) => star.id === state.sizedStarId)?.recordId ?? null)
    syncPanel(sizedRecordId, getSizePanelNodes())
  })

  return null
}