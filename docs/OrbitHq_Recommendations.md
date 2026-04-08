# OrbitHq — Recommended Features Roadmap

*Prioritized recommendations to close gaps and expand capabilities while preserving the local-first, privacy-focused identity*

---

## Implementation Tiers

| Tier | Effort | Description |
|---|---|---|
| **Quick Win** | Days | Small effort, high value. Can be shipped quickly. |
| **Short-Term** | Weeks | Closes key gaps vs. competitors. |
| **Medium-Term** | Months | Expands platform reach and audience. |
| **Long-Term** | Quarters | Major features; potential product repositioning. |

---

## Complete Recommendations Table

### ⚡ Quick Wins

| Feature | Description | Impact |
|---|---|---|
| PWA Manifest | Add `manifest.json` + service worker so users can install OrbitHq as a desktop/mobile app | High |
| `prefers-color-scheme` | Auto-detect OS dark mode and apply dark theme automatically | Medium |
| Re-launch Tour | Add a "Restart Tour" button in settings | Low |
| PDF / HTML Export | Export a note to PDF or clean HTML for sharing | High |
| Note Print Styles | Add CSS `@media print` for clean note printing | Low |
| Syntax Highlighting | Add Prism.js to render code blocks with syntax colors | Medium |
| Read / Focus Mode | Toggle distraction-free reading mode per note (hides editor chrome) | Medium |
| Note Locking | Lock a note as read-only to prevent accidental edits | Low |
| Bulk Note Operations | Multi-select notes to batch move, tag, archive, or delete | Medium |

### 🔵 Short-Term

| Feature | Description | Impact |
|---|---|---|
| Image Paste & Upload | Paste screenshots or drop image files into notes; store as base64 or blob URL | High |
| Inline Search Filters | Add `type:`, `folder:`, `tag:`, `date:` filter syntax to search bar | High |
| Cross-Notebook Search | Search across all notebooks simultaneously | High |
| Task Subtasks | Add collapsible sub-task list under any task | High |
| Task Priorities | Add High / Medium / Low priority field to tasks | Medium |
| Custom Recurrence | Support custom intervals (e.g., every 3 weeks, first Monday of month) | Medium |
| Note Version History | Store the last N versions of each note with diff view and restore | High |
| Auto-Backup to File | Scheduled auto-export to a JSON file (e.g., daily) using File System API | High |
| Per-Note Export | Export individual notes as Markdown, HTML, or PDF | Medium |
| Import from Markdown | Import `.md` files into notes, preserving heading structure | Medium |
| Table Improvements | Add resize handles, merge cells, add/delete rows/columns from context menu | Medium |
| Contact Custom Fields | Add custom field support to contacts (social links, birthday, address) | Low |

### 🟡 Medium-Term

| Feature | Description | Impact |
|---|---|---|
| Mobile Responsive Layout | Redesign panel layout for single-column mobile view with bottom navigation | High |
| End-to-End Encrypted Sync | Optional encrypted sync via user-owned cloud storage (iCloud/Dropbox/S3) | High |
| Attachment Support | Attach files (PDFs, images, documents) to notes; store in IndexedDB or filesystem | High |
| Shareable Read-Only Links | Generate a read-only link to a note (via export or minimal local server) | Medium |
| Calendar View for Tasks | Month/week calendar view showing tasks by due date | High |
| Google Calendar Integration | Two-way sync tasks and events with Google Calendar | Medium |
| Gmail / IMAP Integration | Capture emails as follow-ups from Gmail in addition to Outlook drag-drop | Medium |
| Zapier / Webhook Support | Outbound webhooks on task creation, completion, or note creation | Medium |
| Indexed Search (SQLite WASM) | Replace linear search with a proper inverted index for large notebooks | High |
| Drawing / Whiteboard | Embedded lightweight canvas for quick sketches within notes | Medium |
| Math / LaTeX Support | Render inline and block LaTeX equations in notes | Low |
| AI Writing Assistant | Optional AI for note summarization, action-item extraction, and drafting | High |

