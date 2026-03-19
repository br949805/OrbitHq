// ── config.js ─────────────────────────────────────────────────
// Note type definitions, icons, colors, templates, and defaults.
// ──────────────────────────────────────────────────────────────

const NT = {
  scratchpad: { label:'Scratchpad', icon:'✦', cls:'type-scratchpad', color:'var(--text3)', desc:'Quick capture', template:'' },
  meeting:    { label:'Meeting',    icon:'◉', cls:'type-meeting',    color:'var(--blue)',  desc:'Structured meeting notes', template:'<h2>Agenda / Context</h2><p></p><h2>Discussion</h2><p></p><h2>Decisions Made</h2><p></p><h2>Action Items</h2><p></p>' },
  snippet:    { label:'Snippet',    icon:'⌨', cls:'type-snippet',    color:'var(--teal)',  desc:'Code & references', template:'<pre><code>// code here</code></pre><p></p>' },
  idea:       { label:'Idea',       icon:'◎', cls:'type-idea',       color:'var(--amber)', desc:'Capture & develop ideas', template:'<h2>The Idea</h2><p></p><h2>Why It Matters</h2><p></p><h2>Open Questions</h2><p></p><h2>Next Steps</h2><p></p>' },
  plan:       { label:'Plan',       icon:'▦', cls:'type-plan',       color:'var(--purple)',desc:'Goal-oriented planning', template:'<h2>Goal</h2><p></p><h2>Steps</h2><p></p><h2>Risks</h2><p></p>' },
  note:       { label:'Note',       icon:'○', cls:'type-note',       color:'var(--text2)', desc:'General purpose', template:'' }
};
