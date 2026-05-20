import express from 'express'
import sql from 'mssql'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// ── DB pool (fixed service account from env vars) ─────────────────────────────
const poolConfig = {
  server:   process.env.DB_SERVER   || '192.168.87.91',
  port:     parseInt(process.env.DB_PORT || '1434'),
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || '',
  options: {
    encrypt:               false,
    trustServerCertificate: true,
    enableArithAbort:       true,
  },
  pool: { max: 10, min: 1, idleTimeoutMillis: 30000 },
}

let pool = null

async function getPool() {
  if (!pool) pool = await sql.connect(poolConfig)
  return pool
}

// ── Helper ────────────────────────────────────────────────────────────────────
function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req)
      res.json(result)
    } catch (err) {
      res.json({ error: err.message })
    }
  }
}

// ── Health / connect ──────────────────────────────────────────────────────────
app.get('/api/health', wrap(async () => {
  const p = await getPool()
  await p.request().query('SELECT 1')
  return { success: true }
}))

// Web mode: connect is a no-op (pool is already open server-side)
app.post('/api/db/connect',    wrap(async () => ({ success: true })))
app.post('/api/db/disconnect', wrap(async () => ({ success: true })))

// ── Connections (stored in memory per session — web clients use localStorage) ──
// These endpoints are no-ops; the web adapter uses localStorage directly.
app.get('/api/connections',        (_req, res) => res.json([]))
app.post('/api/connections',       (_req, res) => res.json([]))
app.delete('/api/connections/:id', (_req, res) => res.json([]))

// ── Read ──────────────────────────────────────────────────────────────────────
app.get('/api/db/stores', wrap(async () => {
  const p = await getPool()
  const r = await p.request().query('SELECT StoreId, Name, Description FROM netsqlazman_StoresTable ORDER BY Name')
  return { data: r.recordset }
}))

app.get('/api/db/applications/:storeId', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request()
    .input('storeId', sql.Int, parseInt(req.params.storeId))
    .query('SELECT ApplicationId, StoreId, Name, Description FROM netsqlazman_ApplicationsTable WHERE StoreId = @storeId ORDER BY Name')
  return { data: r.recordset }
}))

app.get('/api/db/applications/:appId/items', wrap(async (req) => {
  const p = await getPool()
  const { type } = req.query
  if (type !== undefined) {
    const r = await p.request()
      .input('appId',    sql.Int, parseInt(req.params.appId))
      .input('itemType', sql.Int, parseInt(type))
      .query('SELECT ItemId, ApplicationId, Name, Description, ItemType FROM netsqlazman_ItemsTable WHERE ApplicationId = @appId AND ItemType = @itemType ORDER BY Name')
    return { data: r.recordset }
  }
  const r = await p.request()
    .input('appId', sql.Int, parseInt(req.params.appId))
    .query('SELECT ItemId, ApplicationId, Name, Description, ItemType FROM netsqlazman_ItemsTable WHERE ApplicationId = @appId ORDER BY ItemType, Name')
  return { data: r.recordset }
}))

app.get('/api/db/items/:itemId/authorizations', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request()
    .input('itemId', sql.Int, parseInt(req.params.itemId))
    .query(`SELECT AuthorizationId, ItemId, Name, SidWhereDefined, AuthorizationType, ValidFrom, ValidTo,
              CONVERT(nvarchar(128), objectSid, 1) AS SidHex
            FROM netsqlazman_AuthorizationView WHERE ItemId = @itemId ORDER BY Name`)
  return { data: r.recordset }
}))

app.get('/api/db/items/:itemId/members', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request()
    .input('itemId', sql.Int, parseInt(req.params.itemId))
    .query(`SELECT i.ItemId, i.Name, i.Description, i.ItemType
            FROM netsqlazman_ItemsHierarchyTable h
            JOIN netsqlazman_ItemsTable i ON h.ItemId = i.ItemId
            WHERE h.MemberOfItemId = @itemId ORDER BY i.ItemType, i.Name`)
  return { data: r.recordset }
}))

app.get('/api/db/applications/:appId/groups', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request()
    .input('appId', sql.Int, parseInt(req.params.appId))
    .query(`SELECT ApplicationGroupId, ApplicationId, Name, Description, GroupType,
              CONVERT(nvarchar(128), objectSid, 1) AS SidHex
            FROM netsqlazman_ApplicationGroupsTable WHERE ApplicationId = @appId ORDER BY Name`)
  return { data: r.recordset }
}))

