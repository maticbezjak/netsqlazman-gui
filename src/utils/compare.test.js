import { describe, it, expect } from 'vitest'
import { getRowKey, compareSection } from './compare'

describe('getRowKey', () => {
  it('prefers Name column', () => {
    expect(getRowKey({ Name: 'Admin', Id: 1 })).toBe('Admin')
  })

  it('falls back through known column names', () => {
    expect(getRowKey({ GroupName: 'Sales' })).toBe('Sales')
    expect(getRowKey({ RoleName: 'Manager' })).toBe('Manager')
    expect(getRowKey({ OperationName: 'Read' })).toBe('Read')
  })

  it('falls back to first column value when no known name found', () => {
    expect(getRowKey({ XYZ: 'fallback' })).toBe('fallback')
  })

  it('coerces numbers to strings', () => {
    expect(getRowKey({ Name: 42 })).toBe('42')
  })
})

describe('compareSection', () => {
  it('returns empty array for two empty inputs', () => {
    expect(compareSection([], [])).toEqual([])
  })

  it('marks items only in A', () => {
    const a = [{ Name: 'AdminRole' }]
    const b = []
    const result = compareSection(a, b)
    expect(result).toEqual([{ key: 'AdminRole', inA: true, inB: false }])
  })

  it('marks items only in B', () => {
    const result = compareSection([], [{ Name: 'UserRole' }])
    expect(result).toEqual([{ key: 'UserRole', inA: false, inB: true }])
  })

  it('marks shared items', () => {
    const shared = [{ Name: 'Shared' }]
    const result = compareSection(shared, shared)
    expect(result).toEqual([{ key: 'Shared', inA: true, inB: true }])
  })

  it('sorts results alphabetically', () => {
    const a = [{ Name: 'Zebra' }, { Name: 'Apple' }]
    const b = [{ Name: 'Mango' }]
    const keys = compareSection(a, b).map((r) => r.key)
    expect(keys).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('handles null/undefined gracefully', () => {
    expect(compareSection(null, null)).toEqual([])
    expect(compareSection(undefined, [{ Name: 'X' }])).toEqual([{ key: 'X', inA: false, inB: true }])
  })
})
