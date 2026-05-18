import { useState, useEffect } from 'react'
import MultiPicker from '../MultiPicker'
import { IconUser, IconUsers, IconTask, IconOp, IconRefresh } from '../Icon'
import { SkeletonPanel } from '../Skeleton'
import { useConfirm } from '../ConfirmDialog'
import { useToast } from '../Toast'
import useSorted from '../../hooks/useSorted'
import SortTh from '../SortTh'
import SidCell from '../SidCell'

const ITEM_TYPE_LABEL = { 0: 'Role', 1: 'Task', 2: 'Operation' }
const ITEM_TYPE_ICON  = { 0: <IconUser />, 1: <IconTask />, 2: <IconOp /> }

const AUTH_TYPE_NUM = {
  NEUTRAL:             0,
  ALLOW:               1,
  DENY:                2,
  ALLOWWITHDELEGATION: 3,
}
const AUTH_NUM_NAME = { 0: 'NEUTRAL', 1: 'ALLOW', 2: 'DENY', 3: 'ALLOWWITHDELEGATION' }

const AUTH_CLASS = {
  NEUTRAL:             'neutral',
  ALLOW:               'allow',
  DENY:                'deny',
  ALLOWWITHDELEGATION: 'delegate',
}

const AUTH_OPTIONS = [
  { value: 1, label: 'Allow' },
  { value: 3, label: 'Allow with Delegation' },
  { value: 0, label: 'Neutral' },
  { value: 2, label: 'Deny' },
]

