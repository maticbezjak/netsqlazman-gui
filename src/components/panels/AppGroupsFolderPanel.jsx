import { useState, useEffect } from 'react'
import { IconUser, IconRefresh } from '../Icon'
import { SkeletonPanel } from '../Skeleton'
import { useConfirm } from '../ConfirmDialog'
import { useToast } from '../Toast'
import useSorted from '../../hooks/useSorted'
import SortTh from '../SortTh'
import SidCell from '../SidCell'

export default function AppGroupsFolderPanel({ applicationId, onSelectGroup, onGroupsChanged }) {
  const [groups, setGroups]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName]       = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [creating, setCreating]     = useState(false)

  const confirm = useConfirm()
  const toast   = useToast()
  const { sorted, sort, toggleSort } = useSorted(groups, 'Name')

  useEffect(() => { load() }, [applicationId])

  async function load() {
    setLoading(true)
    const r = await window.db.getApplicationGroups(applicationId)
    setGroups(r.data || [])
    setLoading(false)
  }

  function openCreate() {
    setNewName('')
    setNewDesc('')
    setShowCreate(true)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const r = await window.db.createApplicationGroup({
      applicationId,
      name:        newName.trim(),
      description: newDesc.trim(),
    })
    setCreating(false)
    if (r.data) {
      setGroups((g) => [...g, r.data].sort((a, b) => a.Name.localeCompare(b.Name)))
      setShowCreate(false)
      onGroupsChanged?.()
      toast.success(`Group "${newName.trim()}" created`)
    } else {
      toast.error(r.error || 'Failed to create group')
    }
  }

  async function handleDelete(group, e) {
    e.stopPropagation()
    const ok = await confirm(
      `Delete group "${group.Name}"? This will also remove all its members and any authorizations that reference it.`,
      { title: 'Delete Group', danger: true }
    )
    if (!ok) return
    const r = await window.db.deleteApplicationGroup(group.ApplicationGroupId)
    if (r.success) {
      setGroups((g) => g.filter((x) => x.ApplicationGroupId !== group.ApplicationGroupId))
      onGroupsChanged?.()
      toast.success(`Group "${group.Name}" deleted`)
    } else {
      toast.error(r.error || 'Failed to delete group')
    }
  }

  if (loading) return <SkeletonPanel />

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">Application Groups</h2>
        <span className="panel-count">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-primary btn-sm" onClick={showCreate ? () => setShowCreate(false) : openCreate}>
          {showCreate ? 'Cancel' : '+ New Group'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}><IconRefresh /> Refresh</button>
      </div>

      {showCreate && (
        <div className="add-form">
          <input
            className="add-input"
            placeholder="Group name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false) }}
            autoFocus
          />
          <input
            className="add-input"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false) }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty-table">No application groups defined.</div>
      ) : (
        <div className="tab-content">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="Name"      sort={sort} onSort={toggleSort}>Application Group Name</SortTh>
                <SortTh col="Description" sort={sort} onSort={toggleSort}>Description</SortTh>
                <SortTh col="GroupType" sort={sort} onSort={toggleSort}>Group Type</SortTh>
                <th>Object SID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => (
                <tr key={g.ApplicationGroupId} className="clickable-row" onClick={() => onSelectGroup(g)}>
                  <td className="name-cell"><IconUser /> {g.Name}</td>
                  <td className="muted">{g.Description || '—'}</td>
                  <td>{g.GroupType === 0 ? 'Basic' : 'LDAP'}</td>
                  <td><SidCell hex={g.SidHex} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(g, e)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
