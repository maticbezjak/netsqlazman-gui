const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const sql = require('mssql')

let mainWindow
let currentPool = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NetSqlAzMan Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

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
      server: config.server,
      port: parseInt(config.port) || 1433,
      user: config.user,
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

// Returns all application groups — these are the authorizable principals (users + groups)
ipcMain.handle('db:getApplicationGroups', async (_, applicationId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('appId', sql.Int, applicationId)
      .query(`
        SELECT
          ApplicationGroupId,
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

// ── Write ─────────────────────────────────────────────────────────────────────

// sidHex:        hex string of the principal's objectSid (e.g. '0xD244B2...')
// ownerSidHex:   hex string of the admin/owner's SID (can be same as sidHex or MantoAdmin's)
// authType:      0=NEUTRAL, 1=ALLOW, 2=DENY, 3=ALLOWWITHDELEGATION
// whereDefined:  1=Application group (the only type currently in use)
ipcMain.handle('db:addAuthorization', async (_, { itemId, sidHex, ownerSidHex, authType }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('itemId',   sql.Int, itemId)
      .input('authType', sql.Int, authType)
      .query(`
        INSERT INTO netsqlazman_AuthorizationsTable
          (ItemId, ownerSid, ownerSidWhereDefined, objectSid, objectSidWhereDefined, AuthorizationType, ValidFrom, ValidTo)
        VALUES (
          @itemId,
          CONVERT(varbinary(MAX), '${ownerSidHex}', 1),
          1,
          CONVERT(varbinary(MAX), '${sidHex}', 1),
          1,
          @authType,
          NULL, NULL
        )
      `)
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
