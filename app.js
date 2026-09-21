import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
  getFirestore, doc, setDoc, onSnapshot, enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

var STORAGE_KEY = 'srs-ledger-topics';
var PIN_KEY = 'srs-ledger-pin';
var INTERVALS = [1, 3, 7, 14, 30, 60, 90]; // days, Ebbinghaus/SuperMemo-derived

var topics = loadLocal();
var pin = localStorage.getItem(PIN_KEY) || '';
var db = null;
var unsubscribe = null;
var suppressNextWrite = false; // avoid re-writing data we just received from the server

// ---------- Firebase setup ----------
var firebaseReady = firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('PASTE_') !== 0;

function initFirebase() {
  if (!firebaseReady) {
    setSyncStatus('offline', 'Sync not set up yet (see firebase-config.js)');
    return;
  }
  try {
    var app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    enableIndexedDbPersistence(db).catch(function () { /* multiple tabs or unsupported browser — fine, still works online */ });
  } catch (e) {
    setSyncStatus('offline', 'Could not connect to sync');
  }
}

function subscribeToPin(p) {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (!db || !p) return;
  setSyncStatus('syncing', 'Connecting…');
  var ref = doc(db, 'students', p);
  unsubscribe = onSnapshot(ref, function (snap) {
    if (snap.exists()) {
      var data = snap.data();
      var incoming = Array.isArray(data.topics) ? data.topics : [];
      mergeTopics(incoming);
      saveLocal(topics);
      suppressNextWrite = true;
      render();
    }
    setSyncStatus('online', 'Synced');
  }, function () {
    setSyncStatus('offline', "Can't reach sync — saved on this device, will sync when back online");
  });
}

function writeRemote() {
  if (!db || !pin) return;
  if (suppressNextWrite) { suppressNextWrite = false; return; }
  setSyncStatus('syncing', 'Saving…');
  var ref = doc(db, 'students', pin);
  setDoc(ref, { topics: topics, updatedAt: Date.now() })
    .then(function () { setSyncStatus('online', 'Synced'); })
    .catch(function () { setSyncStatus('offline', "Saved on this device — will sync when back online"); });
}

function setSyncStatus(state, label) {
  var dot = document.getElementById('syncDot');
  var text = document.getElementById('syncText');
  if (!dot || !text) return;
  dot.className = 'sync-dot ' + state;
  text.textContent = label;
}

// ---------- Local storage ----------
function loadLocal() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveLocal(t) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch (e) { /* ignore */ }
}

// ---------- Date helpers ----------
function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysBetween(a, b) {
  var da = new Date(a + 'T00:00:00');
  var db_ = new Date(b + 'T00:00:00');
  return Math.round((db_ - da) / 86400000);
}
function formatDate(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function relLabel(dateStr) {
  var diff = daysBetween(todayStr(), dateStr);
  if (diff < 0) return (diff === -1 ? '1 day overdue' : (-diff) + ' days overdue');
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return 'in ' + diff + ' days';
}

// ---------- Topic operations ----------
function addTopic(name, subject) {
  var today = todayStr();
  topics.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name,
    subject: subject || '',
    loggedOn: today,
    stage: 0,
    nextReview: addDays(today, INTERVALS[0]),
    mastered: false,
    updatedAt: Date.now()
  });
  saveLocal(topics);
  render();
  writeRemote();
}

function markReviewed(id) {
  var t = topics.find(function (x) { return x.id === id; });
  if (!t) return;
  var nextStage = t.stage + 1;
  if (nextStage >= INTERVALS.length) {
    t.mastered = true;
    t.stage = INTERVALS.length - 1;
  } else {
    t.stage = nextStage;
    t.nextReview = addDays(todayStr(), INTERVALS[nextStage]);
  }
  t.updatedAt = Date.now();
  saveLocal(topics);
  render();
  writeRemote();
}

function removeTopic(id) {
  topics = topics.filter(function (x) { return x.id !== id; });
  saveLocal(topics);
  render();
  writeRemote();
}

function mergeTopics(incoming) {
  var byId = {};
  topics.forEach(function (t) { byId[t.id] = t; });
  incoming.forEach(function (t) {
    var existing = byId[t.id];
    if (!existing || (t.updatedAt || 0) > (existing.updatedAt || 0)) {
      byId[t.id] = t;
    }
  });
  topics = Object.keys(byId).map(function (k) { return byId[k]; });
}

