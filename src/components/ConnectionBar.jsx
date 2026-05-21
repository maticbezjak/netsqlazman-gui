import { useState, useEffect, useRef } from 'react'
import { IconCheck, IconFolderOpen, IconChevDown, IconSun, IconMoon } from './Icon'

const EMPTY = { server: '', port: '1433', user: '', password: '', database: '' }

export default function ConnectionBar({ connected, onConnectionChange, theme, onToggleTheme }) {
  const [config, setConfig]               = useState(EMPTY)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [showForm, setShowForm]           = useState(true)
  const [saved, setSaved]                 = useState([])
  const [showDropdown, setShowDropdown]   = useState(false)
  const [saveMode, setSaveMode]           = useState(false)   // inline save-name input
  const [saveName, setSaveName]           = useState('')
  const [saving, setSaving]               = useState(false)
  const [savedFlash, setSavedFlash]       = useState(false)  // brief "Saved!" confirmation
  const dropdownRef = useRef(null)

  // ── Database picker ────────────────────────────────────────────────────────
  const [dbList, setDbList]         = useState([])
  const [dbLoading, setDbLoading]   = useState(false)
  const [dbError, setDbError]       = useState('')
  const [showDbDrop, setShowDbDrop] = useState(false)
  const [dbDropRect, setDbDropRect] = useState(null)
  const dbWrapRef = useRef(null)

  useEffect(() => {
    loadSaved()
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
      if (dbWrapRef.current && !dbWrapRef.current.contains(e.target)) setShowDbDrop(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function loadSaved() {
    const list = await window.connections.load()
    setSaved(list)
  }

  function set(field) {
    return (e) => setConfig((c) => ({ ...c, [field]: e.target.value }))
  }

  async function handleConnect() {
    setLoading(true)
    setError('')
    const result = await window.db.connect(config)
    setLoading(false)
    if (result.success) {
      onConnectionChange(true)
      setShowForm(false)
      setShowDropdown(false)
    } else {
      setError(result.error)
    }
  }

  async function handleDisconnect() {
    await window.db.disconnect()
    onConnectionChange(false)
    setShowForm(true)
    setSaveMode(false)
  }

  function applyConnection(conn) {
    setConfig({ server: conn.server, port: conn.port, user: conn.user, password: conn.password, database: conn.database })
    setShowDropdown(false)
    setDbList([])
    setError('')
  }

  async function fetchDatabases() {
    setDbLoading(true)
    setDbError('')
    setShowDbDrop(false)
    try {
      const r = await window.db.listDatabases({ server: config.server, port: config.port, user: config.user, password: config.password })
      if (r.data) {
        setDbList(r.data)
        if (dbWrapRef.current) setDbDropRect(dbWrapRef.current.getBoundingClientRect())
        setShowDbDrop(true)
      } else {
        setDbError(r.error || 'Could not connect')
      }
    } catch (err) {
      setDbError(err.message || 'Unknown error')
    } finally {
      setDbLoading(false)
    }
  }

  const canFetchDbs = !!(config.server && config.user && config.password)
  const filteredDbs = dbList.filter((name) =>
    !config.database || name.toLowerCase().includes(config.database.toLowerCase())
  )

  async function handleSave() {
    if (!saveName.trim()) return
    setSaving(true)
    try {
      const list = await window.connections.save({
        name: saveName.trim(),
        server: config.server, port: config.port,
        user: config.user, password: config.password, database: config.database,
      })
      setSaved(list)
      setSaveMode(false)
      setSaveName('')
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (err) {
      alert('Failed to save connection:\n' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    const list = await window.connections.delete(id)
    setSaved(list)
  }

  async function handleConnectAndSave(conn) {
    applyConnection(conn)
    // slight delay so config state settles before connect
    setTimeout(async () => {
      setLoading(true)
      setError('')
      const result = await window.db.connect(conn)
      setLoading(false)
      if (result.success) { onConnectionChange(true); setShowForm(false) }
      else setError(result.error)
    }, 0)
  }

  return (
    <header className="connection-bar">
      <div className="app-title">NetSqlAzMan Manager</div>

      {showForm ? (
        <div className="conn-form" onKeyDown={(e) => e.key === 'Enter' && handleConnect()}>

          {/* ── Saved connections dropdown ─────────── */}
          <div className="saved-wrap" ref={dropdownRef}>
            <button
              className={`btn btn-ghost btn-sm saved-toggle ${showDropdown ? 'active' : ''}`}
              onClick={() => setShowDropdown((v) => !v)}
              title="Saved connections"
            >
              <IconFolderOpen /> {saved.length > 0 ? saved.length : ''} <IconChevDown />
            </button>

            {showDropdown && (
              <div className="saved-dropdown">
                <div className="saved-header">Saved connections</div>

                {saved.length === 0 && (
                  <div className="saved-empty">No saved connections yet.</div>
                )}

                {saved.map((conn) => (
                  <div key={conn.id} className="saved-item" onClick={() => handleConnectAndSave(conn)}>
                    <div className="saved-item-info">
                      <span className="saved-name">{conn.name}</span>
                      <span className="saved-detail">{conn.server}:{conn.port} · {conn.database} · {conn.user}</span>
                    </div>
                    <button className="saved-del" onClick={(e) => handleDelete(conn.id, e)} title="Delete">×</button>
                  </div>
                ))}

                <div className="saved-footer">
                  {saveMode ? (
                    <div className="save-row">
                      <input
                        className="save-name-input"
                        placeholder="Connection name…"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaveMode(false) }}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!saveName.trim()}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSaveMode(false)}>✕</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm save-current-btn"
                      onClick={() => { setSaveName(''); setSaveMode(true) }}
                      disabled={!config.server}
                    >
                      💾 Save current form as…
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Connection fields ─────────────────── */}
          <input className="conn-server"   placeholder="Server"   value={config.server}   onChange={set('server')} />
          <input className="conn-port"     placeholder="Port"     value={config.port}     onChange={set('port')} />
          <input className="conn-user"     placeholder="User"     value={config.user}     onChange={set('user')} />
          <input className="conn-password" type="password" placeholder="Password" value={config.password} onChange={set('password')} />

          {/* ── Database picker ─────────────────────── */}
          <div className="conn-db-wrap" ref={dbWrapRef}>
            <input
              className="conn-db"
              placeholder="Database"
              value={config.database}
              onChange={(e) => { set('database')(e); setShowDbDrop(dbList.length > 0) }}
              onFocus={() => { if (dbList.length > 0) setShowDbDrop(true) }}
              onKeyDown={(e) => { if (e.key === 'Escape') setShowDbDrop(false) }}
            />
            <button
              className="db-browse-btn"
              type="button"
              onClick={fetchDatabases}
              disabled={dbLoading || !canFetchDbs}
              title={canFetchDbs ? 'Browse available databases' : 'Enter server, user and password first'}
            >
              {dbLoading ? '…' : <IconChevDown />}
            </button>
            {showDbDrop && dbDropRect && (
              <div
                className="db-dropdown"
                style={{ top: dbDropRect.bottom + 3, left: dbDropRect.left, width: dbDropRect.width }}
              >
                {filteredDbs.length > 0
                  ? filteredDbs.map((name) => (
                      <div
                        key={name}
                        className={`db-dropdown-item${config.database === name ? ' active' : ''}`}
                        onMouseDown={(e) => { e.preventDefault(); setConfig((c) => ({ ...c, database: name })); setShowDbDrop(false) }}
                      >
                        {name}
                      </div>
                    ))
                  : <div className="db-dropdown-empty">No matching databases</div>
                }
              </div>
            )}
            {dbError && <div className="db-error">{dbError}</div>}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={loading || !config.server || !config.user}
          >
            {loading ? 'Connecting…' : 'Connect'}
          </button>

          {error && <span className="conn-error" title={error}>⚠ {error}</span>}
        </div>
      ) : (
        /* ── Connected state ───────────────────────── */
        <div className="conn-status">
          <span className="status-dot" />
          <span className="conn-info">{config.server}:{config.port} / {config.database}</span>

          {savedFlash && <span className="save-flash"><IconCheck /> Saved!</span>}

          {saveMode ? (
            <>
              <input
                className="save-name-connected"
                placeholder="Connection name…"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaveMode(false) }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !saveName.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSaveMode(false)}>✕</button>
            </>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSaveName(saved.find(s => s.server === config.server && s.database === config.database)?.name ?? ''); setSaveMode(true) }}
              title="Save this connection"
            >
              💾 Save
            </button>
          )}

          <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>Disconnect</button>
        </div>
      )}

      <button className="theme-toggle" onClick={onToggleTheme} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
        {theme === 'light' ? <IconMoon /> : <IconSun />}
      </button>
    </header>
  )
}
