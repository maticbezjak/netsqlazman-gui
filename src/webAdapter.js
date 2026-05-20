// Fetch-based adapter that mirrors the contextBridge API exposed by preload.js.
// Injected into window.db / window.connections when running in a browser (non-Electron).

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(path, opts)
  return res.json()
}

const get    = (path)        => api('GET',    path)
const post   = (path, body)  => api('POST',   path, body)
const put    = (path, body)  => api('PUT',    path, body)
const patch  = (path, body)  => api('PATCH',  path, body)
const del    = (path)        => api('DELETE', path)

export function installWebAdapter() {
  // ── Connections (localStorage, same shape as Electron) ──────────────────
  window.connections = {
    load: () => {
      try { return Promise.resolve(JSON.parse(localStorage.getItem('azman_connections') || '[]')) }
      catch { return Promise.resolve([]) }
    },
    save: (conn) => {
      const list = JSON.parse(localStorage.getItem('azman_connections') || '[]')
      const idx  = list.findIndex((c) => c.id === conn.id)
      if (idx >= 0) list[idx] = conn
      else { conn.id = Date.now().toString(); list.push(conn) }
      localStorage.setItem('azman_connections', JSON.stringify(list))
      return Promise.resolve(list)
    },
    delete: (id) => {
      const list = JSON.parse(localStorage.getItem('azman_connections') || '[]').filter((c) => c.id !== id)
      localStorage.setItem('azman_connections', JSON.stringify(list))
      return Promise.resolve(list)
    },
  }

  // ── DB ───────────────────────────────────────────────────────────────────
  window.db = {
    // In web mode the server holds the connection — these are no-ops
    connect:    () => post('/api/db/connect'),
    disconnect: () => post('/api/db/disconnect'),

    // Read
    getStores:                  ()                       => get(`/api/db/stores`),
    getApplications:            (storeId)                => get(`/api/db/applications/${storeId}`),
    getItems:                   (appId)                  => get(`/api/db/applications/${appId}/items`),
    getItemsByType:             (appId, type)            => get(`/api/db/applications/${appId}/items?type=${type}`),
    getAuthorizations:          (itemId)                 => get(`/api/db/items/${itemId}/authorizations`),
    getItemMembers:             (itemId)                 => get(`/api/db/items/${itemId}/members`),
    getApplicationGroups:       (appId)                  => get(`/api/db/applications/${appId}/groups`),
    getApplicationGroupMembers: (groupId)                => get(`/api/db/groups/${groupId}/members`),
    getDatabaseUsers:           ()                       => get(`/api/db/database-users`),

    // Application group CRUD
    createApplicationGroup: (data)      => post('/api/db/groups', data),
    updateApplicationGroup: (data)      => put(`/api/db/groups/${data.groupId}`, data),
    deleteApplicationGroup: (groupId)   => del(`/api/db/groups/${groupId}`),
    addGroupMember:         (data)      => post(`/api/db/groups/${data.groupId}/members`, data),
    removeGroupMember:      (memberId)  => del(`/api/db/members/${memberId}`),
    toggleGroupMember:      (data)      => patch(`/api/db/members/${data.memberId}`, data),

    // Item CRUD
    createItem:     (data)              => post('/api/db/items', data),
    updateItem:     (data)              => put(`/api/db/items/${data.itemId}`, data),
    deleteItem:     (itemId)            => del(`/api/db/items/${itemId}`),
    addItemChild:   (data)              => post(`/api/db/items/${data.parentItemId}/children`, data),
    removeItemChild:(data)              => del(`/api/db/items/${data.parentItemId}/children/${data.childItemId}`),

    // Authorization CRUD
    addAuthorization:    (data)         => post('/api/db/authorizations', data),
    updateAuthorization: (data)         => put(`/api/db/authorizations/${data.authId}`, data),
    deleteAuthorization: (authId)       => del(`/api/db/authorizations/${authId}`),

    // User Lookup
    searchUsers:               (q)       => get(`/api/db/users/search?q=${encodeURIComponent(q)}`),
    getAzmanGroups:            ()        => get('/api/db/azman/groups'),
    getAzmanGroupsForUser:     (u)       => get(`/api/db/azman/user/${encodeURIComponent(u)}/groups`),
    getAzmanRolesForUser:      (u)       => get(`/api/db/azman/user/${encodeURIComponent(u)}/roles`),
    getAzmanOperationsForUser: (u)       => get(`/api/db/azman/user/${encodeURIComponent(u)}/operations`),
  }
}
