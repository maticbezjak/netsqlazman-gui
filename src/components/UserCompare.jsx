import { useState, useEffect, useCallback } from 'react'
import CopyBtn from './CopyBtn'
import { useUserSearch } from '../hooks/useUserSearch'
import { useToast } from './Toast'
import { exportCSV } from '../utils/csv'
import { compareSection } from '../utils/compare'

// ── Reusable autocomplete search box ─────────────────────────────────────────

function CompareSearchBox({ slot, onSelect }) {
  const { query, setQuery, suggestions, setSuggestions, showDrop, setShowDrop, activeIdx, onQueryChange, navigateDropdown, getActiveSuggestion } = useUserSearch()
  const [selected, setSelected] = useState(null)   // { username, displayName }
  const [loading, setLoading]   = useState(false)

  async function pick(username, displayName) {
    setShowDrop(false)
    setQuery(displayName)
    setSuggestions([])
    setSelected({ username, displayName })
    setLoading(true)
    const [grpRes, roleRes, opRes] = await Promise.all([
      window.db.getAzmanGroupsForUserDetail(username),
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
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown('down'); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); navigateDropdown('up');   return }
    if (e.key === 'Enter') {
      const active = getActiveSuggestion()
      if (active) pick(active.UserName, `${active.Ime} ${active.Priimek}`)
      else if (suggestions.length === 1) { const s = suggestions[0]; pick(s.UserName, `${s.Ime} ${s.Priimek}`) }
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
            {suggestions.map((s, i) => (
              <div key={s.UserName} className={`cmp-suggestion ${i === activeIdx ? 'active' : ''}`}
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

// ── Section table ─────────────────────────────────────────────────────────────

function CompareSection({ title, rows, nameA, nameB, onAddToA, onAddToB, adding }) {
  const both    = rows.filter((r) =>  r.inA &&  r.inB).length
  const onlyA   = rows.filter((r) =>  r.inA && !r.inB).length
  const onlyB   = rows.filter((r) => !r.inA &&  r.inB).length
  const hasActions = onAddToA || onAddToB

  function doExport() {
    const data = rows.map((r) => ({
      Name:    r.key,
      [nameA]: r.inA ? 'Yes' : 'No',
      [nameB]: r.inB ? 'Yes' : 'No',
    }))
    exportCSV(data, `compare-${title.toLowerCase().replace(/\s+/g, '-')}.csv`)
  }

  const missingFromB = rows.filter((r) =>  r.inA && !r.inB)
  const missingFromA = rows.filter((r) => !r.inA &&  r.inB)

  return (
    <div className="cmp-section">
      <div className="cmp-section-header">
        <span className="cmp-section-title">{title}</span>
        <span className="cmp-badge cmp-badge-both">{both} shared</span>
        <span className="cmp-badge cmp-badge-a">{onlyA} only {nameA}</span>
        <span className="cmp-badge cmp-badge-b">{onlyB} only {nameB}</span>
        <div style={{ flex: 1 }} />

        {/* ── Bulk copy buttons ───────────────────── */}
        {onAddToB && missingFromB.length > 0 && (
          <button
            className="btn-cmp-bulk btn-cmp-bulk-b"
            onClick={() => missingFromB.forEach((r) => onAddToB(r.key))}
            disabled={missingFromB.some((r) => adding?.has(`${r.key}:b`))}
            title={`Add all ${missingFromB.length} missing groups to ${nameB}`}
          >
            + Add all missing → {nameB}
          </button>
        )}
        {onAddToA && missingFromA.length > 0 && (
          <button
            className="btn-cmp-bulk btn-cmp-bulk-a"
            onClick={() => missingFromA.forEach((r) => onAddToA(r.key))}
            disabled={missingFromA.some((r) => adding?.has(`${r.key}:a`))}
            title={`Add all ${missingFromA.length} missing groups to ${nameA}`}
          >
            + Add all missing → {nameA}
          </button>
        )}

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
                {hasActions && <th className="cmp-col-action" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const addingToA = adding?.has(`${row.key}:a`)
                const addingToB = adding?.has(`${row.key}:b`)
                return (
                  <tr key={row.key} className={
                    row.inA && row.inB ? 'cmp-both' : row.inA ? 'cmp-only-a' : 'cmp-only-b'
                  }>
                    <td>
                      <span className="copy-cell">
                        <span>{row.key}</span>
                        <CopyBtn text={row.key} />
                      </span>
                    </td>
                    <td className="cmp-check">
                      {row.inA ? (
                        <div className="cmp-check-cell">
                          <span>✓</span>
                          {row.virA && <span className={`cmp-vir ${row.virA === 'Neposredno' ? 'cmp-vir-direct' : 'cmp-vir-via'}`}>{row.virA}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="cmp-check">
                      {row.inB ? (
                        <div className="cmp-check-cell">
                          <span>✓</span>
                          {row.virB && <span className={`cmp-vir ${row.virB === 'Neposredno' ? 'cmp-vir-direct' : 'cmp-vir-via'}`}>{row.virB}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    {hasActions && (
                      <td className="cmp-action-cell">
                        {row.inA && !row.inB && onAddToB && (
                          <button
                            className="btn-cmp-add btn-cmp-add-b"
                            onClick={() => onAddToB(row.key)}
                            disabled={addingToB}
                            title={`Add to ${nameB}`}
                          >
                            {addingToB ? '…' : `+ ${nameB}`}
                          </button>
                        )}
                        {row.inB && !row.inA && onAddToA && (
                          <button
                            className="btn-cmp-add btn-cmp-add-a"
                            onClick={() => onAddToA(row.key)}
                            disabled={addingToA}
                            title={`Add to ${nameA}`}
                          >
                            {addingToA ? '…' : `+ ${nameA}`}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
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
  const [allGroups, setAllGroups] = useState([])   // { ApplicationGroupId, Name }
  const [adding, setAdding]       = useState(new Set())  // `${groupName}:a` or `${groupName}:b`
  const toast = useToast()

  // Fetch all application groups once for ID lookup
  useEffect(() => {
    window.db.getAllApplicationGroups().then((r) => {
      if (r.data) setAllGroups(r.data)
    })
  }, [])

  const ready = userA && userB
  const [refreshing, setRefreshing] = useState(false)

  // ── Re-fetch both users' data ───────────────────────────────────────────────
  async function refreshUsers() {
    setRefreshing(true)
    async function fetchUser(u) {
      const [grpRes, roleRes, opRes] = await Promise.all([
        window.db.getAzmanGroupsForUserDetail(u.username),
        window.db.getAzmanRolesForUser(u.username),
        window.db.getAzmanOperationsForUser(u.username),
      ])
      return {
        ...u,
        groups:     grpRes.data  || [],
        roles:      roleRes.data || [],
        operations: opRes.data   || [],
      }
    }
    try {
      const [a, b] = await Promise.all([fetchUser(userA), fetchUser(userB)])
      setUserA(a)
      setUserB(b)
    } finally {
      setRefreshing(false)
    }
  }

  const groupRows = ready ? compareSection(userA.groups, userB.groups).map((r) => ({
    ...r,
    virA: userA.groups.find((g) => (g.skupina ?? g.Name) === r.key)?.vir ?? null,
    virB: userB.groups.find((g) => (g.skupina ?? g.Name) === r.key)?.vir ?? null,
  })) : []
  const roleRows  = ready ? compareSection(userA.roles,      userB.roles)      : []
  const opRows    = ready ? compareSection(userA.operations, userB.operations) : []

  const nameA = userA?.displayName || 'User A'
  const nameB = userB?.displayName || 'User B'

  // ── Add a single group to a user ────────────────────────────────────────────
  const handleAddToUser = useCallback(async (groupName, targetUser, setTargetUser, slot) => {
    const key = `${groupName}:${slot}`
    if (adding.has(key)) return

    const group = allGroups.find((g) => g.Name === groupName)
    if (!group) { toast.error(`Group "${groupName}" not found.`); return }

    const sidRes = await window.db.getUserSidHex(targetUser.username)
    if (!sidRes.data) {
      toast.error(`Could not resolve SID for ${targetUser.displayName}.`)
      return
    }

    setAdding((prev) => new Set(prev).add(key))
    try {
      const r = await window.db.addGroupMember({
        groupId:      group.ApplicationGroupId,
        sidHex:       sidRes.data,
        whereDefined: 4,   // Database user
        isMember:     true,
      })
      if (r.success) {
        // Update local state so the row turns green immediately
        setTargetUser((prev) => ({
          ...prev,
          groups: [...prev.groups, { skupina: groupName }],
        }))
        toast.success(`Added "${groupName}" to ${targetUser.displayName}.`)
      } else {
        toast.error(`Failed: ${r.error}`)
      }
    } finally {
      setAdding((prev) => { const s = new Set(prev); s.delete(key); return s })
    }
  }, [adding, allGroups, toast])

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
          <button
            className="btn btn-ghost btn-sm"
            onClick={refreshUsers}
            disabled={refreshing}
            title="Reload both users' data from the database"
          >
            {refreshing ? '…' : '⟳ Refresh'}
          </button>
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
          <CompareSection
            title="Application Groups"
            rows={groupRows}
            nameA={nameA}
            nameB={nameB}
            adding={adding}
            onAddToA={(groupName) => handleAddToUser(groupName, userA, setUserA, 'a')}
            onAddToB={(groupName) => handleAddToUser(groupName, userB, setUserB, 'b')}
          />
          <CompareSection title="Roles"              rows={roleRows}  nameA={nameA} nameB={nameB} />
          <CompareSection title="Allowed Operations" rows={opRows}    nameA={nameA} nameB={nameB} />
        </div>
      )}

    </div>
  )
}
