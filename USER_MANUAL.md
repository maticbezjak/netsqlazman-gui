# NetSqlAzMan Manager — User Manual

**Version:** 1.0.6+  
**Platforms:** Windows, macOS, Linux (desktop) · Docker (web browser)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Getting Started](#2-getting-started)
   - [Desktop App](#21-desktop-app-windows--macos--linux)
   - [Web App (Docker)](#22-web-app-docker)
3. [Connecting to a Database](#3-connecting-to-a-database)
   - [Connection Form](#31-connection-form)
   - [Browsing Available Databases](#32-browsing-available-databases)
   - [Saving Connections](#33-saving-connections)
4. [Store Browser](#4-store-browser)
   - [Navigation Tree](#41-navigation-tree)
   - [Application Groups](#42-application-groups)
   - [Item Definitions](#43-item-definitions)
   - [Item Authorizations](#44-item-authorizations)
5. [User Lookup](#5-user-lookup)
   - [Searching for a User](#51-searching-for-a-user)
   - [Table View](#52-table-view)
   - [Graph Visualization](#53-graph-visualization)
6. [Interface Features](#6-interface-features)
   - [Light / Dark Theme](#61-light--dark-theme)
   - [Sidebar Filter](#62-sidebar-filter)
   - [Sortable Tables](#63-sortable-tables)
   - [Auto-Update (Desktop)](#64-auto-update-desktop)

---

## 1. Overview

NetSqlAzMan Manager is a graphical administration tool for **NetSqlAzMan** — a SQL Server–based authorization management framework. It replaces direct SQL queries or the legacy MMC snap-in with a modern, fast interface that lets you:

- Browse and manage **application groups** and their members
- Create and edit **role, task, and operation definitions**
- Assign **authorizations** (Allow / Deny / Delegate) to principals
- Look up any employee to see their **groups, roles, and allowed operations**
- Visualize access relationships as an **interactive force graph**

---

## 2. Getting Started

### 2.1 Desktop App (Windows / macOS / Linux)

Download the installer for your platform from the [GitHub Releases](https://github.com/maticbezjak/netsqlazman-gui/releases) page:

| Platform | File |
|---|---|
| Windows | `NetSqlAzMan-Manager-Setup-x.y.z.exe` |
| macOS | `NetSqlAzMan-Manager-x.y.z.dmg` |
| Linux (Debian/Ubuntu) | `netsqlazman-manager_x.y.z_amd64.deb` |
| Linux (Fedora/RHEL) | `netsqlazman-manager-x.y.z.x86_64.rpm` |

Install normally, then launch **NetSqlAzMan Manager** from your applications menu or Start menu.

The desktop app connects to SQL Server **using the credentials you enter in the connection form** — no fixed service account is required.

### 2.2 Web App (Docker)

The web version runs as a Docker container and is accessed from any browser.

**Prerequisites:** SQL Server credentials with read/write access to the NetSqlAzMan database.

**Run with Docker:**

```bash
docker run -d \
  -p 3001:3000 \
  -e DB_SERVER=192.168.1.10 \
  -e DB_PORT=1433 \
  -e DB_USER=azman_user \
  -e DB_PASSWORD=secret \
  -e DB_NAME=MantoInsight \
  brezjakmanto/netsqlazman-gui:latest
```

Then open `http://your-server:3001` in a browser.

**Run with Docker Compose** (using a `.env` file):

```dotenv
# .env
DB_SERVER=192.168.1.10
DB_PORT=1433
DB_USER=azman_user
DB_PASSWORD=secret
DB_NAME=MantoInsight
```

```bash
docker compose up -d
```

> **Note:** In the web version the database connection is fixed at startup via environment variables. The connection form fields are pre-filled and the Connect button is a no-op — you are already connected.

---

## 3. Connecting to a Database

### 3.1 Connection Form

The connection bar is always visible at the top of the window. Fill in the fields and click **Connect**:

| Field | Description |
|---|---|
| **Server** | Hostname or IP address of the SQL Server instance |
| **Port** | TCP port (default `1433`; use `1434` for named instances via browser) |
| **User** | SQL Server login name |
| **Password** | SQL Server login password |
| **Database** | Name of the NetSqlAzMan database |

Press **Enter** in any field, or click the **Connect** button.

Once connected, the form is replaced by a status bar showing `server:port / database`.

### 3.2 Browsing Available Databases

Instead of typing the database name you can browse all databases on the server:

1. Fill in **Server**, **User**, and **Password**.
2. Click the **▾** chevron button on the right edge of the Database field.
3. The app connects to the server's `master` database, retrieves the list of databases, and shows them in a dropdown.
4. Type to filter the list, then click a database name to select it.

> The browse connection is temporary and independent of the main connection — clicking ▾ does not connect to the app database.

If the credentials are wrong or the server is unreachable, a red error message appears below the field.

### 3.3 Saving Connections

You can save frequently used connections so you don't have to retype them.

**Save the current form:**
1. Click the **📁** (folder) icon on the left of the connection form to open the saved connections panel.
2. Click **💾 Save current form as…**
3. Type a name and press **Enter** or click **Save**.

**Use a saved connection:**
1. Click the **📁** icon to open the panel.
2. Click any saved connection — it fills the form *and* connects immediately.

**Delete a saved connection:**
Click the **×** button next to the connection name in the panel.

**Save while connected:**
Click the **💾 Save** button in the status bar, type a name, and press **Enter**.

> In the **desktop app**, saved connections are stored in the application's user data folder.  
> In the **web app**, saved connections are stored in the browser's `localStorage` — they are per-browser and not shared.

---

## 4. Store Browser

The Store Browser is the main view after connecting. It consists of:
- A **sidebar tree** on the left for navigation
- A **panel** on the right showing details for the selected item

### 4.1 Navigation Tree

The tree is organized as:

```
Store
└── Application
    ├── Application Groups
    │   ├── Group A
    │   └── Group B
    ├── Item Definitions
    │   ├── Role Definitions
    │   │   └── MyRole
    │   ├── Task Definitions
    │   │   └── MyTask
    │   └── Operation Definitions
    │       └── MyOperation
    └── Item Authorizations
        ├── Roles Authorizations
        ├── Task Authorizations
        └── Operation Authorizations
```

Click any node to expand it and load its children. Click a leaf node (group name, item name) to open its detail panel on the right.

**Refresh:** Click the **↺** button at the top of the sidebar to reload stores from the database.

### 4.2 Application Groups

#### Viewing Groups

Click **Application Groups** in the sidebar to see a table of all groups with their name, description, group type (Basic or LDAP), and object SID.

- Click any row to open that group's detail panel.
- Click column headers to sort.

#### Creating a Group

1. Click **+ New Group** in the toolbar.
2. Enter a name (required) and an optional description.
3. Press **Enter** or click **Create**.

#### Editing a Group

1. Open a group by clicking it in the sidebar or the groups table.
2. Click **Edit** in the toolbar to edit the name inline.
3. The description can be edited in the textarea that appears below.
4. Click **Save** or press **Enter** to confirm. Click **Cancel** or press **Escape** to discard.

#### Deleting a Group

Click **Delete Group** in the group's panel toolbar, or the **Delete** button in the groups table. A confirmation dialog appears — this action also removes all members and any authorizations referencing the group.

#### Managing Group Members

The group detail panel shows the picker on the **left** and the members table on the **right**.

**Adding members:**
1. Use the search box on the left to filter available principals (Application Groups or Database Users).
2. Check one or more principals.
3. Choose **Member** or **Non-Member** from the dropdown.
4. Click **Add (n)**.

**Toggling Member / Non-Member:** Click the green **Member** or grey **Non Member** badge in the table to switch a principal's membership status without removing them.

**Removing a member:** Click **Remove** in the row. A confirmation dialog appears.

### 4.3 Item Definitions

Item definitions describe the authorization model — Roles contain Tasks, Tasks contain Operations.

#### Viewing Items

Click a type folder (e.g. **Role Definitions**) in the sidebar to see all items of that type in a table. Columns: Name, Description, Item ID.

Click an item in the sidebar or the table to open its detail panel.

#### Creating an Item

1. Select the type folder in the sidebar.
2. Click **+ New Role / Task / Operation** in the panel toolbar.
3. Enter a name and optional description, then click **Create**.

#### Editing an Item

1. Open the item panel.
2. Click **Edit** in the toolbar.
3. Edit the name inline (or in the **definition** tab form for name + description).
4. Click **Save**.

#### Deleting an Item

Click **Delete** in the item's toolbar. This also removes hierarchy entries and authorizations.

#### Item Hierarchy (Child Items)

The definition panel has tabs showing which child items are linked. A **Role** can contain Tasks and Operations; a **Task** can contain Operations.

The panel shows the available items picker on the **left** and the linked children on the **right**.

**Adding children:**
1. Switch to the relevant tab (e.g. **Tasks** inside a Role).
2. Check items in the left picker.
3. Click **Add (n)**.

**Removing a child:** Click **Remove** in the children table. The item is unlinked but not deleted.

### 4.4 Item Authorizations

Authorizations control which principals (groups or database users) are allowed to perform a role, task, or operation — and at what level.

#### Authorization Types

| Type | Meaning |
|---|---|
| **Allow** | Principal is permitted |
| **Allow with Delegation** | Principal is permitted and may grant this right to others |
| **Neutral** | No explicit grant or deny |
| **Deny** | Principal is explicitly denied |

#### Viewing Authorizations

Click an item under **Item Authorizations** in the sidebar to open its authorization panel. The panel shows:
- **Left:** principal picker to add new authorizations
- **Right:** table of existing authorizations (name, where defined, type, valid from/to dates, SID)

#### Adding Authorizations

1. Search for a principal in the left picker.
2. Check one or more principals.
3. Choose the authorization type from the dropdown.
4. Click **Add (n)**.

#### Changing an Authorization Type

In the authorizations table, use the **dropdown** in the Authorization column of any row to change the type inline. The change is saved immediately.

#### Removing an Authorization

Click **Remove** in the row. A confirmation dialog appears.

---

## 5. User Lookup

The **User Lookup** tab answers the question: *"What does this user have access to?"*

Click **User Lookup** in the tab bar at the top (visible when connected).

### 5.1 Searching for a User

1. Type a **first name, surname, or username** in the search box. Suggestions appear after a short delay.
2. Each suggestion shows the full name with the username underneath.
3. Click a suggestion, or press **Enter** when there is exactly one result.
4. Alternatively, click **Search** after typing.

The app queries three stored procedures in parallel and shows results immediately.

### 5.2 Table View

Results are displayed in three sections:

| Section | Contents |
|---|---|
| **Application Groups** | All AzMan groups the user belongs to |
| **Roles** | All AzMan roles the user has through their groups |
| **Allowed Operations** | All operations the user is permitted to perform |

Each section shows a count badge and a scrollable table. Empty sections show a "No X found" message.

### 5.3 Graph Visualization

Click **Visualize** to switch to an interactive force-directed graph.

**Node types and colors:**

| Color | Meaning |
|---|---|
| 🟣 Purple (large) | The user |
| 🟡 Amber | Application |
| 🟢 Green | Application Group |
| 🩷 Pink | Role |
| 🔵 Blue (small) | Operation |

**Interactions:**
- **Drag** any node to reposition it — the simulation adjusts.
- **Hover** a node to see its name in a tooltip.
- Toggle **Show operations** checkbox to show or hide the operation nodes (useful when there are many).

---

## 6. Interface Features

### 6.1 Light / Dark Theme

Click the **☀️ / 🌙** button in the top-right corner to toggle between light and dark mode. The preference is remembered across sessions.

### 6.2 Sidebar Filter

Type in the **Filter…** box at the top of the sidebar to instantly narrow the visible groups and items by name. The filter applies to all currently expanded nodes — no need to press Enter.

Clear the filter box to show all items again.

### 6.3 Sortable Tables

All tables support sorting. Click any **column header** to sort by that column ascending. Click again to sort descending. An arrow indicator shows the current sort column and direction.

### 6.4 Auto-Update (Desktop)

The desktop app checks for updates on startup. When a new version is available a notification appears — click **Restart and update** to apply it. Updates are downloaded from GitHub Releases and verified before installation.

---

## Appendix: Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Submit the connection form / confirm inline edits |
| `Escape` | Cancel inline edits, close dropdowns |
| `Enter` (User Lookup) | Search when one suggestion is highlighted |

---

## Appendix: Authorization Data Model

```
Store
└── Application
    ├── ApplicationGroup  ←── members (DB Users / other Groups)
    └── Item (Role / Task / Operation)
        ├── ItemHierarchy  ←── links items into a tree
        └── Authorization  ←── assigns Allow/Deny to a principal
```

**Where Defined values:**

| Value | Meaning |
|---|---|
| 1 | Application (AzMan application group) |
| 2 | LDAP |
| 4 | Database User |

---

*For deployment instructions, CI/CD configuration, and developer notes see the project `README` and `CLAUDE.md`.*
