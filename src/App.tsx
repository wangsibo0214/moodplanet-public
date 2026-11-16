import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { startSoundSystem } from '@/features/sound/bootstrap'
import { AppRouter } from '@/router/AppRouter'

export default function App() {
  useEffect(() => startSoundSystem(), [])

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
