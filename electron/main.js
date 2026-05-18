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

ipcMain.handle('db:getAuthorizations', async (_, itemId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT
          a.AuthorizationId,
          a.ItemId,
          a.SID,
          a.AuthorizationType,
          a.ValidFrom,
          a.ValidTo,
          ISNULL(u.UserName, g.GroupName) AS DisplayName,
          CASE
            WHEN u.UserName  IS NOT NULL THEN 'User'
            WHEN g.GroupName IS NOT NULL THEN 'Group'
            ELSE 'Unknown'
          END AS SIDType
        FROM netsqlazman_AuthorizationsTable a
        LEFT JOIN netsqlazman_StorageUsersTable  u ON a.SID = u.CustomSid
        LEFT JOIN netsqlazman_StorageGroupsTable g ON a.SID = g.SID
        WHERE a.ItemId = @itemId
        ORDER BY DisplayName
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getItemMembers', async (_, itemId) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT ii.MemberItemId, i.Name AS MemberName, i.ItemType AS MemberType, i.Description
        FROM netsqlazman_ItemItemsTable ii
        JOIN netsqlazman_ItemsTable i ON ii.MemberItemId = i.ItemId
        WHERE ii.ItemId = @itemId
        ORDER BY i.Name
      `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getUsers', async () => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request().query(`
      SELECT CustomSid AS SID, UserName AS DisplayName, 'User' AS SIDType
      FROM netsqlazman_StorageUsersTable ORDER BY UserName
    `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('db:getGroups', async () => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    const r = await currentPool.request().query(`
      SELECT SID, GroupName AS DisplayName, 'Group' AS SIDType
      FROM netsqlazman_StorageGroupsTable ORDER BY GroupName
    `)
    return { data: r.recordset }
  } catch (err) {
    return { error: err.message }
  }
})

// ── Write ─────────────────────────────────────────────────────────────────────

ipcMain.handle('db:addAuthorization', async (_, { itemId, sid, authType }) => {
  if (!currentPool) return { error: 'Not connected' }
  try {
    await currentPool.request()
      .input('itemId',   sql.Int,         itemId)
      .input('sid',      sql.NVarChar(200), sid)
      .input('authType', sql.Int,          authType)
      .query(`INSERT INTO netsqlazman_AuthorizationsTable
                (ItemId, SID, AuthorizationType, ValidFrom, ValidTo)
              VALUES (@itemId, @sid, @authType, NULL, NULL)`)
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
