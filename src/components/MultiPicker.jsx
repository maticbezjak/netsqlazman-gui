import { useState, useEffect, useRef } from 'react'

/**
 * Searchable multi-select checkbox list.
 *
 * Props
 *   items       – [{ value, label, icon?, group? }]  group is used as section header
 *   selected    – Set<string> of selected values
 *   onToggle    – (value) => void
 *   onToggleAll – (visibleValues[]) => void
 *   placeholder – search input placeholder
 *   autoFocus   – focus search on mount
 *   footer      – React node rendered inside the picker's bottom bar
 */
export default function MultiPicker({
  items,
  selected,
  onToggle,
  onToggleAll,
  placeholder = 'Search…',
  autoFocus = false,
  footer,
}) {
  const [search, setSearch] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [])

  // Accent/diacritic-insensitive normalisation: "Hatic" matches "Hatič"
  const norm     = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q        = norm(search)
  const filtered = q ? items.filter((i) => norm(i.label).includes(q)) : items

  // Build section headers
  const rows = []
  let lastGroup
  filtered.forEach((item) => {
    if (item.group !== lastGroup) {
      lastGroup = item.group
      if (item.group) rows.push({ _header: true, label: item.group })
    }
    rows.push(item)
  })

  const visibleValues  = filtered.map((i) => i.value)
  const allChecked     = visibleValues.length > 0 && visibleValues.every((v) => selected.has(v))

  return (
    <div className="principal-picker">
      <div className="principal-search-row">
        <input
          ref={inputRef}
          className="principal-search"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {visibleValues.length > 0 && (
          <label className="principal-select-all">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => onToggleAll(visibleValues)}
            />
            {allChecked ? 'Deselect all' : `Select all (${visibleValues.length})`}
          </label>
        )}
      </div>

      <div className="principal-list">
        {rows.length === 0 && (
          <div className="principal-empty">No matches.</div>
        )}
        {rows.map((row, i) =>
          row._header ? (
            <div key={`h-${i}`} className="principal-group-label">{row.label}</div>
          ) : (
            <label
              key={row.value}
              className={`principal-item ${selected.has(row.value) ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.has(row.value)}
                onChange={() => onToggle(row.value)}
              />
              {row.icon && <span className="principal-icon">{row.icon}</span>}
              <span className="principal-label">{row.label}</span>
            </label>
          )
        )}
      </div>

      {footer !== undefined && (
        <div className="principal-footer">{footer}</div>
      )}
    </div>
  )
}
