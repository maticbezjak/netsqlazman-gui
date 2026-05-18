import { useState } from 'react'
import ConnectionBar from './components/ConnectionBar'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'

export default function App() {
  const [connected, setConnected] = useState(false)
  const [selection, setSelection] = useState(null)

  function handleConnectionChange(isConnected) {
    setConnected(isConnected)
    if (!isConnected) setSelection(null)
  }

  return (
    <div className="app">
      <ConnectionBar connected={connected} onConnectionChange={handleConnectionChange} />
      <div className="workspace">
        {connected && (
          <Sidebar selection={selection} onSelect={setSelection} />
        )}
        <main className="content">
          {!connected ? (
            <div className="empty-state">
              <div className="empty-icon">🔒</div>
              <h2>Not connected</h2>
              <p>Enter your SQL Server connection details above to get started.</p>
            </div>
          ) : (
            <MainPanel selection={selection} onSelect={setSelection} />
          )}
        </main>
      </div>
    </div>
  )
}
