// Converts SQL Server varbinary SID (as 0x... hex string) to display format.
// 16-byte SIDs are GUIDs stored in SQL Server's mixed-endian uniqueidentifier format.
// Shorter SIDs (e.g. database users) display as plain uppercase hex.
export function formatSid(hexSid) {
  if (!hexSid) return '—'
  const h = hexSid.replace(/^0x/i, '').toUpperCase()
  if (h.length === 32) return sqlHexToGuid(h)
  return h
}

function sqlHexToGuid(h) {
  // SQL Server stores uniqueidentifier in mixed-endian: first 3 groups LE, last 2 BE
  const b = []
  for (let i = 0; i < 32; i += 2) b.push(h.slice(i, i + 2))
  const p1 = b[3] + b[2] + b[1] + b[0]
  const p2 = b[5] + b[4]
  const p3 = b[7] + b[6]
  const p4 = b[8] + b[9]
  const p5 = b.slice(10).join('')
  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase()
}
