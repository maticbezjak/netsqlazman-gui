const { app, BrowserWindow, ipcMain, safeStorage } = require('electron')
const path = require('path')
const fs   = require('fs')
const sql  = require('mssql')
const { autoUpdater } = require('electron-updater')

// ── Multi-instance support ─────────────────────────────────────────────────────
// Secondary instances share the primary's Chromium profile by default and stall
// for seconds waiting on its cache locks (white screen). Give each secondary its
// own session cache; connections.json stays shared via userData.

const isPrimaryInstance = app.requestSingleInstanceLock()
const instancesDir = path.join(app.getPath('userData'), 'instance-cache')

if (!isPrimaryInstance) {
  app.setPath('sessionData', path.join(instancesDir, String(process.pid)))
} else {
  // Clean up caches left behind by closed secondary instances.
  // Dirs still in use by a live instance are locked and survive the delete.
  fs.readdir(instancesDir, (err, entries) => {
    if (err) return
    for (const entry of entries) {
      fs.rm(path.join(instancesDir, entry), { recursive: true, force: true }, () => {})
    }
  })
}

// ── Saved connections (passwords encrypted at rest via safeStorage) ───────────

const ENC_PREFIX = '__enc1__'

function encryptPwd(pwd) {
  if (!pwd) return ''
  if (!safeStorage.isEncryptionAvailable()) return pwd
  try { return ENC_PREFIX + safeStorage.encryptString(pwd).toString('base64') }
  catch { return pwd }
}

function decryptPwd(stored) {
  if (!stored || !stored.startsWith(ENC_PREFIX)) return stored || ''
  if (!safeStorage.isEncryptionAvailable()) return ''
  try { return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64')) }
  catch { return '' }
}

function connectionsFile() {
  return path.join(app.getPath('userData'), 'connections.json')
}

function readRaw() {
  try { return JSON.parse(fs.readFileSync(connectionsFile(), 'utf8')) } catch { return [] }
}

function readConnections() {
  return readRaw().map((c) => ({ ...c, password: decryptPwd(c.password) }))
}

function writeRaw(list) {
  fs.writeFileSync(connectionsFile(), JSON.stringify(list, null, 2))
}

ipcMain.handle('connections:load', () => readConnections())

ipcMain.handle('connections:save', (_, conn) => {
  const raw = readRaw()
  const entry = { ...conn, password: encryptPwd(conn.password) }
  const idx = raw.findIndex((c) => c.id === conn.id)
  if (idx >= 0) raw[idx] = entry
  else { entry.id = Date.now().toString(); raw.push(entry) }
  writeRaw(raw)
  return raw.map((c) => ({ ...c, password: decryptPwd(c.password) }))
})

ipcMain.handle('connections:delete', (_, id) => {
  const raw = readRaw().filter((c) => c.id !== id)
  writeRaw(raw)
  return raw.map((c) => ({ ...c, password: decryptPwd(c.password) }))
})

let mainWindow
let currentPool = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NetSqlAzMan Manager',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function initAutoUpdater() {
  if (process.env.VITE_DEV_SERVER_URL) return  // skip in dev mode
  if (!isPrimaryInstance) return               // only the primary instance updates

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:update-available', info.version)
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:update-downloaded', info.version)
  })

  // Delay the check so the update download never competes with app startup
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 10_000)
}

ipcMain.handle('updater:quitAndInstall', () => autoUpdater.quitAndInstall())

