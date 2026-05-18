import AppGroupsFolderPanel from './panels/AppGroupsFolderPanel'
import AppGroupPanel        from './panels/AppGroupPanel'
import ItemListPanel        from './panels/ItemListPanel'
import ItemDefPanel         from './panels/ItemDefPanel'
import ItemAuthPanel        from './panels/ItemAuthPanel'

export default function MainPanel({ selection, onSelect }) {
  if (!selection) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📂</div>
        <h2>Select an item</h2>
        <p>Expand the tree on the left to browse authorization stores.</p>
      </div>
    )
  }

  const { type } = selection

  if (type === 'app-groups-folder') {
    return (
      <AppGroupsFolderPanel
        applicationId={selection.applicationId}
        onSelectGroup={(g) => onSelect({ type: 'app-group', group: g, applicationId: selection.applicationId })}
      />
    )
  }

  if (type === 'app-group') {
    return <AppGroupPanel group={selection.group} />
  }

  if (type === 'item-defs-folder') {
    return (
      <ItemListPanel
        applicationId={selection.applicationId}
        itemType={selection.itemType}
        mode="defs"
        onSelectItem={(item) => onSelect({ type: 'item-def', item })}
      />
    )
  }

  if (type === 'item-def') {
    return <ItemDefPanel item={selection.item} />
  }

  if (type === 'item-auths-folder') {
    return (
      <ItemListPanel
        applicationId={selection.applicationId}
        itemType={selection.itemType}
        mode="auths"
        onSelectItem={(item) => onSelect({ type: 'item-auth', item })}
      />
    )
  }

  if (type === 'item-auth') {
    return <ItemAuthPanel item={selection.item} />
  }

  return null
}
