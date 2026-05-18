const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('db', {
  connect:             (config) => ipcRenderer.invoke('db:connect', config),
  disconnect:          ()       => ipcRenderer.invoke('db:disconnect'),
  getStores:           ()       => ipcRenderer.invoke('db:getStores'),
  getApplications:     (storeId)       => ipcRenderer.invoke('db:getApplications', storeId),
  getItems:            (applicationId) => ipcRenderer.invoke('db:getItems', applicationId),
  getAuthorizations:   (itemId)        => ipcRenderer.invoke('db:getAuthorizations', itemId),
  getItemMembers:      (itemId)        => ipcRenderer.invoke('db:getItemMembers', itemId),
  addAuthorization:    (data)          => ipcRenderer.invoke('db:addAuthorization', data),
  deleteAuthorization: (authId)        => ipcRenderer.invoke('db:deleteAuthorization', authId),
  getUsers:            ()       => ipcRenderer.invoke('db:getUsers'),
  getGroups:           ()       => ipcRenderer.invoke('db:getGroups'),
})
