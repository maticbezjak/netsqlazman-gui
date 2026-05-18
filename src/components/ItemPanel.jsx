import { useState, useEffect } from 'react'
import AuthTable from './AuthTable'

// ItemType values as returned by the DB
const ITEM_TYPE = { 0: 'Role', 1: 'Task', 2: 'Operation' }
const ITEM_ICON = { 0: '👤', 1: '📋', 2: '⚡' }

export default function ItemPanel({ item }) {
  const [tab, setTab]                   = useState('auth')
  const [authorizations, setAuthorizations] = useState([])
  const [members, setMembers]           = useState([])
  const [loading, setLoading]           = useState(false)

  useEffect(() => {
    setTab('auth')
    loadData()
  }, [item.ItemId])

  async function loadData() {
    setLoading(true)
    const [authRes, membersRes] = await Promise.all([
      window.db.getAuthorizations(item.ItemId),
      window.db.getItemMembers(item.ItemId),
    ])
    setAuthorizations(authRes.data || [])
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  async function handleDeleteAuth(authId) {
    const result = await window.db.deleteAuthorization(authId)
    if (result.success) {
      setAuthorizations((a) => a.filter((x) => x.AuthorizationId !== authId))
    } else {
      alert('Error removing authorization:\n' + result.error)
    }
  }

  return (
    <div className="item-panel">
      <div className="item-header">
        <span className="item-icon-lg">{ITEM_ICON[item.ItemType] ?? '•'}</span>
        <div>
          <h1 className="item-name">{item.Name}</h1>
          <div className="item-meta">
            <span className="badge badge-type">{ITEM_TYPE[item.ItemType] ?? item.ItemType}</span>
            {item.Description && <span className="item-desc">{item.Description}</span>}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'auth' ? 'active' : ''}`} onClick={() => setTab('auth')}>
          Authorizations <span className="tab-count">{authorizations.length}</span>
        </button>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          Members <span className="tab-count">{members.length}</span>
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="panel-loading">Loading…</div>
        ) : tab === 'auth' ? (
          <AuthTable
            authorizations={authorizations}
            item={item}
            onDelete={handleDeleteAuth}
            onAdded={loadData}
          />
        ) : (
          <MembersTable members={members} />
        )}
      </div>
    </div>
  )
}

function MembersTable({ members }) {
  const TYPE_LABEL = { 0: 'Role', 1: 'Task', 2: 'Operation' }
  const TYPE_ICON  = { 0: '👤', 1: '📋', 2: '⚡' }

  if (!members.length) return <div className="empty-table">No child items defined for this item.</div>
  return (
    <table className="data-table">
      <thead>
        <tr><th>Name</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.ItemId}>
            <td>{TYPE_ICON[m.ItemType]} {m.Name}</td>
            <td><span className="badge">{TYPE_LABEL[m.ItemType] ?? m.ItemType}</span></td>
            <td className="muted">{m.Description || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
