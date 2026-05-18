import { useState, useEffect, useRef } from 'react'

const EMPTY = { server: '', port: '1433', user: '', password: '', database: '' }

export default function ConnectionBar({ connected, onConnectionChange }) {
  const [config, setConfig]               = useState(EMPTY)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [showForm, setShowForm]           = useState(true)
  const [saved, setSaved]                 = useState([])
  const [showDropdown, setShowDropdown]   = useState(false)
  const [saveMode, setSaveMode]           = useState(false)   // inline save-name input
  const [saveName, setSaveName]           = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    loadSaved()
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
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
    setError('')
  }

  async function handleSave() {
    if (!saveName.trim()) return
    const list = await window.connections.save({
      name: saveName.trim(),
      server: config.server, port: config.port,
      user: config.user, password: config.password, database: config.database,
    })
    setSaved(list)
    setSaveMode(false)
    setSaveName('')
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
              📂 {saved.length > 0 ? saved.length : ''} ▾
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
          <input placeholder="Server"   value={config.server}   onChange={set('server')} />
          <input placeholder="Port"     value={config.port}     onChange={set('port')}     style={{ width: 60 }} />
          <input placeholder="User"     value={config.user}     onChange={set('user')} />
          <input type="password" placeholder="Password" value={config.password} onChange={set('password')} />
          <input placeholder="Database" value={config.database} onChange={set('database')} />

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
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!saveName.trim()}>Save</button>
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
    </header>
  )
}
