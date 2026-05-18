const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('connections', {
  load:   ()     => ipcRenderer.invoke('connections:load'),
  save:   (conn) => ipcRenderer.invoke('connections:save', conn),
  delete: (id)   => ipcRenderer.invoke('connections:delete', id),
})

contextBridge.exposeInMainWorld('db', {
  // ── Read ──────────────────────────────────────────────────────────────────
  connect:                    (config)                 => ipcRenderer.invoke('db:connect', config),
  disconnect:                 ()                       => ipcRenderer.invoke('db:disconnect'),
  getStores:                  ()                       => ipcRenderer.invoke('db:getStores'),
  getApplications:            (storeId)                => ipcRenderer.invoke('db:getApplications', storeId),
  getItems:                   (applicationId)          => ipcRenderer.invoke('db:getItems', applicationId),
  getItemsByType:             (applicationId, itemType) => ipcRenderer.invoke('db:getItemsByType', applicationId, itemType),
  getAuthorizations:          (itemId)                 => ipcRenderer.invoke('db:getAuthorizations', itemId),
  getItemMembers:             (itemId)                 => ipcRenderer.invoke('db:getItemMembers', itemId),
  getApplicationGroups:       (applicationId)          => ipcRenderer.invoke('db:getApplicationGroups', applicationId),
  getApplicationGroupMembers: (groupId)                => ipcRenderer.invoke('db:getApplicationGroupMembers', groupId),
  getDatabaseUsers:           ()                       => ipcRenderer.invoke('db:getDatabaseUsers'),

  // ── Application Group CRUD ─────────────────────────────────────────────────
  createApplicationGroup: (data)    => ipcRenderer.invoke('db:createApplicationGroup', data),
  updateApplicationGroup: (data)    => ipcRenderer.invoke('db:updateApplicationGroup', data),
  deleteApplicationGroup: (groupId) => ipcRenderer.invoke('db:deleteApplicationGroup', groupId),
  addGroupMember:         (data)    => ipcRenderer.invoke('db:addGroupMember', data),
  removeGroupMember:      (memberId) => ipcRenderer.invoke('db:removeGroupMember', memberId),
  toggleGroupMember:      (data)    => ipcRenderer.invoke('db:toggleGroupMember', data),

  // ── Item CRUD ──────────────────────────────────────────────────────────────
  createItem:    (data)   => ipcRenderer.invoke('db:createItem', data),
  updateItem:    (data)   => ipcRenderer.invoke('db:updateItem', data),
  deleteItem:    (itemId) => ipcRenderer.invoke('db:deleteItem', itemId),
  addItemChild:  (data)   => ipcRenderer.invoke('db:addItemChild', data),
  removeItemChild: (data) => ipcRenderer.invoke('db:removeItemChild', data),

  // ── Authorization CRUD ─────────────────────────────────────────────────────
  addAuthorization:    (data)   => ipcRenderer.invoke('db:addAuthorization', data),
  updateAuthorization: (data)   => ipcRenderer.invoke('db:updateAuthorization', data),
  deleteAuthorization: (authId) => ipcRenderer.invoke('db:deleteAuthorization', authId),
})
