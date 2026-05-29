import { useState, useEffect } from 'react'

/**
 * Thin banner shown when an app update is available or ready to install.
 * Only renders in the Electron context (window.updater exists).
 */
export default function UpdateBanner() {
  const [state, setState]     = useState(null)   // null | 'downloading' | 'ready'
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (!window.updater) return
    window.updater.onUpdateAvailable((v)  => { setVersion(v); setState('downloading') })
    window.updater.onUpdateDownloaded((v) => { setVersion(v); setState('ready') })
  }, [])

  if (!state) return null

  return (
    <div className={`update-banner update-banner-${state}`}>
      {state === 'downloading' && (
        <span>⬇ Downloading update {version}…</span>
      )}
      {state === 'ready' && (
        <>
          <span>✓ Update {version} ready</span>
          <button
            className="update-banner-btn"
            onClick={() => window.updater.quitAndInstall()}
          >
            Restart now
          </button>
        </>
      )}
    </div>
  )
}