app.get('/api/db/groups/:groupId/members', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request()
    .input('groupId', sql.Int, parseInt(req.params.groupId))
    .query(`SELECT m.ApplicationGroupMemberId, m.ApplicationGroupId, m.WhereDefined, m.IsMember,
              CONVERT(nvarchar(128), m.objectSid, 1) AS SidHex,
              CASE m.WhereDefined WHEN 0 THEN sg.Name WHEN 1 THEN ag.Name WHEN 4 THEN du.DBUserName
                ELSE CONVERT(nvarchar(128), m.objectSid, 1) END AS MemberName,
              CASE m.WhereDefined WHEN 0 THEN 'Store' WHEN 1 THEN 'Application'
                WHEN 2 THEN 'LDAP' WHEN 3 THEN 'Local' WHEN 4 THEN 'Database' END AS WhereDefinedLabel
            FROM netsqlazman_ApplicationGroupMembersTable m
            LEFT JOIN netsqlazman_ApplicationGroupsTable ag ON m.objectSid = ag.objectSid AND m.WhereDefined = 1
            LEFT JOIN netsqlazman_StoreGroupsTable sg ON m.objectSid = sg.objectSid AND m.WhereDefined = 0
            LEFT JOIN netsqlazman_DatabaseUsers du ON m.objectSid = du.DBUserSid AND m.WhereDefined = 4
            WHERE m.ApplicationGroupId = @groupId ORDER BY m.IsMember DESC, m.WhereDefined, MemberName`)
  return { data: r.recordset }
}))

app.get('/api/db/database-users', wrap(async () => {
  const p = await getPool()
  const r = await p.request()
    .query('SELECT DBUserSid, DBUserName, CONVERT(nvarchar(128), DBUserSid, 1) AS SidHex FROM netsqlazman_DatabaseUsers ORDER BY DBUserName')
  return { data: r.recordset }
}))

// ── Write — Application Groups ────────────────────────────────────────────────
app.post('/api/db/groups', wrap(async (req) => {
  const { applicationId, name, description } = req.body
  const p = await getPool()
  const r = await p.request()
    .input('appId', sql.Int, applicationId)
    .input('name',  sql.NVarChar, name)
    .input('desc',  sql.NVarChar, description || '')
    .query(`INSERT INTO netsqlazman_ApplicationGroupsTable (ApplicationId, Name, Description, GroupType, objectSid, LDAPQuery)
            OUTPUT INSERTED.ApplicationGroupId, INSERTED.ApplicationId, INSERTED.Name, INSERTED.Description, INSERTED.GroupType,
              CONVERT(nvarchar(128), INSERTED.objectSid, 1) AS SidHex
            VALUES (@appId, @name, @desc, 0, CAST(NEWID() AS varbinary(16)), NULL)`)
  return { data: r.recordset[0] }
}))

app.put('/api/db/groups/:groupId', wrap(async (req) => {
  const { name, description } = req.body
  const p = await getPool()
  await p.request()
    .input('groupId', sql.Int, parseInt(req.params.groupId))
    .input('name',    sql.NVarChar, name)
    .input('desc',    sql.NVarChar, description || '')
    .query('UPDATE netsqlazman_ApplicationGroupsTable SET Name = @name, Description = @desc WHERE ApplicationGroupId = @groupId')
  return { success: true }
}))

app.delete('/api/db/groups/:groupId', wrap(async (req) => {
  const p  = await getPool()
  const t  = new sql.Transaction(p)
  await t.begin()
  try {
    const sidRes = await new sql.Request(t)
      .input('groupId', sql.Int, parseInt(req.params.groupId))
      .query('SELECT objectSid FROM netsqlazman_ApplicationGroupsTable WHERE ApplicationGroupId = @groupId')
    if (!sidRes.recordset.length) { await t.rollback(); return { error: 'Group not found' } }
    const sid = sidRes.recordset[0].objectSid
    await new sql.Request(t).input('groupId', sql.Int, parseInt(req.params.groupId))
      .query('DELETE FROM netsqlazman_ApplicationGroupMembersTable WHERE ApplicationGroupId = @groupId')
    await new sql.Request(t).input('sid', sql.VarBinary, sid)
      .query('DELETE FROM netsqlazman_ApplicationGroupMembersTable WHERE objectSid = @sid')
    await new sql.Request(t).input('sid', sql.VarBinary, sid)
      .query('DELETE FROM netsqlazman_AuthorizationsTable WHERE objectSid = @sid')
    await new sql.Request(t).input('groupId', sql.Int, parseInt(req.params.groupId))
      .query('DELETE FROM netsqlazman_ApplicationGroupsTable WHERE ApplicationGroupId = @groupId')
    await t.commit()
    return { success: true }
  } catch (err) { await t.rollback().catch(() => {}); return { error: err.message } }
}))

