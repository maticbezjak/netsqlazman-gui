import { useState, useEffect, useRef, useCallback } from 'react'
import UserGraph from './UserGraph'

const EMPTY_RESULT = { groups: null, operations: null, user: null, displayName: null, error: null }

export default function UserLookup() {
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggestions] = useState([])   // [{ usrname, Ime, Priimek }]
  const [showDrop, setShowDrop]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState(EMPTY_RESULT)
  const [showGraph, setShowGraph]   = useState(false)
  const debounceRef = useRef(null)
  const wrapRef     = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced autocomplete
  const onQueryChange = useCallback((val) => {
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setSuggestions([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      const res = await window.db.searchUsers(val.trim())
      if (res.data) {
        setSuggestions(res.data)
        setShowDrop(res.data.length > 0)
      }
    }, 280)
  }, [])

  async function lookup(usrname, displayName) {
    setShowDrop(false)
    setQuery(displayName || usrname)
    setSuggestions([])
    setLoading(true)
    setResult(EMPTY_RESULT)

    const [grpRes, opRes] = await Promise.all([
      window.db.getAzmanGroupsForUser(usrname),
      window.db.getAzmanOperationsForUser(usrname),
    ])

    setLoading(false)

    if (grpRes.error || opRes.error) {
      setResult({ ...EMPTY_RESULT, error: grpRes.error || opRes.error })
      return
    }

    setResult({
      user: usrname,
      displayName: displayName || usrname,
      groups: grpRes.data,
      operations: opRes.data,
      error: null,
    })
    setShowGraph(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      // If there's exactly one suggestion, use it; otherwise search by raw query
      if (suggestions.length === 1) {
        const s = suggestions[0]
        lookup(s.usrname, `${s.Ime} ${s.Priimek}`)
      } else {
        lookup(query.trim(), query.trim())
      }
    }
    if (e.key === 'Escape') setShowDrop(false)
  }

  const cols = (rows) => rows.length > 0 ? Object.keys(rows[0]) : []

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
                {suggestions.map((s) => (
                  <div
                    key={s.usrname}
                    className="lookup-suggestion"
                    onClick={() => lookup(s.usrname, `${s.Ime} ${s.Priimek}`)}
                  >
                    <span className="suggestion-name">{s.Ime} {s.Priimek}</span>
                    <span className="suggestion-user">{s.usrname}</span>
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
                lookup(s.usrname, `${s.Ime} ${s.Priimek}`)
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

          <div className="lookup-view-toggle">
            <button className={`btn btn-sm ${!showGraph ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowGraph(false)}>Table</button>
            <button className={`btn btn-sm ${ showGraph ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowGraph(true)}>Visualize</button>
          </div>

          {showGraph && (
            <UserGraph user={result.user} groups={result.groups} operations={result.operations} />
          )}

          {!showGraph && (<>
            {/* Groups */}
            <div className="lookup-section">
              <div className="lookup-section-header">
                <span className="lookup-section-title">Application Groups</span>
                <span className="lookup-badge">{result.groups.length}</span>
              </div>
              {result.groups.length === 0 ? (
                <div className="lookup-empty">No groups found for <strong>{result.displayName}</strong></div>
              ) : (
                <div className="lookup-table-wrap">
                  <table className="lookup-table">
                    <thead>
                      <tr>{cols(result.groups).map((c) => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {result.groups.map((row, i) => (
                        <tr key={i}>
                          {cols(result.groups).map((c) => <td key={c}>{row[c] ?? '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Operations */}
            <div className="lookup-section">
              <div className="lookup-section-header">
                <span className="lookup-section-title">Allowed Operations</span>
                <span className="lookup-badge">{result.operations.length}</span>
              </div>
              {result.operations.length === 0 ? (
                <div className="lookup-empty">No operations found for <strong>{result.displayName}</strong></div>
              ) : (
                <div className="lookup-table-wrap">
                  <table className="lookup-table">
                    <thead>
                      <tr>{cols(result.operations).map((c) => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {result.operations.map((row, i) => (
                        <tr key={i}>
                          {cols(result.operations).map((c) => <td key={c}>{row[c] ?? '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
