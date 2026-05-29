import { useState, useEffect, useRef, useCallback } from 'react'

const TYPE_ICONS = { Group: '👥', Item: '📋', Application: '🏢' }
const ITEM_TYPE_LABEL = { '0': 'Role', '1': 'Task', '2': 'Operation' }

/**
 * Command-palette style global search modal.
 * Triggered by Ctrl/Cmd+K or the 🔍 button.
 * Clicking a result navigates to it in the Store Browser.
 */
export default function GlobalSearch({ onNavigate, onClose }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)
  const listRef     = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current)
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await window.db.globalSearch(q.trim())
      setResults(res.data || [])
      setActiveIdx(0)
      setLoading(false)
    }, 200)
  }, [])

  function navigate(result) {
    onClose()
    // Build the selection object App.jsx understands
    if (result.Type === 'Group') {
      onNavigate({
        view: 'store',
        selection: {
          type: 'app-group',
          applicationId: result.ApplicationId,
          appName: result.AppName,
          group: { ApplicationGroupId: Number(result.Id), Name: result.Name, Description: '' },
        },
      })
    } else if (result.Type === 'Item') {
      const isAuth = false  // navigate to def view; auth looks the same
      onNavigate({
        view: 'store',
        selection: {
          type: 'item-def',
          applicationId: result.ApplicationId,
          appName: result.AppName,
          item: { ItemId: Number(result.Id), Name: result.Name, ItemType: Number(result.Extra ?? 0) },
        },
      })
    } else if (result.Type === 'Application') {
      onNavigate({
        view: 'store',
        selection: {
          type: 'app-groups-folder',
          applicationId: result.ApplicationId,
          appName: result.Name,
        },
      })
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIdx]) navigate(results[activeIdx])
    if (e.key === 'Escape') onClose()
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Group results by Type
  const grouped = results.reduce((acc, r) => {
    ;(acc[r.Type] = acc[r.Type] || []).push(r)
    return acc
  }, {})

  return (
    <div className="gsearch-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="gsearch-modal">
        <div className="gsearch-input-row">
          <span className="gsearch-icon">🔍</span>
          <input
            ref={inputRef}
            className="gsearch-input"
            placeholder="Search groups, items, applications…"
            value={query}
            onChange={(e) => search(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <span className="gsearch-spinner">…</span>}
          <kbd className="gsearch-esc" onClick={onClose}>Esc</kbd>
        </div>

        {results.length > 0 && (
          <div className="gsearch-results" ref={listRef}>
            {['Group', 'Item', 'Application'].flatMap((type) => {
              const rows = grouped[type]
              if (!rows) return []
              return [
                <div key={`h-${type}`} className="gsearch-group-header">
                  {TYPE_ICONS[type]} {type === 'Group' ? 'Application Groups' : type === 'Item' ? 'Items' : 'Applications'}
                </div>,
                ...rows.map((r) => {
                  const flatIdx = results.indexOf(r)
                  const label = type === 'Item'
                    ? `${ITEM_TYPE_LABEL[r.Extra] ?? 'Item'}: ${r.Name}`
                    : r.Name
                  return (
                    <div
                      key={`${type}-${r.Id}`}
                      className={`gsearch-result ${flatIdx === activeIdx ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIdx(flatIdx)}
                      onClick={() => navigate(r)}
                    >
                      <span className="gsearch-result-name">{label}</span>
                      <span className="gsearch-result-path">
                        {[r.StoreName, r.AppName].filter(Boolean).join(' › ')}
                      </span>
                    </div>
                  )
                }),
              ]
            })}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="gsearch-empty">No results for "{query}"</div>
        )}

        {!query && (
          <div className="gsearch-hint">
            Type to search across all stores, applications, groups and items
          </div>
        )}
      </div>
    </div>
  )
}
