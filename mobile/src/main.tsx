import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import App from './App'
import './index.css'
import { usePathname } from './lib/pathname'
import { isCarePath } from './care/routing'

// The caretaker web app loads only on /care, so the phone app's bundle and styles stay as they were.
const CareApp = lazy(() => import('./care/CareApp'))

/** `/` = senior phone app; `/care/*` = caretaker web app. */
function Root() {
  const pathname = usePathname()
  if (isCarePath(pathname)) {
    return (
      <Suspense fallback={null}>
        <CareApp />
      </Suspense>
    )
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
