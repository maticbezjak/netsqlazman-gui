import { useState, useEffect } from 'react'
import MultiPicker from '../MultiPicker'
import { IconUser, IconUsers, IconRefresh } from '../Icon'
import { SkeletonPanel } from '../Skeleton'
import { useConfirm } from '../ConfirmDialog'
import { useToast } from '../Toast'
import useSorted from '../../hooks/useSorted'
import SortTh from '../SortTh'
import SidCell from '../SidCell'

export default function AppGroupPanel({ group: initialGroup, applicationId, onGroupsChanged, onDeleted }) {
  const [group, setGroup]         = useState(initialGroup)
  const [members, setMembers]     = useState([])
  const [allGroups, setAllGroups] = useState([])
  const [dbUsers, setDbUsers]     = useState([])
  const [loading, setLoading]     = useState(true)

  const [editing, setEditing]   = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving]     = useState(false)

  const [showAdd, setShowAdd]         = useState(false)
  const [selected, setSelected]       = useState(new Set())
  const [addIsMember, setAddIsMember] = useState(true)
  const [adding, setAdding]           = useState(false)

  const confirm = useConfirm()
  const toast   = useToast()
  const { sorted: sortedMembers, sort, toggleSort } = useSorted(members, 'MemberName')

  useEffect(() => {
    setGroup(initialGroup)
    setEditing(false)
    closeAdd()
    load()
  }, [initialGroup.ApplicationGroupId])

  useEffect(() => { loadPrincipals() }, [applicationId])

  async function load() {
    setLoading(true)
    const r = await window.db.getApplicationGroupMembers(initialGroup.ApplicationGroupId)
    setMembers(r.data || [])
    setLoading(false)
  }

  async function loadPrincipals() {
    const [groupsRes, usersRes] = await Promise.all([
      window.db.getApplicationGroups(applicationId),
      window.db.getDatabaseUsers(),
    ])
    setAllGroups(groupsRes.data || [])
    setDbUsers(usersRes.data || [])
  }

  function closeAdd() {
    setShowAdd(false)
    setSelected(new Set())
  }

  function startEdit() {
    setEditName(group.Name)
    setEditDesc(group.Description || '')
    setEditing(true)
  }

  async function handleSave() {
    if (!editName.trim()) return
    setSaving(true)
    const r = await window.db.updateApplicationGroup({
      groupId:     group.ApplicationGroupId,
      name:        editName.trim(),
      description: editDesc.trim(),
    })
    setSaving(false)
    if (r.success) {
      setGroup((g) => ({ ...g, Name: editName.trim(), Description: editDesc.trim() }))
      setEditing(false)
      onGroupsChanged?.()
      toast.success('Group updated')
    } else {
      toast.error(r.error || 'Failed to update group')
    }
  }

  async function handleDelete() {
    const ok = await confirm(
      `Delete group "${group.Name}"? This will also remove all its members and any authorizations that reference it.`,
      { title: 'Delete Group', danger: true }
    )
    if (!ok) return
    const r = await window.db.deleteApplicationGroup(group.ApplicationGroupId)
    if (r.success) {
      onDeleted?.()
      toast.success(`Group "${group.Name}" deleted`)
    } else {
      toast.error(r.error || 'Failed to delete group')
    }
  }

  function toggle(value) {
    setSelected((s) => { const n = new Set(s); n.has(value) ? n.delete(value) : n.add(value); return n })
  }

  function toggleAll(visibleValues) {
    setSelected((s) => {
      const allChecked = visibleValues.every((v) => s.has(v))
      const n = new Set(s)
      allChecked ? visibleValues.forEach((v) => n.delete(v)) : visibleValues.forEach((v) => n.add(v))
      return n
    })
  }

  async function handleAddMembers() {
    if (!selected.size) return
    setAdding(true)
    const errors = []
    for (const value of selected) {
      const colonIdx     = value.indexOf(':')
      const whereDefined = Number(value.slice(0, colonIdx))
      const sidHex       = value.slice(colonIdx + 1)
      const r = await window.db.addGroupMember({
        groupId: group.ApplicationGroupId, sidHex, whereDefined, isMember: addIsMember,
      })
      if (!r.success) errors.push(sidHex + ': ' + r.error)
    }
    setAdding(false)
    if (errors.length) {
      toast.error(`${errors.length} member(s) could not be added`)
    } else {
      toast.success(`${selected.size} member(s) added`)
    }
    closeAdd()
    load()
  }

  async function handleRemoveMember(m) {
    const ok = await confirm(
      `Remove "${m.MemberName || m.SidHex}" from this group?`,
      { title: 'Remove Member', danger: true, confirmLabel: 'Remove' }
    )
    if (!ok) return
    const r = await window.db.removeGroupMember(m.ApplicationGroupMemberId)
    if (r.success) {
      setMembers((ms) => ms.filter((x) => x.ApplicationGroupMemberId !== m.ApplicationGroupMemberId))
      toast.success('Member removed')
    } else {
      toast.error(r.error || 'Failed to remove member')
    }
  }

  async function handleToggle(m) {
    const r = await window.db.toggleGroupMember({ memberId: m.ApplicationGroupMemberId, isMember: !m.IsMember })
    if (r.success) {
      setMembers((ms) => ms.map((x) =>
        x.ApplicationGroupMemberId === m.ApplicationGroupMemberId ? { ...x, IsMember: !x.IsMember } : x
      ))
    } else {
      toast.error(r.error || 'Failed to toggle membership')
    }
  }

  const existingSids = new Set(members.map((m) => m.SidHex).filter(Boolean))
  const pickerItems = [
    ...allGroups
      .filter((g) => !existingSids.has(g.SidHex) && g.ApplicationGroupId !== group.ApplicationGroupId)
      .map((g) => ({ value: `1:${g.SidHex}`, label: g.Name,       icon: <IconUsers />, group: 'Application Groups' })),
    ...dbUsers
      .filter((u) => !existingSids.has(u.SidHex))
      .map((u) => ({ value: `4:${u.SidHex}`, label: u.DBUserName, icon: <IconUser />,  group: 'Database Users' })),
  ]

  if (loading) return <SkeletonPanel />

  const memberCount    = members.filter((m) => m.IsMember).length
  const nonMemberCount = members.filter((m) => !m.IsMember).length

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
            <h2 className="panel-title"><IconUser size={16} /> {group.Name}</h2>
            <span className="panel-count">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
              {nonMemberCount > 0 ? `, ${nonMemberCount} non-member${nonMemberCount !== 1 ? 's' : ''}` : ''}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete Group</button>
          </>
        )}
        <div className="toolbar-spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => (showAdd ? closeAdd() : setShowAdd(true))}>
          {showAdd ? 'Cancel' : '+ Add Member'}
        </button>
        <button className="btn btn-ghost btn-sm icon-btn" onClick={load} title="Refresh"><IconRefresh /></button>
      </div>

      {editing && (
        <div className="edit-desc-row">
          <textarea
            className="edit-desc-textarea"
            placeholder="Description…"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
          />
        </div>
      )}
      {!editing && group.Description && <p className="panel-desc">{group.Description}</p>}

      {showAdd && (
        <MultiPicker
          items={pickerItems}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          placeholder="Search principals…"
          autoFocus
          footer={
            <>
              <select value={addIsMember ? '1' : '0'} onChange={(e) => setAddIsMember(e.target.value === '1')}>
                <option value="1">Member</option>
                <option value="0">Non-Member</option>
              </select>
              <div className="toolbar-spacer" />
              {selected.size > 0 && <span className="principal-selected-count">{selected.size} selected</span>}
              <button className="btn btn-primary btn-sm" onClick={handleAddMembers} disabled={adding || !selected.size}>
                {adding ? 'Adding…' : `Add${selected.size ? ` (${selected.size})` : ''}`}
              </button>
            </>
          }
        />
      )}

      {!members.length ? (
        <div className="empty-table">No members defined for this group.</div>
      ) : (
        <div className="tab-content">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="MemberName"      sort={sort} onSort={toggleSort}>Name</SortTh>
                <SortTh col="WhereDefinedLabel" sort={sort} onSort={toggleSort}>Where Defined</SortTh>
                <th>Member / Non Member</th>
                <th>SID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((m) => (
                <tr key={m.ApplicationGroupMemberId}>
                  <td className="name-cell">
                    {m.WhereDefined === 1 ? <IconUsers /> : <IconUser />} {m.MemberName || m.SidHex}
                  </td>
                  <td>{m.WhereDefinedLabel}</td>
                  <td>
                    <button
                      className={`member-badge ${m.IsMember ? 'member' : 'non-member'} member-toggle`}
                      onClick={() => handleToggle(m)}
                      title="Click to toggle"
                    >
                      {m.IsMember ? 'Member' : 'Non Member'}
                    </button>
                  </td>
                  <td><SidCell hex={m.SidHex} /></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m)}>Remove</button>
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
