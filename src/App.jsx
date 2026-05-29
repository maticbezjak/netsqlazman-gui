import { useState, useRef, useEffect, useCallback } from 'react'
import ConnectionBar from './components/ConnectionBar'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import Breadcrumb from './components/Breadcrumb'
import UserLookup from './components/UserLookup'
import UserCompare from './components/UserCompare'
import HelpModal from './components/HelpModal'
import UpdateBanner from './components/UpdateBanner'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalSearch from './components/GlobalSearch'
import { IconLock } from './components/Icon'
import { ToastProvider, useToast } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmDialog'

function AppInner() {
  const [connected, setConnected] = useState(false)
  const [selection, setSelection] = useState(null)
  const [sidebarW, setSidebarW]   = useState(280)
  const [theme, setTheme]         = useState(() => localStorage.getItem('theme') || 'light')
  const [view, setView]           = useState('store')
  const [showHelp, setShowHelp]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [connLost, setConnLost]   = useState(false)
  const sidebarRef  = useRef()
  const dragging    = useRef(false)
  const pingTimer   = useRef(null)
  const { showToast } = useToast()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (connected) setShowSearch((v) => !v)
      }
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey)) {
        if (connected && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          sidebarRef.current?.reload()
        }
      }
      if (e.key === 'Escape') setShowSearch(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [connected])

  // ── Connection health check (ping every 30s) ───────────────────────────────
  useEffect(() => {
    if (!connected || !window.db?.ping) return
    pingTimer.current = setInterval(async () => {
      const res = await window.db.ping()
      if (!res.ok) {
        setConnLost(true)
        showToast('Connection to SQL Server was lost.', 'error')
      } else {
        setConnLost(false)
      }
    }, 30_000)
    return () => clearInterval(pingTimer.current)
  }, [connected])

  function toggleTheme() { setTheme((t) => t === 'light' ? 'dark' : 'light') }

  function handleConnectionChange(isConnected) {
    setConnected(isConnected)
    setConnLost(false)
    if (!isConnected) { setSelection(null); setView('store') }
  }

  function refreshGroups(appId) { sidebarRef.current?.refreshGroups(appId) }
  function refreshItems(appId, itemType) { sidebarRef.current?.refreshItems(appId, itemType) }

  // ── Global search navigation ───────────────────────────────────────────────
  function handleSearchNavigate({ view: targetView, selection: targetSel }) {
    setView(targetView || 'store')
    setSelection(targetSel || null)
  }

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
    <div className="app">
      <ConnectionBar connected={connected} onConnectionChange={handleConnectionChange} theme={theme} onToggleTheme={toggleTheme} onHelp={() => setShowHelp(true)} />
      <UpdateBanner />

      {connLost && (
        <div className="conn-lost-banner">
          ⚠ Connection to SQL Server was lost.
          <button className="conn-lost-btn" onClick={() => handleConnectionChange(false)}>
            Reconnect
          </button>
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSearch && (
        <GlobalSearch
          onNavigate={handleSearchNavigate}
          onClose={() => setShowSearch(false)}
        />
      )}

      {connected && (
        <div className="tab-bar">
          <button className={`tab-btn ${view === 'store'   ? 'active' : ''}`} onClick={() => setView('store')}>Store Browser</button>
          <button className={`tab-btn ${view === 'lookup'  ? 'active' : ''}`} onClick={() => setView('lookup')}>User Lookup</button>
          <button className={`tab-btn ${view === 'compare' ? 'active' : ''}`} onClick={() => setView('compare')}>Compare Users</button>
          <button className="tab-search-btn" onClick={() => setShowSearch(true)} title="Global search (Ctrl+K)">🔍</button>
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
            <div className="resize-handle" onMouseDown={(e) => { dragging.current = true; e.preventDefault() }} />
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
          ) : view === 'compare' ? (
            <UserCompare />
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
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <AppInner />
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
