// ── nudges.js ─────────────────────────────────────────────────
// Weekly review nudge and 24h aged-notes nudge logic.
// ──────────────────────────────────────────────────────────────

function checkNudges() {
  const inbox  = getInbox(); const aged = getAged(); const today = todayISO(); const dow = new Date().getDay();
  const weekly = inbox.length > 0 && dow === S.settings.reviewDay && S.session.lastWeekly !== today;
  document.getElementById('nudge-weekly-ct').textContent = inbox.length;
  document.getElementById('nudge-weekly').classList.toggle('show', weekly);
  const snoozed  = S.session.agedSnoozedUntil && Date.now() < S.session.agedSnoozedUntil;
  const showAged = aged.length > 0 && !snoozed && !weekly;
  document.getElementById('nudge-aged-ct').textContent = aged.length;
  document.getElementById('nudge-aged').classList.toggle('show', showAged);
}

function dismissNudge(type) {
  if (type === 'weekly') { S.session.lastWeekly = todayISO(); document.getElementById('nudge-weekly').classList.remove('show'); }
  if (type === 'aged')   { document.getElementById('nudge-aged').classList.remove('show'); }
  save();
}

function snoozeAged() {
  S.session.agedSnoozedUntil = Date.now() + 86400000;
  dismissNudge('aged'); toast('Snoozed 24 hours');
}
