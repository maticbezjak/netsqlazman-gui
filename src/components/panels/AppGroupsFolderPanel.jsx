import { useState, useEffect } from 'react'
import { formatSid } from '../../utils/sid'

export default function AppGroupsFolderPanel({ applicationId, onSelectGroup }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [applicationId])

  async function load() {
    setLoading(true)
    const r = await window.db.getApplicationGroups(applicationId)
    setGroups(r.data || [])
    setLoading(false)
  }

  if (loading) return <div className="panel-loading">Loading…</div>

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">Application Groups</h2>
        <span className="panel-count">{groups.length} groups</span>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Application Group Name</th>
            <th>Description</th>
            <th>Group Type</th>
            <th>Object SID</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.ApplicationGroupId} className="clickable-row" onClick={() => onSelectGroup(g)}>
              <td className="name-cell">👤 {g.Name}</td>
              <td className="muted">{g.Description || '—'}</td>
              <td>{g.GroupType === 0 ? 'Basic' : 'LDAP'}</td>
              <td className="sid-cell">{formatSid(g.SidHex)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
