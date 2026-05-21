import { useState, useRef, useEffect } from 'react'
import ConnectionBar from './components/ConnectionBar'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import Breadcrumb from './components/Breadcrumb'
import UserLookup from './components/UserLookup'
import HelpModal from './components/HelpModal'
import { IconLock } from './components/Icon'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmDialog'

export default function App() {
  const [connected, setConnected] = useState(false)
  const [selection, setSelection] = useState(null)
  const [sidebarW, setSidebarW]   = useState(280)
  const [theme, setTheme]         = useState(() => localStorage.getItem('theme') || 'light')
  const [view, setView]           = useState('store')  // 'store' | 'lookup'
  const [showHelp, setShowHelp]   = useState(false)
  const sidebarRef = useRef()
  const dragging   = useRef(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => t === 'light' ? 'dark' : 'light')
  }

  function handleConnectionChange(isConnected) {
    setConnected(isConnected)
    if (!isConnected) { setSelection(null); setView('store') }
  }

  function refreshGroups(appId) { sidebarRef.current?.refreshGroups(appId) }
  function refreshItems(appId, itemType) { sidebarRef.current?.refreshItems(appId, itemType) }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      setSidebarW(Math.max(160, Math.min(480, e.clientX)))
    }
    function onMouseUp() { dragging.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="app">
          <ConnectionBar connected={connected} onConnectionChange={handleConnectionChange} theme={theme} onToggleTheme={toggleTheme} onHelp={() => setShowHelp(true)} />
          {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
          {connected && (
            <div className="tab-bar">
              <button className={`tab-btn ${view === 'store'  ? 'active' : ''}`} onClick={() => setView('store')}>
                Store Browser
              </button>
              <button className={`tab-btn ${view === 'lookup' ? 'active' : ''}`} onClick={() => setView('lookup')}>
                User Lookup
              </button>
            </div>
          )}

          <div className="workspace">
            {connected && view === 'store' && (
              <>
                <Sidebar
                  ref={sidebarRef}
                  style={{ width: sidebarW, minWidth: sidebarW }}
                  selection={selection}
                  onSelect={setSelection}
                />
                <div
                  className="resize-handle"
                  onMouseDown={(e) => { dragging.current = true; e.preventDefault() }}
                />
              </>
            )}
            <main className="content">
              {!connected ? (
                <div className="empty-state">
                  <div className="empty-icon"><IconLock size={48} strokeWidth={1.4} /></div>
                  <h2>Not connected</h2>
                  <p>Enter your SQL Server connection details above to get started.</p>
                </div>
              ) : view === 'lookup' ? (
                <UserLookup />
              ) : (
                <>
                  <Breadcrumb selection={selection} />
                  <MainPanel
                    selection={selection}
                    onSelect={setSelection}
                    onRefreshGroups={refreshGroups}
                    onRefreshItems={refreshItems}
                  />
                </>
              )}
            </main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
