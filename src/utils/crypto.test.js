import { describe, it, expect } from 'vitest'
import { encryptConnections, decryptConnections, isEncryptedExport } from './crypto'

const SAMPLE = [
  { name: 'Prod', server: 'sql.prod.local', port: '1433', user: 'sa', password: 's3cr3t', database: 'AzManDB' },
  { name: 'Dev',  server: 'sql.dev.local',  port: '1433', user: 'sa', password: 'devpass', database: 'AzManDB' },
]

describe('isEncryptedExport', () => {
  it('returns false for plain arrays', () => {
    expect(isEncryptedExport(SAMPLE)).toBe(false)
    expect(isEncryptedExport(null)).toBeFalsy()
    expect(isEncryptedExport({})).toBe(false)
  })

  it('returns true for encrypted payloads', async () => {
    const enc = await encryptConnections(SAMPLE, 'pass')
    expect(isEncryptedExport(enc)).toBe(true)
  })
})

describe('encryptConnections / decryptConnections', () => {
  it('round-trips connections with correct passphrase', async () => {
    const passphrase = 'test-passphrase-€üž'
    const enc = await encryptConnections(SAMPLE, passphrase)
    expect(enc._type).toBe('netsqlazman-connections-v1')
    expect(enc.salt).toBeTruthy()
    expect(enc.iv).toBeTruthy()
    expect(enc.data).toBeTruthy()

    const dec = await decryptConnections(enc, passphrase)
    expect(dec).toEqual(SAMPLE)
  })

  it('each encryption produces a unique ciphertext (random IV/salt)', async () => {
    const enc1 = await encryptConnections(SAMPLE, 'same')
    const enc2 = await encryptConnections(SAMPLE, 'same')
    expect(enc1.iv).not.toBe(enc2.iv)
    expect(enc1.data).not.toBe(enc2.data)
  })

  it('throws on wrong passphrase', async () => {
    const enc = await encryptConnections(SAMPLE, 'correct')
    await expect(decryptConnections(enc, 'wrong')).rejects.toThrow()
  })

  it('throws on tampered ciphertext', async () => {
    const enc = await encryptConnections(SAMPLE, 'pass')
    const tampered = { ...enc, data: enc.data.slice(0, -4) + 'AAAA' }
    await expect(decryptConnections(tampered, 'pass')).rejects.toThrow()
  })

  it('throws on unknown _type marker', async () => {
    const enc = await encryptConnections(SAMPLE, 'pass')
    await expect(decryptConnections({ ...enc, _type: 'unknown' }, 'pass')).rejects.toThrow()
  })
})
