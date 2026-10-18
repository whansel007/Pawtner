import React, { Suspense, lazy, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import App from './App'
import './index.css'
import { usePathname } from './lib/pathname'
import { isCarePath } from './care/routing'
import type { Screen } from './types'

// The caretaker web app loads only on /care, so the phone app's bundle and styles stay as they were.
const CareApp = lazy(() => import('./care/CareApp'))

/**
 * `/` = senior phone app; `/care/*` = caretaker web app.
 * "Reset to morning" restarts the phone app in place (a new key = fresh state, like a reload without leaving the page),
 * back on the screen it was on.
 */
function Root() {
  const pathname = usePathname()
  const [restart, setRestart] = useState<{ key: number; screen: Screen } | null>(null)
  if (isCarePath(pathname)) {
    return (
      <Suspense fallback={null}>
        <CareApp />
      </Suspense>
    )
  }
  return <App key={restart?.key ?? 0} startScreen={restart?.screen} onRestart={(screen) => setRestart((current) => ({ key: (current?.key ?? 0) + 1, screen }))} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
