# OrbitHq Architecture

## System Overview

OrbitHq is a note-taking and task management application with a modular architecture. This diagram shows the relationships between all major modules and data flows.

```mermaid
graph TB
    %% Core Init & State Management
    APP[app.js<br/>View Switching<br/>Boot Sequence]
    STATE[state.js<br/>Global State S<br/>localStorage/Cloud]
    NOTEBOOK[notebooks.js<br/>Notebook Registry<br/>Multi-Notebook]
    
    %% Data Persistence
    FILESTORE[filestore.js<br/>File System API<br/>IndexedDB Handles]
    SYNC[sync.js<br/>Cloud Sync Core]
    SYNCDB[sync-dropbox.js<br/>Dropbox Backend]
    SYNCCRYPTO[sync-crypto.js<br/>Encryption/Auth]
    
    %% UI Views & Modals
    EDITOR[editor.js<br/>Rich Text Editor<br/>Note CRUD]
    TASKS[tasks.js<br/>Task Management<br/>Auto-Archive]
    INBOX[inbox.js<br/>Inbox Processor<br/>Unprocessed Detect]
    NOTES[notes.js<br/>Note List Render<br/>Filtering]
    
    %% Feature Modules
    FOLDERS[folders.js<br/>Folder Navigation]
    TAGS[tags.js<br/>Tag Management]
    FOLLOWUPS[followups.js<br/>Follow-ups & Archive]
    CONTACTS[contacts.js<br/>Contact Info]
    GRAPH[graph.js<br/>Wiki Links<br/>Backlinks]
    
    %% Utilities & Config
    MODALS[modals.js<br/>Capture Modal<br/>Type Selector<br/>Settings]
    CONFIG[config.js<br/>Note Types NT<br/>Defaults]
    SHORTCUTS[shortcuts.js<br/>Keyboard Bindings]
    UTILS[utils.js<br/>Helpers<br/>Formatting]
    SEARCH[search.js<br/>Note Search]
    ARCHIVE[archive.js<br/>Archive Mgmt]
    RESIZE[resize.js<br/>Panel Resizing]
    MOBILE[mobile.js<br/>Responsive UI]
    TOUR[tour.js<br/>Feature Tour]
    NUDGES[nudges.js<br/>Notifications]
    
    %% External & Browser APIs
    BROWSER["Browser APIs<br/>localStorage<br/>IndexedDB<br/>File System<br/>Service Worker"]
    DROPBOX["Dropbox API"]
    
    %% Data Flow & Dependencies
    
    %% Core Boot Path
    APP -->|initializes| NOTEBOOK
    NOTEBOOK -->|loads registry| STATE
    APP -->|boots| STATE
    STATE -->|reads/writes| FILESTORE
    FILESTORE -->|persists handles| BROWSER
    STATE -->|syncs to cloud| SYNC
    SYNC -->|uses crypto| SYNCCRYPTO
    SYNC -->|calls backend| SYNCDB
    SYNCDB -->|API calls| DROPBOX
    
    %% UI to State
    EDITOR -->|reads/writes notes| STATE
    TASKS -->|reads/writes tasks| STATE
    INBOX -->|reads notes| STATE
    NOTES -->|renders from| STATE
    FOLDERS -->|manages folderId| STATE
    TAGS -->|manages tags| STATE
    FOLLOWUPS -->|reads/writes| STATE
    CONTACTS -->|manages contact data| STATE
    GRAPH -->|scans content| EDITOR
    
    %% Modals & Input
    MODALS -->|creates items| EDITOR
    MODALS -->|creates items| TASKS
    MODALS -->|applies themes| STATE
    MODALS -->|uses types| CONFIG
    
    %% View Switching
    APP -->|switches to| EDITOR
    APP -->|switches to| INBOX
    APP -->|switches to| TASKS
    APP -->|switches to| NOTES
    
    %% Filtering & Search
    NOTES -->|filters by| FOLDERS
    NOTES -->|filters by| TAGS
    SEARCH -->|searches| NOTES
    INBOX -->|filters unprocessed| NOTES
    
    %% UI Features
    EDITOR -->|manages| SHORTCUTS
    EDITOR -->|wiki links| GRAPH
    EDITOR -->|auto-save| STATE
    MOBILE -->|adapts| APP
    RESIZE -->|persists sizes| STATE
    NUDGES -->|triggers alerts| STATE
    ARCHIVE -->|moves to archived| STATE
    FOLLOWUPS -->|track follow-ups| INBOX
    TOUR -->|onboarding| APP
    
    %% Utility Usage
    EDITOR -->|uses| UTILS
    TASKS -->|uses| UTILS
    NOTES -->|uses| UTILS
    INBOX -->|uses| UTILS
    
    %% Service Worker
    SW["sw.js<br/>Service Worker<br/>Offline Support"]
    BROWSER -->|serves| SW
    SW -->|caches| BROWSER

    style APP fill:#4a7c9e
    style STATE fill:#4a7c9e
    style NOTEBOOK fill:#4a7c9e
    style BROWSER fill:#6b4a9e
    style EDITOR fill:#2d7a5a
    style TASKS fill:#2d7a5a
    style INBOX fill:#2d7a5a
    style NOTES fill:#2d7a5a
    style FOLDERS fill:#6b5d2d
    style TAGS fill:#6b5d2d
    style SYNC fill:#5a4a7e
    style FILESTORE fill:#5a4a7e
    style MODALS fill:#8a6a2e
    style CONFIG fill:#8a6a2e
    style SHORTCUTS fill:#8a6a2e
```

