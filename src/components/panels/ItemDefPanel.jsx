import { useState, useEffect } from 'react'
import MultiPicker from '../MultiPicker'
import { IconUser, IconTask, IconOp, IconRefresh } from '../Icon'
import { SkeletonInline } from '../Skeleton'
import { useConfirm } from '../ConfirmDialog'
import { useToast } from '../Toast'
import useSorted from '../../hooks/useSorted'
import SortTh from '../SortTh'

const ITEM_TYPE_LABEL = { 0: 'Role', 1: 'Task', 2: 'Operation' }
const ITEM_TYPE_ICON  = { 0: <IconUser />, 1: <IconTask />, 2: <IconOp /> }
const ITEM_TYPE_COMP  = { 0: IconUser, 1: IconTask, 2: IconOp }

const CHILD_TABS = {
  0: [{ label: 'Roles', type: 0 }, { label: 'Tasks', type: 1 }, { label: 'Operations', type: 2 }],
  1: [                              { label: 'Tasks', type: 1 }, { label: 'Operations', type: 2 }],
  2: [],
}

export default function ItemDefPanel({ item: initialItem, onItemsChanged, onDeleted }) {
  const [item, setItem]               = useState(initialItem)
  const [tab, setTab]                 = useState('def')
  const [allChildren, setAllChildren] = useState([])
  const [childLoading, setChildLoading] = useState(false)
  const [availableByType, setAvailableByType] = useState({})

  const [editing, setEditing]   = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving]     = useState(false)

  const [addSelected, setAddSelected] = useState(new Set())
  const [addingChild, setAddingChild] = useState(false)

  const confirm = useConfirm()
  const toast   = useToast()

  const tabs = CHILD_TABS[item.ItemType] ?? []

  const currentTabDef   = tabs.find((t) => t.label === tab)
  const visibleChildren = tab === 'def' ? [] : allChildren.filter((c) => c.ItemType === currentTabDef?.type)
  const { sorted: sortedChildren, sort: childSort, toggleSort: toggleChildSort } = useSorted(visibleChildren, 'Name')

  useEffect(() => {
    setItem(initialItem)
    setEditing(false)
    setAddSelected(new Set())
    setAvailableByType({})
    setTab(tabs.length ? tabs[tabs.length - 1].label : 'def')
    loadChildren()
  }, [initialItem.ItemId])

  useEffect(() => {
    setAddSelected(new Set())
    if (currentTabDef) loadAvailable(currentTabDef.type)
  }, [tab])

  async function loadChildren() {
    if (!CHILD_TABS[initialItem.ItemType]?.length) return
    setChildLoading(true)
    const r = await window.db.getItemMembers(initialItem.ItemId)
    setAllChildren(r.data || [])
    setChildLoading(false)
  }

  async function loadAvailable(type) {
    if (availableByType[type] !== undefined) return
    const r = await window.db.getItemsByType(item.ApplicationId, type)
    setAvailableByType((a) => ({ ...a, [type]: r.data || [] }))
  }

  async function handleSave() {
    if (!editName.trim()) return
    setSaving(true)
    const r = await window.db.updateItem({ itemId: item.ItemId, name: editName.trim(), description: editDesc.trim() })
    setSaving(false)
    if (r.success) {
      setItem((i) => ({ ...i, Name: editName.trim(), Description: editDesc.trim() }))
      setEditing(false)
      onItemsChanged?.()
      toast.success('Item updated')
    } else {
      toast.error(r.error || 'Failed to update item')
    }
  }

  async function handleDelete() {
    const ok = await confirm(
      `Delete "${item.Name}"? This will also remove its hierarchy entries and authorizations.`,
      { title: `Delete ${ITEM_TYPE_LABEL[item.ItemType]}`, danger: true }
    )
    if (!ok) return
    const r = await window.db.deleteItem(item.ItemId)
    if (r.success) {
      onDeleted?.()
      toast.success(`"${item.Name}" deleted`)
    } else {
      toast.error(r.error || 'Failed to delete item')
    }
  }

  function toggle(value) {
    setAddSelected((s) => { const n = new Set(s); n.has(value) ? n.delete(value) : n.add(value); return n })
  }

  function toggleAll(visibleValues) {
    setAddSelected((s) => {
      const allChecked = visibleValues.every((v) => s.has(v))
      const n = new Set(s)
      allChecked ? visibleValues.forEach((v) => n.delete(v)) : visibleValues.forEach((v) => n.add(v))
      return n
    })
  }

  async function handleAddChildren() {
    if (!addSelected.size) return
    const tabDef = currentTabDef
    setAddingChild(true)
    const errors = []
    const added  = []
    for (const idStr of addSelected) {
      const r = await window.db.addItemChild({ parentItemId: item.ItemId, childItemId: Number(idStr) })
      if (!r.success) {
        errors.push(r.error)
      } else {
        const child = availableByType[tabDef.type]?.find((x) => x.ItemId === Number(idStr))
        if (child) added.push(child)
      }
    }
    if (added.length) setAllChildren((c) => [...c, ...added])
    setAddingChild(false)
    if (errors.length) {
      toast.error(`${errors.length} item(s) could not be added`)
    } else {
      toast.success(`${added.length} item(s) added`)
    }
    setAddSelected(new Set())
    setAvailableByType((a) => { const n = { ...a }; delete n[tabDef.type]; return n })
  }

  async function handleRemoveChild(child) {
    const ok = await confirm(
      `Remove "${child.Name}" from this ${ITEM_TYPE_LABEL[item.ItemType]}?`,
      { title: 'Remove Item', danger: true, confirmLabel: 'Remove' }
    )
    if (!ok) return
    const r = await window.db.removeItemChild({ parentItemId: item.ItemId, childItemId: child.ItemId })
    if (r.success) {
      setAllChildren((c) => c.filter((x) => x.ItemId !== child.ItemId))
      // Invalidate available cache so removed item reappears in picker
      setAvailableByType((a) => { const n = { ...a }; delete n[child.ItemType]; return n })
      toast.success(`"${child.Name}" removed`)
    } else {
      toast.error(r.error || 'Failed to remove item')
    }
  }

  const childItemIds = new Set(allChildren.map((c) => c.ItemId))
  const pickerItems  = currentTabDef
    ? (availableByType[currentTabDef.type] ?? [])
        .filter((x) => !childItemIds.has(x.ItemId) && x.ItemId !== item.ItemId)
        .map((x) => { const Ic = ITEM_TYPE_COMP[x.ItemType]; return { value: String(x.ItemId), label: x.Name, icon: Ic ? <Ic /> : null } })
    : []

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        {editing ? (
          <>
            <input
              className="edit-name-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !editName.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <h2 className="panel-title">{ITEM_TYPE_ICON[item.ItemType]} {item.Name}</h2>
            <span className="badge badge-type">{ITEM_TYPE_LABEL[item.ItemType]}</span>
            <span className="panel-count">Item ID: {item.ItemId}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditName(item.Name); setEditDesc(item.Description || ''); setEditing(true) }}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'def' ? 'active' : ''}`} onClick={() => setTab('def')}>
          {ITEM_TYPE_LABEL[item.ItemType]} definition
        </button>
        {tabs.map((t) => (
          <button
            key={t.label}
            className={`tab ${tab === t.label ? 'active' : ''}`}
            onClick={() => setTab(t.label)}
          >
            {t.label}
            <span className="tab-count">{allChildren.filter((c) => c.ItemType === t.type).length}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'def' ? (
          <div className="def-form">
            <div className="def-field">
              <label>Name</label>
              {editing ? (
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
              ) : (
                <input readOnly value={item.Name} />
              )}
            </div>
            <div className="def-field">
              <label>Description</label>
              {editing ? (
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={5} />
              ) : (
                <textarea readOnly value={item.Description || ''} rows={5} />
              )}
            </div>
          </div>
        ) : childLoading ? (
          <SkeletonInline />
        ) : (
          <div className="group-split">
            {/* ── Left: item picker ──────────────────────────────── */}
            <div className="group-split-picker">
              <MultiPicker
                items={pickerItems}
                selected={addSelected}
                onToggle={toggle}
                onToggleAll={toggleAll}
                placeholder={`Search ${tab.toLowerCase()}…`}
                footer={
                  <>
                    <div className="toolbar-spacer" />
                    {addSelected.size > 0 && (
                      <span className="principal-selected-count">{addSelected.size} selected</span>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleAddChildren}
                      disabled={addingChild || !addSelected.size}
                    >
                      {addingChild ? 'Adding…' : `Add${addSelected.size ? ` (${addSelected.size})` : ''}`}
                    </button>
                  </>
                }
              />
            </div>

            {/* ── Right: children table ───────────────────────────── */}
            <div className="group-split-table">
              {visibleChildren.length === 0 ? (
                <div className="empty-table">No {tab.toLowerCase()} defined for this item.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <SortTh col="Name"        sort={childSort} onSort={toggleChildSort}>Name</SortTh>
                      <SortTh col="ItemType"    sort={childSort} onSort={toggleChildSort}>Type</SortTh>
                      <SortTh col="Description" sort={childSort} onSort={toggleChildSort}>Description</SortTh>
                      <SortTh col="ItemId"      sort={childSort} onSort={toggleChildSort}>Item ID</SortTh>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedChildren.map((c) => (
                      <tr key={c.ItemId}>
                        <td className="name-cell">{ITEM_TYPE_ICON[c.ItemType]} {c.Name}</td>
                        <td><span className="badge">{ITEM_TYPE_LABEL[c.ItemType]}</span></td>
                        <td className="muted">{c.Description || '—'}</td>
                        <td className="muted item-id">{c.ItemId}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRemoveChild(c)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
