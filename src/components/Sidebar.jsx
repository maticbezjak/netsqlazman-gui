import { useState, useEffect } from 'react'

const ITEM_ICON  = { 0: '⚡', 1: '📋', 2: '👤', 3: '👥' }
const ITEM_LABEL = { 0: 'Op',   1: 'Task', 2: 'Role', 3: 'Grp' }

export default function Sidebar({ selectedItem, onItemSelect }) {
  const [stores, setStores]   = useState([])
  const [apps, setApps]       = useState({})   // storeId  → []
  const [items, setItems]     = useState({})   // appId    → []
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => { loadStores() }, [])

  async function loadStores() {
    setLoading(true)
    setError('')
    const result = await window.db.getStores()
    if (result.error) setError(result.error)
    else setStores(result.data || [])
    setLoading(false)
  }

  async function toggleStore(store) {
    const key = `s-${store.StoreId}`
    const opening = !expanded[key]
    setExpanded((e) => ({ ...e, [key]: opening }))
    if (opening && !apps[store.StoreId]) {
      const result = await window.db.getApplications(store.StoreId)
      if (result.data) setApps((a) => ({ ...a, [store.StoreId]: result.data }))
    }
  }

  async function toggleApp(app) {
    const key = `a-${app.ApplicationId}`
    const opening = !expanded[key]
    setExpanded((e) => ({ ...e, [key]: opening }))
    if (opening && !items[app.ApplicationId]) {
      const result = await window.db.getItems(app.ApplicationId)
      if (result.data) setItems((i) => ({ ...i, [app.ApplicationId]: result.data }))
    }
  }

  async function refreshApp(app) {
    const result = await window.db.getItems(app.ApplicationId)
    if (result.data) setItems((i) => ({ ...i, [app.ApplicationId]: result.data }))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Stores</span>
        <button className="icon-btn" onClick={loadStores} title="Refresh">↻</button>
      </div>

      {loading && <div className="sidebar-msg">Loading…</div>}
      {error   && <div className="sidebar-msg error">⚠ {error}</div>}

      <div className="tree">
        {stores.map((store) => (
          <div key={store.StoreId}>
            <div className="tree-node store-node" onClick={() => toggleStore(store)}>
              <span className="tree-arrow">{expanded[`s-${store.StoreId}`] ? '▾' : '▸'}</span>
              <span className="tree-icon">🗄️</span>
              <span className="tree-label" title={store.Description || store.Name}>{store.Name}</span>
            </div>

            {expanded[`s-${store.StoreId}`] && (apps[store.StoreId] || []).map((app) => (
              <div key={app.ApplicationId}>
                <div className="tree-node app-node" onClick={() => toggleApp(app)}>
                  <span className="tree-arrow">{expanded[`a-${app.ApplicationId}`] ? '▾' : '▸'}</span>
                  <span className="tree-icon">📦</span>
                  <span className="tree-label" title={app.Description || app.Name}>{app.Name}</span>
                  {expanded[`a-${app.ApplicationId}`] && (
                    <button
                      className="icon-btn tiny"
                      onClick={(e) => { e.stopPropagation(); refreshApp(app) }}
                      title="Refresh items"
                    >↻</button>
                  )}
                </div>

                {expanded[`a-${app.ApplicationId}`] && (items[app.ApplicationId] || []).map((item) => (
                  <div
                    key={item.ItemId}
                    className={`tree-node item-node ${selectedItem?.ItemId === item.ItemId ? 'selected' : ''}`}
                    onClick={() => onItemSelect(item)}
                  >
                    <span className="tree-icon item-icon">{ITEM_ICON[item.ItemType] ?? '•'}</span>
                    <span className="tree-label" title={item.Description || item.Name}>{item.Name}</span>
                    <span className="item-badge">{ITEM_LABEL[item.ItemType]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
