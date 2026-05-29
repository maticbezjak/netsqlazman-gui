import { useEffect } from 'react'

export default function HelpModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="help-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="help-modal">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="help-header">
          <h1 className="help-title">NetSqlAzMan Manager — User Manual</h1>
          <button className="help-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        <div className="help-body">

          {/* ── TOC ──────────────────────────────────────────────────────── */}
          <nav className="help-toc">
            <div className="help-toc-title">Contents</div>
            <a href="#h-overview">1. Overview</a>
            <a href="#h-connect">2. Connecting to a Database</a>
            <a href="#h-browse">3. Store Browser</a>
            <a href="#h-groups">4. Application Groups</a>
            <a href="#h-defs">5. Item Definitions</a>
            <a href="#h-auths">6. Item Authorizations</a>
            <a href="#h-lookup">7. User Lookup</a>
            <a href="#h-compare">8. Compare Users</a>
            <a href="#h-ui">9. Interface Features</a>
            <a href="#h-shortcuts">10. Keyboard Shortcuts</a>
          </nav>

          <div className="help-content">

            {/* 1 ── Overview ──────────────────────────────────────────── */}
            <section id="h-overview">
              <h2>1. Overview</h2>
              <p>
                NetSqlAzMan Manager is a graphical administration tool for <strong>NetSqlAzMan</strong> — a SQL
                Server–based authorization framework. It lets you:
              </p>
              <ul>
                <li>Browse and manage <strong>application groups</strong> and their members</li>
                <li>Create and edit <strong>role, task, and operation definitions</strong></li>
                <li>Assign <strong>authorizations</strong> (Allow / Deny / Delegate) to principals</li>
                <li>Look up any employee to see their <strong>groups, roles, and allowed operations</strong></li>
                <li>Visualize access relationships as an <strong>interactive force graph</strong></li>
                <li><strong>Compare two users'</strong> permissions side-by-side</li>
              </ul>
            </section>

            {/* 2 ── Connecting ────────────────────────────────────────── */}
            <section id="h-connect">
              <h2>2. Connecting to a Database</h2>

              <h3>Connection Form</h3>
              <p>Fill in the fields at the top of the window and click <strong>Connect</strong> (or press <kbd>Enter</kbd>):</p>
              <table className="help-table">
                <thead><tr><th>Field</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><strong>Server</strong></td><td>Hostname or IP address of the SQL Server instance</td></tr>
                  <tr><td><strong>Port</strong></td><td>TCP port — default <code>1433</code></td></tr>
                  <tr><td><strong>User</strong></td><td>SQL Server login name</td></tr>
                  <tr><td><strong>Password</strong></td><td>SQL Server login password</td></tr>
                  <tr><td><strong>Database</strong></td><td>Name of the NetSqlAzMan database</td></tr>
                </tbody>
              </table>

              <h3>Browsing Available Databases</h3>
              <p>
                Click the <strong>▾</strong> chevron button on the right edge of the Database field to fetch a list of
                all databases on the server. The app connects to <code>master</code> with your credentials, retrieves
                the list, and shows a dropdown. Type to filter, then click a name to select it.
              </p>
              <p className="help-note">
                ⚠ Server, User, and Password must be filled before the ▾ button becomes active. If the credentials
                are wrong a red error message appears below the field.
              </p>

              <h3>Saving Connections</h3>
              <p>
                Click the <strong>📁</strong> icon on the left of the connection form to open the saved connections
                panel.
              </p>
              <ul>
                <li><strong>Save:</strong> click <em>💾 Save current form as…</em>, enter a name, press <kbd>Enter</kbd></li>
                <li><strong>Load &amp; connect:</strong> click any saved connection — it fills the form and connects immediately</li>
                <li><strong>Delete:</strong> click the <strong>×</strong> next to the connection name</li>
                <li><strong>Save while connected:</strong> click <em>💾 Save</em> in the status bar</li>
              </ul>
            </section>

            {/* 3 ── Store Browser ─────────────────────────────────────── */}
            <section id="h-browse">
              <h2>3. Store Browser</h2>
              <p>
                After connecting, the Store Browser is the main view. It has a <strong>sidebar tree</strong> on the
                left and a <strong>detail panel</strong> on the right.
              </p>
              <h3>Navigation Tree</h3>
              <p>The tree is organized as:</p>
              <pre className="help-pre">{`Store
└── Application
    ├── Application Groups
    │   └── Group Name
    ├── Item Definitions
    │   ├── Role Definitions  →  Role Name
    │   ├── Task Definitions  →  Task Name
    │   └── Operation Definitions  →  Operation Name
    └── Item Authorizations
        ├── Roles Authorizations
        ├── Task Authorizations
        └── Operation Authorizations`}</pre>
              <p>
                Click any node to expand it. Click a leaf node (a group name or item name) to open its detail panel.
                Use the <strong>↺</strong> button at the top of the sidebar to reload everything from the database.
              </p>
              <h3>Sidebar Filter</h3>
              <p>
                Type in the <strong>Filter…</strong> box at the top of the sidebar to narrow visible groups and items
                by name. Clear the box to show all items again.
              </p>
            </section>

            {/* 4 ── Application Groups ────────────────────────────────── */}
            <section id="h-groups">
              <h2>4. Application Groups</h2>

              <h3>Viewing Groups</h3>
              <p>
                Click <strong>Application Groups</strong> in the sidebar to see a table of all groups (name,
                description, type, object SID). Click any row to open that group's detail panel.
              </p>

              <h3>Creating a Group</h3>
              <ol>
                <li>Click <strong>+ New Group</strong> in the toolbar.</li>
                <li>Enter a name (required) and an optional description.</li>
                <li>Press <kbd>Enter</kbd> or click <strong>Create</strong>.</li>
              </ol>

              <h3>Editing a Group</h3>
              <ol>
                <li>Open the group panel and click <strong>Edit</strong>.</li>
                <li>Edit the name inline; edit the description in the textarea below.</li>
                <li>Click <strong>Save</strong> or press <kbd>Enter</kbd>. Press <kbd>Escape</kbd> to cancel.</li>
              </ol>

              <h3>Deleting a Group</h3>
              <p>
                Click <strong>Delete Group</strong> in the panel toolbar. A confirmation dialog appears. Deleting a
                group also removes all its members and any authorizations that reference it.
              </p>

              <h3>Managing Members</h3>
              <p>
                The group detail panel shows a <strong>picker on the left</strong> and the <strong>members table on
                the right</strong>.
              </p>
              <ul>
                <li><strong>Adding:</strong> search in the left picker, check principals, choose Member / Non-Member, click <strong>Add (n)</strong></li>
                <li><strong>Toggling:</strong> click the green <em>Member</em> or grey <em>Non Member</em> badge to switch status without removing</li>
                <li><strong>Removing:</strong> click <strong>Remove</strong> in the row and confirm</li>
              </ul>
            </section>

            {/* 5 ── Item Definitions ──────────────────────────────────── */}
            <section id="h-defs">
              <h2>5. Item Definitions</h2>
              <p>
                Item definitions describe the authorization model. <strong>Roles</strong> contain Tasks, <strong>Tasks</strong> contain Operations.
              </p>

              <h3>Creating an Item</h3>
              <ol>
                <li>Click a type folder in the sidebar (e.g. <em>Role Definitions</em>).</li>
                <li>Click <strong>+ New Role / Task / Operation</strong>.</li>
                <li>Enter a name and optional description, then click <strong>Create</strong>.</li>
              </ol>

              <h3>Editing &amp; Deleting</h3>
              <p>
                Open an item and click <strong>Edit</strong> to rename it. Click <strong>Delete</strong> to remove it
                — this also removes hierarchy entries and authorizations.
              </p>

              <h3>Linking Child Items</h3>
              <p>
                The definition panel has tabs showing linked children (e.g. the Tasks inside a Role). The layout is
                picker on the left, linked children on the right.
              </p>
              <ul>
                <li><strong>Adding:</strong> check items in the left picker and click <strong>Add (n)</strong></li>
                <li><strong>Removing:</strong> click <strong>Remove</strong> in the children table (unlinks only, does not delete)</li>
              </ul>
            </section>

            {/* 6 ── Item Authorizations ───────────────────────────────── */}
            <section id="h-auths">
              <h2>6. Item Authorizations</h2>
              <p>Authorizations control which principals can perform a role, task, or operation.</p>

              <h3>Authorization Types</h3>
              <table className="help-table">
                <thead><tr><th>Type</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td><strong>Allow</strong></td><td>Principal is permitted</td></tr>
                  <tr><td><strong>Allow with Delegation</strong></td><td>Principal is permitted and may grant this right to others</td></tr>
                  <tr><td><strong>Neutral</strong></td><td>No explicit grant or deny</td></tr>
                  <tr><td><strong>Deny</strong></td><td>Principal is explicitly denied</td></tr>
                </tbody>
              </table>

              <h3>Adding Authorizations</h3>
              <ol>
                <li>Click an item under <em>Item Authorizations</em> in the sidebar.</li>
                <li>Search and check principals in the left picker.</li>
                <li>Choose the authorization type from the dropdown.</li>
                <li>Click <strong>Add (n)</strong>.</li>
              </ol>

              <h3>Changing Authorization Type</h3>
              <p>
                Use the <strong>dropdown</strong> in the Authorization column of any row. The change is saved
                immediately.
              </p>

              <h3>Removing an Authorization</h3>
              <p>Click <strong>Remove</strong> in the row and confirm.</p>
            </section>

            {/* 7 ── User Lookup ───────────────────────────────────────── */}
            <section id="h-lookup">
              <h2>7. User Lookup</h2>
              <p>
                Click <strong>User Lookup</strong> in the tab bar to answer the question: <em>"What does this user
                have access to?"</em>
              </p>

              <h3>Searching</h3>
              <ol>
                <li>Type a <strong>first name, surname, or username</strong> — suggestions appear after a short delay.</li>
                <li>Use <kbd>↑</kbd> / <kbd>↓</kbd> to navigate suggestions, then <kbd>Enter</kbd> to select. Or click a suggestion directly.</li>
              </ol>

              <h3>Table View</h3>
              <table className="help-table">
                <thead><tr><th>Section</th><th>Contents</th></tr></thead>
                <tbody>
                  <tr><td><strong>Application Groups</strong></td><td>All AzMan groups the user belongs to</td></tr>
                  <tr><td><strong>Roles</strong></td><td>All roles the user has through their groups</td></tr>
                  <tr><td><strong>Allowed Operations</strong></td><td>All operations the user is permitted to perform</td></tr>
                </tbody>
              </table>
              <p>
                Each section shows a count badge and a <strong>↓ CSV</strong> button to export that section to a
                spreadsheet-ready file. Hover any row in Allowed Operations to reveal a <strong>⎘</strong> copy
                button for the operation name. The user's username also has a copy button in the identity bar.
              </p>

              <h3>Graph Visualization</h3>
              <p>Click <strong>Visualize</strong> to switch to an interactive force-directed graph.</p>
              <table className="help-table">
                <thead><tr><th>Color</th><th>Node type</th></tr></thead>
                <tbody>
                  <tr><td><span className="help-dot" style={{ background: '#6366f1' }} /> Purple (large)</td><td>The user</td></tr>
                  <tr><td><span className="help-dot" style={{ background: '#f59e0b' }} /> Amber</td><td>Application</td></tr>
                  <tr><td><span className="help-dot" style={{ background: '#10b981' }} /> Green</td><td>Application Group</td></tr>
                  <tr><td><span className="help-dot" style={{ background: '#ec4899' }} /> Pink</td><td>Role</td></tr>
                  <tr><td><span className="help-dot" style={{ background: '#3b82f6' }} /> Blue (small)</td><td>Operation</td></tr>
                </tbody>
              </table>
              <p>
                <strong>Drag</strong> any node to reposition it. <strong>Hover</strong> a node to see its name.
                Use the <strong>Show operations</strong> checkbox to hide operation nodes when there are many.
              </p>
            </section>

            {/* 8 ── Compare Users ─────────────────────────────────────── */}
            <section id="h-compare">
              <h2>8. Compare Users</h2>
              <p>
                Click <strong>Compare Users</strong> in the tab bar to place two users side-by-side and see exactly
                where their permissions differ.
              </p>

              <h3>Selecting Users</h3>
              <p>
                Each search box works like User Lookup — type to get suggestions, use <kbd>↑</kbd> / <kbd>↓</kbd>
                to navigate, <kbd>Enter</kbd> to select. Once both users are chosen the comparison loads automatically.
              </p>

              <h3>Reading the Comparison</h3>
              <p>Three sections are shown: <em>Application Groups</em>, <em>Roles</em>, and <em>Allowed Operations</em>.</p>
              <table className="help-table">
                <thead><tr><th>Row colour</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td>White</td><td>Both users share this permission</td></tr>
                  <tr><td>Indigo</td><td>Only User A has this permission</td></tr>
                  <tr><td>Amber</td><td>Only User B has this permission</td></tr>
                </tbody>
              </table>
              <p>
                Each section header shows badge counts for <em>shared</em>, <em>only A</em>, and <em>only B</em> entries.
                Click <strong>↓ CSV</strong> to export any section. Hover a row to copy its name with <strong>⎘</strong>.
              </p>
            </section>

            {/* 9 ── Interface Features ────────────────────────────────── */}
            <section id="h-ui">
              <h2>9. Interface Features</h2>
              <ul>
                <li><strong>Light / Dark theme:</strong> click the ☀️ / 🌙 button in the top-right corner. Preference is remembered.</li>
                <li><strong>Sortable tables:</strong> click any column header to sort ascending; click again for descending.</li>
                <li><strong>Resizable sidebar:</strong> drag the divider between the sidebar and the main panel.</li>
                <li><strong>Sidebar state persisted:</strong> the expanded/collapsed state of the tree is saved across sessions.</li>
                <li><strong>CSV export:</strong> every result section in User Lookup and Compare Users has a <strong>↓ CSV</strong> button. Files are UTF-8 with BOM so Excel opens diacritics correctly.</li>
                <li><strong>Clipboard copy:</strong> hover any row in Allowed Operations or Compare tables to reveal a <strong>⎘</strong> copy button. Usernames also have a copy button in the identity bar.</li>
                <li><strong>Filter results:</strong> after a User Lookup, type in the <em>Filter results…</em> box to search across all three result sections at once. Badge counts update to show filtered/total.</li>
                <li><strong>Global search <kbd>Ctrl+K</kbd>:</strong> command-palette search across all stores, groups and items — click a result to navigate directly.</li>
                <li><strong>Clone group:</strong> the <em>Clone</em> button in a group panel creates a copy with a new name and all the same members.</li>
                <li><strong>Add user to groups:</strong> the <em>⊕ Add to groups</em> button in User Lookup lets you add the found user to one or more groups at once.</li>
                <li><strong>Auto-update (desktop):</strong> the app checks for updates on startup. A banner appears when a download is in progress or ready — click <em>Restart now</em> to apply immediately.</li>
                <li><strong>Connection export/import:</strong> connections are exported as AES-256 encrypted JSON files — a passphrase is required to import them on another machine.</li>
              </ul>
            </section>

            {/* 10 ── Keyboard Shortcuts ───────────────────────────────── */}
            <section id="h-shortcuts">
              <h2>10. Keyboard Shortcuts</h2>
              <table className="help-table">
                <thead><tr><th>Key</th><th>Action</th></tr></thead>
                <tbody>
                  <tr><td><kbd>Ctrl+K</kbd></td><td>Open global search</td></tr>
                  <tr><td><kbd>F5</kbd> / <kbd>Ctrl+R</kbd></td><td>Reload the authorization tree</td></tr>
                  <tr><td><kbd>Enter</kbd></td><td>Submit connection form / confirm inline edit / select search result</td></tr>
                  <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navigate autocomplete suggestions in search dropdowns</td></tr>
                  <tr><td><kbd>Escape</kbd></td><td>Cancel edit, close dropdowns, close this help window</td></tr>
                </tbody>
              </table>
            </section>

          </div>{/* help-content */}
        </div>{/* help-body */}
      </div>{/* help-modal */}
    </div>
  )
}
