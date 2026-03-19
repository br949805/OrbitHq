// ── resize.js ──────────────────────────────────────────────────
// Resizable panel handles with localStorage persistence.
// Panels: sidebar, task-panel, notes-list.
// ──────────────────────────────────────────────────────────────

const PANELS_KEY = 'nucleus_panels_v1';
const PANEL_DEFAULTS = { sidebarWidth: 192, taskWidth: 360, notesListWidth: 256 };

function loadPanelSizes() {
  try {
    const s = localStorage.getItem(PANELS_KEY);
    return s ? { ...PANEL_DEFAULTS, ...JSON.parse(s) } : { ...PANEL_DEFAULTS };
  } catch(e) { return { ...PANEL_DEFAULTS }; }
}

function savePanelSizes(sizes) {
  try { localStorage.setItem(PANELS_KEY, JSON.stringify(sizes)); } catch(e) {}
}

function applyPanelSizes() {
  const sizes = loadPanelSizes();
  const sidebar   = document.getElementById('sidebar');
  const taskPanel = document.getElementById('task-panel');
  const notesList = document.getElementById('notes-list');
  if (sidebar)   { sidebar.style.width   = sizes.sidebarWidth   + 'px'; sidebar.style.minWidth   = sizes.sidebarWidth   + 'px'; }
  if (taskPanel) { taskPanel.style.width = sizes.taskWidth      + 'px'; taskPanel.style.minWidth = sizes.taskWidth      + 'px'; }
  if (notesList) { notesList.style.width = sizes.notesListWidth + 'px'; notesList.style.minWidth = sizes.notesListWidth + 'px'; }
}

function initResize() {
  applyPanelSizes();

  function makeDragger(handleId, panelId, key, minW, maxW) {
    const handle = document.getElementById(handleId);
    const panel  = document.getElementById(panelId);
    if (!handle || !panel) return;

    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = panel.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';

      function onMove(ev) {
        const w = Math.max(minW, Math.min(maxW, startW + (ev.clientX - startX)));
        panel.style.width    = w + 'px';
        panel.style.minWidth = w + 'px';
      }

      function onUp() {
        handle.classList.remove('dragging');
        document.body.style.cursor     = '';
        document.body.style.userSelect = '';
        const sizes = loadPanelSizes();
        sizes[key] = panel.offsetWidth;
        savePanelSizes(sizes);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  makeDragger('sidebar-resize', 'sidebar',    'sidebarWidth',   120, 340);
  makeDragger('task-resize',    'task-panel', 'taskWidth',      180, 600);
  makeDragger('notes-resize',   'notes-list', 'notesListWidth', 140, 520);
}