## Module Descriptions

### Core Architecture

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| **app.js** | Boot sequence, view switching (dashboard/inbox) | `showView()`, `_continueBoot()` |
| **state.js** | Global state object `S`, localStorage/cloud persistence | `save()`, `loadAsync()`, `loadSync()` |
| **notebooks.js** | Multi-notebook support, registry persistence | `getActiveNotebook()`, `setActiveId()` |

### Data Persistence

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| **filestore.js** | File System Access API + IndexedDB handles | `fileStore.initForNotebook()`, `readFileForNotebook()` |
| **sync.js** | Cloud sync orchestration, version control | `pushNotebook()`, `pullNotebook()` |
| **sync-dropbox.js** | Dropbox API integration | `handleAuthCallback()`, `uploadToDropbox()` |
| **sync-crypto.js** | Encryption/decryption, auth | `encryptData()`, `decryptData()` |

### UI Views

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| **editor.js** | Rich text editor, note CRUD, wiki linking | `openNote()`, `createNote()`, `saveNote()` |
| **tasks.js** | Task rendering, CRUD, recurrence, auto-archive | `renderTasks()`, `createTask()`, `completeTask()` |
| **inbox.js** | Inbox grid, unprocessed detection, processor | `renderInbox()`, `getInbox()`, `processCard()` |
| **notes.js** | Note list rendering, filtering, badges | `renderNotesList()`, `updateNoteBadges()` |

### Features

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| **folders.js** | Folder tree navigation, CRUD | `renderFolderTree()`, `createFolder()` |
| **tags.js** | Tag management, filtering | `renderTagsSidebar()`, `addTag()` |
| **followups.js** | Follow-up tracking, reminders | `renderFollowUps()`, `createFollowUp()` |
| **contacts.js** | Contact management, mentions | `getContacts()`, `addContact()` |
| **graph.js** | Wiki link parsing, backlinks | `getBacklinks()`, `scanLinks()` |

