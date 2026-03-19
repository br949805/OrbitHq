// ── graph.js ───────────────────────────────────────────────────
// Force-directed connected-notes graph visualization.
// ──────────────────────────────────────────────────────────────

const GRAPH_COLORS = {
  scratchpad: '#888888',
  meeting:    '#4a9eff',
  snippet:    '#2dd4c4',
  idea:       '#f0a040',
  plan:       '#a855f7',
  note:       '#aaaaaa',
};
const NODE_R = 18;
const MAX_NODES = 80;

let gNodes = [];
let gEdges = [];
let gHovered = null;
let gDragging = null;
let gAnimId = null;
let gSimTick = 0;
let gCanvas = null;
let gCtx = null;

// ── Build ────────────────────────────────────────────────────

function buildGraph() {
  const activeId = S.activeNoteId;
  let notes = S.notes;

  // If too many notes, show neighborhood of active note (up to 2 hops) + fill remainder
  if (notes.length > MAX_NODES) {
    const linked = new Set();
    if (activeId) {
      linked.add(activeId);
      // 1-hop: notes that link to or from active
      notes.forEach(n => {
        const content = n.content || '';
        if (content.includes(`data-note-id="${activeId}"`)) linked.add(n.id);
        if (n.id === activeId) {
          const ids = [...content.matchAll(/data-note-id="([^"]+)"/g)].map(m => m[1]);
          ids.forEach(id => linked.add(id));
        }
      });
      // 2-hop
      const hop1 = [...linked];
      hop1.forEach(hid => {
        const hn = notes.find(n => n.id === hid); if (!hn) return;
        const ids = [...(hn.content || '').matchAll(/data-note-id="([^"]+)"/g)].map(m => m[1]);
        ids.forEach(id => linked.add(id));
        notes.forEach(n => { if ((n.content || '').includes(`data-note-id="${hid}"`)) linked.add(n.id); });
      });
    }
    notes = notes.filter(n => linked.has(n.id)).slice(0, MAX_NODES);
    if (!notes.length) notes = S.notes.slice(0, MAX_NODES);
  }

  const idSet = new Set(notes.map(n => n.id));

  gNodes = notes.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title || 'Untitled',
    x: 0, y: 0, vx: 0, vy: 0,
    active: n.id === activeId,
  }));

  // Edges: wiki links
  const seen = new Set();
  gEdges = [];
  notes.forEach(n => {
    const ids = [...(n.content || '').matchAll(/data-note-id="([^"]+)"/g)].map(m => m[1]);
    ids.forEach(tid => {
      if (!idSet.has(tid)) return;
      const key = [n.id, tid].sort().join('|');
      if (!seen.has(key)) { seen.add(key); gEdges.push({ s: n.id, t: tid }); }
    });
  });
}

function placeNodes() {
  if (!gCanvas) return;
  const cx = gCanvas.width / 2, cy = gCanvas.height / 2;
  const r = Math.min(cx, cy) * 0.65;
  gNodes.forEach((n, i) => {
    const angle = (i / gNodes.length) * Math.PI * 2;
    n.x = cx + r * Math.cos(angle);
    n.y = cy + r * Math.sin(angle);
    n.vx = 0; n.vy = 0;
  });
  const active = gNodes.find(n => n.active);
  if (active) { active.x = cx; active.y = cy; }
}

// ── Simulation ───────────────────────────────────────────────

function tickSim() {
  const repulsion = 2200;
  const springK   = 0.04;
  const springLen = 130;
  const gravity   = 0.008;
  const damping   = 0.82;
  const cx = gCanvas.width / 2, cy = gCanvas.height / 2;

  for (let i = 0; i < gNodes.length; i++) {
    for (let j = i + 1; j < gNodes.length; j++) {
      const a = gNodes[i], b = gNodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f = repulsion / (dist * dist);
      const fx = f * dx / dist, fy = f * dy / dist;
      a.vx -= fx; a.vy -= fy;
      b.vx += fx; b.vy += fy;
    }
  }

  gEdges.forEach(e => {
    const s = gNodes.find(n => n.id === e.s);
    const t = gNodes.find(n => n.id === e.t);
    if (!s || !t) return;
    const dx = t.x - s.x, dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
    const f = springK * (dist - springLen);
    const fx = f * dx / dist, fy = f * dy / dist;
    s.vx += fx; s.vy += fy;
    t.vx -= fx; t.vy -= fy;
  });

  gNodes.forEach(n => {
    if (n === gDragging) return;
    n.vx += (cx - n.x) * gravity;
    n.vy += (cy - n.y) * gravity;
    n.vx *= damping; n.vy *= damping;
    n.x += n.vx; n.y += n.vy;
    // Keep in bounds
    n.x = Math.max(NODE_R + 2, Math.min(gCanvas.width  - NODE_R - 2, n.x));
    n.y = Math.max(NODE_R + 2, Math.min(gCanvas.height - NODE_R - 2, n.y));
  });

  gSimTick++;
}

