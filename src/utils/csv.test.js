import { describe, it, expect } from 'vitest'
import { buildCSV } from './csv'

describe('buildCSV', () => {
  it('returns empty string for empty array', () => {
    expect(buildCSV([])).toBe('')
    expect(buildCSV(null)).toBe('')
    expect(buildCSV(undefined)).toBe('')
  })

  it('builds header + one row', () => {
    const rows = [{ Name: 'Alice', Role: 'Admin' }]
    const csv  = buildCSV(rows)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Name,Role')
    expect(lines[1]).toBe('"Alice","Admin"')
  })

  it('escapes double quotes inside values', () => {
    const rows = [{ Note: 'say "hello"' }]
    const csv  = buildCSV(rows)
    expect(csv).toContain('"say ""hello"""')
  })

  it('handles null/undefined cell values as empty string', () => {
    const rows = [{ A: null, B: undefined, C: 0 }]
    const csv  = buildCSV(rows)
    expect(csv).toContain('"","","0"')
  })

  it('builds multiple rows correctly', () => {
    const rows = [
      { User: 'alice', Group: 'Admins' },
      { User: 'bob',   Group: 'Users'  },
    ]
    const lines = buildCSV(rows).split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('User,Group')
    expect(lines[1]).toBe('"alice","Admins"')
    expect(lines[2]).toBe('"bob","Users"')
  })

  it('handles diacritics without mangling', () => {
    const rows = [{ Name: 'Hatič' }]
    expect(buildCSV(rows)).toContain('Hatič')
  })
})
