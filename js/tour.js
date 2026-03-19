// ── tour.js ────────────────────────────────────────────────────
// First-launch feature tour.
// Triggered by app.js after _continueBoot() when S.settings.tourDone
// is not set. Persists completion in S.settings.tourDone via save().
// ──────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    title: 'Welcome to Orbit Hq',
    body: 'Your focused workspace for notes, tasks, and ideas. ' +
          'This quick tour covers the key features — about 60 seconds.',
    target: null,
  },
  {
    title: 'Task Panel',
    body: 'Tasks are sorted by urgency: ' +
          '<span style="color:var(--red)">Overdue</span>, ' +
          'Due Today, Upcoming, and No Due Date. ' +
          'Click <kbd>+ Add Task</kbd> or press <kbd>N</kbd> to create one.',
    target: '#task-panel',
    position: 'right',
  },
  {
    title: 'Notes & Editor',
    body: 'Notes come in 6 types — Meeting, Idea, Plan, Snippet, and more. ' +
          'Click <kbd>+ Add Note</kbd> or press <kbd>M</kbd>. ' +
          'The rich editor supports formatting, tables, and code blocks.',
    target: '#notes-list',
    position: 'right',
  },
  {
    title: 'Inbox',
    body: 'Quick captures with little context land in your Inbox. ' +
          'Click <kbd>▶ Process Inbox</kbd> to review them — ' +
          'assign a type, a folder, or convert bullet points into tasks.',
    target: '#inbox-tb-btn',
    position: 'bottom',
  },
  {
    title: 'Folders & Tags',
    body: 'Organize notes with folders and tags. ' +
          'Filter by note type, pinned, or custom folder from the sidebar. ' +
          'Switch between multiple notebooks at the top.',
    target: '#sidebar',
    position: 'right',
  },
  {
    title: 'Email → Task (Drag & Drop)',
    body: 'Drag an email from Outlook directly onto the drop zone at the bottom of the task panel. ' +
          'Orbit Hq reads the subject line and creates a follow-up task — ' +
          'pick a due date and you\'re done.',
    target: '#email-drop-zone',
    position: 'right',
  },
  {
    title: 'Settings & Themes',
    body: 'Pick a theme, set auto-archive timing, customize note templates, ' +
          'and connect a JSON file for persistent storage outside the browser.',
    target: '#hamburger-btn',
    position: 'bottom-left',
  },
  {
    title: 'Your data stays private',
    body: 'Everything is stored <strong>only in your browser</strong> or local JSON file — no server, no account, no cloud sync. ' +
          '<strong>Your data on your machine. Always.</strong>',
    target: null,
  },
  {
    title: "You're all set!",
    body: 'Press <kbd>?</kbd> anytime to see all keyboard shortcuts. ' +
          'Press <kbd>C</kbd> to quick-capture a task or note. ' +
          'Happy organizing!',
    target: null,
  },
];

let _tourStep        = 0;
let _tourKeyHandler  = null;

function startTour() {
  _tourStep = 0;
  _tourKeyHandler = (e) => {
    if (e.key === 'Escape')                         { endTour(); return; }
    if (e.key === 'ArrowRight' || e.key === 'Enter') { _nextTourStep(); return; }
    if (e.key === 'ArrowLeft')                       { _prevTourStep(); }
  };
  document.addEventListener('keydown', _tourKeyHandler);
  _renderTourStep();
}

function _cleanTour() {
  document.getElementById('tour-overlay')?.remove();
  document.getElementById('tour-spotlight')?.remove();
  document.getElementById('tour-card')?.remove();
}

function _renderTourStep() {
  _cleanTour();

  const step   = TOUR_STEPS[_tourStep];
  const isLast = _tourStep === TOUR_STEPS.length - 1;

  // ── Overlay (click anywhere on dark area to advance) ──────
  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';

  if (step.target) {
    const el = document.querySelector(step.target);
    if (!el) { _nextTourStep(); return; }

    // Spotlight positioned over target element
    const rect = el.getBoundingClientRect();
    const pad  = 6;

    const spotlight = document.createElement('div');
    spotlight.id = 'tour-spotlight';
    spotlight.style.cssText =
      `top:${rect.top - pad}px;` +
      `left:${rect.left - pad}px;` +
      `width:${rect.width + pad * 2}px;` +
      `height:${rect.height + pad * 2}px;`;
    document.body.appendChild(spotlight);

    // Click overlay advances tour (but stays below spotlight)
    overlay.addEventListener('click', _nextTourStep);
    document.body.appendChild(overlay);

    // Floating card near the element
    const card = _buildCard(step, isLast);
    document.body.appendChild(card);
    _positionCard(card, rect, step.position || 'bottom');

  } else {
    // Centered modal (welcome / done steps)
    overlay.classList.add('tour-center');
    document.body.appendChild(overlay);

    const card = _buildCard(step, isLast);
    card.classList.add('tour-card-center');
    document.body.appendChild(card);
  }
}

function _buildCard(step, isLast) {
  const total = TOUR_STEPS.length;
  const card  = document.createElement('div');
  card.id     = 'tour-card';

  const dots = TOUR_STEPS.map((_, i) =>
    `<span class="tour-dot${i === _tourStep ? ' active' : ''}"></span>`
  ).join('');

  card.innerHTML = `
    <div class="tour-header">
      <span class="tour-step-label">${_tourStep + 1} / ${total}</span>
      <button class="tour-skip" onclick="endTour()">Skip tour</button>
    </div>
    <h3 class="tour-title">${step.title}</h3>
    <p class="tour-body">${step.body}</p>
    <div class="tour-footer">
      <div class="tour-dots">${dots}</div>
      <div class="tour-nav">
        ${_tourStep > 0
          ? `<button class="tour-btn-sec" onclick="_prevTourStep()">← Back</button>`
          : ''}
        <button class="tour-btn-pri" onclick="${isLast ? 'endTour()' : '_nextTourStep()'}">
          ${isLast ? 'Get started →' : 'Next →'}
        </button>
      </div>
    </div>
  `;
  return card;
}

function _positionCard(card, rect, position) {
  const GAP     = 14;
  const CARD_W  = 320;  // matches CSS width
  const CARD_H  = 210;  // approximate height for clamping
  const vw      = window.innerWidth;
  const vh      = window.innerHeight;

  let top, left;

  switch (position) {
    case 'bottom':
      top  = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
      break;
    case 'bottom-left':
      top  = rect.bottom + GAP;
      left = rect.right - CARD_W;
      break;
    case 'right':
      top  = rect.top;
      left = rect.right + GAP;
      break;
    case 'left':
      top  = rect.top;
      left = rect.left - CARD_W - GAP;
      break;
    case 'top':
      top  = rect.top - CARD_H - GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
      break;
    default:
      top  = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  top  = Math.max(12, Math.min(top,  vh - CARD_H - 12));

  card.style.top  = top  + 'px';
  card.style.left = left + 'px';
}

function _nextTourStep() {
  if (_tourStep < TOUR_STEPS.length - 1) {
    _tourStep++;
    _renderTourStep();
  } else {
    endTour();
  }
}

function _prevTourStep() {
  if (_tourStep > 0) {
    _tourStep--;
    _renderTourStep();
  }
}

function endTour() {
  if (_tourKeyHandler) {
    document.removeEventListener('keydown', _tourKeyHandler);
    _tourKeyHandler = null;
  }
  _cleanTour();
  S.settings.tourDone = true;
  save();
}
