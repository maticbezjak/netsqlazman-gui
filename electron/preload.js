const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('connections', {
  load:   ()     => ipcRenderer.invoke('connections:load'),
  save:   (conn) => ipcRenderer.invoke('connections:save', conn),
  delete: (id)   => ipcRenderer.invoke('connections:delete', id),
})

contextBridge.exposeInMainWorld('db', {
  connect:                  (config)           => ipcRenderer.invoke('db:connect', config),
  disconnect:               ()                 => ipcRenderer.invoke('db:disconnect'),
  getStores:                ()                 => ipcRenderer.invoke('db:getStores'),
  getApplications:          (storeId)          => ipcRenderer.invoke('db:getApplications', storeId),
  getItems:                 (applicationId)    => ipcRenderer.invoke('db:getItems', applicationId),
  getItemsByType:           (applicationId, itemType) => ipcRenderer.invoke('db:getItemsByType', applicationId, itemType),
  getAuthorizations:        (itemId)           => ipcRenderer.invoke('db:getAuthorizations', itemId),
  getItemMembers:           (itemId)           => ipcRenderer.invoke('db:getItemMembers', itemId),
  getApplicationGroups:     (applicationId)    => ipcRenderer.invoke('db:getApplicationGroups', applicationId),
  getApplicationGroupMembers: (groupId)        => ipcRenderer.invoke('db:getApplicationGroupMembers', groupId),
  addAuthorization:         (data)             => ipcRenderer.invoke('db:addAuthorization', data),
  deleteAuthorization:      (authId)           => ipcRenderer.invoke('db:deleteAuthorization', authId),
})
