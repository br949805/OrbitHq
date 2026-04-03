# OrbitHq — Complete Feature List & Competitive Differentiators

*A Privacy-First, Local-First Note-Taking & Productivity Application*

---

## Overview

OrbitHq is a sophisticated, privacy-focused productivity application built entirely in vanilla JavaScript with no server dependencies. All data lives on the user's device. It combines rich note-taking, task management, follow-up tracking, and personal knowledge management into a single, fast, offline-capable web app.

---

## 1. Rich Text Editor

### Core Capabilities

| Feature | Description | Differentiator |
|---|---|---|
| ContentEditable Editor | Full HTML-based rich text with formatting toolbar | No dependency on heavy frameworks |
| Float Toolbar | Context-sensitive toolbar appears on text selection | Clean, distraction-free UX |
| Bold / Italic / Underline | Ctrl+B/I/U keyboard shortcuts plus toolbar buttons | — |
| Headings H1–H3 | Heading styles with custom color & size per heading level | Per-heading style customization |
| Lists (Bullet & Numbered) | Full list support with Tab indent/outdent | — |
| Blockquote & Code Blocks | Semantic HTML blockquote and `<pre><code>` support | — |
| Tables | Insert tables via slash command | — |
| Horizontal Dividers | Insert `<hr>` via `---` markdown shortcut | — |
| Callout Blocks | Custom callout div elements via slash command | — |
| Autosave | 2-second debounce autosave with visual "saving…"/"saved" indicator | Non-intrusive status feedback |
| Force Save | Ctrl+S / Cmd+S immediate save | — |

### Markdown Shortcut System

OrbitHq converts typed markdown syntax into formatted HTML in real-time:

