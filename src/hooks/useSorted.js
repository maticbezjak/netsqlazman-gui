import { useState } from 'react'

export default function useSorted(data, defaultCol = null) {
  const [sort, setSort] = useState({ col: defaultCol, dir: 'asc' })

  function toggleSort(col) {
    setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const sorted = sort.col
    ? [...data].sort((a, b) => {
        const av = String(a[sort.col] ?? '').toLowerCase()
        const bv = String(b[sort.col] ?? '').toLowerCase()
        return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1)
      })
    : data

  return { sorted, sort, toggleSort }
}
