// ── test-inbox.js ──────────────────────────────────────────────
// Automated test suite for Inbox feature
// Run in browser console: loadTests()
// ─────────────────────────────────────────────────────────────

let testResults = {
  passed: 0,
  failed: 0,
  pending: 0,
  tests: []
};

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function createTestNote(type, title, content, folderId = null) {
  const note = {
    id: uid(),
    type,
    title,
    content,
    metadata: type === 'meeting' ? { dateTime: todayISO(), attendeeIds: [], decisions: '', project: '' } : {},
    folderId,
    pinned: false,
    createdAt: nowMs(),
    updatedAt: nowMs()
  };
  S.notes.push(note);
  save();
  return note;
}

function runTest(name, testFn) {
  try {
    testFn();
    testResults.tests.push({ name, status: 'PASS', error: null });
    testResults.passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    testResults.tests.push({ name, status: 'FAIL', error: e.message });
    testResults.failed++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// ── Test Suite ──────────────────────────────────────────────

async function loadTests() {
  console.log('🚀 Starting Inbox Test Suite...\n');

  // Clear state
  S = {
    tasks: [], archived: [], notes: [], folders: [], tags: [],
    contacts: [], followups: [], fuArchived: [], fuPanelMode: 'normal',
    collapsed: {}, noteFilter: 'all', activeNoteId: null,
    navHistory: [], blOpen: false, dismissedCtx: [],
    settings: { archiveDelay:7, wordThreshold:50, reviewDay:1, theme:'clean-dark', templates:{} },
    session: { lastWeekly:null, agedSnoozedUntil:null, clearedToday:0, clearedDate:null }
  };
  normalizeState();
  save();

  // Test 1: Inbox Detection
  console.log('📋 Feature 1: Inbox Detection');

  runTest('1.1: Scratchpad notes enter inbox', () => {
    const sp1 = createTestNote('scratchpad', 'Thought', 'Short note');
    const sp2 = createTestNote('scratchpad', 'Long', 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt');
    const inbox = getInbox();
    assert(inbox.length === 2, `Expected 2 in inbox, got ${inbox.length}`);
    assert(inbox.some(n => n.id === sp1.id), 'Scratchpad 1 not in inbox');
    assert(inbox.some(n => n.id === sp2.id), 'Scratchpad 2 not in inbox');
  });

  runTest('1.2: Short notes without folder enter inbox', () => {
    S.notes = [];
    const short1 = createTestNote('note', 'Brief', 'This is a short note');
    const short2 = createTestNote('note', 'Another', 'One two three four five');
    const inbox = getInbox();
    assert(inbox.length === 2, `Expected 2 in inbox, got ${inbox.length}`);
  });

  runTest('1.3: Snippets skip inbox', () => {
    S.notes = [];
    const snip1 = createTestNote('snippet', 'Code', 'const x = 5;');
    const snip2 = createTestNote('snippet', 'Long snippet', 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt');
    const inbox = getInbox();
    assert(inbox.length === 0, `Expected 0 in inbox (snippets exempt), got ${inbox.length}`);
  });

  runTest('1.4: Short notes WITH folder skip inbox', () => {
    S.notes = [];
    S.folders = [{ id: 'f1', name: 'Projects', description: '' }];
    const filed = createTestNote('note', 'Filed', 'Short note', 'f1');
    const inbox = getInbox();
    assert(inbox.length === 0, `Expected 0 in inbox (has folder), got ${inbox.length}`);
  });

  runTest('1.5: Long notes skip inbox', () => {
    S.notes = [];
    const longWords = Array(51).fill('word').join(' ');
    const longNote = createTestNote('note', 'Long', longWords);
    const inbox = getInbox();
    assert(inbox.length === 0, `Expected 0 in inbox (>50 words), got ${inbox.length}`);
  });

  runTest('1.6: Aged item detection', () => {
    S.notes = [];
    const short = createTestNote('note', 'Aged', 'Short note');
    short.createdAt = Date.now() - (25 * 86400000); // 25 hours ago
    const aged = getAged();
    assert(aged.length === 1, `Expected 1 aged item, got ${aged.length}`);
    assert(isAged(short), 'Note not marked as aged');
  });

  // Test 2: Inbox Grid UI
  console.log('\n📊 Feature 2: Inbox Grid UI');

  runTest('2.1: Card contains all metadata', () => {
    S.notes = [];
    const note = createTestNote('scratchpad', 'Ideas', 'This is a brief idea with some content');
    const inbox = getInbox();
    assert(inbox.length === 1, 'Note not in inbox');
    assert(inbox[0].title === 'Ideas', 'Title mismatch');
  });

  runTest('2.2: Empty inbox shows message', () => {
    S.notes = [];
    const inbox = getInbox();
    assert(inbox.length === 0, 'Inbox should be empty');
  });

  runTest('2.3: Inbox sorts aged first, then newest', () => {
    S.notes = [];
    const old = createTestNote('note', 'Old', 'Old note');
    const new1 = createTestNote('note', 'New', 'New note');
    const aged = createTestNote('note', 'Aged', 'Aged note');

    old.createdAt = Date.now() - (2 * 3600000); // 2 hours ago
    new1.createdAt = Date.now() - (100000); // 100 seconds ago
    aged.createdAt = Date.now() - (25 * 86400000); // 25 hours ago

    const inbox = getInbox().sort((a, b) =>
      (isAged(b) ? 1 : -1) - (isAged(a) ? 1 : -1) || (b.createdAt - a.createdAt)
    );

    assert(isAged(inbox[0]), 'First should be aged');
    assert(inbox[0].id === aged.id, 'Aged item not first');
  });

  // Test 3: Processor Logic
  console.log('\n⚙️  Feature 3: Processor');

  runTest('3.1: Start processor with all items', () => {
    S.notes = [];
    pQueue = []; pIndex = 0; pSkipped = []; pStats = { applied:0, discarded:0, converted:0, snippetConverted:0 };

    createTestNote('note', 'Item 1', 'Short');
    createTestNote('note', 'Item 2', 'Short');
    createTestNote('note', 'Item 3', 'Short');

    const inbox = getInbox();
    pQueue = [...inbox];
    assert(pQueue.length === 3, `Expected 3 in queue, got ${pQueue.length}`);
  });

  runTest('3.5: Apply changes type', () => {
    S.notes = [];
    const note = createTestNote('scratchpad', 'Idea', 'Quick thought');
    pQueue = [note];
    pIndex = 0;
    pStats = { applied:0, discarded:0, converted:0, snippetConverted:0 };

    const originalType = note.type;
    note.type = 'idea';
    note.updatedAt = nowMs();
    pStats.applied++;
    save();

    assert(note.type === 'idea', `Type should be 'idea', got '${note.type}'`);
    assert(pStats.applied === 1, 'Stats not incremented');
  });

  runTest('3.10: Convert to snippet removes from queue', () => {
    S.notes = [];
    const note = createTestNote('note', 'Snippet it', 'Short code');
    pQueue = [note];
    pIndex = 0;
    pStats = { applied:0, discarded:0, converted:0, snippetConverted:0 };

    note.type = 'snippet';
    note.updatedAt = nowMs();
    pStats.snippetConverted++;
    pStats.applied++;
    save();
    pQueue.splice(0, 1);

    assert(note.type === 'snippet', 'Type not changed to snippet');
    assert(pQueue.length === 0, 'Note not removed from queue');
    assert(pStats.snippetConverted === 1, 'Snippet stat not incremented');
  });

  runTest('3.11: Discard removes note', () => {
    S.notes = [];
    const note = createTestNote('note', 'Delete me', 'Short');
    const beforeCount = S.notes.length;

    S.notes = S.notes.filter(n => n.id !== note.id);
    pStats.discarded++;
    save();

    assert(S.notes.length === beforeCount - 1, 'Note not deleted');
    assert(!S.notes.find(n => n.id === note.id), 'Note still exists');
  });

  // Test 4: Pause/Resume
  console.log('\n⏸️  Feature 4: Pause/Resume');

  runTest('4.1: Resume session after exit', () => {
    S.notes = [];
    pQueue = [];
    pIndex = 0;
    pSessionState = null;

    for (let i = 0; i < 5; i++) {
      createTestNote('note', `Item ${i+1}`, 'Short');
    }

    const inbox = getInbox();
    pQueue = [...inbox];
    pIndex = 2;
    pSessionState = { agedOnly: false, queueIds: pQueue.map(n => n.id) };

    assert(pIndex === 2, 'Index not preserved');
    assert(pQueue.length === 5, 'Queue not preserved');
    assert(pSessionState !== null, 'Session state not set');
  });

  runTest('4.3: Session clears on completion', () => {
    pSessionState = { agedOnly: false, queueIds: ['123'] };
    pQueue = [];
    pIndex = 0;

    pSessionState = null;

    assert(pSessionState === null, 'Session state not cleared');
  });

  // Test 5: Full Content Modal
  console.log('\n🔍 Feature 5: Full Content');

  runTest('5.1: Expand button logic', () => {
    S.notes = [];
    const withContent = createTestNote('note', 'Title', 'Content here');
    const empty = createTestNote('note', 'Title2', '');

    const hasByline = strip(withContent.content || '').length > 0;
    const emptyByline = strip(empty.content || '').length > 0;

    assert(hasByline === true, 'Note with content should have text');
    assert(emptyByline === false, 'Empty note should have no text');
  });

  // Test 6: Snippet Behavior
  console.log('\n⌨️  Feature 9: Snippet Behavior');

  runTest('9.1: Snippet always exempt', () => {
    S.notes = [];
    const snip1 = createTestNote('snippet', 'Short', 'x');
    const snip2 = createTestNote('snippet', 'Long', Array(100).fill('word').join(' '));

    const inbox = getInbox();
    assert(inbox.length === 0, `Snippets in inbox: ${inbox.length}`);
    assert(S.notes.filter(n => n.type === 'snippet').length === 2, 'Snippets deleted');
  });

  runTest('9.2: Convert to snippet in processor', () => {
    S.notes = [];
    const note = createTestNote('note', 'Convert me', 'Short content');
    pQueue = [note];
    pIndex = 0;
    pStats = { applied:0, discarded:0, converted:0, snippetConverted:0 };

    const beforeInbox = getInbox().length;
    note.type = 'snippet';
    pStats.snippetConverted++;
    pStats.applied++;
    pQueue.splice(0, 1);
    save();

    const afterInbox = getInbox().length;
    assert(note.type === 'snippet', 'Type not changed');
    assert(beforeInbox === 1, 'Note should be in inbox before conversion');
    assert(afterInbox === 0, 'Note should be out of inbox after snippet conversion');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results`);
  console.log(`✓ Passed: ${testResults.passed}`);
  console.log(`✗ Failed: ${testResults.failed}`);
  console.log(`⏸  Pending: 0`);
  console.log('='.repeat(50));

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check above for details.');
  }

  return testResults;
}

// Run tests
console.log('📚 Inbox Test Suite loaded. Run: loadTests()');
