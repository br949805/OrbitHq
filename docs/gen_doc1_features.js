const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType,
  ShadingType, PageNumber, Header, Footer
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const accentBorder = { style: BorderStyle.SINGLE, size: 4, color: "4F46E5" };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 36, color: "1E1B4B" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, size: 28, color: "312E81" })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text, bold: true, size: 24, color: "4F46E5" })]
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, color: "374151", ...opts })]
  });
}

function bullet(text, highlight = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({
      text,
      size: 22,
      color: highlight ? "4F46E5" : "374151",
      bold: highlight
    })]
  });
}

function differentiatorBullet(text) {
  return new Paragraph({
    numbering: { reference: "stars", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, color: "065F46", bold: true })]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });
}

function featureTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 4360, 2000],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          ["Feature", "Description", "Differentiator"].map((h, i) =>
            new TableCell({
              borders,
              width: { size: [3000, 4360, 2000][i], type: WidthType.DXA },
              shading: { fill: "312E81", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22, color: "FFFFFF" })] })]
            })
          )
        ]
      }),
      ...rows.map((r, idx) => new TableRow({
        children: r.map((cell, i) =>
          new TableCell({
            borders,
            width: { size: [3000, 4360, 2000][i], type: WidthType.DXA },
            shading: { fill: idx % 2 === 0 ? "F5F3FF" : "FFFFFF", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({
                text: cell,
                size: 20,
                color: i === 2 && cell !== "—" ? "065F46" : "374151",
                bold: i === 2 && cell !== "—"
              })]
            })]
          })
        )
      }))
    ]
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      },
      {
        reference: "stars",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2605", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1E1B4B" },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "312E81" },
        paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "4F46E5" },
        paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "4F46E5" } },
          children: [
            new TextRun({ text: "OrbitHq", bold: true, size: 22, color: "4F46E5" }),
            new TextRun({ text: "  |  Complete Feature List & Competitive Differentiators", size: 22, color: "6B7280" })
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" } },
          children: [
            new TextRun({ text: "Page ", size: 18, color: "9CA3AF" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "9CA3AF" }),
            new TextRun({ text: " of ", size: 18, color: "9CA3AF" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "9CA3AF" })
          ]
        })]
      })
    },
    children: [
      // Cover
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: "OrbitHq", bold: true, size: 64, color: "1E1B4B" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Complete Feature List & Competitive Differentiators", size: 28, color: "4F46E5" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "A Privacy-First, Local-First Note-Taking & Productivity Application", size: 22, color: "6B7280", italics: true })]
      }),

      // Intro
      h1("Overview"),
      body("OrbitHq is a sophisticated, privacy-focused productivity application built entirely in vanilla JavaScript with no server dependencies. All data lives on the user\u2019s device. It combines rich note-taking, task management, follow-up tracking, and personal knowledge management into a single, fast, offline-capable web app."),
      spacer(),

      // Section 1: Core editing
      h1("1. Rich Text Editor"),
      h2("Core Capabilities"),
      featureTable([
        ["ContentEditable Editor", "Full HTML-based rich text with formatting toolbar", "No dependency on heavy frameworks"],
        ["Float Toolbar", "Context-sensitive toolbar appears on text selection with formatting buttons", "Clean, distraction-free UX"],
        ["Bold / Italic / Underline", "Ctrl+B/I/U keyboard shortcuts plus toolbar buttons", "\u2014"],
        ["Headings H1\u2013H3", "Heading styles with custom color & size per heading level", "Per-heading style customization"],
        ["Lists (Bullet & Numbered)", "Full list support with Tab indent/outdent", "\u2014"],
        ["Blockquote & Code Blocks", "Semantic HTML blockquote and <pre><code> support", "\u2014"],
        ["Tables", "Insert tables via slash command", "\u2014"],
        ["Horizontal Dividers", "Insert <hr> via --- markdown shortcut", "\u2014"],
        ["Callout Blocks", "Custom callout div elements via slash command", "\u2014"],
        ["Autosave", "2-second debounce autosave with visual \u201Csaving\u2026\u201D/\u201Csaved\u201D indicator", "Non-intrusive status feedback"],
        ["Force Save", "Ctrl+S / Cmd+S immediate save", "\u2014"],
      ]),
      spacer(),

      h2("Markdown Shortcut System"),
      body("OrbitHq converts typed markdown syntax into formatted HTML in real-time, without requiring a separate markdown rendering pass:"),
      featureTable([
        ["Block Headings", "Type # / ## / ### + space at line start to create H1/H2/H3", "\u2605 Inline markdown in a rich-text editor"],
        ["Bullet Lists", "Type - or * + space to start bullet list", "\u2014"],
        ["Numbered Lists", "Type 1. + space to start ordered list", "\u2014"],
        ["Code Blocks", "Type ``` + Enter to create code block", "\u2014"],
        ["Horizontal Rule", "Type --- + Enter for <hr>", "\u2014"],
        ["Inline Bold", "Wrap text in **bold** to convert to <strong>", "\u2605 Inline markdown conversion"],
        ["Inline Code", "Wrap text in `backticks` for <code>", "\u2605 Inline markdown conversion"],
      ]),
      spacer(),

      h2("Slash Command System"),
      body("Typing / on a blank line opens a command palette with 11 structural elements:"),
      bullet("H1, H2, H3 headings"),
      bullet("Bullet list, Ordered list"),
      bullet("Blockquote, Code block, Table"),
      bullet("Horizontal divider, Callout block"),
      bullet("Task item (inline task)"),
      body("Commands support keyword search and keyboard navigation (arrows, Tab, Enter)."),
      spacer(),

      // Section 2: Note types
      h1("2. Six Specialized Note Types"),
      body("Each note type carries its own icon, color, template, and metadata fields:"),
      featureTable([
        ["Scratchpad (\u2746)", "Quick unstructured capture, always routed to inbox", "\u2605 Dedicated quick-capture type"],
        ["Meeting (\u25C9)", "Structured template: Agenda, Discussion, Decisions, Action Items + attendee chips", "\u2605 Attendee linking to Contacts"],
        ["Snippet (\u2328)", "Code/tech references with language, source URL, context, date fields", "\u2605 Developer-oriented note type"],
        ["Idea (\u25CE)", "Concept capture with status (Raw/Developing/Mature), category, date", "\u2605 Idea lifecycle tracking"],
        ["Plan (\u2586)", "Goal planning with status (Draft/In Progress/Complete) and target date", "\u2605 Built-in planning workflow"],
        ["Note (\u25CB)", "General purpose note", "\u2014"],
      ]),
      body("Every type\u2019s default template is editable by the user via the built-in template editor."),
      spacer(),

      // Section 3: Linking
      h1("3. Knowledge Linking System"),
      h2("Wiki-Style Note Linking"),
      featureTable([
        ["[[ Trigger", "Type [[ to open note-link autocomplete dropdown (8 suggestions)", "\u2605 Bidirectional wiki linking"],
        ["Backlinks Panel", "Every note shows which other notes link to it, togglable panel", "\u2605 Automatic backlink generation"],
        ["Backlink Persistence", "Open/closed state of backlinks panel persisted across sessions", "\u2014"],
        ["Note Graph View", "Visual node-link diagram of all wiki connections, click-to-navigate", "\u2605 Visual knowledge graph"],
      ]),
      spacer(),
      h2("@Contact Linking"),
      featureTable([
        ["@ Trigger", "Type @ to open contact autocomplete (filter by name or org)", "\u2605 People-aware note editor"],
        ["Contact Link", "Creates clickable @Name link that navigates to contact profile", "\u2014"],
        ["Meeting Attendees", "Chip-based attendee field in meeting notes, multi-select with search", "\u2605 Meeting-to-contact integration"],
      ]),
      spacer(),

      // Section 4: Task Management
      h1("4. Task Management"),
      featureTable([
        ["Task Creation", "Create tasks from toolbar, keyboard shortcut C, selection-to-task, or list extraction", "\u2605 Multiple creation paths"],
        ["Due Dates", "Popover date picker per task with clear option", "\u2014"],
        ["Recurrence", "Daily, Weekdays, Weekly, Monthly \u2014 auto-creates next instance on completion", "\u2605 Weekday-aware recurrence"],
        ["Smart Sections", "Auto-sorted: Overdue (red), Due Today (amber), Upcoming, No Due Date", "\u2605 Urgency-color-coded sections"],
        ["Inline Tasks in Notes", "Tasks embedded directly in note content, checkbox syncs to task system", "\u2605 Note-embedded task creation"],
        ["Extract List to Tasks", "Convert any bullet/numbered list into individual tasks with per-item due dates", "\u2605 List-to-task extraction"],
        ["Selection to Task", "Highlight text in editor, click Create Task in float toolbar", "\u2605 Selection-based task capture"],
        ["Note Link", "Tasks can link back to the note they were created from", "\u2605 Bidirectional task-note link"],
        ["Task Notes", "Expandable rich-text notes area per task with URL auto-extraction", "\u2014"],
        ["Completion Animation", "Chime sound + CSS animation on task completion", "Satisfying UX detail"],
        ["Auto-Archive", "Completed tasks auto-archived after configurable delay (default 7 days)", "\u2605 Configurable archive delay"],
        ["Archive View", "Browse, restore, or permanently delete archived tasks", "\u2014"],
        ["Email Drag-and-Drop", "Drag Outlook emails onto task panel to create follow-up tasks with deep links", "\u2605 Outlook email integration"],
      ]),
      spacer(),

      // Section 5: Inbox
      h1("5. Inbox & Triage System"),
      body("OrbitHq routes all scratchpads and short/unfoldered notes to an inbox for processing \u2014 a concept borrowed from GTD (Getting Things Done) methodology:"),
      featureTable([
        ["Inbox Definition", "Scratchpads + notes with no folder under configurable word threshold (default 50)", "\u2605 Automatic inbox routing"],
        ["Aged Notifications", "Items in inbox 24+ hours highlighted in amber", "\u2605 Aging indicator"],
        ["Card-Stack Processor", "Sequential review UI: Apply (type + folder), Skip, Discard, Convert to Task", "\u2605 Card-stack triage UX"],
        ["Progress Tracking", "Progress bar + session stats: processed/converted/discarded/skipped", "\u2605 Session completion stats"],
        ["Weekly Review Nudge", "Smart nudge on configured review day when inbox has aged items", "\u2605 GTD-style weekly review"],
        ["Grid View", "Visual grid of all inbox items with actions", "\u2014"],
      ]),
      spacer(),

      // Section 6: Follow-Ups
      h1("6. Follow-Up Tracking"),
      featureTable([
        ["Follow-Up Items", "Separate from tasks \u2014 track pending items waiting on others", "\u2605 Dedicated follow-up concept"],
        ["Contact Association", "Link follow-ups to contacts with autocomplete", "\u2605 People-linked follow-ups"],
        ["Due Dates & Overdue", "Color-coded overdue (red) and due today (amber)", "\u2014"],
        ["Three Panel Modes", "Normal (75/25 split), Collapsed, Full-screen follow-up view", "\u2605 Flexible panel layouts"],
        ["Mark Received", "Archive follow-up with completion animation when response received", "\u2605 Received vs. pending state"],
        ["Source Note Link", "Follow-ups link back to originating note", "\u2014"],
      ]),
      spacer(),

      // Section 7: Organization
      h1("7. Organization: Folders & Tags"),
      featureTable([
        ["Hierarchical Folders", "Two-level folder hierarchy (parent + sub-folder) for note organization", "\u2014"],
        ["Folder Note Counts", "Badge shows number of notes per folder", "\u2014"],
        ["Cascade Delete", "Deleting folder un-assigns notes before removing, prevents data loss", "\u2014"],
        ["Tags with Colors", "8 predefined tag colors, multiple tags per note", "\u2605 Color-coded tagging"],
        ["Tag Filter", "Click tag in sidebar to filter all notes by that tag", "\u2014"],
        ["Note Pinning", "Pin important notes to top of list, persisted in state", "\u2014"],
      ]),
      spacer(),

      // Section 8: Contacts
      h1("8. Contacts Directory"),
      featureTable([
        ["Contact Profiles", "Name, email, phone, organization, role, notes fields", "\u2014"],
        ["Directory Search", "Filter contacts by name, email, or organization", "\u2014"],
        ["Mailto Links", "Email field renders as clickable mailto link", "\u2014"],
        ["Follow-Up Count Badge", "Shows how many pending follow-ups are linked to each contact", "\u2605 Relationship-to-followup count"],
        ["Inline Contact Creation", "Create contacts on-the-fly during meeting attendee or follow-up capture flows", "\u2605 Context-aware inline creation"],
      ]),
      spacer(),

      // Section 9: Search
      h1("9. Global Search"),
      featureTable([
        ["Real-Time Search", "Results appear as you type in the top search bar", "\u2014"],
        ["Dual Result Types", "Returns both matching notes (title + content) and matching tasks", "\u2605 Cross-type search"],
        ["Task Urgency Colors", "Task results color-coded by urgency (overdue/today/upcoming)", "\u2605 Visual urgency in results"],
        ["Result Navigation", "Click note to open, click task to scroll and highlight in panel", "\u2014"],
      ]),
      spacer(),

      // Section 10: Multi-Notebook
      h1("10. Multi-Notebook System"),
      featureTable([
        ["Multiple Notebooks", "Create and switch between independent notebooks", "\u2605 True multi-notebook isolation"],
        ["Local File Sync", "Connect a notebook to a JSON file via File System Access API", "\u2605 Browser-native file persistence"],
        ["IndexedDB Handle Cache", "File handles persisted via IndexedDB, survive browser restarts", "\u2605 Persistent file permission caching"],
        ["Permission Management", "Handles granted/prompt/denied states, reconnection modal on permission loss", "\u2614 Graceful permission recovery"],
        ["Graceful Fallback", "Falls back to localStorage if File System Access API unavailable", "\u2605 Progressive enhancement"],
        ["Data Export/Import", "Export full notebook as timestamped JSON, import from JSON file", "\u2605 Portable data format"],
        ["Legacy Migration", "Auto-migrates single-notebook localStorage data to new multi-notebook registry", "\u2614 Backward compatibility"],
      ]),
      spacer(),

      // Section 11: Customization
      h1("11. Customization & Settings"),
      featureTable([
        ["5 Themes", "Clean, Clean-Dark, Vibrant, Carbon, Aurora \u2014 via CSS custom properties", "\u2605 5 built-in themes"],
        ["Font Size Control", "Small, Default, Large, XLarge \u2014 via data attribute on <html>", "\u2614 Accessibility font scaling"],
        ["Per-Heading Styles", "Custom color and font-size per heading level with live preview injection", "\u2605 Per-heading customization"],
        ["Template Editor", "Edit default note templates per type with rich formatting toolbar", "\u2605 Editable type templates"],
        ["Archive Delay", "Configurable days before auto-archiving completed tasks", "\u2614 Configurable archive delay"],
        ["Word Threshold", "Configure minimum words to exclude notes from inbox triage", "\u2614 Configurable inbox threshold"],
        ["Review Day", "Configure day-of-week for weekly review nudge", "\u2614 Configurable review schedule"],
      ]),
      spacer(),

      // Section 12: UX
      h1("12. User Experience Features"),
      featureTable([
        ["Keyboard Shortcuts", "C (capture), N (new note), K (search), ? (help), E (email FU), M (quick capture)", "\u2605 Vim-style single-key navigation"],
        ["First-Launch Tour", "10-step spotlight walkthrough on first use, keyboard-navigable", "\u2605 Spotlight-style onboarding tour"],
        ["Smart Nudges", "Weekly review nudge + aged notes nudge with snooze option", "\u2605 Contextual productivity nudges"],
        ["Resizable Panels", "Drag dividers to resize task/notes/editor panels, sizes persisted", "\u2605 Persistent panel sizing"],
        ["Collapsible Panels", "Task and notes list panels can be collapsed to header bar", "\u2614 Panel collapse controls"],
        ["Toast Notifications", "Brief success toasts for non-blocking feedback", "\u2614 Non-blocking feedback"],
        ["Confirmation Dialogs", "Modal confirmations for all destructive actions", "\u2614 Destructive action safety"],
        ["Note Duplication", "Duplicate a note with one click from editor toolbar", "\u2614 Quick note duplication"],
      ]),
      spacer(),

      // Differentiators summary
      h1("Key Differentiators vs. Other Note-Taking Apps"),
      body("The following capabilities set OrbitHq apart from common alternatives like Notion, Obsidian, Apple Notes, Evernote, and Roam Research:"),
      spacer(),
      differentiatorBullet("Truly local-first, zero-server: All data stays on device. No account required, no cloud sync, no telemetry."),
      differentiatorBullet("File System Access API: Connect notebooks to plain JSON files on disk \u2014 readable, portable, and not locked into a proprietary format."),
      differentiatorBullet("Integrated follow-up tracking: A dedicated follow-up system (separate from tasks) for items waiting on other people \u2014 rare in note apps."),
      differentiatorBullet("Inbox triage with card-stack UX: GTD-inspired inbox with a card-stack processor for sequential review of unprocessed notes."),
      differentiatorBullet("Email drag-and-drop to task: Drag Outlook emails onto the task panel to auto-create follow-up tasks with deep links back to the email."),
      differentiatorBullet("Six typed notes with metadata: Each note type carries structured metadata fields (e.g., idea status, snippet language, meeting attendees)."),
      differentiatorBullet("Inline tasks in notes: Tasks embedded inside note content with checkboxes that sync bidirectionally to the task system."),
      differentiatorBullet("Extract list to tasks: Convert bullet/numbered list items into tasks with individual due dates in one operation."),
      differentiatorBullet("Contacts system with note integration: Meeting notes link to contacts as attendees; follow-ups link to contacts; @-mention contacts in any note."),
      differentiatorBullet("Per-heading style customization: Users can set custom color and font-size per heading level with live preview \u2014 finer than most apps\u2019 theme systems."),
      differentiatorBullet("Weekday-aware recurrence: Recurring tasks can be set to skip weekends with a \u201CWeekdays\u201D option."),
      differentiatorBullet("Smart weekly review nudge: App nudges users on their configured review day when aged inbox items accumulate."),
      spacer(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/OrbitHq_Feature_List.docx", buf);
  console.log("Created OrbitHq_Feature_List.docx");
});
