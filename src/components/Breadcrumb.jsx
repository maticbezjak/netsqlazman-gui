const TYPE_LABEL = { 0: 'Roles', 1: 'Tasks', 2: 'Operations' }

export default function Breadcrumb({ selection }) {
  if (!selection) return null

  const parts = []
  if (selection.appName) parts.push(selection.appName)

  switch (selection.type) {
    case 'app-groups-folder':
      parts.push('Application Groups')
      break
    case 'app-group':
      parts.push('Application Groups')
      parts.push({ label: selection.group?.Name, current: true })
      break
    case 'item-defs-folder':
      parts.push('Item Definitions')
      parts.push({ label: TYPE_LABEL[selection.itemType], current: true })
      break
    case 'item-def':
      parts.push('Item Definitions')
      parts.push(TYPE_LABEL[selection.item?.ItemType])
      parts.push({ label: selection.item?.Name, current: true })
      break
    case 'item-auths-folder':
      parts.push('Authorizations')
      parts.push({ label: TYPE_LABEL[selection.itemType], current: true })
      break
    case 'item-auth':
      parts.push('Authorizations')
      parts.push(TYPE_LABEL[selection.item?.ItemType])
      parts.push({ label: selection.item?.Name, current: true })
      break
    default:
      return null
  }

  return (
    <nav className="breadcrumb">
      {parts.map((p, i) => {
        const label   = typeof p === 'object' ? p.label  : p
        const current = typeof p === 'object' ? p.current : false
        return (
          <span key={i} className={current ? 'bc-current' : 'bc-part'}>
            {i > 0 && <span className="bc-sep">›</span>}
            {label}
          </span>
        )
      })}
    </nav>
  )
}
