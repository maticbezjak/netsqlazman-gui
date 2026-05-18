import { useState } from 'react'
import ConnectionBar from './components/ConnectionBar'
import Sidebar from './components/Sidebar'
import ItemPanel from './components/ItemPanel'

export default function App() {
  const [connected, setConnected] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  function handleConnectionChange(isConnected) {
    setConnected(isConnected)
    if (!isConnected) setSelectedItem(null)
  }

  return (
    <div className="app">
      <ConnectionBar connected={connected} onConnectionChange={handleConnectionChange} />
      <div className="workspace">
        {connected && (
          <Sidebar selectedItem={selectedItem} onItemSelect={setSelectedItem} />
        )}
        <main className="content">
          {!connected ? (
            <div className="empty-state">
              <div className="empty-icon">🔒</div>
              <h2>Not connected</h2>
              <p>Enter your SQL Server connection details above to get started.</p>
            </div>
          ) : !selectedItem ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h2>Select an item</h2>
              <p>Expand a store and application in the sidebar to browse items.</p>
            </div>
          ) : (
            <ItemPanel item={selectedItem} />
          )}
        </main>
      </div>
    </div>
  )
}
