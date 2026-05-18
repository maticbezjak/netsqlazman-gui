import { useState, useEffect } from 'react'

const AUTH_LABEL = { 1: 'Allow', 2: 'Deny', 0: 'Neutral' }
const AUTH_CLASS  = { 1: 'allow', 2: 'deny',  0: 'neutral' }

export default function AuthTable({ authorizations, item, onDelete, onAdded }) {
  const [showAdd, setShowAdd]     = useState(false)
  const [principals, setPrincipals] = useState([])
  const [newSid, setNewSid]       = useState('')
  const [newType, setNewType]     = useState(1)
  const [adding, setAdding]       = useState(false)

  useEffect(() => {
    loadPrincipals()
  }, [])

  async function loadPrincipals() {
    const [users, groups] = await Promise.all([
      window.db.getUsers(),
      window.db.getGroups(),
    ])
    const list = [
      ...(users.data  || []),
      ...(groups.data || []),
    ].sort((a, b) => a.DisplayName.localeCompare(b.DisplayName))
    setPrincipals(list)
  }

  async function handleAdd() {
    if (!newSid) return
    setAdding(true)
    const result = await window.db.addAuthorization({
      itemId: item.ItemId,
      sid: newSid,
      authType: newType,
    })
    setAdding(false)
    if (result.success) {
      setShowAdd(false)
      setNewSid('')
      setNewType(1)
      onAdded()
    } else {
      alert('Error adding authorization:\n' + result.error)
    }
  }

  return (
    <div>
      <div className="table-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add Authorization'}
        </button>
      </div>

      {showAdd && (
        <div className="add-form">
          <select value={newSid} onChange={(e) => setNewSid(e.target.value)}>
            <option value="">Select user or group…</option>
            {principals.map((p) => (
              <option key={p.SID} value={p.SID}>
                [{p.SIDType}] {p.DisplayName}
              </option>
            ))}
          </select>
          <select value={newType} onChange={(e) => setNewType(Number(e.target.value))}>
            <option value={1}>Allow</option>
            <option value={2}>Deny</option>
            <option value={0}>Neutral</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding || !newSid}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      {!authorizations.length ? (
        <div className="empty-table">No authorizations for this item.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Principal</th>
              <th>Type</th>
              <th>Authorization</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {authorizations.map((a) => (
              <tr key={a.AuthorizationId}>
                <td className="principal-name">{a.DisplayName || a.SID}</td>
                <td><span className="badge">{a.SIDType}</span></td>
                <td>
                  <span className={`auth-badge ${AUTH_CLASS[a.AuthorizationType] ?? ''}`}>
                    {AUTH_LABEL[a.AuthorizationType] ?? a.AuthorizationType}
                  </span>
                </td>
                <td className="muted">{a.ValidFrom ? new Date(a.ValidFrom).toLocaleDateString() : '—'}</td>
                <td className="muted">{a.ValidTo   ? new Date(a.ValidTo).toLocaleDateString()   : '—'}</td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (window.confirm(`Remove authorization for "${a.DisplayName || a.SID}"?`)) {
                        onDelete(a.AuthorizationId)
                      }
                    }}
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
