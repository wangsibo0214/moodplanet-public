import { Canvas } from '@react-three/fiber'

import { CapsuleScene } from '../scene/CapsuleScene'
import type { CapsuleStatus } from '@/types/capsule'

interface CapsuleCanvasProps {
  status: CapsuleStatus | null
  calm: boolean
}

/** 单独模块供 React.lazy 动态导入，three 只在进入胶囊页时才下载。 */
export default function CapsuleCanvas({ status, calm }: CapsuleCanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.15, 4.4], fov: 40, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: import.meta.env.DEV,
      }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.12
      }}
    >
      <CapsuleScene status={status} calm={calm} />
    </Canvas>
  )
}
