const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType,
  ShadingType, PageNumber, Header, Footer
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 36, color: "14532D" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, size: 28, color: "166534" })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text, bold: true, size: 24, color: "15803D" })]
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, color: "374151", ...opts })]
  });
}

function bullet(text, sub = false) {
  return new Paragraph({
    numbering: { reference: sub ? "sub-bullets" : "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: sub ? 20 : 22, color: sub ? "6B7280" : "374151" })]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });
}

function recTable(rows) {
  const tierColors = {
    "Quick Win": "D1FAE5",
    "Short-Term": "DBEAFE",
    "Medium-Term": "FEF3C7",
    "Long-Term": "EDE9FE"
  };
  const tierText = {
    "Quick Win": "065F46",
    "Short-Term": "1E40AF",
    "Medium-Term": "92400E",
    "Long-Term": "5B21B6"
  };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 3760, 1500, 1500],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Feature", "Description", "Tier", "Impact"].map((h, i) =>
          new TableCell({
            borders,
            width: { size: [2600, 3760, 1500, 1500][i], type: WidthType.DXA },
            shading: { fill: "14532D", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22, color: "FFFFFF" })] })]
          })
        )
      }),
      ...rows.map((r, idx) => {
        const tier = r[2];
        return new TableRow({
          children: r.map((cell, i) =>
            new TableCell({
              borders,
              width: { size: [2600, 3760, 1500, 1500][i], type: WidthType.DXA },
              shading: {
                fill: i === 2 ? (tierColors[tier] || "F3F4F6") : (idx % 2 === 0 ? "F0FDF4" : "FFFFFF"),
                type: ShadingType.CLEAR
              },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({
                children: [new TextRun({
                  text: cell,
                  size: 20,
                  color: i === 2 ? (tierText[tier] || "374151") : "374151",
                  bold: i === 2
                })]
              })]
            })
          )
        });
      })
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
        reference: "sub-bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2013", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }]
      },
      {
        reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "14532D" },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "166534" },
        paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "15803D" },
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
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "15803D" } },
          children: [
            new TextRun({ text: "OrbitHq", bold: true, size: 22, color: "15803D" }),
            new TextRun({ text: "  |  Recommended Features Roadmap", size: 22, color: "6B7280" })
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
        children: [new TextRun({ text: "OrbitHq", bold: true, size: 64, color: "14532D" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Recommended Features Roadmap", size: 28, color: "15803D" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "Prioritized recommendations to close gaps and expand capabilities while preserving the local-first, privacy-focused identity", size: 22, color: "6B7280", italics: true })]
      }),

      // Tiers legend
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Implementation Tiers:", bold: true, size: 22, color: "374151" })]
      }),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 2340, 2340],
        rows: [new TableRow({
          children: [
            ["Quick Win", "D1FAE5", "065F46", "Small effort, high value. Can be shipped in days."],
            ["Short-Term", "DBEAFE", "1E40AF", "Weeks of work. Closes key gaps vs. competitors."],
            ["Medium-Term", "FEF3C7", "92400E", "Months of work. Expands platform reach."],
            ["Long-Term", "EDE9FE", "5B21B6", "Major features. Potential product repositioning."]
          ].map(([label, fill, color, desc]) =>
            new TableCell({
              borders,
              width: { size: 2340, type: WidthType.DXA },
              shading: { fill, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color })] }),
                new Paragraph({ children: [new TextRun({ text: desc, size: 18, color: "6B7280" })] })
              ]
            })
          )
        })]
      }),
      spacer(),

      // Master table
      h1("Complete Recommendations Table"),
      recTable([
        // Quick Wins
        ["PWA Manifest", "Add manifest.json + service worker so users can install OrbitHq as a desktop/mobile app", "Quick Win", "High"],
        ["prefers-color-scheme", "Auto-detect OS dark mode and apply dark theme automatically", "Quick Win", "Medium"],
        ["Re-launch Tour", "Add a \u201CRestart Tour\u201D button in settings", "Quick Win", "Low"],
        ["PDF / HTML Export", "Export a note to PDF or clean HTML for sharing", "Quick Win", "High"],
        ["Note Print Styles", "Add CSS @media print for clean note printing", "Quick Win", "Low"],
        ["Syntax Highlighting", "Add Prism.js or similar to render code blocks with syntax colors", "Quick Win", "Medium"],
        ["Read / Focus Mode", "Toggle distraction-free reading mode per note (hides editor chrome)", "Quick Win", "Medium"],
        ["Note Locking", "Lock a note as read-only to prevent accidental edits", "Quick Win", "Low"],
        ["Bulk Note Operations", "Multi-select notes to batch move, tag, archive, or delete", "Quick Win", "Medium"],
        ["Dark Mode Auto-Detect", "Follow system prefers-color-scheme preference automatically", "Quick Win", "Low"],
        // Short-term
        ["Image Paste & Upload", "Paste screenshots or drop image files into notes; store as base64 or blob URL", "Short-Term", "High"],
        ["Inline Search Filters", "Add type:, folder:, tag:, date: filter syntax to search bar", "Short-Term", "High"],
        ["Cross-Notebook Search", "Search across all notebooks simultaneously", "Short-Term", "High"],
        ["Task Subtasks", "Add collapsible sub-task list under any task", "Short-Term", "High"],
        ["Task Priorities", "Add High / Medium / Low priority field to tasks", "Short-Term", "Medium"],
        ["Custom Recurrence", "Support custom intervals (e.g., every 3 weeks, first Monday of month)", "Short-Term", "Medium"],
        ["Note Version History", "Store the last N versions of each note with diff view and restore", "Short-Term", "High"],
        ["Auto-Backup to File", "Scheduled auto-export to a JSON file (e.g., daily) using File System API", "Short-Term", "High"],
        ["Per-Note Export", "Export individual notes as Markdown, HTML, or PDF", "Short-Term", "Medium"],
        ["Import from Markdown", "Import .md files into notes, preserving heading structure", "Short-Term", "Medium"],
        ["Table Improvements", "Add resize handles, merge cells, add/delete rows/columns from context menu", "Short-Term", "Medium"],
        ["Contact Custom Fields", "Add custom field support to contacts (social links, birthday, address)", "Short-Term", "Low"],
        // Medium-term
        ["Mobile Responsive Layout", "Redesign panel layout for single-column mobile view with bottom navigation", "Medium-Term", "High"],
        ["End-to-End Encrypted Sync", "Optional encrypted sync via user-owned cloud storage (iCloud/Dropbox/S3)", "Medium-Term", "High"],
        ["Attachment Support", "Attach files (PDFs, images, documents) to notes; store in IndexedDB or filesystem", "Medium-Term", "High"],
        ["Shareable Read-Only Links", "Generate a read-only link to a note (via a minimal local server or export)", "Medium-Term", "Medium"],
        ["Calendar View for Tasks", "Month/week calendar view showing tasks by due date", "Medium-Term", "High"],
        ["Google Calendar Integration", "Two-way sync tasks and events with Google Calendar", "Medium-Term", "Medium"],
        ["Gmail / IMAP Integration", "Capture emails as follow-ups from Gmail in addition to Outlook drag-drop", "Medium-Term", "Medium"],
        ["Zapier / Webhook Support", "Outbound webhooks on task creation, completion, or note creation", "Medium-Term", "Medium"],
        ["Indexed Search (SQLite WASM)", "Replace linear search with a proper inverted index for large notebooks", "Medium-Term", "High"],
        ["Drawing / Whiteboard", "Embedded lightweight canvas for quick sketches within notes", "Medium-Term", "Medium"],
        ["Math / LaTeX Support", "Render inline and block LaTeX equations in notes", "Medium-Term", "Low"],
        ["AI Writing Assistant", "On-device or optional cloud AI for note summarization, action-item extraction, and drafting", "Medium-Term", "High"],
        // Long-term
        ["Native Desktop App", "Electron or Tauri wrapper for true offline native experience with OS notifications", "Long-Term", "High"],
        ["Plugin / Extension System", "Public API + plugin manifest for user and third-party extensions", "Long-Term", "High"],
        ["Team Workspaces", "Shared notebooks with role-based access for small teams", "Long-Term", "High"],
        ["Bi-directional External Sync", "Sync individual notes as Markdown files to a folder (Obsidian-compatible)", "Long-Term", "Medium"],
        ["Task Time Tracking", "Log time spent on tasks with start/stop timer and totals", "Long-Term", "Medium"],
        ["Advanced Graph View", "Filter graph by type/folder/tag, cluster views, visual layout options", "Long-Term", "Low"],
      ]),
      spacer(),

      // Detailed sections
      h1("Tier 1: Quick Wins"),
      body("These recommendations require minimal development effort and can dramatically improve user experience and adoption:"),
      spacer(),

      h2("1. Progressive Web App (PWA) Manifest"),
      body("Adding a manifest.json and a minimal service worker would allow users to install OrbitHq directly to their desktop or mobile home screen. This requires no backend, costs almost nothing to implement, and removes the friction of \u201Cjust another browser tab.\""),
      bullet("Add manifest.json with name, icons, start_url, display: standalone"),
      bullet("Register a service worker for offline caching of the app shell"),
      bullet("Users on mobile can install and launch like a native app"),
      bullet("Estimated effort: 1\u20132 days"),
      spacer(),

      h2("2. PDF / HTML Export per Note"),
      body("Currently there is no way to share a note with someone outside the app. A simple window.print() call with a CSS @media print stylesheet, or html2canvas + jsPDF, would enable note sharing without any server requirement."),
      bullet("Export current note to printer-friendly PDF via browser print dialog"),
      bullet("Export to self-contained HTML file for emailing"),
      bullet("Estimated effort: 1 day"),
      spacer(),

      h2("3. Syntax Highlighting in Code Blocks"),
      body("The Snippet note type is specifically designed for code, yet code blocks render as plain text. Adding Prism.js (CDN, ~30KB) would provide syntax highlighting for 200+ languages with zero configuration."),
      bullet("Load Prism.js lazily when a code block is rendered"),
      bullet("Auto-detect language from the language metadata field of Snippet notes"),
      bullet("Estimated effort: 0.5 days"),
      spacer(),

      h2("4. Read / Focus Mode"),
      body("Adding a read mode toggle would hide the editor chrome (toolbar, metadata fields) and render note content as clean, formatted HTML \u2014 ideal for reviewing meeting notes or reading long-form content."),
      bullet("Toggle button in editor toolbar"),
      bullet("CSS class on editor container that hides toolbar, input borders, and metadata"),
      bullet("Estimated effort: 0.5 days"),
      spacer(),

      h1("Tier 2: Short-Term Improvements"),
      body("These features close the most critical gaps vs. competing tools and would meaningfully increase retention:"),
      spacer(),

      h2("5. Image Paste & Upload"),
      body("The inability to paste a screenshot into a note is a frequent pain point for knowledge workers who capture information visually. Implementation options:"),
      bullet("Listen for paste events in the editor, detect image/png or image/jpeg in clipboard"),
      bullet("Convert to base64 data URL and insert as <img> in the note content"),
      bullet("For large images, store in IndexedDB keyed by note ID to keep localStorage size manageable"),
      bullet("Estimated effort: 2\u20133 days"),
      spacer(),

      h2("6. Note Version History"),
      body("Without version history, a mis-click or accidental clear can destroy meeting notes or project plans. A simple ring-buffer approach within existing localStorage would work:"),
      bullet("On every save, push current content to a versions[] array (cap at 20 entries)"),
      bullet("Add a \u201CVersion History\u201D option in the editor\u2019s \u2026 menu"),
      bullet("Modal shows timestamped snapshots; click to preview or restore"),
      bullet("Estimated effort: 1\u20132 days"),
      spacer(),

      h2("7. Task Subtasks"),
      body("The flat task list is limiting for project planning. Adding a collapsible sub-task list under any parent task would significantly increase utility without requiring a full project management redesign:"),
      bullet("Sub-tasks stored as tasks[] array inside the parent task object"),
      bullet("Rendered as indented checklist under the parent task row"),
      bullet("Parent task completion percentage derived from sub-task progress"),
      bullet("Estimated effort: 3\u20134 days"),
      spacer(),

      h2("8. Advanced Search Filters"),
      body("Adding filter syntax to the search bar (type:meeting, folder:Projects, tag:urgent, before:2025-01-01) would make OrbitHq\u2019s search feel professional and handle large notebooks gracefully:"),
      bullet("Parse filter tokens before running content search"),
      bullet("Apply filters as pre-pass on the notes array before text matching"),
      bullet("Show active filters as chips in the search bar"),
      bullet("Estimated effort: 2\u20133 days"),
      spacer(),

      h2("9. Auto-Backup to File"),
      body("A daily auto-export to the connected notebook file (or a parallel backup file) using the File System Access API would eliminate the risk of localStorage data loss without requiring any server:"),
      bullet("On app load, check if 24 hours have passed since last backup"),
      bullet("Write a timestamped backup JSON alongside the main notebook file"),
      bullet("Keep the last 7 backup files, rotate older ones"),
      bullet("Estimated effort: 1 day"),
      spacer(),

      h1("Tier 3: Medium-Term Platform Expansion"),
      body("These features represent the largest growth opportunities and would open OrbitHq to broader audiences:"),
      spacer(),

      h2("10. Mobile Responsive Layout"),
      body("A single-column layout with bottom navigation tabs (Notes, Tasks, Inbox, Contacts) would make OrbitHq usable on smartphones. This is the most impactful medium-term investment:"),
      bullet("CSS media queries to stack the three-panel layout into a single column on narrow screens"),
      bullet("Bottom nav bar to switch between panels (replacing sidebar)"),
      bullet("Float toolbar replaced by long-press context menu on mobile"),
      bullet("Estimated effort: 2\u20133 weeks"),
      spacer(),

      h2("11. End-to-End Encrypted Sync"),
      body("Rather than building a backend, OrbitHq could offer encrypted sync via user-owned storage. This preserves the privacy-first philosophy while solving the cross-device problem:"),
      bullet("Encrypt notebook JSON with a user-provided password using the Web Crypto API"),
      bullet("Sync the encrypted blob to Dropbox, iCloud Drive, or Google Drive via their JavaScript SDKs"),
      bullet("Decrypt on load with user\u2019s password"),
      bullet("Zero-knowledge: OrbitHq never sees unencrypted data"),
      bullet("Estimated effort: 4\u20136 weeks"),
      spacer(),

      h2("12. AI Writing Assistant"),
      body("An optional, privacy-respecting AI integration would set OrbitHq apart in a meaningful way. Options that preserve the local-first identity:"),
      bullet("Use the Claude API (or user-provided API key) for cloud AI features: note summarization, action item extraction from meeting notes, drafting assistance"),
      bullet("Use a local model (Ollama, WebLLM) for fully on-device processing"),
      bullet("Contextual suggestions: meeting notes \u2192 auto-extract action items as tasks"),
      bullet("Estimated effort: 2\u20134 weeks (Claude API path)"),
      spacer(),

      h2("13. Calendar View for Tasks"),
      body("A monthly/weekly calendar view showing tasks by due date is one of the most commonly expected features in productivity apps. Using a lightweight calendar library (e.g., FullCalendar or a custom canvas render):"),
      bullet("Month view with task dots/chips on due dates"),
      bullet("Click a day to see tasks due that day"),
      bullet("Drag tasks between days to reschedule"),
      bullet("Estimated effort: 2\u20133 weeks"),
      spacer(),

      h1("Tier 4: Long-Term Vision"),
      body("These are significant investments that would reposition OrbitHq as a platform rather than a single-user tool:"),
      spacer(),

      h2("14. Native Desktop App (Electron / Tauri)"),
      body("A native desktop wrapper would enable OS-level features that browser apps cannot access: system notifications, global hotkeys, system tray, file watching, and deeper OS integration. Tauri (Rust) is recommended over Electron for its smaller binary size and better performance:"),
      bullet("Global capture hotkey (e.g., Ctrl+Shift+C) to open quick capture from anywhere"),
      bullet("System tray icon with task count badge"),
      bullet("Native OS notifications for overdue tasks"),
      bullet("Direct file system access without the File System Access API"),
      spacer(),

      h2("15. Plugin / Extension System"),
      body("A well-designed plugin API would enable the community to extend OrbitHq without forking. Key design principles:"),
      bullet("Plugin manifest file declaring hooks and capabilities"),
      bullet("Sandboxed execution (iframe or Web Worker) to protect core data"),
      bullet("Hooks: onNoteSave, onTaskCreate, onInboxProcess, renderSidebar"),
      bullet("Example plugins: Toggl time tracking, Slack notifications, custom note types"),
      spacer(),

      h2("16. Obsidian-Compatible Markdown Sync"),
      body("Syncing notes as individual .md files to a watched folder would make OrbitHq interoperable with Obsidian, VS Code, and any text editor. This is the most compelling interoperability story for the power-user market:"),
      bullet("Each note saved as a separate .md file in a user-selected folder"),
      bullet("OrbitHq watches the folder for external changes and syncs back"),
      bullet("Wiki links rendered as [[NoteTitle]] in Markdown for Obsidian compatibility"),
      bullet("Task frontmatter (due, recur) preserved in YAML front matter"),
      spacer(),

      // Summary
      h1("Recommended Prioritization"),
      body("If resources are limited, the following order maximizes user impact per unit of effort:"),
      spacer(),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "PWA Manifest + Service Worker \u2014 installability is foundational for retention", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "Note Version History \u2014 data safety is a trust issue; one lost meeting note drives churn", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "Image Paste \u2014 most commonly expected feature missing from the editor", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "PDF / HTML Export \u2014 sharing is critical for professional use cases", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "Auto-Backup \u2014 eliminates the data loss risk of localStorage dependency", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "Task Subtasks + Priorities \u2014 closes the task management gap vs. Todoist / Things", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "Mobile Layout \u2014 opens the app to 50%+ of potential users currently locked out", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "Encrypted Sync \u2014 solves cross-device without compromising privacy-first positioning", size: 22, color: "374151" })]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "AI Writing Assistant \u2014 highest potential differentiator in the note-taking market for 2025+", size: 22, color: "374151" })]
      }),
      spacer(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/OrbitHq_Recommendations.docx", buf);
  console.log("Created OrbitHq_Recommendations.docx");
});
