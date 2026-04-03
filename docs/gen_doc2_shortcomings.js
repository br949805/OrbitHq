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
    children: [new TextRun({ text, bold: true, size: 36, color: "7F1D1D" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, size: 28, color: "991B1B" })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text, bold: true, size: 24, color: "B91C1C" })]
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, color: "374151", ...opts })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, color: "374151" })]
  });
}

function severityTable(rows) {
  const sevColors = { High: "FEE2E2", Medium: "FEF9C3", Low: "F0FDF4" };
  const sevText = { High: "991B1B", Medium: "713F12", Low: "14532D" };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 4160, 1200, 1200],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Shortcoming", "Description", "Severity", "Category"].map((h, i) =>
          new TableCell({
            borders,
            width: { size: [2800, 4160, 1200, 1200][i], type: WidthType.DXA },
            shading: { fill: "7F1D1D", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22, color: "FFFFFF" })] })]
          })
        )
      }),
      ...rows.map((r, idx) => {
        const sev = r[2];
        return new TableRow({
          children: r.map((cell, i) =>
            new TableCell({
              borders,
              width: { size: [2800, 4160, 1200, 1200][i], type: WidthType.DXA },
              shading: {
                fill: i === 2 ? (sevColors[sev] || "F3F4F6") : (idx % 2 === 0 ? "FFF7F7" : "FFFFFF"),
                type: ShadingType.CLEAR
              },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({
                children: [new TextRun({
                  text: cell,
                  size: 20,
                  color: i === 2 ? (sevText[sev] || "374151") : "374151",
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

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "7F1D1D" },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "991B1B" },
        paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "B91C1C" },
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
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "B91C1C" } },
          children: [
            new TextRun({ text: "OrbitHq", bold: true, size: 22, color: "B91C1C" }),
            new TextRun({ text: "  |  Potential Shortcomings & Gaps Analysis", size: 22, color: "6B7280" })
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
        children: [new TextRun({ text: "OrbitHq", bold: true, size: 64, color: "7F1D1D" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Potential Shortcomings & Gaps Analysis", size: 28, color: "B91C1C" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "An honest assessment of current limitations to inform future development", size: 22, color: "6B7280", italics: true })]
      }),

      body("This document provides a frank assessment of areas where OrbitHq currently has limitations, gaps, or potential user friction compared to expectations for a modern productivity application. Items are grouped by category and rated High / Medium / Low severity based on their likely impact on user adoption and retention."),
      spacer(),

      // Full table
      h1("Consolidated Shortcomings Table"),
      severityTable([
        ["No cloud sync / cross-device", "Data lives only in one browser. File System Access API helps but requires manual file management across devices.", "High", "Platform"],
        ["Browser-only, no native app", "Runs in browser tab; no offline app, no system tray, no OS notifications. Closing the tab ends all access.", "High", "Platform"],
        ["No mobile support", "ContentEditable + desktop-centric layout is unusable on touch/mobile screens. No responsive design.", "High", "Platform"],
        ["Single user only", "No collaboration, sharing, or multi-user access to notebooks.", "High", "Collaboration"],
        ["No real-time collaboration", "No simultaneous editing, comments, or presence indicators.", "High", "Collaboration"],
        ["localStorage size limits", "Browsers cap localStorage at ~5-10 MB. Large notebooks with many notes will hit this ceiling.", "High", "Data"],
        ["Fragile data backup", "Export is manual JSON. No automatic backup schedule, no versioning, no revision history.", "High", "Data"],
        ["No version history", "Editing a note is destructive. No undo history past a session, no per-note revision log.", "High", "Data"],
        ["File System API browser support", "File System Access API is Chromium-only. Firefox and Safari users get localStorage fallback only.", "High", "Compatibility"],
        ["No image support in notes", "Editor has no image insertion, paste-image, or media embedding capability.", "Medium", "Editor"],
        ["No attachments", "Cannot attach files (PDFs, images, docs) to notes.", "Medium", "Editor"],
        ["No drawing / whiteboard", "No sketch, diagram, or whiteboard capability.", "Medium", "Editor"],
        ["Table editing is primitive", "Tables can be inserted but have no resize handles, merge cells, or inline toolbar.", "Medium", "Editor"],
        ["Flat tag structure", "Tags are single-level with no nesting or hierarchy.", "Medium", "Organization"],
        ["Folder depth limited to 2", "Only parent + one sub-level. Deep hierarchies not supported.", "Medium", "Organization"],
        ["No full-text search across notebooks", "Search only works within the active notebook. No cross-notebook search.", "Medium", "Search"],
        ["Search not indexed", "Search scans all notes on every keystroke. Will degrade with large datasets.", "Medium", "Search"],
        ["No advanced search syntax", "No boolean operators (AND/OR/NOT), no date filters, no type filters in search.", "Medium", "Search"],
        ["No task subtasks", "Tasks are flat. No nested sub-tasks or checklist hierarchy within a task.", "Medium", "Tasks"],
        ["No task priorities", "Tasks have no priority field (High/Medium/Low) beyond urgency derived from due date.", "Medium", "Tasks"],
        ["No task time tracking", "No time estimates, no time logging, no pomodoro integration.", "Medium", "Tasks"],
        ["Contact fields limited", "No social links, birthday, address, or custom fields on contacts.", "Medium", "Contacts"],
        ["No email integration beyond drag-drop", "Email drag-drop is Outlook-specific. No Gmail, no IMAP, no email composition.", "Medium", "Integrations"],
        ["No calendar integration", "Plan notes have target dates but no calendar view or sync to external calendars.", "Medium", "Integrations"],
        ["No API or webhooks", "No programmatic access. Cannot integrate with Zapier, n8n, or other automation tools.", "Medium", "Integrations"],
        ["No plugin/extension system", "No way for users or third parties to extend functionality.", "Medium", "Extensibility"],
        ["Graph view is basic", "Node-link diagram has no filtering, no clustering, no search, no visual customization.", "Low", "Knowledge"],
        ["Snippet type lacks syntax highlighting", "Code snippets in notes render in plain text, no syntax highlighting in editor or read view.", "Low", "Editor"],
        ["No read view / focus mode", "No distraction-free reading mode. Editor is always in edit mode.", "Low", "UX"],
        ["No note locking", "Notes can be accidentally edited. No read-only lock.", "Low", "UX"],
        ["No print styles", "No CSS print stylesheet for clean note printing.", "Low", "UX"],
        ["No bulk operations on notes", "Cannot select multiple notes for batch move, tag, archive, or delete.", "Low", "UX"],
        ["No note templates on creation", "Templates exist per type but no user-created templates or template picker at note creation.", "Low", "UX"],
        ["Recurring tasks limited", "No custom recurrence intervals (e.g., every 3 weeks, every 2 months, last Friday of month).", "Low", "Tasks"],
        ["No task dependencies", "Tasks cannot be linked as blockers/dependencies of each other.", "Low", "Tasks"],
        ["First-run tour is skippable but not resumable", "After dismissing tour, no way to re-launch it from settings.", "Low", "UX"],
        ["No dark mode auto-detect", "Dark mode theme must be manually selected; doesn\u2019t follow system prefers-color-scheme.", "Low", "UX"],
        ["No import from other apps", "No import from Notion, Obsidian, Evernote, or Markdown files.", "Low", "Data"],
        ["Follow-up due dates not required", "Follow-ups can be created without a due date, making them easy to forget.", "Low", "Follow-ups"],
      ]),
      spacer(),

      // Deep dives by category
      h1("Critical Gaps: Detailed Analysis"),

      h2("1. Platform & Cross-Device Access"),
      body("The most significant structural limitation is the single-browser, single-device model. While the File System Access API provides a path to file-based portability, it requires users to manually manage file locations and is not available in Firefox or Safari. For many knowledge workers who switch between laptop, desktop, tablet, and phone, this is a deal-breaker."),
      bullet("No Android or iOS app"),
      bullet("No Chrome extension for web clipping"),
      bullet("No PWA (Progressive Web App) manifest for installability"),
      bullet("localStorage fragility: clearing browser data erases everything"),
      spacer(),

      h2("2. Collaboration"),
      body("OrbitHq is explicitly designed as a single-user tool, which is a valid positioning decision. However, the absence of even read-only sharing limits use cases in professional settings where sharing a meeting note or project plan is routine."),
      bullet("No shareable read-only link for a note"),
      bullet("No export to PDF or HTML for sharing"),
      bullet("No team workspace concept"),
      spacer(),

      h2("3. Data Safety & Durability"),
      body("The app relies entirely on the user\u2019s diligence for backups. There is no autosave to file (only to localStorage), no version history, and no crash recovery beyond what the browser localStorage retains."),
      bullet("A browser crash or storage clear can result in total data loss"),
      bullet("No diff/merge capability if the same file is edited in two browsers"),
      bullet("JSON export is all-or-nothing \u2014 no per-note export"),
      spacer(),

      h2("4. Editor Limitations"),
      body("For a note-taking app, the editor\u2019s lack of media support is a notable gap. Users who want to paste screenshots, attach documents, or embed diagrams will need to leave the app."),
      bullet("No image paste/upload"),
      bullet("No PDF preview"),
      bullet("No LaTeX/math equations"),
      bullet("No embed support (YouTube, Figma, etc.)"),
      spacer(),

      h2("5. Search & Discovery"),
      body("Search is functional but will degrade as notebooks grow. Without an inverted index or indexed storage (e.g., SQLite via WASM), search performance will drop noticeably beyond a few hundred notes."),
      bullet("Linear scan of all notes on every keystroke"),
      bullet("No fuzzy matching"),
      bullet("No search within a specific folder or tag scope"),
      bullet("No date range search"),
      spacer(),

      h2("6. Mobile & Touch"),
      body("The three-panel desktop layout, contentEditable editor, and hover-triggered interactions are fundamentally incompatible with mobile browsers. This limits OrbitHq to desktop use only."),
      bullet("No touch-optimized note list"),
      bullet("Float toolbar requires text selection \u2014 difficult on touch"),
      bullet("Slash commands require keyboard"),
      bullet("Drag-and-drop resize panels unusable on mobile"),
      spacer(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/OrbitHq_Shortcomings.docx", buf);
  console.log("Created OrbitHq_Shortcomings.docx");
});
