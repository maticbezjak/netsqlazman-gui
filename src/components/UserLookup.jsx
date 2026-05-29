import { useState, useEffect, useRef } from 'react'
import UserGraph from './UserGraph'
import CopyBtn from './CopyBtn'
import { useUserSearch } from '../hooks/useUserSearch'
import { exportCSV } from '../utils/csv'
import { useToast } from './Toast'

const EMPTY_RESULT = { groups: null, roles: null, operations: null, user: null, displayName: null, error: null }

// ── Section table ─────────────────────────────────────────────────────────────

function LookupSection({ title, rows, displayName, exportFilename, copyFirstCol = false }) {
  const cols = rows.length > 0 ? Object.keys(rows[0]) : []
  return (
    <div className="lookup-section">
      <div className="lookup-section-header">
        <span className="lookup-section-title">{title}</span>
        <span className="lookup-badge">{rows.length}</span>
        <div style={{ flex: 1 }} />
        {rows.length > 0 && (
          <button className="btn-export" onClick={() => exportCSV(rows, exportFilename)} title="Export to CSV">
            ↓ CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="lookup-empty">No {title.toLowerCase()} found for <strong>{displayName}</strong></div>
      ) : (
        <div className="lookup-table-wrap">
          <table className="lookup-table">
            <thead>
              <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {cols.map((c, ci) => (
                    <td key={c}>
                      {copyFirstCol && ci === 0 ? (
                        <span className="copy-cell">
                          <span>{row[c] ?? '—'}</span>
                          <CopyBtn text={String(row[c] ?? '')} />
                        </span>
                      ) : (row[c] ?? '—')}
                    </td>
                  ))}
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

// ── Bulk add to groups panel ──────────────────────────────────────────────────

function BulkAddPanel({ username, onClose }) {
  const [allGroups, setAllGroups]   = useState([])
  const [selected, setSelected]     = useState(new Set())
  const [adding, setAdding]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    window.db.getAllApplicationGroups().then((r) => {
      setAllGroups(r.data || [])
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    setAdding(true)
    const sidRes = await window.db.getUserSidHex(username)
    if (!sidRes.data) { showToast('Could not resolve user SID.', 'error'); setAdding(false); return }
    const sidHex = sidRes.data
    let ok = 0, fail = 0
    for (const groupId of selected) {
      const r = await window.db.addGroupMember({ groupId: Number(groupId), sidHex, whereDefined: 4, isMember: true })
      r.success ? ok++ : fail++
    }
    setAdding(false)
    showToast(`Added to ${ok} group(s).${fail ? ` ${fail} failed.` : ''}`, ok ? 'success' : 'error')
    onClose()
  }

  const q = ''
  // Group by AppName
  const byApp = allGroups.reduce((acc, g) => {
    ;(acc[g.AppName] = acc[g.AppName] || []).push(g)
    return acc
  }, {})

  return (
    <div className="bulk-add-panel">
      <div className="bulk-add-header">
        <span className="bulk-add-title">Add <strong>{username}</strong> to groups</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      {loading ? (
        <div className="bulk-add-loading">Loading groups…</div>
      ) : (
        <>
          <div className="bulk-add-list">
            {Object.entries(byApp).map(([appName, groups]) => (
              <div key={appName}>
                <div className="bulk-add-app-header">{appName}</div>
                {groups.map((g) => (
                  <label key={g.ApplicationGroupId} className="bulk-add-item">
                    <input type="checkbox"
                      checked={selected.has(String(g.ApplicationGroupId))}
                      onChange={() => setSelected((s) => {
                        const n = new Set(s)
                        n.has(String(g.ApplicationGroupId)) ? n.delete(String(g.ApplicationGroupId)) : n.add(String(g.ApplicationGroupId))
                        return n
                      })}
                    />
                    <span>{g.Name}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="bulk-add-footer">
            <span className="bulk-add-count">{selected.size} selected</span>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding || !selected.size}>
              {adding ? 'Adding…' : `Add to ${selected.size} group${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserLookup() {
  const { query, setQuery, suggestions, setSuggestions, showDrop, setShowDrop, activeIdx, onQueryChange, navigateDropdown, getActiveSuggestion } = useUserSearch()
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState(EMPTY_RESULT)
  const [showGraph, setShowGraph]   = useState(false)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const wrapRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function lookup(usrname, displayName) {
    setShowDrop(false)
    setQuery(displayName || usrname)
    setSuggestions([])
    setLoading(true)
    setResult(EMPTY_RESULT)

    const [grpRes, roleRes, opRes] = await Promise.all([
      window.db.getAzmanGroupsForUser(usrname),
      window.db.getAzmanRolesForUser(usrname),
      window.db.getAzmanOperationsForUser(usrname),
    ])

    setLoading(false)

    if (grpRes.error || roleRes.error || opRes.error) {
      setResult({ ...EMPTY_RESULT, error: grpRes.error || roleRes.error || opRes.error })
      return
    }

    setResult({
      user: usrname,
      displayName: displayName || usrname,
      groups:     grpRes.data,
      roles:      roleRes.data,
      operations: opRes.data,
      error: null,
    })
    setShowGraph(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown('down'); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); navigateDropdown('up');   return }
    if (e.key === 'Enter' && query.trim()) {
      const active = getActiveSuggestion()
      if (active) lookup(active.UserName, `${active.Ime} ${active.Priimek}`)
      else if (suggestions.length === 1) { const s = suggestions[0]; lookup(s.UserName, `${s.Ime} ${s.Priimek}`) }
      else lookup(query.trim(), query.trim())
    }
    if (e.key === 'Escape') setShowDrop(false)
  }

  return (
    <div className="user-lookup">

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="lookup-search-wrap" ref={wrapRef}>
        <div className="lookup-search-row">
          <div className="lookup-input-wrap">
            <input
              className="lookup-input"
              placeholder="Type a name or surname…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => suggestions.length && setShowDrop(true)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {showDrop && suggestions.length > 0 && (
              <div className="lookup-dropdown">
                {suggestions.map((s, i) => (
                  <div
                    key={s.UserName}
                    className={`lookup-suggestion ${i === activeIdx ? 'active' : ''}`}
                    onClick={() => lookup(s.UserName, `${s.Ime} ${s.Priimek}`)}
                  >
                    <span className="suggestion-name">{s.Ime} {s.Priimek}</span>
                    <span className="suggestion-user">{s.UserName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (suggestions.length === 1) {
                const s = suggestions[0]
                lookup(s.UserName, `${s.Ime} ${s.Priimek}`)
              } else if (query.trim()) {
                lookup(query.trim(), query.trim())
              }
            }}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────────────────── */}
      {result.error && (
        <div className="lookup-error">⚠ {result.error}</div>
      )}

      {result.user && !result.error && (
        <div className="lookup-results">

          {/* User identity bar */}
          <div className="lookup-user-bar">
            <div className="lookup-user-identity">
              <span className="lookup-user-name">{result.displayName}</span>
              <span className="lookup-user-id">{result.user}</span>
              <CopyBtn text={result.user} />
            </div>
            {window.db?.getAllApplicationGroups && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBulkAdd((v) => !v)}
                title="Add this user to one or more groups">
                ⊕ Add to groups
              </button>
            )}
            <div className="lookup-view-toggle">
              <button className={`btn btn-sm ${!showGraph ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowGraph(false)}>Table</button>
              <button className={`btn btn-sm ${ showGraph ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowGraph(true)}>Visualize</button>
            </div>
          </div>

          {showBulkAdd && (
            <BulkAddPanel username={result.user} onClose={() => setShowBulkAdd(false)} />
          )}

          {showGraph && (
            <UserGraph user={result.user} groups={result.groups} roles={result.roles} operations={result.operations} />
          )}

          {!showGraph && (<>
            <LookupSection
              title="Application Groups"
              rows={result.groups}
              displayName={result.displayName}
              exportFilename={`${result.user}-groups.csv`}
            />
            <LookupSection
              title="Roles"
              rows={result.roles}
              displayName={result.displayName}
              exportFilename={`${result.user}-roles.csv`}
            />
            <LookupSection
              title="Allowed Operations"
              rows={result.operations}
              displayName={result.displayName}
              exportFilename={`${result.user}-operations.csv`}
              copyFirstCol
            />
          </>)}

        </div>
      )}

      {!result.user && !loading && !result.error && (
        <div className="lookup-placeholder">
          <p>Search for a user to see their AzMan groups and allowed operations.</p>
        </div>
      )}
    </div>
  )
}
