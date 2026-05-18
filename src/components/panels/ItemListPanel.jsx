import { useState, useEffect } from 'react'

const ITEM_TYPE_LABEL = { 0: 'Role', 1: 'Task', 2: 'Operation' }
const ITEM_TYPE_ICON  = { 0: '👤', 1: '📋', 2: '⚡' }

const FOLDER_TITLE = {
  defs:  { 0: 'Role Definitions',      1: 'Task Definitions',      2: 'Operation Definitions' },
  auths: { 0: 'Roles Authorizations',  1: 'Task Authorizations',   2: 'Operation Authorizations' },
}

export default function ItemListPanel({ applicationId, itemType, mode, onSelectItem }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [applicationId, itemType])

  async function load() {
    setLoading(true)
    const r = await window.db.getItemsByType(applicationId, itemType)
    setItems(r.data || [])
    setLoading(false)
  }

  const title = FOLDER_TITLE[mode]?.[itemType] ?? 'Items'
  const icon  = ITEM_TYPE_ICON[itemType] ?? '•'

  if (loading) return <div className="panel-loading">Loading…</div>

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">{icon} {title}</h2>
        <span className="panel-count">{items.length} items</span>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Item ID</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.ItemId} className="clickable-row" onClick={() => onSelectItem(item)}>
              <td className="name-cell">{ITEM_TYPE_ICON[item.ItemType]} {item.Name}</td>
              <td><span className="badge">{ITEM_TYPE_LABEL[item.ItemType]}</span></td>
              <td className="muted">{item.Description || '—'}</td>
              <td className="muted item-id">{item.ItemId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