| Shortcut | Result | Differentiator |
|---|---|---|
| `# ` / `## ` / `### ` at line start | H1 / H2 / H3 heading | ★ Inline markdown in a rich-text editor |
| `- ` or `* ` at line start | Bullet list | — |
| `1. ` at line start | Ordered list | — |
| ` ``` ` + Enter | Code block | — |
| `---` + Enter | Horizontal rule | — |
| `**text**` | Bold | ★ Inline markdown conversion |
| `` `text` `` | Inline code | ★ Inline markdown conversion |

### Slash Command System

Typing `/` on a blank line opens a command palette with 11 elements:

- H1, H2, H3 headings
- Bullet list, Ordered list
- Blockquote, Code block, Table
- Horizontal divider, Callout block
- Task item (inline task)

Commands support keyword search and keyboard navigation (arrows, Tab, Enter).

---

## 2. Six Specialized Note Types

Each note type carries its own icon, color, template, and metadata fields:

| Type | Description | Differentiator |
|---|---|---|
| Scratchpad (✦) | Quick unstructured capture, always routed to inbox | ★ Dedicated quick-capture type |
| Meeting (◉) | Structured template: Agenda, Discussion, Decisions, Action Items + attendee chips | ★ Attendee linking to Contacts |
| Snippet (⌨) | Code/tech references with language, source URL, context, date fields | ★ Developer-oriented note type |
| Idea (◎) | Concept capture with status (Raw/Developing/Mature), category, date | ★ Idea lifecycle tracking |
| Plan (▦) | Goal planning with status (Draft/In Progress/Complete) and target date | ★ Built-in planning workflow |
| Note (○) | General purpose note | — |

Every type's default template is editable by the user via the built-in template editor.

---

## 3. Knowledge Linking System

### Wiki-Style Note Linking

| Feature | Description | Differentiator |
|---|---|---|
| `[[` trigger | Type `[[` to open note-link autocomplete dropdown (8 suggestions) | ★ Bidirectional wiki linking |
| Backlinks Panel | Every note shows which other notes link to it, togglable panel | ★ Automatic backlink generation |
| Backlink Persistence | Open/closed state of backlinks panel persisted across sessions | — |
| Note Graph View | Visual node-link diagram of all wiki connections, click-to-navigate | ★ Visual knowledge graph |

### @Contact Linking

| Feature | Description | Differentiator |
|---|---|---|
| `@` trigger | Type `@` to open contact autocomplete (filter by name or org) | ★ People-aware note editor |
| Contact Link | Creates clickable @Name link that navigates to contact profile | — |
| Meeting Attendees | Chip-based attendee field in meeting notes, multi-select with search | ★ Meeting-to-contact integration |

---

## 4. Task Management

| Feature | Description | Differentiator |
|---|---|---|
| Task Creation | Create tasks from toolbar, keyboard shortcut C, selection-to-task, or list extraction | ★ Multiple creation paths |
| Due Dates | Popover date picker per task with clear option | — |
| Recurrence | Daily, Weekdays, Weekly, Monthly — auto-creates next instance on completion | ★ Weekday-aware recurrence |
| Smart Sections | Auto-sorted: Overdue (red), Due Today (amber), Upcoming, No Due Date | ★ Urgency-color-coded sections |
| Inline Tasks in Notes | Tasks embedded directly in note content, checkbox syncs to task system | ★ Note-embedded task creation |
| Extract List to Tasks | Convert any bullet/numbered list into individual tasks with per-item due dates | ★ List-to-task extraction |
| Selection to Task | Highlight text in editor, click Create Task in float toolbar | ★ Selection-based task capture |
| Note Link | Tasks can link back to the note they were created from | ★ Bidirectional task-note link |
| Task Notes | Expandable rich-text notes area per task with URL auto-extraction | — |
| Completion Animation | Chime sound + CSS animation on task completion | Satisfying UX detail |
| Auto-Archive | Completed tasks auto-archived after configurable delay (default 7 days) | ★ Configurable archive delay |
| Archive View | Browse, restore, or permanently delete archived tasks | — |
| Email Drag-and-Drop | Drag Outlook emails onto task panel to create follow-up tasks with deep links | ★ Outlook email integration |

---

## 5. Inbox & Triage System

OrbitHq routes all scratchpads and short/unfoldered notes to an inbox for processing — a concept borrowed from GTD (Getting Things Done) methodology:

| Feature | Description | Differentiator |
|---|---|---|
| Inbox Definition | Scratchpads + notes with no folder under configurable word threshold (default 50) | ★ Automatic inbox routing |
| Aged Notifications | Items in inbox 24+ hours highlighted in amber | ★ Aging indicator |
| Card-Stack Processor | Sequential review UI: Apply (type + folder), Skip, Discard, Convert to Task | ★ Card-stack triage UX |
| Progress Tracking | Progress bar + session stats: processed/converted/discarded/skipped | ★ Session completion stats |
| Weekly Review Nudge | Smart nudge on configured review day when inbox has aged items | ★ GTD-style weekly review |
| Grid View | Visual grid of all inbox items with quick actions | — |

---

## 6. Follow-Up Tracking

| Feature | Description | Differentiator |
|---|---|---|
| Follow-Up Items | Separate from tasks — track pending items waiting on others | ★ Dedicated follow-up concept |
| Contact Association | Link follow-ups to contacts with autocomplete | ★ People-linked follow-ups |
| Due Dates & Overdue | Color-coded overdue (red) and due today (amber) | — |
| Three Panel Modes | Normal (75/25 split), Collapsed, Full-screen follow-up view | ★ Flexible panel layouts |
| Mark Received | Archive follow-up with completion animation when response received | ★ Received vs. pending state |
| Source Note Link | Follow-ups link back to originating note | — |

---

## 7. Organization: Folders & Tags

| Feature | Description | Differentiator |
|---|---|---|
| Hierarchical Folders | Two-level folder hierarchy (parent + sub-folder) | — |
| Folder Note Counts | Badge shows number of notes per folder | — |
| Cascade Delete | Deleting folder un-assigns notes before removing, prevents data loss | — |
| Tags with Colors | 8 predefined tag colors, multiple tags per note | ★ Color-coded tagging |
| Tag Filter | Click tag in sidebar to filter all notes by that tag | — |
| Note Pinning | Pin important notes to top of list, persisted in state | — |

---

## 8. Contacts Directory

| Feature | Description | Differentiator |
|---|---|---|
| Contact Profiles | Name, email, phone, organization, role, notes fields | — |
| Directory Search | Filter contacts by name, email, or organization | — |
| Mailto Links | Email field renders as clickable mailto link | — |
| Follow-Up Count Badge | Shows how many pending follow-ups are linked to each contact | ★ Relationship-to-followup count |
| Inline Contact Creation | Create contacts on-the-fly during meeting attendee or follow-up capture flows | ★ Context-aware inline creation |

---

## 9. Global Search

| Feature | Description | Differentiator |
|---|---|---|
| Real-Time Search | Results appear as you type in the top search bar | — |
| Dual Result Types | Returns both matching notes (title + content) and matching tasks | ★ Cross-type search |
| Task Urgency Colors | Task results color-coded by urgency (overdue/today/upcoming) | ★ Visual urgency in results |
| Result Navigation | Click note to open, click task to scroll and highlight in panel | — |

---

## 10. Multi-Notebook System

| Feature | Description | Differentiator |
|---|---|---|
| Multiple Notebooks | Create and switch between independent notebooks | ★ True multi-notebook isolation |
| Local File Sync | Connect a notebook to a JSON file via File System Access API | ★ Browser-native file persistence |
| IndexedDB Handle Cache | File handles persisted via IndexedDB, survive browser restarts | ★ Persistent file permission caching |
| Permission Management | Handles granted/prompt/denied states, reconnection modal on permission loss | Graceful permission recovery |
| Graceful Fallback | Falls back to localStorage if File System Access API unavailable | ★ Progressive enhancement |
| Data Export/Import | Export full notebook as timestamped JSON, import from JSON file | ★ Portable data format |
| Legacy Migration | Auto-migrates single-notebook localStorage data to new multi-notebook registry | Backward compatibility |

---

## 11. Customization & Settings

| Feature | Description | Differentiator |
|---|---|---|
| 5 Themes | Clean, Clean-Dark, Vibrant, Carbon, Aurora — via CSS custom properties | ★ 5 built-in themes |
| Font Size Control | Small, Default, Large, XLarge — via data attribute on `<html>` | Accessibility font scaling |
| Per-Heading Styles | Custom color and font-size per heading level with live preview injection | ★ Per-heading customization |
| Template Editor | Edit default note templates per type with rich formatting toolbar | ★ Editable type templates |
| Archive Delay | Configurable days before auto-archiving completed tasks | Configurable archive delay |
| Word Threshold | Configure minimum words to exclude notes from inbox triage | Configurable inbox threshold |
| Review Day | Configure day-of-week for weekly review nudge | Configurable review schedule |

---

## 12. User Experience Features

| Feature | Description | Differentiator |
|---|---|---|
| Keyboard Shortcuts | C (capture), N (new note), K (search), ? (help), E (email FU), M (quick capture) | ★ Vim-style single-key navigation |
| First-Launch Tour | 10-step spotlight walkthrough on first use, keyboard-navigable | ★ Spotlight-style onboarding tour |
| Smart Nudges | Weekly review nudge + aged notes nudge with snooze option | ★ Contextual productivity nudges |
| Resizable Panels | Drag dividers to resize task/notes/editor panels, sizes persisted | ★ Persistent panel sizing |
| Collapsible Panels | Task and notes list panels can be collapsed to header bar | Panel collapse controls |
| Toast Notifications | Brief success toasts for non-blocking feedback | — |
| Confirmation Dialogs | Modal confirmations for all destructive actions | — |
| Note Duplication | Duplicate a note with one click from editor toolbar | — |

---

## Key Differentiators vs. Other Note-Taking Apps

The following capabilities set OrbitHq apart from common alternatives like Notion, Obsidian, Apple Notes, Evernote, and Roam Research:

1. **Truly local-first, zero-server** — All data stays on device. No account required, no cloud sync, no telemetry.
2. **File System Access API** — Connect notebooks to plain JSON files on disk — readable, portable, and not locked into a proprietary format.
3. **Integrated follow-up tracking** — A dedicated follow-up system (separate from tasks) for items waiting on other people — rare in note apps.
4. **Inbox triage with card-stack UX** — GTD-inspired inbox with a card-stack processor for sequential review of unprocessed notes.
5. **Email drag-and-drop to task** — Drag Outlook emails onto the task panel to auto-create follow-up tasks with deep links back to the email.
6. **Six typed notes with metadata** — Each note type carries structured metadata fields (e.g., idea status, snippet language, meeting attendees).
7. **Inline tasks in notes** — Tasks embedded inside note content with checkboxes that sync bidirectionally to the task system.
8. **Extract list to tasks** — Convert bullet/numbered list items into tasks with individual due dates in one operation.
9. **Contacts system with note integration** — Meeting notes link to contacts as attendees; follow-ups link to contacts; @-mention contacts in any note.
10. **Per-heading style customization** — Users can set custom color and font-size per heading level with live preview — finer than most apps' theme systems.
11. **Weekday-aware recurrence** — Recurring tasks can skip weekends with a "Weekdays" option.
12. **Smart weekly review nudge** — App nudges users on their configured review day when aged inbox items accumulate.