// ---------- Rendering ----------
function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function rowHtml(t, kind) {
  var whenLabel = t.mastered ? ('mastered · learned ' + formatDate(t.loggedOn)) :
    (relLabel(t.nextReview) + ' · ' + formatDate(t.nextReview));
  var whenClass = kind === 'due' ? 'due' : (kind === 'upcoming' ? 'upcoming' : '');
  var subjectBit = t.subject ? (esc(t.subject) + ' · ') : '';
  var actionBtn = t.mastered ? '' :
    '<button class="mark" data-action="review" data-id="' + t.id + '">Reviewed ✓</button>';
  return '' +
    '<li class="row ' + kind + '">' +
      '<div class="info">' +
        '<div class="topic">' + esc(t.name) + '</div>' +
        '<div class="meta">' + subjectBit + '<span class="when ' + whenClass + '">' + whenLabel + '</span></div>' +
      '</div>' +
      '<div class="actions">' +
        actionBtn +
        '<button class="del" data-action="delete" data-id="' + t.id + '" aria-label="Remove">✕</button>' +
      '</div>' +
    '</li>';
}

function render() {
  var today = todayStr();
  var due = [], upcoming = [], mastered = [];
  topics.forEach(function (t) {
    if (t.mastered) { mastered.push(t); return; }
    if (t.nextReview <= today) due.push(t); else upcoming.push(t);
  });
  due.sort(function (a, b) { return a.nextReview < b.nextReview ? -1 : 1; });
  upcoming.sort(function (a, b) { return a.nextReview < b.nextReview ? -1 : 1; });
  mastered.sort(function (a, b) { return b.loggedOn < a.loggedOn ? -1 : 1; });

  document.getElementById('statDue').textContent = due.length;
  document.getElementById('statUpcoming').textContent = upcoming.length;
  document.getElementById('statTotal').textContent = topics.length;

  document.getElementById('listDue').innerHTML = due.map(function (t) { return rowHtml(t, 'due'); }).join('');
  document.getElementById('listUpcoming').innerHTML = upcoming.map(function (t) { return rowHtml(t, 'upcoming'); }).join('');
  document.getElementById('listMastered').innerHTML = mastered.map(function (t) { return rowHtml(t, 'mastered'); }).join('');

  document.getElementById('emptyDue').style.display = due.length ? 'none' : 'block';
  document.getElementById('emptyUpcoming').style.display = upcoming.length ? 'none' : 'block';
  document.getElementById('masteredSection').style.display = mastered.length ? 'block' : 'none';
}

// ---------- PIN onboarding ----------
function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setPin(p) {
  pin = p.trim();
  localStorage.setItem(PIN_KEY, pin);
  document.getElementById('pinBadge').textContent = 'Code: ' + pin;
  closePinModal();
  subscribeToPin(pin);
}

function openPinModal(prefillGenerated) {
  var modal = document.getElementById('pinModal');
  modal.style.display = 'flex';
  var suggested = document.getElementById('suggestedPin');
  if (prefillGenerated) suggested.textContent = randomPin();
}
function closePinModal() {
  document.getElementById('pinModal').style.display = 'none';
}

// ---------- Wire up UI ----------
document.getElementById('logForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var nameEl = document.getElementById('topicInput');
  var subjEl = document.getElementById('subjectInput');
  var name = nameEl.value.trim();
  if (!name) return;
  addTopic(name, subjEl.value.trim());
  nameEl.value = '';
  subjEl.value = '';
  nameEl.focus();
});

document.addEventListener('click', function (e) {
  var btn = e.target.closest('button[data-action]');
  if (!btn) return;
  var id = btn.getAttribute('data-id');
  if (btn.getAttribute('data-action') === 'review') markReviewed(id);
  if (btn.getAttribute('data-action') === 'delete') removeTopic(id);
});

document.getElementById('pinBadge').addEventListener('click', function () {
  document.getElementById('existingPinInput').value = pin;
  openPinModal(true);
});

document.getElementById('useGeneratedBtn').addEventListener('click', function () {
  setPin(document.getElementById('suggestedPin').textContent);
});
document.getElementById('regenerateBtn').addEventListener('click', function () {
  document.getElementById('suggestedPin').textContent = randomPin();
});
document.getElementById('useExistingBtn').addEventListener('click', function () {
  var val = document.getElementById('existingPinInput').value.trim();
  if (val) setPin(val);
});
document.getElementById('pinModalClose').addEventListener('click', closePinModal);

// ---------- Boot ----------
initFirebase();
render();

if (pin) {
  document.getElementById('pinBadge').textContent = 'Code: ' + pin;
  if (firebaseReady) subscribeToPin(pin);
} else if (firebaseReady) {
  openPinModal(true);
} else {
  document.getElementById('pinBadge').textContent = 'Sync not set up';
}

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js').catch(function () { /* ignore */ });
  });
}
