/**
 * Export an array of row objects to a UTF-8 CSV file download.
 * Adds a BOM so Excel opens it correctly with diacritics.
 */
export function exportCSV(rows, filename = 'export.csv') {
  if (!rows?.length) return
  const cols   = Object.keys(rows[0])
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv    = [
    cols.join(','),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(',')),
  ].join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
