import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Shared autocomplete search hook used in UserLookup and UserCompare.
 *
 * Returns:
 *   query            – current input value
 *   setQuery         – setter for controlled input
 *   suggestions      – [{ UserName, Ime, Priimek }]
 *   setSuggestions   – clear suggestions externally
 *   showDrop         – whether dropdown is open
 *   setShowDrop      – toggle dropdown
 *   activeIdx        – currently highlighted suggestion index (-1 = none)
 *   onQueryChange    – debounced handler for input onChange
 *   navigateDropdown – ('up'|'down') → moves activeIdx, returns selected suggestion or null
 *   reset            – clear all state
 */
export function useUserSearch() {
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)
  const debounceRef = useRef(null)

  // Reset highlight when suggestions list changes
  useEffect(() => { setActiveIdx(-1) }, [suggestions])

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

  /**
   * Move the highlighted index up or down.
   * Returns the newly highlighted suggestion (or null if none).
   */
  function navigateDropdown(direction) {
    if (!suggestions.length) return null
    let next
    if (direction === 'down') next = Math.min(activeIdx + 1, suggestions.length - 1)
    else                      next = Math.max(activeIdx - 1, 0)
    setActiveIdx(next)
    return suggestions[next] ?? null
  }

  /** Returns the currently highlighted suggestion, or null. */
  function getActiveSuggestion() {
    return activeIdx >= 0 ? (suggestions[activeIdx] ?? null) : null
  }

  function reset() { setQuery(''); setSuggestions([]); setShowDrop(false); setActiveIdx(-1) }

  return {
    query, setQuery,
    suggestions, setSuggestions,
    showDrop, setShowDrop,
    activeIdx,
    onQueryChange,
    navigateDropdown,
    getActiveSuggestion,
    reset,
  }
}