### Utilities & Config

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| **modals.js** | Capture modal, type selector, settings | `openCapture()`, `openTypeSelector()` |
| **config.js** | Note type definitions (NT object) | `NT` (type registry) |
| **shortcuts.js** | Keyboard shortcuts | `registerShortcut()`, `handleKeydown()` |
| **utils.js** | Formatting, date helpers, common functions | `uid()`, `todayISO()`, `esc()` |
| **search.js** | Full-text note search | `searchNotes()` |
| **archive.js** | Archive management, restore | `viewArchive()`, `restoreTask()` |
| **resize.js** | Panel resize persistence | `savePanelSizes()`, `loadPanelSizes()` |
| **mobile.js** | Mobile/responsive UI adaptations | `updateMobBadges()`, `toggleMobileMenu()` |
| **tour.js** | First-launch feature tour | `startTour()` |
| **nudges.js** | Smart notifications, reminders | `checkNudges()` |

## Data Flow Patterns

### Boot Sequence
```
app.js → notebooks.js → state.js → filestore.js → BROWSER APIs
                                  ↓
                              (try) sync.js → syncDropbox.js → Dropbox
```

### Creating a Note
```
modals.js (capture) → editor.js (createNote) → state.js (S.notes.unshift)
                                              ↓
                                          filestore.js → BROWSER
                                          sync.js → cloud
                                          ↓
                                      notes.js (render) → UI
```

### Processing Inbox
```
inbox.js (getInbox) → state.js (read unprocessed)
                    ↓
                    editor.js (open)
                    ↓
                    folders.js (assign) OR tags.js (add) OR complete
                    ↓
                    state.js (save) → filestore & sync
```

### Searching Notes
```
search.js → state.js (scan S.notes) → filter by content/type/tag/folder
                                    ↓
                                    notes.js (render results)
```

## State Schema (S object)

```javascript
S = {
  tasks: [],           // { id, title, due, recur, noteId, subtasks, createdAt, completedAt }
  archived: [],        // completed tasks
  notes: [],           // { id, type, title, content, metadata, folderId, pinned, createdAt, updatedAt }
  folders: [],         // { id, name, description, parentId }
  tags: [],            // { id, name, color }
  contacts: [],        // { id, name, email, notes }
  followups: [],       // { id, text, dueDate, noteId, completed }
  fuArchived: [],      // archived follow-ups
  fuPanelMode: 'normal', // or 'compact'
  collapsed: {},       // { [sectionId]: boolean }
  noteFilter: 'all',   // 'all' | 'folder:ID' | 'tag:ID' | 'type:TYPE'
  activeNoteId: null,  // currently open note
  navHistory: [],      // breadcrumb navigation
  blOpen: false,       // backlinks panel open
  dismissedCtx: [],    // dismissed contexts
  settings: {
    archiveDelay: 7,
    wordThreshold: 50,
    reviewDay: 1,
    theme: 'clean-dark',
    fontSize: 'default',
    templates: {},
    headingStyles: {}
  },
  session: {
    lastWeekly: null,
    agedSnoozedUntil: null,
    clearedToday: 0,
    clearedDate: null
  }
}
```

## Key Concepts

- **Multi-Notebook**: Each notebook has its own localStorage key (`nucleus_nb_${id}`) and optional File System handle
- **Smart Inbox**: Auto-detection of "unprocessed" items (< word threshold or scratchpad)
- **Auto-Archive**: Completed tasks older than `archiveDelay` days move to `archived`
- **Sync Strategy**: Try cloud first (Dropbox), fallback to local File System, always localStorage
- **Wiki Links**: Editor scans for `[[note-title]]` links, maintains backlinks graph
- **Keyboard First**: Shortcuts.js enables vim-style and standard shortcuts
- **Responsive**: Mobile.js adapts UI for small screens
- **Encryption**: Optional E2E encryption for cloud sync via sync-crypto.js

## Browser APIs Used

- **localStorage**: Primary state persistence
- **IndexedDB**: File handles cache (filestore.js)
- **File System Access API**: Direct notebook file editing
- **Service Worker**: Offline support, caching
- **Dropbox API**: Cloud backup/sync

---

This architecture document should be consulted at the beginning of each session to understand module relationships and data flows.
