import AppGroupsFolderPanel from './panels/AppGroupsFolderPanel'
import AppGroupPanel        from './panels/AppGroupPanel'
import ItemListPanel        from './panels/ItemListPanel'
import ItemDefPanel         from './panels/ItemDefPanel'
import ItemAuthPanel        from './panels/ItemAuthPanel'
import { IconFolderOpen } from './Icon'

export default function MainPanel({ selection, onSelect, onRefreshGroups, onRefreshItems }) {
  if (!selection) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><IconFolderOpen size={48} strokeWidth={1.4} /></div>
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
        onGroupsChanged={() => onRefreshGroups(selection.applicationId)}
      />
    )
  }

  if (type === 'app-group') {
    return (
      <AppGroupPanel
        group={selection.group}
        applicationId={selection.applicationId}
        onGroupsChanged={() => onRefreshGroups(selection.applicationId)}
        onDeleted={() => {
          onRefreshGroups(selection.applicationId)
          onSelect({ type: 'app-groups-folder', applicationId: selection.applicationId })
        }}
      />
    )
  }

  if (type === 'item-defs-folder') {
    return (
      <ItemListPanel
        applicationId={selection.applicationId}
        itemType={selection.itemType}
        mode="defs"
        onSelectItem={(item) => onSelect({ type: 'item-def', item })}
        onItemsChanged={() => onRefreshItems(selection.applicationId, selection.itemType)}
      />
    )
  }

  if (type === 'item-def') {
    return (
      <ItemDefPanel
        item={selection.item}
        onItemsChanged={() => onRefreshItems(selection.item.ApplicationId, selection.item.ItemType)}
        onDeleted={() => {
          onRefreshItems(selection.item.ApplicationId, selection.item.ItemType)
          onSelect({ type: 'item-defs-folder', applicationId: selection.item.ApplicationId, itemType: selection.item.ItemType })
        }}
      />
    )
  }

  if (type === 'item-auths-folder') {
    return (
      <ItemListPanel
        applicationId={selection.applicationId}
        itemType={selection.itemType}
        mode="auths"
        onSelectItem={(item) => onSelect({ type: 'item-auth', item })}
        onItemsChanged={() => onRefreshItems(selection.applicationId, selection.itemType)}
      />
    )
  }

  if (type === 'item-auth') {
    return (
      <ItemAuthPanel
        item={selection.item}
        onDeleted={() => {
          onRefreshItems(selection.item.ApplicationId, selection.item.ItemType)
          onSelect({ type: 'item-auths-folder', applicationId: selection.item.ApplicationId, itemType: selection.item.ItemType })
        }}
      />
    )
  }

  return null
}
