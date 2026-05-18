import { useState, useEffect } from 'react'

const ITEM_TYPE_LABEL = { 0: 'Role', 1: 'Task', 2: 'Operation' }
const ITEM_TYPE_ICON  = { 0: '👤', 1: '📋', 2: '⚡' }

// Which child-type tabs each item type exposes
const CHILD_TABS = {
  0: [{ label: 'Roles',      type: 0 }, { label: 'Tasks',      type: 1 }, { label: 'Operations', type: 2 }],
  1: [                                   { label: 'Tasks',      type: 1 }, { label: 'Operations', type: 2 }],
  2: [],
}

export default function ItemDefPanel({ item }) {
  const [tab, setTab]         = useState('def')
  const [allChildren, setAllChildren] = useState([])
  const [childLoading, setChildLoading] = useState(false)

  const tabs = CHILD_TABS[item.ItemType] ?? []

  useEffect(() => {
    setTab(tabs.length ? tabs[tabs.length - 1].label : 'def')  // default to last tab (Operations)
    loadChildren()
  }, [item.ItemId])

  async function loadChildren() {
    if (!tabs.length) return
    setChildLoading(true)
    const r = await window.db.getItemMembers(item.ItemId)
    setAllChildren(r.data || [])
    setChildLoading(false)
  }

  const visibleChildren =
    tab === 'def'
      ? []
      : allChildren.filter((c) => c.ItemType === tabs.find((t) => t.label === tab)?.type)

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">{ITEM_TYPE_ICON[item.ItemType]} {item.Name}</h2>
        <span className="badge badge-type">{ITEM_TYPE_LABEL[item.ItemType]}</span>
        <span className="panel-count">Item ID: {item.ItemId}</span>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'def' ? 'active' : ''}`} onClick={() => setTab('def')}>
          {ITEM_TYPE_LABEL[item.ItemType]} definition
        </button>
        {tabs.map((t) => (
          <button
            key={t.label}
            className={`tab ${tab === t.label ? 'active' : ''}`}
            onClick={() => setTab(t.label)}
          >
            {t.label}
            {tab === t.label && (
              <span className="tab-count">{allChildren.filter((c) => c.ItemType === t.type).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'def' ? (
          <div className="def-form">
            <div className="def-field">
              <label>Name</label>
              <input readOnly value={item.Name} />
            </div>
            <div className="def-field">
              <label>Description</label>
              <textarea readOnly value={item.Description || ''} rows={5} />
            </div>
          </div>
        ) : childLoading ? (
          <div className="panel-loading">Loading…</div>
        ) : !visibleChildren.length ? (
          <div className="empty-table">No {tab.toLowerCase()} defined for this item.</div>
        ) : (
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
              {visibleChildren.map((c) => (
                <tr key={c.ItemId}>
                  <td className="name-cell">{ITEM_TYPE_ICON[c.ItemType]} {c.Name}</td>
                  <td><span className="badge">{ITEM_TYPE_LABEL[c.ItemType]}</span></td>
                  <td className="muted">{c.Description || '—'}</td>
                  <td className="muted item-id">{c.ItemId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
