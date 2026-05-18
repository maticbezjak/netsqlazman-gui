import { useState, useEffect } from 'react'
import { formatSid } from '../../utils/sid'

export default function AppGroupPanel({ group }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => { load() }, [group.ApplicationGroupId])

  async function load() {
    setLoading(true)
    const r = await window.db.getApplicationGroupMembers(group.ApplicationGroupId)
    setMembers(r.data || [])
    setLoading(false)
  }

  if (loading) return <div className="panel-loading">Loading…</div>

  const memberCount    = members.filter((m) => m.IsMember).length
  const nonMemberCount = members.filter((m) => !m.IsMember).length

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">👤 {group.Name}</h2>
        <span className="panel-count">
          {memberCount} member{memberCount !== 1 ? 's' : ''}
          {nonMemberCount > 0 ? `, ${nonMemberCount} non-member${nonMemberCount !== 1 ? 's' : ''}` : ''}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {group.Description && <p className="panel-desc">{group.Description}</p>}

      {!members.length ? (
        <div className="empty-table">No members defined for this group.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Where defined</th>
              <th>Member / Non Member</th>
              <th>Sid</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.ApplicationGroupMemberId}>
                <td className="name-cell">
                  {m.WhereDefined === 1 ? '👥' : '👤'} {m.MemberName || m.SidHex}
                </td>
                <td>{m.WhereDefinedLabel}</td>
                <td>
                  <span className={`member-badge ${m.IsMember ? 'member' : 'non-member'}`}>
                    {m.IsMember ? 'Member' : 'Non Member'}
                  </span>
                </td>
                <td className="sid-cell">{formatSid(m.SidHex)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
