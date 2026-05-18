import { useState } from 'react'

const DEFAULT_CONFIG = {
  server: '',
  port: '1433',
  user: '',
  password: '',
  database: '',
}

export default function ConnectionBar({ connected, onConnectionChange }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(true)

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
    } else {
      setError(result.error)
    }
  }

  async function handleDisconnect() {
    await window.db.disconnect()
    onConnectionChange(false)
    setShowForm(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleConnect()
  }

  return (
    <header className="connection-bar">
      <div className="app-title">NetSqlAzMan Manager</div>

      {showForm ? (
        <div className="conn-form" onKeyDown={handleKeyDown}>
          <input placeholder="Server" value={config.server} onChange={set('server')} />
          <input placeholder="Port" value={config.port} onChange={set('port')} style={{ width: 64 }} />
          <input placeholder="User" value={config.user} onChange={set('user')} />
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
        <div className="conn-status">
          <span className="status-dot" />
          <span className="conn-info">{config.server}:{config.port} / {config.database}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>Disconnect</button>
        </div>
      )}
    </header>
  )
}
