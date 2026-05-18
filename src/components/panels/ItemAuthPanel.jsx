import { useState, useEffect } from 'react'
import { formatSid } from '../../utils/sid'

const ITEM_TYPE_LABEL = { 0: 'Role', 1: 'Task', 2: 'Operation' }
const ITEM_TYPE_ICON  = { 0: '👤', 1: '📋', 2: '⚡' }

const AUTH_CLASS = {
  NEUTRAL:             'neutral',
  ALLOW:               'allow',
  DENY:                'deny',
  ALLOWWITHDELEGATION: 'delegate',
}

const AUTH_OPTIONS = [
  { value: 1, label: 'Allow' },
  { value: 3, label: 'Allow with Delegation' },
  { value: 0, label: 'Neutral' },
  { value: 2, label: 'Deny' },
]

export default function ItemAuthPanel({ item }) {
  const [authorizations, setAuthorizations] = useState([])
  const [principals, setPrincipals]         = useState([])
  const [loading, setLoading]               = useState(true)
  const [showAdd, setShowAdd]               = useState(false)
  const [newSidHex, setNewSidHex]           = useState('')
  const [newType, setNewType]               = useState(1)
  const [adding, setAdding]                 = useState(false)

  useEffect(() => {
    setShowAdd(false)
    load()
  }, [item.ItemId])

  useEffect(() => {
    loadPrincipals()
  }, [item.ApplicationId])

  async function load() {
    setLoading(true)
    const r = await window.db.getAuthorizations(item.ItemId)
    setAuthorizations(r.data || [])
    setLoading(false)
  }

  async function loadPrincipals() {
    const r = await window.db.getApplicationGroups(item.ApplicationId)
    setPrincipals(r.data || [])
  }

  async function handleDelete(authId, name) {
    if (!window.confirm(`Remove authorization for "${name}"?`)) return
    const result = await window.db.deleteAuthorization(authId)
    if (result.success) {
      setAuthorizations((a) => a.filter((x) => x.AuthorizationId !== authId))
    } else {
      alert('Error:\n' + result.error)
    }
  }

  async function handleAdd() {
    if (!newSidHex) return
    setAdding(true)
    const adminGroup = principals.find((p) => p.Name === 'MantoAdmin') || principals[0]
    const result = await window.db.addAuthorization({
      itemId: item.ItemId,
      sidHex: newSidHex,
      ownerSidHex: adminGroup?.SidHex ?? newSidHex,
      authType: newType,
    })
    setAdding(false)
    if (result.success) {
      setShowAdd(false)
      setNewSidHex('')
      setNewType(1)
      load()
    } else {
      alert('Error:\n' + result.error)
    }
  }

  const authorizedSids = new Set(authorizations.map((a) => a.SidHex))

  if (loading) return <div className="panel-loading">Loading…</div>

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">{ITEM_TYPE_ICON[item.ItemType]} {item.Name}</h2>
        <span className="badge badge-type">{ITEM_TYPE_LABEL[item.ItemType]}</span>
        <span className="panel-count">{authorizations.length} authorization{authorizations.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻</button>
      </div>

      {showAdd && (
        <div className="add-form">
          <select value={newSidHex} onChange={(e) => setNewSidHex(e.target.value)}>
            <option value="">Select principal…</option>
            {principals.map((p) => (
              <option key={p.SidHex} value={p.SidHex} disabled={authorizedSids.has(p.SidHex)}>
                {p.Name}{authorizedSids.has(p.SidHex) ? ' (already authorized)' : ''}
              </option>
            ))}
          </select>
          <select value={newType} onChange={(e) => setNewType(Number(e.target.value))}>
            {AUTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding || !newSidHex}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      {!authorizations.length ? (
        <div className="empty-table">No authorizations defined for this item.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Where defined</th>
              <th>Authorization</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th>Sid</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {authorizations.map((a) => (
              <tr key={a.AuthorizationId}>
                <td className="name-cell">{a.Name || a.SidHex}</td>
                <td>{a.SidWhereDefined}</td>
                <td>
                  <span className={`auth-badge ${AUTH_CLASS[a.AuthorizationType] ?? ''}`}>
                    {a.AuthorizationType}
                  </span>
                </td>
                <td className="muted">{a.ValidFrom ? new Date(a.ValidFrom).toLocaleDateString() : '—'}</td>
                <td className="muted">{a.ValidTo   ? new Date(a.ValidTo).toLocaleDateString()   : '—'}</td>
                <td className="sid-cell">{formatSid(a.SidHex)}</td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(a.AuthorizationId, a.Name)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
