import { useState, useEffect } from 'react'

const ITEM_DEFS = [
  { itemType: 0, label: 'Role Definitions',      icon: '👤' },
  { itemType: 1, label: 'Task Definitions',      icon: '📋' },
  { itemType: 2, label: 'Operation Definitions', icon: '⚡' },
]
const ITEM_AUTHS = [
  { itemType: 0, label: 'Roles Authorizations',     icon: '👤' },
  { itemType: 1, label: 'Task Authorizations',      icon: '📋' },
  { itemType: 2, label: 'Operation Authorizations', icon: '⚡' },
]

export default function Sidebar({ selection, onSelect }) {
  const [stores, setStores]       = useState([])
  const [apps, setApps]           = useState({})           // storeId → []
  const [appGroups, setAppGroups] = useState({})           // applicationId → []
  const [items, setItems]         = useState({})           // `${appId}-${type}` → []
  const [expanded, setExpanded]   = useState({})
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadStores() }, [])

  async function loadStores() {
    setLoading(true)
    const r = await window.db.getStores()
    setStores(r.data || [])
    setLoading(false)
  }

  function tog(key) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }))
  }

  async function expandStore(store) {
    const key = `s-${store.StoreId}`
    if (!expanded[key] && !apps[store.StoreId]) {
      const r = await window.db.getApplications(store.StoreId)
      if (r.data) setApps((a) => ({ ...a, [store.StoreId]: r.data }))
    }
    tog(key)
  }

  async function expandAppGroups(app) {
    const key = `ag-${app.ApplicationId}`
    if (!expanded[key] && !appGroups[app.ApplicationId]) {
      const r = await window.db.getApplicationGroups(app.ApplicationId)
      if (r.data) setAppGroups((g) => ({ ...g, [app.ApplicationId]: r.data }))
    }
    tog(key)
    onSelect({ type: 'app-groups-folder', applicationId: app.ApplicationId })
  }

  async function expandItemTypeFolder(app, itemType, prefix) {
    const expKey   = `${prefix}-${app.ApplicationId}-${itemType}`
    const cacheKey = `${app.ApplicationId}-${itemType}`
    if (!expanded[expKey] && !items[cacheKey]) {
      const r = await window.db.getItemsByType(app.ApplicationId, itemType)
      if (r.data) setItems((i) => ({ ...i, [cacheKey]: r.data }))
    }
    tog(expKey)
  }

  function selKey(sel) {
    if (!sel) return ''
    switch (sel.type) {
      case 'app-groups-folder':  return `app-groups-folder:${sel.applicationId}`
      case 'app-group':          return `app-group:${sel.group?.ApplicationGroupId}`
      case 'item-defs-folder':   return `item-defs-folder:${sel.applicationId}:${sel.itemType}`
      case 'item-def':           return `item-def:${sel.item?.ItemId}`
      case 'item-auths-folder':  return `item-auths-folder:${sel.applicationId}:${sel.itemType}`
      case 'item-auth':          return `item-auth:${sel.item?.ItemId}`
      default: return ''
    }
  }
  const currentKey = selKey(selection)

  function isSel(key) { return currentKey === key }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Authorization Manager</span>
        <button className="icon-btn" onClick={loadStores} title="Refresh">↻</button>
      </div>

      {loading && <div className="sidebar-msg">Loading…</div>}

      <div className="tree">
        {stores.map((store) => (
          <div key={store.StoreId}>
            {/* Store */}
            <div className="tree-node n0" onClick={() => expandStore(store)}>
              <span className="tree-arrow">{expanded[`s-${store.StoreId}`] ? '▾' : '▸'}</span>
              <span className="tree-icon">🗄️</span>
              <span className="tree-label" title={store.Description}>{store.Name}</span>
            </div>

            {expanded[`s-${store.StoreId}`] && (apps[store.StoreId] || []).map((app) => (
              <div key={app.ApplicationId}>
                {/* Application */}
                <div className="tree-node n1" onClick={() => tog(`app-${app.ApplicationId}`)}>
                  <span className="tree-arrow">{expanded[`app-${app.ApplicationId}`] ? '▾' : '▸'}</span>
                  <span className="tree-icon">📦</span>
                  <span className="tree-label">{app.Name}</span>
                </div>

                {expanded[`app-${app.ApplicationId}`] && (
                  <>
                    {/* ── Application Groups ─────────────────────────── */}
                    <div
                      className={`tree-node n2 folder ${isSel(`app-groups-folder:${app.ApplicationId}`) ? 'selected' : ''}`}
                      onClick={() => expandAppGroups(app)}
                    >
                      <span className="tree-arrow">{expanded[`ag-${app.ApplicationId}`] ? '▾' : '▸'}</span>
                      <span className="tree-icon">👥</span>
                      <span className="tree-label">Application Groups</span>
                    </div>

                    {expanded[`ag-${app.ApplicationId}`] && (appGroups[app.ApplicationId] || []).map((g) => (
                      <div
                        key={g.ApplicationGroupId}
                        className={`tree-node n3 ${isSel(`app-group:${g.ApplicationGroupId}`) ? 'selected' : ''}`}
                        onClick={() => onSelect({ type: 'app-group', group: g, applicationId: app.ApplicationId })}
                      >
                        <span className="tree-icon">👤</span>
                        <span className="tree-label" title={g.Description}>{g.Name}</span>
                      </div>
                    ))}

                    {/* ── Item Definitions ───────────────────────────── */}
                    <div className="tree-node n2 folder" onClick={() => tog(`defs-${app.ApplicationId}`)}>
                      <span className="tree-arrow">{expanded[`defs-${app.ApplicationId}`] ? '▾' : '▸'}</span>
                      <span className="tree-icon">📁</span>
                      <span className="tree-label">Item Definitions</span>
                    </div>

                    {expanded[`defs-${app.ApplicationId}`] && ITEM_DEFS.map(({ itemType, label, icon }) => {
                      const cacheKey = `${app.ApplicationId}-${itemType}`
                      const expKey   = `defs-${app.ApplicationId}-${itemType}`
                      return (
                        <div key={itemType}>
                          <div
                            className={`tree-node n3 folder ${isSel(`item-defs-folder:${app.ApplicationId}:${itemType}`) ? 'selected' : ''}`}
                            onClick={() => {
                              expandItemTypeFolder(app, itemType, 'defs')
                              onSelect({ type: 'item-defs-folder', applicationId: app.ApplicationId, itemType })
                            }}
                          >
                            <span className="tree-arrow">{expanded[expKey] ? '▾' : '▸'}</span>
                            <span className="tree-icon">{icon}</span>
                            <span className="tree-label">{label}</span>
                          </div>
                          {expanded[expKey] && (items[cacheKey] || []).map((item) => (
                            <div
                              key={item.ItemId}
                              className={`tree-node n4 ${isSel(`item-def:${item.ItemId}`) ? 'selected' : ''}`}
                              onClick={() => onSelect({ type: 'item-def', item })}
                            >
                              <span className="tree-label" title={item.Description}>{item.Name}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}

                    {/* ── Item Authorizations ────────────────────────── */}
                    <div className="tree-node n2 folder" onClick={() => tog(`auths-${app.ApplicationId}`)}>
                      <span className="tree-arrow">{expanded[`auths-${app.ApplicationId}`] ? '▾' : '▸'}</span>
                      <span className="tree-icon">🔐</span>
                      <span className="tree-label">Item Authorizations</span>
                    </div>

                    {expanded[`auths-${app.ApplicationId}`] && ITEM_AUTHS.map(({ itemType, label, icon }) => {
                      const cacheKey = `${app.ApplicationId}-${itemType}`
                      const expKey   = `auths-${app.ApplicationId}-${itemType}`
                      return (
                        <div key={itemType}>
                          <div
                            className={`tree-node n3 folder ${isSel(`item-auths-folder:${app.ApplicationId}:${itemType}`) ? 'selected' : ''}`}
                            onClick={() => {
                              expandItemTypeFolder(app, itemType, 'auths')
                              onSelect({ type: 'item-auths-folder', applicationId: app.ApplicationId, itemType })
                            }}
                          >
                            <span className="tree-arrow">{expanded[expKey] ? '▾' : '▸'}</span>
                            <span className="tree-icon">{icon}</span>
                            <span className="tree-label">{label}</span>
                          </div>
                          {expanded[expKey] && (items[cacheKey] || []).map((item) => (
                            <div
                              key={item.ItemId}
                              className={`tree-node n4 ${isSel(`item-auth:${item.ItemId}`) ? 'selected' : ''}`}
                              onClick={() => onSelect({ type: 'item-auth', item })}
                            >
                              <span className="tree-label" title={item.Description}>{item.Name}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