### 🟣 Long-Term

| Feature | Description | Impact |
|---|---|---|
| Native Desktop App | Electron or Tauri wrapper for true offline native experience with OS notifications | High |
| Plugin / Extension System | Public API + plugin manifest for user and third-party extensions | High |
| Team Workspaces | Shared notebooks with role-based access for small teams | High |
| Obsidian-Compatible Sync | Sync individual notes as Markdown files to a folder (Obsidian-compatible) | Medium |
| Task Time Tracking | Log time spent on tasks with start/stop timer and totals | Medium |
| Advanced Graph View | Filter graph by type/folder/tag, cluster views, visual layout options | Low |

---

## Detailed Implementation Notes

### ⚡ 1. Progressive Web App (PWA) Manifest DONE

Adding a `manifest.json` and a minimal service worker would allow users to install OrbitHq directly to their desktop or mobile home screen. This requires no backend and costs almost nothing to implement.

- Add `manifest.json` with name, icons, start_url, `display: standalone`
- Register a service worker for offline caching of the app shell
- Users on mobile can install and launch like a native app
- **Estimated effort: 1–2 days**

### ⚡ 2. PDF / HTML Export per Note

A simple `window.print()` call with a CSS `@media print` stylesheet, or html2canvas + jsPDF, would enable note sharing without any server requirement.

- Export current note to printer-friendly PDF via browser print dialog
- Export to self-contained HTML file for emailing or archiving
- **Estimated effort: 1 day**

### ⚡ 3. Syntax Highlighting in Code Blocks

The Snippet note type is specifically designed for code, yet code blocks render as plain text. Adding Prism.js (~30KB, CDN) would provide syntax highlighting for 200+ languages with zero configuration.

- Load Prism.js lazily when a code block is rendered
- Auto-detect language from the `language` metadata field of Snippet notes
- **Estimated effort: 0.5 days**

### ⚡ 4. Read / Focus Mode DONE

A read mode toggle would hide the editor chrome (toolbar, metadata fields) and render note content as clean, formatted HTML — ideal for reviewing meeting notes or reading long-form content.

- Toggle button in editor toolbar
- CSS class on editor container that hides toolbar, input borders, and metadata
- **Estimated effort: 0.5 days**

---

### 🔵 5. Image Paste & Upload DONE

The inability to paste a screenshot into a note is a frequent pain point. Implementation:

- Listen for `paste` events in the editor, detect `image/png` or `image/jpeg` in clipboard
- Convert to base64 data URL and insert as `<img>` in the note content
- For large images, store in IndexedDB keyed by note ID to keep localStorage size manageable
- **Estimated effort: 2–3 days**

### 🔵 6. Note Version History

Without version history, a mis-click or accidental clear can destroy meeting notes or project plans. A simple ring-buffer approach within existing localStorage would work:

- On every save, push current content to a `versions[]` array (cap at 20 entries)
- Add a "Version History" option in the editor's `…` menu
- Modal shows timestamped snapshots; click to preview or restore
- **Estimated effort: 1–2 days**

### 🔵 7. Task Subtasks DONE

Adding a collapsible sub-task list under any parent task would significantly increase utility without requiring a full project management redesign:

- Sub-tasks stored as `tasks[]` array inside the parent task object
- Rendered as indented checklist under the parent task row
- Parent task completion percentage derived from sub-task progress
- **Estimated effort: 3–4 days**

### 🔵 8. Advanced Search Filters

Adding filter syntax to the search bar (`type:meeting`, `folder:Projects`, `tag:urgent`, `before:2025-01-01`) would make search feel professional and handle large notebooks gracefully:

- Parse filter tokens before running content search
- Apply filters as pre-pass on the notes array before text matching
- Show active filters as chips in the search bar
- **Estimated effort: 2–3 days**

### 🔵 9. Auto-Backup to File

A daily auto-export to the connected notebook file (or a parallel backup file) using the File System Access API would eliminate the risk of localStorage data loss:

- On app load, check if 24 hours have passed since last backup
- Write a timestamped backup JSON alongside the main notebook file
- Keep the last 7 backup files, rotate older ones
- **Estimated effort: 1 day**

---

### 🟡 10. Mobile Responsive Layout

A single-column layout with bottom navigation tabs (Notes, Tasks, Inbox, Contacts) would make OrbitHq usable on smartphones. This is the most impactful medium-term investment:

- CSS media queries to stack the three-panel layout into a single column on narrow screens
- Bottom nav bar to switch between panels (replacing sidebar)
- Float toolbar replaced by long-press context menu on mobile
- **Estimated effort: 2–3 weeks**

### 🟡 11. End-to-End Encrypted Sync

Rather than building a backend, OrbitHq could offer encrypted sync via user-owned storage. This preserves the privacy-first philosophy while solving the cross-device problem:

- Encrypt notebook JSON with a user-provided password using the Web Crypto API
- Sync the encrypted blob to Dropbox, iCloud Drive, or Google Drive via their JavaScript SDKs
- Decrypt on load with user's password
- Zero-knowledge: OrbitHq never sees unencrypted data
- **Estimated effort: 4–6 weeks**

### 🟡 12. AI Writing Assistant

An optional, privacy-respecting AI integration would set OrbitHq apart:

- Use the Claude API (or user-provided API key) for cloud AI features: note summarization, action item extraction from meeting notes, drafting assistance
- Use a local model (Ollama, WebLLM) for fully on-device processing
- Contextual: meeting notes → auto-extract action items as tasks
- **Estimated effort: 2–4 weeks (Claude API path)**

### 🟡 13. Calendar View for Tasks

A monthly/weekly calendar view showing tasks by due date:

- Month view with task dots/chips on due dates
- Click a day to see tasks due that day
- Drag tasks between days to reschedule
- **Estimated effort: 2–3 weeks**

---

### 🟣 14. Native Desktop App (Electron / Tauri)

A native desktop wrapper would enable OS-level features the browser cannot access. Tauri (Rust) is recommended over Electron for its smaller binary size and better performance:

- Global capture hotkey (e.g., Ctrl+Shift+C) to open quick capture from anywhere
- System tray icon with task count badge
- Native OS notifications for overdue tasks
- Direct file system access without the File System Access API

### 🟣 15. Plugin / Extension System

A well-designed plugin API would enable the community to extend OrbitHq:

- Plugin manifest file declaring hooks and capabilities
- Sandboxed execution (iframe or Web Worker) to protect core data
- Hooks: `onNoteSave`, `onTaskCreate`, `onInboxProcess`, `renderSidebar`
- Example plugins: Toggl time tracking, Slack notifications, custom note types

### 🟣 16. Obsidian-Compatible Markdown Sync

Syncing notes as individual `.md` files to a watched folder would make OrbitHq interoperable with Obsidian, VS Code, and any text editor:

- Each note saved as a separate `.md` file in a user-selected folder
- OrbitHq watches the folder for external changes and syncs back
- Wiki links rendered as `[[NoteTitle]]` in Markdown for Obsidian compatibility
- Task frontmatter (due, recur) preserved in YAML front matter

---

## Recommended Prioritization

If resources are limited, the following order maximizes user impact per unit of effort:

1. **PWA Manifest + Service Worker** — installability is foundational for retention
2. **Note Version History** — data safety is a trust issue; one lost meeting note drives churn
3. **Image Paste** — most commonly expected feature missing from the editor
4. **PDF / HTML Export** — sharing is critical for professional use cases
5. **Auto-Backup** — eliminates the data loss risk of localStorage dependency
6. **Task Subtasks + Priorities** — closes the task management gap vs. Todoist / Things
7. **Mobile Layout** — opens the app to a majority of potential users currently locked out
8. **Encrypted Sync** — solves cross-device without compromising privacy-first positioning
9. **AI Writing Assistant** — highest potential differentiator in the note-taking market