app.post('/api/db/groups/:groupId/members', wrap(async (req) => {
  const { sidHex, whereDefined, isMember } = req.body
  const p = await getPool()
  const sidBuf = Buffer.from(sidHex.replace(/^0x/i, ''), 'hex')
  await p.request()
    .input('groupId',      sql.Int,       parseInt(req.params.groupId))
    .input('whereDefined', sql.Int,       whereDefined)
    .input('isMember',     sql.Bit,       isMember ? 1 : 0)
    .input('sid',          sql.VarBinary, sidBuf)
    .query('INSERT INTO netsqlazman_ApplicationGroupMembersTable (ApplicationGroupId, WhereDefined, IsMember, objectSid) VALUES (@groupId, @whereDefined, @isMember, @sid)')
  return { success: true }
}))

app.delete('/api/db/members/:memberId', wrap(async (req) => {
  const p = await getPool()
  await p.request()
    .input('memberId', sql.Int, parseInt(req.params.memberId))
    .query('DELETE FROM netsqlazman_ApplicationGroupMembersTable WHERE ApplicationGroupMemberId = @memberId')
  return { success: true }
}))

app.patch('/api/db/members/:memberId', wrap(async (req) => {
  const p = await getPool()
  await p.request()
    .input('memberId', sql.Int, parseInt(req.params.memberId))
    .input('isMember', sql.Bit, req.body.isMember ? 1 : 0)
    .query('UPDATE netsqlazman_ApplicationGroupMembersTable SET IsMember = @isMember WHERE ApplicationGroupMemberId = @memberId')
  return { success: true }
}))

// ── Write — Items ─────────────────────────────────────────────────────────────
app.post('/api/db/items', wrap(async (req) => {
  const { applicationId, name, description, itemType } = req.body
  const p = await getPool()
  const r = await p.request()
    .input('appId',    sql.Int,      applicationId)
    .input('name',     sql.NVarChar, name)
    .input('desc',     sql.NVarChar, description || '')
    .input('itemType', sql.Int,      itemType)
    .query('INSERT INTO netsqlazman_ItemsTable (ApplicationId, Name, Description, ItemType) OUTPUT INSERTED.ItemId, INSERTED.ApplicationId, INSERTED.Name, INSERTED.Description, INSERTED.ItemType VALUES (@appId, @name, @desc, @itemType)')
  return { data: r.recordset[0] }
}))

app.put('/api/db/items/:itemId', wrap(async (req) => {
  const p = await getPool()
  await p.request()
    .input('itemId', sql.Int,      parseInt(req.params.itemId))
    .input('name',   sql.NVarChar, req.body.name)
    .input('desc',   sql.NVarChar, req.body.description || '')
    .query('UPDATE netsqlazman_ItemsTable SET Name = @name, Description = @desc WHERE ItemId = @itemId')
  return { success: true }
}))

app.delete('/api/db/items/:itemId', wrap(async (req) => {
  const p = await getPool()
  const t = new sql.Transaction(p)
  await t.begin()
  try {
    const id = parseInt(req.params.itemId)
    await new sql.Request(t).input('itemId', sql.Int, id)
      .query('DELETE FROM netsqlazman_ItemsHierarchyTable WHERE ItemId = @itemId OR MemberOfItemId = @itemId')
    await new sql.Request(t).input('itemId', sql.Int, id)
      .query('DELETE FROM netsqlazman_AuthorizationsTable WHERE ItemId = @itemId')
    await new sql.Request(t).input('itemId', sql.Int, id)
      .query('DELETE FROM netsqlazman_ItemsTable WHERE ItemId = @itemId')
    await t.commit()
    return { success: true }
  } catch (err) { await t.rollback().catch(() => {}); return { error: err.message } }
}))

