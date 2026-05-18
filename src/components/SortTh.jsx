import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export default function SortTh({ col, sort, onSort, children }) {
  const active = sort.col === col
  return (
    <th className="sortable-th" onClick={() => onSort(col)}>
      {children}
      <span className={`sort-icon${active ? ' active' : ''}`}>
        {active
          ? sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
          : <ChevronsUpDown size={11} />}
      </span>
    </th>
  )
}
