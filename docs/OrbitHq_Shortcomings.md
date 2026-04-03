# OrbitHq — Potential Shortcomings & Gaps Analysis

*An honest assessment of current limitations to inform future development*

---

Items are grouped by category and rated **High / Medium / Low** severity based on their likely impact on user adoption and retention.

---

## Consolidated Shortcomings

### 🔴 High Severity

| Shortcoming | Description | Category |
|---|---|---|
| No cloud sync / cross-device | Data lives only in one browser. File System Access API helps but requires manual file management across devices. | Platform |
| Browser-only, no native app | Runs in browser tab; no offline app, no system tray, no OS notifications. Closing the tab ends all access. | Platform |
| No mobile support | ContentEditable + desktop-centric layout is unusable on touch/mobile screens. No responsive design. | Platform |
| Single user only | No collaboration, sharing, or multi-user access to notebooks. | Collaboration |
| No real-time collaboration | No simultaneous editing, comments, or presence indicators. | Collaboration |
| localStorage size limits | Browsers cap localStorage at ~5–10 MB. Large notebooks with many notes will hit this ceiling. | Data |
| Fragile data backup | Export is manual JSON. No automatic backup schedule, no versioning, no revision history. | Data |
| No version history | Editing a note is destructive. No undo history past a session, no per-note revision log. | Data |
| File System API browser support | File System Access API is Chromium-only. Firefox and Safari users get localStorage fallback only. | Compatibility |

### 🟡 Medium Severity

| Shortcoming | Description | Category |
|---|---|---|
| No image support in notes | Editor has no image insertion, paste-image, or media embedding capability. | Editor |
| No attachments | Cannot attach files (PDFs, images, docs) to notes. | Editor |
| No drawing / whiteboard | No sketch, diagram, or whiteboard capability. | Editor |
| Table editing is primitive | Tables can be inserted but have no resize handles, merge cells, or inline toolbar. | Editor |
| Flat tag structure | Tags are single-level with no nesting or hierarchy. | Organization |
| Folder depth limited to 2 | Only parent + one sub-level. Deep hierarchies not supported. | Organization |
| No full-text search across notebooks | Search only works within the active notebook. No cross-notebook search. | Search |
| Search not indexed | Search scans all notes on every keystroke. Will degrade with large datasets. | Search |
| No advanced search syntax | No boolean operators (AND/OR/NOT), no date filters, no type filters in search. | Search |
| No task subtasks | Tasks are flat. No nested sub-tasks or checklist hierarchy within a task. | Tasks |
| No task priorities | Tasks have no priority field (High/Medium/Low) beyond urgency derived from due date. | Tasks |
| No task time tracking | No time estimates, no time logging, no pomodoro integration. | Tasks |
| Contact fields limited | No social links, birthday, address, or custom fields on contacts. | Contacts |
| No email integration beyond drag-drop | Email drag-drop is Outlook-specific. No Gmail, no IMAP, no email composition. | Integrations |
| No calendar integration | Plan notes have target dates but no calendar view or sync to external calendars. | Integrations |
| No API or webhooks | No programmatic access. Cannot integrate with Zapier, n8n, or other automation tools. | Integrations |
| No plugin/extension system | No way for users or third parties to extend functionality. | Extensibility |

### 🟢 Low Severity

| Shortcoming | Description | Category |
|---|---|---|
| Graph view is basic | Node-link diagram has no filtering, no clustering, no search, no visual customization. | Knowledge |
| Snippet type lacks syntax highlighting | Code snippets render as plain text — no syntax highlighting in editor or read view. | Editor |
| No read view / focus mode | No distraction-free reading mode. Editor is always in edit mode. | UX |
| No note locking | Notes can be accidentally edited. No read-only lock. | UX |
| No print styles | No CSS print stylesheet for clean note printing. | UX |
| No bulk operations on notes | Cannot select multiple notes for batch move, tag, archive, or delete. | UX |
| No note templates on creation | Templates exist per type but no user-created templates or template picker at note creation. | UX |
| Recurring tasks limited | No custom recurrence intervals (e.g., every 3 weeks, every 2 months, last Friday of month). | Tasks |
| No task dependencies | Tasks cannot be linked as blockers/dependencies of each other. | Tasks |
| Tour not resumable | After dismissing the first-launch tour, there is no way to re-launch it from settings. | UX |
| No dark mode auto-detect | Dark mode theme must be manually selected; doesn't follow system `prefers-color-scheme`. | UX |
| No import from other apps | No import from Notion, Obsidian, Evernote, or Markdown files. | Data |
| Follow-up due dates not required | Follow-ups can be created without a due date, making them easy to forget. | Follow-ups |

---

## Critical Gaps: Detailed Analysis

### 1. Platform & Cross-Device Access

The most significant structural limitation is the single-browser, single-device model. While the File System Access API provides a path to file-based portability, it requires users to manually manage file locations and is not available in Firefox or Safari. For many knowledge workers who switch between laptop, desktop, tablet, and phone, this is a deal-breaker.

- No Android or iOS app
- No Chrome extension for web clipping
- No PWA (Progressive Web App) manifest for installability
- localStorage fragility: clearing browser data erases everything

### 2. Collaboration

OrbitHq is explicitly designed as a single-user tool, which is a valid positioning decision. However, the absence of even read-only sharing limits use cases in professional settings where sharing a meeting note or project plan is routine.

- No shareable read-only link for a note
- No export to PDF or HTML for sharing
- No team workspace concept

### 3. Data Safety & Durability

The app relies entirely on the user's diligence for backups. There is no autosave to file (only to localStorage), no version history, and no crash recovery beyond what the browser localStorage retains.

- A browser crash or storage clear can result in total data loss
- No diff/merge capability if the same file is edited in two browsers
- JSON export is all-or-nothing — no per-note export

### 4. Editor Limitations

For a note-taking app, the editor's lack of media support is a notable gap. Users who want to paste screenshots, attach documents, or embed diagrams will need to leave the app.

- No image paste/upload
- No PDF preview
- No LaTeX/math equations
- No embed support (YouTube, Figma, etc.)

### 5. Search & Discovery

Search is functional but will degrade as notebooks grow. Without an inverted index or indexed storage (e.g., SQLite via WASM), search performance will drop noticeably beyond a few hundred notes.

- Linear scan of all notes on every keystroke
- No fuzzy matching
- No search within a specific folder or tag scope
- No date range search

### 6. Mobile & Touch

The three-panel desktop layout, contentEditable editor, and hover-triggered interactions are fundamentally incompatible with mobile browsers. This limits OrbitHq to desktop use only.

- No touch-optimized note list
- Float toolbar requires text selection — difficult on touch
- Slash commands require keyboard
- Drag-and-drop resize panels unusable on mobile
