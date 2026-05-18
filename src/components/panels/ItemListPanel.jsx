import { useState, useEffect } from 'react'
import { IconUser, IconTask, IconOp, IconRefresh } from '../Icon'
import { SkeletonPanel } from '../Skeleton'
import { useConfirm } from '../ConfirmDialog'
import { useToast } from '../Toast'
import useSorted from '../../hooks/useSorted'
import SortTh from '../SortTh'

const ITEM_TYPE_LABEL = { 0: 'Role', 1: 'Task', 2: 'Operation' }
const ITEM_TYPE_ICON  = { 0: <IconUser />, 1: <IconTask />, 2: <IconOp /> }

const FOLDER_TITLE = {
  defs:  { 0: 'Role Definitions',     1: 'Task Definitions',     2: 'Operation Definitions' },
  auths: { 0: 'Roles Authorizations', 1: 'Task Authorizations',  2: 'Operation Authorizations' },
}

export default function ItemListPanel({ applicationId, itemType, mode, onSelectItem, onItemsChanged }) {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName]       = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [creating, setCreating]     = useState(false)

  const confirm = useConfirm()
  const toast   = useToast()
  const { sorted, sort, toggleSort } = useSorted(items, 'Name')

  useEffect(() => { load() }, [applicationId, itemType])

  async function load() {
    setLoading(true)
    const r = await window.db.getItemsByType(applicationId, itemType)
    setItems(r.data || [])
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
    const r = await window.db.createItem({
      applicationId,
      name:        newName.trim(),
      description: newDesc.trim(),
      itemType,
    })
    setCreating(false)
    if (r.data) {
      setItems((i) => [...i, r.data].sort((a, b) => a.Name.localeCompare(b.Name)))
      setShowCreate(false)
      onItemsChanged?.()
      toast.success(`${label} "${newName.trim()}" created`)
    } else {
      toast.error(r.error || `Failed to create ${label.toLowerCase()}`)
    }
  }

  async function handleDelete(item, e) {
    e.stopPropagation()
    const ok = await confirm(
      `Delete "${item.Name}"? This will also remove its hierarchy entries and authorizations.`,
      { title: `Delete ${ITEM_TYPE_LABEL[item.ItemType]}`, danger: true }
    )
    if (!ok) return
    const r = await window.db.deleteItem(item.ItemId)
    if (r.success) {
      setItems((i) => i.filter((x) => x.ItemId !== item.ItemId))
      onItemsChanged?.()
      toast.success(`"${item.Name}" deleted`)
    } else {
      toast.error(r.error || 'Failed to delete item')
    }
  }

  const title     = FOLDER_TITLE[mode]?.[itemType] ?? 'Items'
  const TitleIcon = [IconUser, IconTask, IconOp][itemType]
  const label     = ITEM_TYPE_LABEL[itemType] ?? 'Item'

  if (loading) return <SkeletonPanel />

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">{TitleIcon && <TitleIcon size={16} />} {title}</h2>
        <span className="panel-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-primary btn-sm" onClick={showCreate ? () => setShowCreate(false) : openCreate}>
          {showCreate ? 'Cancel' : `+ New ${label}`}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}><IconRefresh /> Refresh</button>
      </div>

      {showCreate && (
        <div className="add-form">
          <input
            className="add-input"
            placeholder={`${label} name…`}
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

      {items.length === 0 ? (
        <div className="empty-table">No {title.toLowerCase()} found.</div>
      ) : (
        <div className="tab-content">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="Name"        sort={sort} onSort={toggleSort}>Name</SortTh>
                <SortTh col="ItemType"    sort={sort} onSort={toggleSort}>Type</SortTh>
                <SortTh col="Description" sort={sort} onSort={toggleSort}>Description</SortTh>
                <SortTh col="ItemId"      sort={sort} onSort={toggleSort}>Item ID</SortTh>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.ItemId} className="clickable-row" onClick={() => onSelectItem(item)}>
                  <td className="name-cell">{ITEM_TYPE_ICON[item.ItemType]} {item.Name}</td>
                  <td><span className="badge">{ITEM_TYPE_LABEL[item.ItemType]}</span></td>
                  <td className="muted">{item.Description || '—'}</td>
                  <td className="muted item-id">{item.ItemId}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(item, e)}>Delete</button>
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