app.whenReady().then(() => {
  createWindow()
  initAutoUpdater()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

async function closePool() {
  if (currentPool) {
    await currentPool.close().catch(() => {})
    currentPool = null
  }
}

// ── Connection ────────────────────────────────────────────────────────────────

ipcMain.handle('db:connect', async (_, config) => {
  try {
    await closePool()
    currentPool = await sql.connect({
      server:   config.server,
      port:     parseInt(config.port) || 1433,
      user:     config.user,
      password: config.password,
      database: config.database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      connectionTimeout: 10000,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:disconnect', async () => {
  await closePool()
  return { success: true }
})

ipcMain.handle('db:ping', async () => {
  if (!currentPool) return { ok: false }
  try {
    await currentPool.request().query('SELECT 1')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('db:getUserSidHex', async (_, username) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('username', sql.NVarChar, username)
      .query(`SELECT TOP 1 CONVERT(nvarchar(128), DBUserSid, 1) AS SidHex
              FROM dbo.netsqlazman_GetDBUsers(NULL, NULL, NULL, NULL)
              WHERE DBUserName = @username`)
    return { data: r.recordset[0]?.SidHex ?? null }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:globalSearch', async (_, query) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const q = `%${query}%`
    const r = await currentPool.request()
      .input('q', sql.NVarChar, q)
      .query(`
        SELECT 'Group' AS Type,
               CAST(ag.ApplicationGroupId AS nvarchar) AS Id,
               ag.Name, a.Name AS AppName, s.Name AS StoreName,
               ag.ApplicationId, a.StoreId, NULL AS Extra
        FROM netsqlazman_ApplicationGroupsTable ag
        JOIN netsqlazman_ApplicationsTable a ON a.ApplicationId = ag.ApplicationId
        JOIN netsqlazman_StoresTable s ON s.StoreId = a.StoreId
        WHERE ag.Name LIKE @q
        UNION ALL
        SELECT 'Item',
               CAST(i.ItemId AS nvarchar),
               i.Name, a.Name, s.Name,
               i.ApplicationId, a.StoreId,
               CAST(i.ItemType AS nvarchar) AS Extra
        FROM netsqlazman_ItemsTable i
        JOIN netsqlazman_ApplicationsTable a ON a.ApplicationId = i.ApplicationId
        JOIN netsqlazman_StoresTable s ON s.StoreId = a.StoreId
        WHERE i.Name LIKE @q
        UNION ALL
        SELECT 'Application',
               CAST(a.ApplicationId AS nvarchar),
               a.Name, NULL, s.Name,
               a.ApplicationId, a.StoreId, NULL
        FROM netsqlazman_ApplicationsTable a
        JOIN netsqlazman_StoresTable s ON s.StoreId = a.StoreId
        WHERE a.Name LIKE @q
        ORDER BY Type, StoreName, AppName, Name
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getAllApplicationGroups', async () => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request().query(`
      SELECT ag.ApplicationGroupId, ag.Name, a.Name AS AppName, a.ApplicationId
      FROM netsqlazman_ApplicationGroupsTable ag
      JOIN netsqlazman_ApplicationsTable a ON a.ApplicationId = ag.ApplicationId
      ORDER BY a.Name, ag.Name
    `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:listDatabases', async (_, { server, port, user, password }) => {
  let tempPool = null
  try {
    tempPool = new sql.ConnectionPool({
      server,
      port:     parseInt(port) || 1433,
      user,
      password,
      database: 'master',
      options:  { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
      connectionTimeout: 8000,
    })
    await tempPool.connect()
    const r = await tempPool.request().query(
      `SELECT name FROM sys.databases WHERE name <> 'tempdb' ORDER BY name`
    )
    return { data: r.recordset.map((row) => row.name) }
  } catch (err) {
    return { error: err.message }
  } finally {
    try { if (tempPool) await tempPool.close() } catch {}
  }
})

// ── Read ──────────────────────────────────────────────────────────────────────

ipcMain.handle('db:getStores', async () => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request().query(
      'SELECT StoreId, Name, Description FROM netsqlazman_StoresTable ORDER BY Name'
    )
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getApplications', async (_, storeId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('storeId', sql.Int, storeId)
      .query(`SELECT ApplicationId, StoreId, Name, Description
              FROM netsqlazman_ApplicationsTable
              WHERE StoreId = @storeId ORDER BY Name`)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getItems', async (_, applicationId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('appId', sql.Int, applicationId)
      .query(`SELECT ItemId, ApplicationId, Name, Description, ItemType
              FROM netsqlazman_ItemsTable
              WHERE ApplicationId = @appId
              ORDER BY ItemType, Name`)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// Uses the built-in view which resolves binary SIDs to names via netsqlazman_GetNameFromSid()
ipcMain.handle('db:getAuthorizations', async (_, itemId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT
          AuthorizationId,
          ItemId,
          Name,
          SidWhereDefined,
          AuthorizationType,
          ValidFrom,
          ValidTo,
          CONVERT(nvarchar(128), objectSid, 1) AS SidHex
        FROM netsqlazman_AuthorizationView
        WHERE ItemId = @itemId
        ORDER BY Name
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// Returns child items (operations/tasks) that belong to the given role/task
ipcMain.handle('db:getItemMembers', async (_, itemId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT i.ItemId, i.Name, i.Description, i.ItemType
        FROM netsqlazman_ItemsHierarchyTable h
        JOIN netsqlazman_ItemsTable i ON h.ItemId = i.ItemId
        WHERE h.MemberOfItemId = @itemId
        ORDER BY i.ItemType, i.Name
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// Returns items of a specific type (0=Role, 1=Task, 2=Operation) for an application
ipcMain.handle('db:getItemsByType', async (_, applicationId, itemType) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('appId',    sql.Int, applicationId)
      .input('itemType', sql.Int, itemType)
      .query(`SELECT ItemId, ApplicationId, Name, Description, ItemType
              FROM netsqlazman_ItemsTable
              WHERE ApplicationId = @appId AND ItemType = @itemType
              ORDER BY Name`)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// Returns members of a specific application group
ipcMain.handle('db:getApplicationGroupMembers', async (_, groupId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('groupId', sql.Int, groupId)
      .query(`
        SELECT
          m.ApplicationGroupMemberId,
          m.ApplicationGroupId,
          m.WhereDefined,
          m.IsMember,
          CONVERT(nvarchar(128), m.objectSid, 1) AS SidHex,
          CASE m.WhereDefined
            WHEN 0 THEN sg.Name
            WHEN 1 THEN ag.Name
            WHEN 4 THEN du.DBUserName
            ELSE CONVERT(nvarchar(128), m.objectSid, 1)
          END AS MemberName,
          CASE m.WhereDefined
            WHEN 0 THEN 'Store'
            WHEN 1 THEN 'Application'
            WHEN 2 THEN 'LDAP'
            WHEN 3 THEN 'Local'
            WHEN 4 THEN 'Database'
          END AS WhereDefinedLabel
        FROM netsqlazman_ApplicationGroupMembersTable m
        LEFT JOIN netsqlazman_ApplicationGroupsTable ag
          ON m.objectSid = ag.objectSid AND m.WhereDefined = 1
        LEFT JOIN netsqlazman_StoreGroupsTable sg
          ON m.objectSid = sg.objectSid AND m.WhereDefined = 0
        LEFT JOIN netsqlazman_DatabaseUsers du
          ON m.objectSid = du.DBUserSid AND m.WhereDefined = 4
        WHERE m.ApplicationGroupId = @groupId
        ORDER BY m.IsMember DESC, m.WhereDefined, MemberName
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// Returns all application groups — includes ApplicationId for CRUD context
ipcMain.handle('db:getApplicationGroups', async (_, applicationId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('appId', sql.Int, applicationId)
      .query(`
        SELECT
          ApplicationGroupId,
          ApplicationId,
          Name,
          Description,
          GroupType,
          CONVERT(nvarchar(128), objectSid, 1) AS SidHex
        FROM netsqlazman_ApplicationGroupsTable
        WHERE ApplicationId = @appId
        ORDER BY Name
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// Returns all database users via the custom netsqlazman_GetDBUsers TVF (reads from Zaposleni)
ipcMain.handle('db:getDatabaseUsers', async () => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .query(`SELECT DBUserSid, DBUserName, FullName,
                     CONVERT(nvarchar(128), DBUserSid, 1) AS SidHex
              FROM dbo.netsqlazman_GetDBUsers(NULL, NULL, NULL, NULL)
              ORDER BY DBUserName`)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// ── Write — Application Groups ────────────────────────────────────────────────

ipcMain.handle('db:createApplicationGroup', async (_, { applicationId, name, description }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('appId', sql.Int, applicationId)
      .input('name',  sql.NVarChar, name)
      .input('desc',  sql.NVarChar, description || '')
      .query(`
        INSERT INTO netsqlazman_ApplicationGroupsTable
          (ApplicationId, Name, Description, GroupType, objectSid, LDAPQuery)
        OUTPUT
          INSERTED.ApplicationGroupId,
          INSERTED.ApplicationId,
          INSERTED.Name,
          INSERTED.Description,
          INSERTED.GroupType,
          CONVERT(nvarchar(128), INSERTED.objectSid, 1) AS SidHex
        VALUES (@appId, @name, @desc, 0, CAST(NEWID() AS varbinary(16)), NULL)
      `)
    return { data: r.recordset[0] }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:updateApplicationGroup', async (_, { groupId, name, description }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('groupId', sql.Int, groupId)
      .input('name',    sql.NVarChar, name)
      .input('desc',    sql.NVarChar, description || '')
      .query(`UPDATE netsqlazman_ApplicationGroupsTable
              SET Name = @name, Description = @desc
              WHERE ApplicationGroupId = @groupId`)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:deleteApplicationGroup', async (_, groupId) => {
  if (!currentPool) return { error: 'Not connected' }
  const t = new sql.Transaction(currentPool)
  try {
    await t.begin()

    const sidRes = await new sql.Request(t)
      .input('groupId', sql.Int, groupId)
      .query('SELECT objectSid FROM netsqlazman_ApplicationGroupsTable WHERE ApplicationGroupId = @groupId')

    if (!sidRes.recordset.length) {
      await t.rollback()
      return { error: 'Group not found' }
    }
    const sid = sidRes.recordset[0].objectSid

    // Remove all members of this group
    await new sql.Request(t)
      .input('groupId', sql.Int, groupId)
      .query('DELETE FROM netsqlazman_ApplicationGroupMembersTable WHERE ApplicationGroupId = @groupId')

    // Remove this group from any parent group it belongs to
    await new sql.Request(t)
      .input('sid', sql.VarBinary, sid)
      .query('DELETE FROM netsqlazman_ApplicationGroupMembersTable WHERE objectSid = @sid')

    // Remove authorizations where this group is the principal
    await new sql.Request(t)
      .input('sid', sql.VarBinary, sid)
      .query('DELETE FROM netsqlazman_AuthorizationsTable WHERE objectSid = @sid')

    await new sql.Request(t)
      .input('groupId', sql.Int, groupId)
      .query('DELETE FROM netsqlazman_ApplicationGroupsTable WHERE ApplicationGroupId = @groupId')

    await t.commit()
    return { success: true }
  } catch (err) {
    await t.rollback().catch(() => {})
    return { error: err.message }
  }
})

ipcMain.handle('db:addGroupMember', async (_, { groupId, sidHex, whereDefined, isMember }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const sidBuf = Buffer.from(sidHex.replace(/^0x/i, ''), 'hex')
    await currentPool.request()
      .input('groupId',      sql.Int,     groupId)
      .input('whereDefined', sql.Int,     whereDefined)
      .input('isMember',     sql.Bit,     isMember ? 1 : 0)
      .input('sid',          sql.VarBinary, sidBuf)
      .query(`IF NOT EXISTS (
                SELECT 1 FROM netsqlazman_ApplicationGroupMembersTable
                WHERE ApplicationGroupId = @groupId AND objectSid = @sid AND WhereDefined = @whereDefined
              )
              INSERT INTO netsqlazman_ApplicationGroupMembersTable
                (ApplicationGroupId, WhereDefined, IsMember, objectSid)
              VALUES (@groupId, @whereDefined, @isMember, @sid)`)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:removeGroupMember', async (_, memberId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('memberId', sql.Int, memberId)
      .query('DELETE FROM netsqlazman_ApplicationGroupMembersTable WHERE ApplicationGroupMemberId = @memberId')
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:toggleGroupMember', async (_, { memberId, isMember }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('memberId', sql.Int, memberId)
      .input('isMember', sql.Bit, isMember ? 1 : 0)
      .query(`UPDATE netsqlazman_ApplicationGroupMembersTable
              SET IsMember = @isMember WHERE ApplicationGroupMemberId = @memberId`)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

// ── Write — Items ─────────────────────────────────────────────────────────────

ipcMain.handle('db:createItem', async (_, { applicationId, name, description, itemType }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('appId',    sql.Int,      applicationId)
      .input('name',     sql.NVarChar, name)
      .input('desc',     sql.NVarChar, description || '')
      .input('itemType', sql.Int,      itemType)
      .query(`
        INSERT INTO netsqlazman_ItemsTable (ApplicationId, Name, Description, ItemType)
        OUTPUT INSERTED.ItemId, INSERTED.ApplicationId, INSERTED.Name, INSERTED.Description, INSERTED.ItemType
        VALUES (@appId, @name, @desc, @itemType)
      `)
    return { data: r.recordset[0] }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:updateItem', async (_, { itemId, name, description }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('itemId', sql.Int,      itemId)
      .input('name',   sql.NVarChar, name)
      .input('desc',   sql.NVarChar, description || '')
      .query(`UPDATE netsqlazman_ItemsTable SET Name = @name, Description = @desc WHERE ItemId = @itemId`)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:deleteItem', async (_, itemId) => {
  if (!currentPool) return { error: 'Not connected' }
  const t = new sql.Transaction(currentPool)
  try {
    await t.begin()

    // Remove from hierarchy as both child and parent
    await new sql.Request(t)
      .input('itemId', sql.Int, itemId)
      .query('DELETE FROM netsqlazman_ItemsHierarchyTable WHERE ItemId = @itemId OR MemberOfItemId = @itemId')

    // Remove authorizations for this item
    await new sql.Request(t)
      .input('itemId', sql.Int, itemId)
      .query('DELETE FROM netsqlazman_AuthorizationsTable WHERE ItemId = @itemId')

    await new sql.Request(t)
      .input('itemId', sql.Int, itemId)
      .query('DELETE FROM netsqlazman_ItemsTable WHERE ItemId = @itemId')

    await t.commit()
    return { success: true }
  } catch (err) {
    await t.rollback().catch(() => {})
    return { error: err.message }
  }
})

ipcMain.handle('db:addItemChild', async (_, { parentItemId, childItemId }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('childItemId',  sql.Int, childItemId)
      .input('parentItemId', sql.Int, parentItemId)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM netsqlazman_ItemsHierarchyTable
          WHERE ItemId = @childItemId AND MemberOfItemId = @parentItemId
        )
          INSERT INTO netsqlazman_ItemsHierarchyTable (ItemId, MemberOfItemId)
          VALUES (@childItemId, @parentItemId)
      `)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:removeItemChild', async (_, { parentItemId, childItemId }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('childItemId',  sql.Int, childItemId)
      .input('parentItemId', sql.Int, parentItemId)
      .query(`DELETE FROM netsqlazman_ItemsHierarchyTable
              WHERE ItemId = @childItemId AND MemberOfItemId = @parentItemId`)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

// ── Write — Authorizations ────────────────────────────────────────────────────

ipcMain.handle('db:addAuthorization', async (_, { itemId, sidHex, ownerSidHex, authType, sidWhereDefined = 1 }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const sidBuf   = Buffer.from(sidHex.replace(/^0x/i, ''),      'hex')
    const ownerBuf = Buffer.from(ownerSidHex.replace(/^0x/i, ''), 'hex')
    await currentPool.request()
      .input('itemId',       sql.Int,      itemId)
      .input('authType',     sql.Int,      authType)
      .input('sidWhere',     sql.Int,      sidWhereDefined)
      .input('sid',          sql.VarBinary, sidBuf)
      .input('ownerSid',     sql.VarBinary, ownerBuf)
      .query(`
        INSERT INTO netsqlazman_AuthorizationsTable
          (ItemId, ownerSid, ownerSidWhereDefined, objectSid, objectSidWhereDefined, AuthorizationType, ValidFrom, ValidTo)
        VALUES (@itemId, @ownerSid, 2, @sid, @sidWhere, @authType, NULL, NULL)
      `)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:updateAuthorization', async (_, { authId, authType }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('authId',   sql.Int, authId)
      .input('authType', sql.Int, authType)
      .query(`UPDATE netsqlazman_AuthorizationsTable SET AuthorizationType = @authType WHERE AuthorizationId = @authId`)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:deleteAuthorization', async (_, authorizationId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('authId', sql.Int, authorizationId)
      .query('DELETE FROM netsqlazman_AuthorizationsTable WHERE AuthorizationId = @authId')
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

// ── User Lookup ───────────────────────────────────────────────────────────────

ipcMain.handle('db:searchUsers', async (_, query) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('q', sql.NVarChar, `%${query}%`)
      .query(`
        SELECT TOP 20 UserName, Ime, Priimek
        FROM dbo.Zaposleni
        WHERE Ime + ' ' + Priimek LIKE @q
           OR Priimek + ' ' + Ime LIKE @q
           OR UserName LIKE @q
        ORDER BY Priimek, Ime
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getAzmanGroups', async () => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request().execute('GetAzmanGroups')
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getAzmanGroupsForUser', async (_, username) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('username', sql.NVarChar, username)
      .execute('GetAzmanGroupsForUser')
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getAzmanGroupsForUserDetail', async (_, username) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('username', sql.NVarChar, username)
      .execute('GetAzmanGroupsForUserDetail')
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getAzmanOperationsForUser', async (_, username) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('username', sql.NVarChar, username)
      .execute('GetAzmanOperationsForUser')
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getAzmanRolesForUser', async (_, username) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('username', sql.NVarChar, username)
      .execute('GetAzmanRolesForUser')
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})
