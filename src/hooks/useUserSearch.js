import { useState, useRef, useCallback } from 'react'

/**
 * Shared autocomplete search hook used in UserLookup and UserCompare.
 *
 * Returns:
 *   query          – current input value
 *   setQuery       – setter for controlled input
 *   suggestions    – [{ UserName, Ime, Priimek }]
 *   setSuggestions – clear suggestions externally
 *   showDrop       – whether dropdown is open
 *   setShowDrop    – toggle dropdown
 *   onQueryChange  – debounced handler for input onChange
 *   reset          – clear all state
 */
export function useUserSearch() {
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const debounceRef = useRef(null)

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

  function reset() { setQuery(''); setSuggestions([]); setShowDrop(false) }

  return { query, setQuery, suggestions, setSuggestions, showDrop, setShowDrop, onQueryChange, reset }
}