app.post('/api/db/items/:parentId/children', wrap(async (req) => {
  const p = await getPool()
  await p.request()
    .input('childItemId',  sql.Int, req.body.childItemId)
    .input('parentItemId', sql.Int, parseInt(req.params.parentId))
    .query(`IF NOT EXISTS (SELECT 1 FROM netsqlazman_ItemsHierarchyTable WHERE ItemId = @childItemId AND MemberOfItemId = @parentItemId)
              INSERT INTO netsqlazman_ItemsHierarchyTable (ItemId, MemberOfItemId) VALUES (@childItemId, @parentItemId)`)
  return { success: true }
}))

app.delete('/api/db/items/:parentId/children/:childId', wrap(async (req) => {
  const p = await getPool()
  await p.request()
    .input('childItemId',  sql.Int, parseInt(req.params.childId))
    .input('parentItemId', sql.Int, parseInt(req.params.parentId))
    .query('DELETE FROM netsqlazman_ItemsHierarchyTable WHERE ItemId = @childItemId AND MemberOfItemId = @parentItemId')
  return { success: true }
}))

// ── Write — Authorizations ────────────────────────────────────────────────────
app.post('/api/db/authorizations', wrap(async (req) => {
  const { itemId, sidHex, ownerSidHex, authType, sidWhereDefined = 1 } = req.body
  const p = await getPool()
  const sidBuf   = Buffer.from(sidHex.replace(/^0x/i, ''),      'hex')
  const ownerBuf = Buffer.from(ownerSidHex.replace(/^0x/i, ''), 'hex')
  await p.request()
    .input('itemId',   sql.Int,       itemId)
    .input('authType', sql.Int,       authType)
    .input('sidWhere', sql.Int,       sidWhereDefined)
    .input('sid',      sql.VarBinary, sidBuf)
    .input('ownerSid', sql.VarBinary, ownerBuf)
    .query(`INSERT INTO netsqlazman_AuthorizationsTable (ItemId, ownerSid, ownerSidWhereDefined, objectSid, objectSidWhereDefined, AuthorizationType, ValidFrom, ValidTo)
            VALUES (@itemId, @ownerSid, 1, @sid, @sidWhere, @authType, NULL, NULL)`)
  return { success: true }
}))

app.put('/api/db/authorizations/:authId', wrap(async (req) => {
  const p = await getPool()
  await p.request()
    .input('authId',   sql.Int, parseInt(req.params.authId))
    .input('authType', sql.Int, req.body.authType)
    .query('UPDATE netsqlazman_AuthorizationsTable SET AuthorizationType = @authType WHERE AuthorizationId = @authId')
  return { success: true }
}))

app.delete('/api/db/authorizations/:authId', wrap(async (req) => {
  const p = await getPool()
  await p.request()
    .input('authId', sql.Int, parseInt(req.params.authId))
    .query('DELETE FROM netsqlazman_AuthorizationsTable WHERE AuthorizationId = @authId')
  return { success: true }
}))

// ── User Lookup ───────────────────────────────────────────────────────────────
app.get('/api/db/users/search', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request()
    .input('q', sql.NVarChar, `%${req.query.q || ''}%`)
    .query(`SELECT TOP 20 UserName, Ime, Priimek FROM dbo.Zaposleni
            WHERE Ime + ' ' + Priimek LIKE @q OR Priimek + ' ' + Ime LIKE @q OR UserName LIKE @q
            ORDER BY Priimek, Ime`)
  return { data: r.recordset }
}))

app.get('/api/db/azman/groups', wrap(async () => {
  const p = await getPool()
  const r = await p.request().execute('GetAzmanGroups')
  return { data: r.recordset }
}))

app.get('/api/db/azman/user/:username/groups', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request().input('username', sql.NVarChar, req.params.username).execute('GetAzmanGroupsForUser')
  return { data: r.recordset }
}))

app.get('/api/db/azman/user/:username/roles', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request().input('username', sql.NVarChar, req.params.username).execute('GetAzmanRolesForUser')
  return { data: r.recordset }
}))

app.get('/api/db/azman/user/:username/operations', wrap(async (req) => {
  const p = await getPool()
  const r = await p.request().input('username', sql.NVarChar, req.params.username).execute('GetAzmanOperationsForUser')
  return { data: r.recordset }
}))

// ── Serve React frontend ──────────────────────────────────────────────────────
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`NetSqlAzMan Manager web server running on port ${PORT}`)
  try {
    await getPool()
    console.log(`Connected to SQL Server: ${poolConfig.server}:${poolConfig.port} / ${poolConfig.database}`)
  } catch (err) {
    console.error('DB connection failed:', err.message)
  }
})
