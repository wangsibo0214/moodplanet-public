import { Canvas } from '@react-three/fiber'

import { PlanetScene } from '../scene/PlanetScene'
import type { VegetationQuality } from '../scene/Vegetation'

interface PlanetCanvasProps {
  calm: boolean
  quality: VegetationQuality
  detail: number
  fov: number
}

/**
 * 单独的模块，供 React.lazy 动态导入，
 * 让 three / @react-three 只在进入星球主页时才下载。
 */
export default function PlanetCanvas({ calm, quality, detail, fov }: PlanetCanvasProps) {
  return (
    <Canvas
      /* three r187 已移除 PCFSoftShadowMap，显式用 PCF 避免运行期告警 */
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [0, 1.62, 5.55], fov, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        /* 只在开发环境保留绘制缓冲，方便用 toDataURL 做自动化出画验收 */
        preserveDrawingBuffer: import.meta.env.DEV,
      }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.15
      }}
    >
      <PlanetScene calm={calm} quality={quality} detail={detail} />
    </Canvas>
  )
}
