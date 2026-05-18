import { useState, useEffect } from 'react'
import AuthTable from './AuthTable'

const ITEM_TYPE = { 0: 'Operation', 1: 'Task', 2: 'Role', 3: 'Group' }
const ITEM_ICON = { 0: '⚡', 1: '📋', 2: '👤', 3: '👥' }
const MEMBER_TYPE = { 0: 'Operation', 1: 'Task', 2: 'Role', 3: 'Group' }

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
    if (authRes.data)    setAuthorizations(authRes.data)
    else                 setAuthorizations([])
    if (membersRes.data) setMembers(membersRes.data)
    else                 setMembers([])
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
        <span className="item-icon-lg">{ITEM_ICON[item.ItemType]}</span>
        <div>
          <h1 className="item-name">{item.Name}</h1>
          <div className="item-meta">
            <span className="badge badge-type">{ITEM_TYPE[item.ItemType]}</span>
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
  if (!members.length) return <div className="empty-table">No members defined for this item.</div>
  return (
    <table className="data-table">
      <thead>
        <tr><th>Name</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.MemberItemId}>
            <td>{m.MemberName}</td>
            <td><span className="badge">{MEMBER_TYPE[m.MemberType] ?? m.MemberType}</span></td>
            <td className="muted">{m.Description || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
