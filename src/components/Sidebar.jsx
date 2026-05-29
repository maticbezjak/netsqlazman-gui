import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import {
  IconUser, IconUsers, IconTask, IconOp,
  IconStore, IconApp, IconFolder, IconFolderKey,
  IconRefresh, IconChevRight, IconChevDown,
} from './Icon'

const ITEM_DEFS = [
  { itemType: 0, label: 'Role Definitions',      Icon: IconUser },
  { itemType: 1, label: 'Task Definitions',      Icon: IconTask },
  { itemType: 2, label: 'Operation Definitions', Icon: IconOp   },
]
const ITEM_AUTHS = [
  { itemType: 0, label: 'Roles Authorizations',     Icon: IconUser },
  { itemType: 1, label: 'Task Authorizations',      Icon: IconTask },
  { itemType: 2, label: 'Operation Authorizations', Icon: IconOp   },
]

const STORAGE_KEY = 'azman_sidebar_expanded'

function loadSavedExpanded() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

const Sidebar = forwardRef(function Sidebar({ selection, onSelect, style }, ref) {
  const [stores, setStores]       = useState([])
  const [apps, setApps]           = useState({})
  const [appGroups, setAppGroups] = useState({})
  const [items, setItems]         = useState({})
  const [expanded, setExpanded]   = useState(loadSavedExpanded)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  // Persist expanded state to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded)) } catch {}
  }, [expanded])

  useEffect(() => { loadStores() }, [])

  // Auto-reveal when selection comes from GlobalSearch
  useEffect(() => {
    if (selection?.applicationId) autoReveal(selection)
  }, [selection])

  useImperativeHandle(ref, () => ({
    async refreshGroups(appId) {
      const r = await window.db.getApplicationGroups(appId)
      if (r.data) setAppGroups((g) => ({ ...g, [appId]: r.data }))
    },
    async refreshItems(appId, itemType) {
      const key = `${appId}-${itemType}`
      const r = await window.db.getItemsByType(appId, itemType)
      if (r.data) setItems((i) => ({ ...i, [key]: r.data }))
    },
    reload() { loadStores() },
  }))

  async function loadStores() {
    setLoading(true)
    const r = await window.db.getStores()
    const storeList = r.data || []
    setStores(storeList)
    setLoading(false)
    await autoExpand(storeList)
  }

  async function autoExpand(storeList) {
    if (!storeList.length) return
    const store = storeList[0]
    const appsRes = await window.db.getApplications(store.StoreId)
    const appList = appsRes.data || []
    setApps((a) => ({ ...a, [store.StoreId]: appList }))
    if (!appList.length) {
      setExpanded((e) => ({ ...e, [`s-${store.StoreId}`]: true }))
      return
    }
    const app = appList[0]
    const groupsRes = await window.db.getApplicationGroups(app.ApplicationId)
    setAppGroups((g) => ({ ...g, [app.ApplicationId]: groupsRes.data || [] }))
    setExpanded((e) => ({
      ...e,
      [`s-${store.StoreId}`]:         true,
      [`app-${app.ApplicationId}`]:   true,
      [`ag-${app.ApplicationId}`]:    true,
      [`defs-${app.ApplicationId}`]:  true,
      [`auths-${app.ApplicationId}`]: true,
    }))
    onSelect({ type: 'app-groups-folder', applicationId: app.ApplicationId, appName: app.Name })
  }

  // ── Auto-reveal a selection (e.g. from GlobalSearch) ──────────────────────
  async function autoReveal(sel) {
    const appId = sel.applicationId
    if (!appId) return

    // Find which store owns this app — check loaded apps first
    let foundStoreId = null
    for (const [storeId, appList] of Object.entries(apps)) {
      if (appList.find((a) => a.ApplicationId === appId)) { foundStoreId = Number(storeId); break }
    }

    // If not found, load apps for each store until we find it
    if (!foundStoreId) {
      for (const store of stores) {
        let appList = apps[store.StoreId]
        if (!appList) {
          const r = await window.db.getApplications(store.StoreId)
          appList = r.data || []
          setApps((a) => ({ ...a, [store.StoreId]: appList }))
        }
        if (appList.find((a) => a.ApplicationId === appId)) { foundStoreId = store.StoreId; break }
      }
    }
    if (!foundStoreId) return

    // Ensure groups are loaded
    if (!appGroups[appId]) {
      const r = await window.db.getApplicationGroups(appId)
      setAppGroups((g) => ({ ...g, [appId]: r.data || [] }))
    }

    // Expand appropriate nodes based on selection type
    const updates = {
      [`s-${foundStoreId}`]:       true,
      [`app-${appId}`]:            true,
      [`ag-${appId}`]:             true,
    }
    if (sel.type === 'item-def' || sel.type === 'item-defs-folder') {
      updates[`defs-${appId}`] = true
      if (sel.item?.ItemType !== undefined) updates[`defs-${appId}-${sel.item.ItemType}`] = true
    }
    if (sel.type === 'item-auth' || sel.type === 'item-auths-folder') {
      updates[`auths-${appId}`] = true
      if (sel.item?.ItemType !== undefined) updates[`auths-${appId}-${sel.item.ItemType}`] = true
    }
    setExpanded((e) => ({ ...e, ...updates }))
  }

  function tog(key) { setExpanded((e) => ({ ...e, [key]: !e[key] })) }

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
    onSelect({ type: 'app-groups-folder', applicationId: app.ApplicationId, appName: app.Name })
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
  const isSel = (key) => currentKey === key

  const q    = search.trim().toLowerCase()
  const hasQ = !!q
  const filterByName = (list) => hasQ ? list.filter((x) => (x.Name || '').toLowerCase().includes(q)) : list

  return (
    <aside className="sidebar" style={style}>
      <div className="sidebar-header">
        <span>Authorization Manager</span>
        <button className="icon-btn" onClick={loadStores} title="Refresh (F5)"><IconRefresh /></button>
      </div>

      <div className="sidebar-search-wrap">
        <input
          className="sidebar-search"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="sidebar-msg">Loading…</div>}

      <div className="tree">
        {stores.map((store) => (
          <div key={store.StoreId}>
            <div className="tree-node n0" onClick={() => expandStore(store)}>
              <span className="tree-arrow">{expanded[`s-${store.StoreId}`] ? <IconChevDown /> : <IconChevRight />}</span>
              <span className="tree-icon"><IconStore /></span>
              <span className="tree-label" title={store.Description}>{store.Name}</span>
            </div>

            {expanded[`s-${store.StoreId}`] && (
              <div className="tree-level">
                {(apps[store.StoreId] || []).map((app) => (
                  <div key={app.ApplicationId}>
                    <div className="tree-node n1" onClick={() => tog(`app-${app.ApplicationId}`)}>
                      <span className="tree-tick" />
                      <span className="tree-arrow">{expanded[`app-${app.ApplicationId}`] ? <IconChevDown /> : <IconChevRight />}</span>
                      <span className="tree-icon"><IconApp /></span>
                      <span className="tree-label">{app.Name}</span>
                    </div>

                    {expanded[`app-${app.ApplicationId}`] && (
                      <div className="tree-level">

                        {/* Application Groups folder */}
                        <div className={`tree-node n2 folder ${isSel(`app-groups-folder:${app.ApplicationId}`) ? 'selected' : ''}`}
                          onClick={() => expandAppGroups(app)}>
                          <span className="tree-tick" />
                          <span className="tree-arrow">{expanded[`ag-${app.ApplicationId}`] ? <IconChevDown /> : <IconChevRight />}</span>
                          <span className="tree-icon"><IconUsers /></span>
                          <span className="tree-label">Application Groups</span>
                        </div>

                        {expanded[`ag-${app.ApplicationId}`] && (
                          <div className="tree-level">
                            {filterByName(appGroups[app.ApplicationId] || []).map((g) => (
                              <div key={g.ApplicationGroupId}
                                className={`tree-node n3 ${isSel(`app-group:${g.ApplicationGroupId}`) ? 'selected' : ''}`}
                                onClick={() => onSelect({ type: 'app-group', group: g, applicationId: app.ApplicationId, appName: app.Name })}>
                                <span className="tree-tick" />
                                <span className="tree-icon"><IconUser /></span>
                                <span className="tree-label" title={g.Description}>{g.Name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Item Definitions folder */}
                        <div className="tree-node n2 folder" onClick={() => tog(`defs-${app.ApplicationId}`)}>
                          <span className="tree-tick" />
                          <span className="tree-arrow">{expanded[`defs-${app.ApplicationId}`] ? <IconChevDown /> : <IconChevRight />}</span>
                          <span className="tree-icon"><IconFolder /></span>
                          <span className="tree-label">Item Definitions</span>
                        </div>

                        {expanded[`defs-${app.ApplicationId}`] && (
                          <div className="tree-level">
                            {ITEM_DEFS.map(({ itemType, label, Icon }) => {
                              const cacheKey = `${app.ApplicationId}-${itemType}`
                              const expKey   = `defs-${app.ApplicationId}-${itemType}`
                              return (
                                <div key={itemType}>
                                  <div className={`tree-node n3 folder ${isSel(`item-defs-folder:${app.ApplicationId}:${itemType}`) ? 'selected' : ''}`}
                                    onClick={() => { expandItemTypeFolder(app, itemType, 'defs'); onSelect({ type: 'item-defs-folder', applicationId: app.ApplicationId, itemType, appName: app.Name }) }}>
                                    <span className="tree-tick" />
                                    <span className="tree-arrow">{expanded[expKey] ? <IconChevDown /> : <IconChevRight />}</span>
                                    <span className="tree-icon"><Icon /></span>
                                    <span className="tree-label">{label}</span>
                                  </div>
                                  {expanded[expKey] && (
                                    <div className="tree-level">
                                      {filterByName(items[cacheKey] || []).map((item) => (
                                        <div key={item.ItemId}
                                          className={`tree-node n4 ${isSel(`item-def:${item.ItemId}`) ? 'selected' : ''}`}
                                          onClick={() => onSelect({ type: 'item-def', item, appName: app.Name })}>
                                          <span className="tree-tick" />
                                          <span className="tree-label" title={item.Description}>{item.Name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Item Authorizations folder */}
                        <div className="tree-node n2 folder" onClick={() => tog(`auths-${app.ApplicationId}`)}>
                          <span className="tree-tick" />
                          <span className="tree-arrow">{expanded[`auths-${app.ApplicationId}`] ? <IconChevDown /> : <IconChevRight />}</span>
                          <span className="tree-icon"><IconFolderKey /></span>
                          <span className="tree-label">Item Authorizations</span>
                        </div>

                        {expanded[`auths-${app.ApplicationId}`] && (
                          <div className="tree-level">
                            {ITEM_AUTHS.map(({ itemType, label, Icon }) => {
                              const cacheKey = `${app.ApplicationId}-${itemType}`
                              const expKey   = `auths-${app.ApplicationId}-${itemType}`
                              return (
                                <div key={itemType}>
                                  <div className={`tree-node n3 folder ${isSel(`item-auths-folder:${app.ApplicationId}:${itemType}`) ? 'selected' : ''}`}
                                    onClick={() => { expandItemTypeFolder(app, itemType, 'auths'); onSelect({ type: 'item-auths-folder', applicationId: app.ApplicationId, itemType, appName: app.Name }) }}>
                                    <span className="tree-tick" />
                                    <span className="tree-arrow">{expanded[expKey] ? <IconChevDown /> : <IconChevRight />}</span>
                                    <span className="tree-icon"><Icon /></span>
                                    <span className="tree-label">{label}</span>
                                  </div>
                                  {expanded[expKey] && (
                                    <div className="tree-level">
                                      {filterByName(items[cacheKey] || []).map((item) => (
                                        <div key={item.ItemId}
                                          className={`tree-node n4 ${isSel(`item-auth:${item.ItemId}`) ? 'selected' : ''}`}
                                          onClick={() => onSelect({ type: 'item-auth', item, appName: app.Name })}>
                                          <span className="tree-tick" />
                                          <span className="tree-label" title={item.Description}>{item.Name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
})

export default Sidebar
