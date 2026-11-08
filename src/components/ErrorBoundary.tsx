import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
  /** 出错时的标识，仅用于日志 */
  label?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * 兜底边界。3D 场景、着色器编译或驱动问题都可能抛错，
 * 这里保证任何一处崩溃都只降级当前模块，不让整站白屏。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[MoodPlanet] ${this.props.label ?? '模块'} 渲染失败，已降级`,
      error,
      info.componentStack,
    )
  }

  render(): ReactNode {
    return this.state.error ? this.props.fallback : this.props.children
  }
}