export default function ItemAuthPanel({ item, onDeleted }) {
  const [authorizations, setAuthorizations] = useState([])
  const [allGroups, setAllGroups]           = useState([])
  const [dbUsers, setDbUsers]               = useState([])
  const [loading, setLoading]               = useState(true)

  const [showAdd, setShowAdd]   = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [newType, setNewType]   = useState(1)
  const [adding, setAdding]     = useState(false)

  const confirm = useConfirm()
  const toast   = useToast()
  const { sorted, sort, toggleSort } = useSorted(authorizations, 'Name')

  useEffect(() => {
    closeAdd()
    load()
  }, [item.ItemId])

  useEffect(() => { loadPrincipals() }, [item.ApplicationId])

  async function load() {
    setLoading(true)
    const r = await window.db.getAuthorizations(item.ItemId)
    setAuthorizations(r.data || [])
    setLoading(false)
  }

  async function loadPrincipals() {
    const [groupsRes, usersRes] = await Promise.all([
      window.db.getApplicationGroups(item.ApplicationId),
      window.db.getDatabaseUsers(),
    ])
    setAllGroups(groupsRes.data || [])
    setDbUsers(usersRes.data || [])
  }

  function closeAdd() {
    setShowAdd(false)
    setSelected(new Set())
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

  async function handleAddMany() {
    if (!selected.size) return
    setAdding(true)
    const adminGroup = allGroups.find((p) => p.Name === 'MantoAdmin') || allGroups[0]
    const errors = []
    for (const value of selected) {
      const colonIdx        = value.indexOf(':')
      const sidWhereDefined = Number(value.slice(0, colonIdx))
      const sidHex          = value.slice(colonIdx + 1)
      const r = await window.db.addAuthorization({
        itemId:      item.ItemId,
        sidHex,
        ownerSidHex: adminGroup?.SidHex ?? sidHex,
        authType:    newType,
        sidWhereDefined,
      })
      if (!r.success) errors.push(sidHex + ': ' + r.error)
    }
    setAdding(false)
    if (errors.length) {
      toast.error(`${errors.length} authorization(s) could not be added`)
    } else {
      toast.success(`${selected.size} authorization(s) added`)
    }
    closeAdd()
    load()
  }

  async function handleUpdateType(authId, newAuthType) {
    const result = await window.db.updateAuthorization({ authId, authType: newAuthType })
    if (result.success) {
      setAuthorizations((a) =>
        a.map((x) => x.AuthorizationId === authId
          ? { ...x, AuthorizationType: AUTH_NUM_NAME[newAuthType] }
          : x
        )
      )
    } else {
      toast.error(result.error || 'Failed to update authorization')
    }
  }

  async function handleDelete(authId, name) {
    const ok = await confirm(
      `Remove authorization for "${name}"?`,
      { title: 'Remove Authorization', danger: true, confirmLabel: 'Remove' }
    )
    if (!ok) return
    const result = await window.db.deleteAuthorization(authId)
    if (result.success) {
      setAuthorizations((a) => a.filter((x) => x.AuthorizationId !== authId))
      toast.success('Authorization removed')
    } else {
      toast.error(result.error || 'Failed to remove authorization')
    }
  }

  const authorizedSids = new Set(authorizations.map((a) => a.SidHex).filter(Boolean))
  const pickerItems = [
    ...allGroups
      .filter((g) => !authorizedSids.has(g.SidHex))
      .map((g) => ({ value: `1:${g.SidHex}`, label: g.Name,       icon: <IconUsers />, group: 'Application Groups' })),
    ...dbUsers
      .filter((u) => !authorizedSids.has(u.SidHex))
      .map((u) => ({ value: `4:${u.SidHex}`, label: u.DBUserName, icon: <IconUser />,  group: 'Database Users' })),
  ]

  if (loading) return <SkeletonPanel />

  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <h2 className="panel-title">{ITEM_TYPE_ICON[item.ItemType]} {item.Name}</h2>
        <span className="badge badge-type">{ITEM_TYPE_LABEL[item.ItemType]}</span>
        <span className="panel-count">
          {authorizations.length} authorization{authorizations.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => (showAdd ? closeAdd() : setShowAdd(true))}>
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
        <button className="btn btn-ghost btn-sm icon-btn" onClick={load} title="Refresh"><IconRefresh /></button>
      </div>

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
              <select value={newType} onChange={(e) => setNewType(Number(e.target.value))}>
                {AUTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="toolbar-spacer" />
              {selected.size > 0 && <span className="principal-selected-count">{selected.size} selected</span>}
              <button className="btn btn-primary btn-sm" onClick={handleAddMany} disabled={adding || !selected.size}>
                {adding ? 'Adding…' : `Add${selected.size ? ` (${selected.size})` : ''}`}
              </button>
            </>
          }
        />
      )}

      {!authorizations.length ? (
        <div className="empty-table">No authorizations defined for this item.</div>
      ) : (
        <div className="tab-content">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="Name"           sort={sort} onSort={toggleSort}>Name</SortTh>
                <SortTh col="SidWhereDefined" sort={sort} onSort={toggleSort}>Where Defined</SortTh>
                <th>Authorization</th>
                <SortTh col="ValidFrom"      sort={sort} onSort={toggleSort}>Valid From</SortTh>
                <SortTh col="ValidTo"        sort={sort} onSort={toggleSort}>Valid To</SortTh>
                <th>SID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.AuthorizationId}>
                  <td className="name-cell">{a.Name || a.SidHex}</td>
                  <td>{a.SidWhereDefined}</td>
                  <td>
                    <select
                      className={`auth-type-select auth-type-select--${AUTH_CLASS[a.AuthorizationType] ?? ''}`}
                      value={AUTH_TYPE_NUM[a.AuthorizationType] ?? 0}
                      onChange={(e) => handleUpdateType(a.AuthorizationId, Number(e.target.value))}
                    >
                      {AUTH_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="muted">{a.ValidFrom ? new Date(a.ValidFrom).toLocaleDateString() : '—'}</td>
                  <td className="muted">{a.ValidTo   ? new Date(a.ValidTo).toLocaleDateString()   : '—'}</td>
                  <td><SidCell hex={a.SidHex} /></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.AuthorizationId, a.Name)}>
                      Remove
                    </button>
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
