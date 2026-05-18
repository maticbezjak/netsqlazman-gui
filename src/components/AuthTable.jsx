import { useState, useEffect } from 'react'

// Values returned by netsqlazman_AuthorizationView
const AUTH_CLASS = {
  'NEUTRAL':             'neutral',
  'ALLOW':               'allow',
  'DENY':                'deny',
  'ALLOWWITHDELEGATION': 'delegate',
}

// Values for the add-form dropdown (numeric codes → inserted into the DB)
const AUTH_OPTIONS = [
  { value: 1, label: 'Allow' },
  { value: 3, label: 'Allow with Delegation' },
  { value: 0, label: 'Neutral' },
  { value: 2, label: 'Deny' },
]

export default function AuthTable({ authorizations, item, onDelete, onAdded }) {
  const [showAdd, setShowAdd]       = useState(false)
  const [principals, setPrincipals] = useState([])   // application groups
  const [newSidHex, setNewSidHex]   = useState('')
  const [newType, setNewType]       = useState(1)
  const [adding, setAdding]         = useState(false)

  useEffect(() => {
    if (item?.ApplicationId) loadPrincipals()
  }, [item?.ApplicationId])

  async function loadPrincipals() {
    const result = await window.db.getApplicationGroups(item.ApplicationId)
    setPrincipals(result.data || [])
  }

  // ownerSid: use the first available group's SID as a placeholder owner (MantoAdmin or first group)
  function ownerSidHex() {
    const admin = principals.find((p) => p.Name === 'MantoAdmin') || principals[0]
    return admin?.SidHex ?? '0x00000000'
  }

  async function handleAdd() {
    if (!newSidHex) return
    setAdding(true)
    const result = await window.db.addAuthorization({
      itemId: item.ItemId,
      sidHex: newSidHex,
      ownerSidHex: ownerSidHex(),
      authType: newType,
    })
    setAdding(false)
    if (result.success) {
      setShowAdd(false)
      setNewSidHex('')
      setNewType(1)
      onAdded()
    } else {
      alert('Error adding authorization:\n' + result.error)
    }
  }

  // Check if a principal is already authorized on this item
  const authorizedSids = new Set(authorizations.map((a) => a.SidHex))

  return (
    <div>
      <div className="table-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add Authorization'}
        </button>
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
        <div className="empty-table">No authorizations for this item.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Principal</th>
              <th>Defined In</th>
              <th>Authorization</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {authorizations.map((a) => (
              <tr key={a.AuthorizationId}>
                <td className="principal-name">{a.Name || a.SidHex}</td>
                <td><span className="badge">{a.SidWhereDefined}</span></td>
                <td>
                  <span className={`auth-badge ${AUTH_CLASS[a.AuthorizationType] ?? ''}`}>
                    {a.AuthorizationType}
                  </span>
                </td>
                <td className="muted">{a.ValidFrom ? new Date(a.ValidFrom).toLocaleDateString() : '—'}</td>
                <td className="muted">{a.ValidTo   ? new Date(a.ValidTo).toLocaleDateString()   : '—'}</td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (window.confirm(`Remove authorization for "${a.Name}"?`)) {
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
