import { useState } from 'react'
import CopyBtn from './CopyBtn'
import { useUserSearch } from '../hooks/useUserSearch'
import { exportCSV } from '../utils/csv'

// ── Reusable autocomplete search box ─────────────────────────────────────────

function CompareSearchBox({ slot, onSelect }) {
  const { query, setQuery, suggestions, setSuggestions, showDrop, setShowDrop, onQueryChange } = useUserSearch()
  const [selected, setSelected] = useState(null)   // { username, displayName }
  const [loading, setLoading]   = useState(false)

  async function pick(username, displayName) {
    setShowDrop(false)
    setQuery(displayName)
    setSuggestions([])
    setSelected({ username, displayName })
    setLoading(true)
    const [grpRes, roleRes, opRes] = await Promise.all([
      window.db.getAzmanGroupsForUser(username),
      window.db.getAzmanRolesForUser(username),
      window.db.getAzmanOperationsForUser(username),
    ])
    setLoading(false)
    onSelect({
      username,
      displayName,
      groups:     grpRes.data  || [],
      roles:      roleRes.data || [],
      operations: opRes.data   || [],
    })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && suggestions.length === 1) {
      const s = suggestions[0]
      pick(s.UserName, `${s.Ime} ${s.Priimek}`)
    }
    if (e.key === 'Escape') setShowDrop(false)
  }

  function clear() {
    setQuery(''); setSelected(null); setSuggestions([]); onSelect(null)
  }

  return (
    <div className="cmp-search-box">
      <div className="cmp-slot-label">{slot}</div>
      <div className="cmp-input-wrap">
        <input
          className={`cmp-input ${selected ? 'has-value' : ''}`}
          placeholder="Type a name or username…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => suggestions.length && setShowDrop(true)}
          onKeyDown={handleKeyDown}
        />
        {loading && <span className="cmp-spinner">…</span>}
        {selected && !loading && <span className="cmp-clear" onClick={clear}>✕</span>}

        {showDrop && suggestions.length > 0 && (
          <div className="cmp-dropdown">
            {suggestions.map((s) => (
              <div key={s.UserName} className="cmp-suggestion"
                onMouseDown={(e) => { e.preventDefault(); pick(s.UserName, `${s.Ime} ${s.Priimek}`) }}>
                <span className="cmp-sug-name">{s.Ime} {s.Priimek}</span>
                <span className="cmp-sug-user">{s.UserName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Comparison logic ──────────────────────────────────────────────────────────

function getRowKey(row) {
  // Prefer well-known name columns; fall back to first column value.
  const val = row.Name ?? row.GroupName ?? row.RoleName ?? row.OperationName
    ?? row.ApplicationName ?? Object.values(row)[0]
  return String(val ?? '')
}

function compareSection(aRows, bRows) {
  const aMap = new Map((aRows || []).map((r) => [getRowKey(r), r]))
  const bMap = new Map((bRows || []).map((r) => [getRowKey(r), r]))
  const keys = new Set([...aMap.keys(), ...bMap.keys()])
  return [...keys].sort((a, b) => a.localeCompare(b)).map((key) => ({
    key,
    inA: aMap.has(key),
    inB: bMap.has(key),
  }))
}

// ── Section table ─────────────────────────────────────────────────────────────

function CompareSection({ title, rows, nameA, nameB }) {
  const both  = rows.filter((r) =>  r.inA &&  r.inB).length
  const onlyA = rows.filter((r) =>  r.inA && !r.inB).length
  const onlyB = rows.filter((r) => !r.inA &&  r.inB).length

  function doExport() {
    const data = rows.map((r) => ({
      Name:    r.key,
      [nameA]: r.inA ? 'Yes' : 'No',
      [nameB]: r.inB ? 'Yes' : 'No',
    }))
    exportCSV(data, `compare-${title.toLowerCase().replace(/\s+/g, '-')}.csv`)
  }

  return (
    <div className="cmp-section">
      <div className="cmp-section-header">
        <span className="cmp-section-title">{title}</span>
        <span className="cmp-badge cmp-badge-both">{both} shared</span>
        <span className="cmp-badge cmp-badge-a">{onlyA} only {nameA}</span>
        <span className="cmp-badge cmp-badge-b">{onlyB} only {nameB}</span>
        <div style={{ flex: 1 }} />
        {rows.length > 0 && (
          <button className="btn-export" onClick={doExport} title="Export to CSV">↓ CSV</button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="cmp-empty">Neither user has any {title.toLowerCase()}.</div>
      ) : (
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="cmp-col-user">{nameA}</th>
                <th className="cmp-col-user">{nameB}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={
                  row.inA && row.inB ? 'cmp-both' : row.inA ? 'cmp-only-a' : 'cmp-only-b'
                }>
                  <td>
                    <span className="copy-cell">
                      <span>{row.key}</span>
                      <CopyBtn text={row.key} />
                    </span>
                  </td>
                  <td className="cmp-check">{row.inA ? '✓' : '—'}</td>
                  <td className="cmp-check">{row.inB ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserCompare() {
  const [userA, setUserA] = useState(null)
  const [userB, setUserB] = useState(null)

  const ready = userA && userB

  const groupRows = ready ? compareSection(userA.groups,     userB.groups)     : []
  const roleRows  = ready ? compareSection(userA.roles,      userB.roles)      : []
  const opRows    = ready ? compareSection(userA.operations, userB.operations) : []

  const nameA = userA?.displayName || 'User A'
  const nameB = userB?.displayName || 'User B'

  return (
    <div className="user-compare">

      {/* ── Two search boxes ──────────────────────────────────────────── */}
      <div className="cmp-header">
        <CompareSearchBox slot="User A" onSelect={setUserA} />
        <div className="cmp-vs">vs</div>
        <CompareSearchBox slot="User B" onSelect={setUserB} />
      </div>

      {/* ── Identity bar ─────────────────────────────────────────────── */}
      {ready && (
        <div className="cmp-identity-bar">
          <div className="cmp-identity cmp-identity-a">
            <span className="cmp-identity-name">{userA.displayName}</span>
            <span className="cmp-identity-user">{userA.username}</span>
            <CopyBtn text={userA.username} />
          </div>
          <div className="cmp-identity cmp-identity-b">
            <span className="cmp-identity-name">{userB.displayName}</span>
            <span className="cmp-identity-user">{userB.username}</span>
            <CopyBtn text={userB.username} />
          </div>
        </div>
      )}

      {/* ── Placeholder ──────────────────────────────────────────────── */}
      {!ready && (
        <div className="lookup-placeholder">
          <p>Select two users above to compare their groups, roles, and allowed operations.</p>
        </div>
      )}

      {/* ── Comparison tables ─────────────────────────────────────────── */}
      {ready && (
        <div className="cmp-results">
          <CompareSection title="Application Groups" rows={groupRows} nameA={nameA} nameB={nameB} />
          <CompareSection title="Roles"              rows={roleRows}  nameA={nameA} nameB={nameB} />
          <CompareSection title="Allowed Operations" rows={opRows}    nameA={nameA} nameB={nameB} />
        </div>
      )}

    </div>
  )
}