// ── Draw ─────────────────────────────────────────────────────

function drawGraph() {
  if (!document.getElementById('graph-modal').classList.contains('open')) { gAnimId = null; return; }

  const ctx = gCtx, w = gCanvas.width, h = gCanvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = 'var(--bg)';
  ctx.fillRect(0, 0, w, h);

  // Edges
  gEdges.forEach(e => {
    const s = gNodes.find(n => n.id === e.s);
    const t = gNodes.find(n => n.id === e.t);
    if (!s || !t) return;
    const isActive = s.active || t.active;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.stroke();
  });

  // Nodes
  gNodes.forEach(n => {
    const color = GRAPH_COLORS[n.type] || '#888';
    const r = n.active ? NODE_R + 4 : NODE_R;
    const isHov = n === gHovered;

    // Glow for active / hovered
    if (n.active || isHov) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = color + '22';
      ctx.fill();
    }

    // Circle fill
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.active ? color : color + '66';
    ctx.fill();

    // Circle border
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = (n.active || isHov) ? color : color + '99';
    ctx.lineWidth = (n.active || isHov) ? 2 : 1;
    ctx.stroke();

    // Icon
    ctx.font = `${n.active ? 13 : 11}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(NT[n.type]?.icon || '○', n.x, n.y);

    // Label (always for active/hovered; only if small graph or close enough)
    const showLabel = n.active || isHov || gNodes.length <= 25;
    if (showLabel) {
      const label = n.title.length > 22 ? n.title.slice(0, 20) + '…' : n.title;
      ctx.font = `${n.active ? 12 : 11}px sans-serif`;
      ctx.fillStyle = n.active ? '#fff' : 'rgba(255,255,255,0.65)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Text shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(label, n.x, n.y + r + 4);
      ctx.shadowBlur = 0;
    }
  });

  // Orphan count hint
  const orphans = gNodes.filter(n => !gEdges.some(e => e.s === n.id || e.t === n.id)).length;
  if (orphans > 0 && gNodes.length > 1) {
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${orphans} unlinked note${orphans !== 1 ? 's' : ''}`, 10, h - 8);
  }

  // Legend
  let lx = w - 10, ly = h - 8;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = '10px monospace';
  Object.entries(GRAPH_COLORS).reverse().forEach(([type, color]) => {
    ctx.fillStyle = color;
    ctx.fillText(NT[type]?.icon + ' ' + (NT[type]?.label || type), lx, ly);
    ly -= 14;
  });

  if (gSimTick < 180) tickSim();
  gAnimId = requestAnimationFrame(drawGraph);
}

// ── Interaction ──────────────────────────────────────────────

function graphNodeAt(x, y) {
  return gNodes.find(n => Math.hypot(n.x - x, n.y - y) <= (n.active ? NODE_R + 4 : NODE_R) + 4) || null;
}

function attachGraphEvents() {
  const canvas = gCanvas;
  let mousedownNode = null, mousedownPos = null;

  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (gDragging) {
      gDragging.x = x; gDragging.y = y;
      gDragging.vx = 0; gDragging.vy = 0;
    } else {
      const prev = gHovered;
      gHovered = graphNodeAt(x, y);
      const hint = document.getElementById('graph-hint');
      if (gHovered) {
        canvas.style.cursor = 'pointer';
        hint.textContent = gHovered.title + (gHovered.active ? ' (current)' : ' — click to open');
      } else {
        canvas.style.cursor = 'default';
        hint.textContent = 'Click a node to open · Drag to rearrange';
      }
    }
  };

  canvas.onmousedown = e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const node = graphNodeAt(x, y);
    mousedownNode = node; mousedownPos = { x, y };
    gDragging = node;
  };

  canvas.onmouseup = e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (mousedownNode && mousedownPos && Math.hypot(x - mousedownPos.x, y - mousedownPos.y) < 6) {
      closeModal('graph-modal');
      openNote(mousedownNode.id);
    }
    gDragging = null; mousedownNode = null; mousedownPos = null;
  };

  canvas.onmouseleave = () => {
    gDragging = null; gHovered = null;
    canvas.style.cursor = 'default';
  };
}

// ── Public API ───────────────────────────────────────────────

function openGraphModal() {
  buildGraph();
  gSimTick = 0;
  document.getElementById('graph-modal').classList.add('open');
  setTimeout(() => {
    gCanvas = document.getElementById('graph-canvas');
    gCtx = gCanvas.getContext('2d');
    const mb = gCanvas.closest('.graph-mb');
    const rect = mb ? mb.getBoundingClientRect() : gCanvas.parentElement.getBoundingClientRect();
    gCanvas.width  = Math.floor(rect.width  || 800);
    gCanvas.height = Math.floor((rect.height || 600) - 96); // minus header+footer
    placeNodes();
    attachGraphEvents();
    if (gAnimId) cancelAnimationFrame(gAnimId);
    drawGraph();
  }, 80);
}

function resetGraphLayout() {
  gSimTick = 0;
  placeNodes();
}
