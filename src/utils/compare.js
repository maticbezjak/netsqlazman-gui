/**
 * Pure comparison utilities shared by UserCompare.jsx and its tests.
 */

export function getRowKey(row) {
  const val = row.Name ?? row.GroupName ?? row.RoleName ?? row.OperationName
    ?? row.ApplicationName ?? Object.values(row)[0]
  return String(val ?? '')
}

export function compareSection(aRows, bRows) {
  const aMap = new Map((aRows || []).map((r) => [getRowKey(r), r]))
  const bMap = new Map((bRows || []).map((r) => [getRowKey(r), r]))
  const keys = new Set([...aMap.keys(), ...bMap.keys()])
  return [...keys].sort((a, b) => a.localeCompare(b)).map((key) => ({
    key,
    inA: aMap.has(key),
    inB: bMap.has(key),
  }))
}
