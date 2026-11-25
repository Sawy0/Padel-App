// App controller: all state + actions + a flat view-model. UI-agnostic so the watch page,
// the browser simulator and the tests all drive the exact same code.
import Scoring from './scoring.js';
import Training from './training.js';
import Stats from './stats.js';

var VIEWS = ['match', 'stats', 'train', 'settings'];
var UNDO_MAX = 40;
var RECORD_MAX = 100;

function defaults() {
  return { sets: 3, golden: 'ask', finalSet: 'set', haptics: true, myKey: null, program: 'std' };
}

var S = {
  view: 'match',
  settings: defaults(),
  match: null,
  undo: [],
  records: [],
  train: null,
  lastTick: 0,
  assigning: false,
  confirmClear: false,
  keyNote: '',
  adapter: null,
  hooks: { vibrate: function () {}, redraw: function () {} }
};
S.match = Scoring.newMatch(S.settings);
S.train = Training.create(S.settings.program);

function redraw() { S.hooks.redraw(); }
function buzz(kind) { if (S.settings.haptics) S.hooks.vibrate(kind); }

function save() {
  if (!S.adapter) return;
  S.adapter.write(JSON.stringify({
    settings: S.settings, records: S.records, match: S.match, train: S.train, savedAt: Date.now()
  }));
}

function init(adapter, hooks, done) {
  S.adapter = adapter;
  if (hooks) S.hooks = hooks;
  adapter.read(function (text) {
    try {
      var d = JSON.parse(text);
      var def = defaults();
      for (var k in def) if (d.settings && d.settings[k] !== undefined) def[k] = d.settings[k];
      S.settings = def;
      if (d.records) S.records = d.records;
      if (d.match) S.match = d.match;
      if (d.train) {
        S.train = d.train;
        if (S.train.running && d.savedAt) Training.tick(S.train, Math.max(0, (Date.now() - d.savedAt) / 1000));
      }
    } catch (e) { /* first run or unreadable file: keep defaults */ }
    S.lastTick = Date.now();
    redraw();
    if (done) done();
  });
}

function pristine(m) { return m.totals.points[0] + m.totals.points[1] === 0; }

function point(t) {
  var m = S.match;
  if (m.winner !== null || m.pendingGolden) return;
  S.undo.push(m);
  if (S.undo.length > UNDO_MAX) S.undo.shift();
  var n = Scoring.point(m, t);
  var big = n.winner !== null || n.setsWon[0] + n.setsWon[1] !== m.setsWon[0] + m.setsWon[1];
  var game = n.games[0] + n.games[1] !== m.games[0] + m.games[1];
  S.match = n;
  buzz(big ? 'long' : (game ? 'long' : 'short'));
  if (n.winner !== null) {
    S.records.push(Stats.makeRecord(n));
    if (S.records.length > RECORD_MAX) S.records.shift();
  }
  save(); redraw();
}

function undo() {
  if (!S.undo.length) return;
  if (S.match.winner !== null) S.records.pop();   // un-save the finished match
  S.match = S.undo.pop();
  save(); redraw();
}

function answerGolden(yes) {
  S.match = Scoring.answerGolden(S.match, yes);
  save(); redraw();
}

function newMatch() {
  S.match = Scoring.newMatch(S.settings);
  S.undo = [];
  save(); redraw();
}

function setView(v) {
  if (VIEWS.indexOf(v) < 0) return;
  S.view = v; S.assigning = false; S.confirmClear = false; S.keyNote = '';
  redraw();
}

function cycle(list, cur) { return list[(list.indexOf(cur) + 1) % list.length]; }

function toggleSetting(k) {
  var s = S.settings;
  if (k === 'sets') s.sets = s.sets === 3 ? 1 : 3;
  else if (k === 'golden') s.golden = cycle(['ask', 'always', 'off'], s.golden);
  else if (k === 'finalSet') s.finalSet = s.finalSet === 'set' ? 'supertb' : 'set';
  else if (k === 'haptics') s.haptics = !s.haptics;
  if (k !== 'haptics' && pristine(S.match)) S.match = Scoring.newMatch(s);  // apply right away
  save(); redraw();
}

// ---- physical keys ----
function beginAssign() { S.assigning = true; S.keyNote = ''; redraw(); }
function clearKey() { S.settings.myKey = null; S.assigning = false; save(); redraw(); }

function key(code) {
  if (S.assigning) {
    S.settings.myKey = code;
    S.assigning = false;
    S.keyNote = 'Saved';
    save(); redraw();
    return;
  }
  if (S.view !== 'match' || S.settings.myKey === null) return;
  // the assigned key scores for YOU, any other key scores for THEM
  point(code === S.settings.myKey ? 0 : 1);
}

// ---- training ----
function trainToggle() {
  var tr = S.train;
  if (tr.done) S.train = tr = Training.create(S.settings.program);
  tr.running = !tr.running;
  S.lastTick = Date.now();
  buzz('short'); save(); redraw();
}
function trainSkip() {
  if (S.train.done) return;
  Training.next(S.train); buzz('short'); save(); redraw();
}
function trainReset() { S.train = Training.create(S.settings.program); save(); redraw(); }
function trainProgram() {
  var ids = [];
  for (var i = 0; i < Training.PROGRAMS.length; i++) ids.push(Training.PROGRAMS[i].id);
  S.settings.program = cycle(ids, S.settings.program);
  S.train = Training.create(S.settings.program);
  save(); redraw();
}

// Call about once a second from the UI. Uses wall-clock delta so it never drifts.
function tick() {
  var now = Date.now();
  var dt = (now - S.lastTick) / 1000;
  S.lastTick = now;
  if (!S.train.running) return;
  var ev = Training.tick(S.train, dt);
  if (ev) buzz('long');
  if (ev === 'done') save();
  redraw();
}

function clearHistory() {
  if (!S.confirmClear) { S.confirmClear = true; redraw(); return; }
  S.records = []; S.confirmClear = false; save(); redraw();
}

// ---- view-model ----
function mmss(sec) {
  sec = Math.max(0, Math.ceil(sec));
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

var GOLD_TXT = { ask: 'Ask', always: 'Always', off: 'Off' };

function vm() {
  var m = S.match, d = Scoring.display(m), tr = S.train, prog = Training.find(tr.id);
  var st = Stats.summary(S.records);
  var cur = prog.blocks[tr.idx], nxt = prog.blocks[tr.idx + 1];
  var setsLine = 'Sets ' + m.setsWon[0] + '-' + m.setsWon[1];
  var done = Scoring.setSummary(m);
  if (done) setsLine += '  (' + done + ')';
  var won = m.winner === 0;
  var fresh = tr.idx === 0 && tr.left === prog.blocks[0][1];
  var drill = tr.done ? 'Training done!' :
              tr.running ? cur[0] + '  ' + mmss(tr.left) :
              fresh ? 'Training: tap to start' : 'Paused ' + mmss(tr.left);
  var assignTxt = S.assigning ? 'Press the button now...' :
                  (S.settings.myKey === null ? 'Not set' : 'You = key ' + S.settings.myKey);
  var pctDone = Math.round(100 * Training.elapsed(tr) / Training.total(tr.id));
  return {
    isMatch: S.view === 'match', isStats: S.view === 'stats',
    isTrain: S.view === 'train', isSettings: S.view === 'settings',
    // match
    p0: d.p[0], p1: d.p[1], g0: String(m.games[0]), g1: String(m.games[1]),
    note: d.note, setsLine: setsLine, drillLine: drill,
    pendingGolden: m.pendingGolden, over: m.winner !== null,
    overText: won ? 'YOU WIN!' : 'THEY WIN',
    overScore: Scoring.setSummary(m),
    canUndo: S.undo.length > 0,
    // stats
    rate: st.rate, record: st.wins + 'W - ' + st.losses + 'L', matches: String(st.n),
    form: st.form, streak: st.streak, ptsRate: st.ptsRate, gamesRate: st.gamesRate,
    clearText: S.confirmClear ? 'Tap again to erase' : 'Clear history',
    // training
    trProg: prog.name, trBlock: tr.done ? 'Done' : cur[0], trTip: tr.done ? 'Great session' : cur[2],
    trLeft: mmss(tr.left), trStep: (tr.idx + 1) + '/' + prog.blocks.length,
    trNext: tr.done ? '' : (nxt ? 'Next: ' + nxt[0] : 'Last block'),
    trPct: pctDone + '%', trRunning: tr.running,
    trBtn: tr.done ? 'RESTART' : (tr.running ? 'PAUSE' : 'START'),
    // settings
    setSets: S.settings.sets === 3 ? 'Best of 3' : '1 set',
    setGolden: GOLD_TXT[S.settings.golden],
    setFinal: S.settings.finalSet === 'set' ? 'Full set' : 'Super TB',
    setHaptics: S.settings.haptics ? 'On' : 'Off',
    setKey: assignTxt, keyNote: S.keyNote, assigning: S.assigning
  };
}

var Controller = {
  init: init, vm: vm, point: point, undo: undo, answerGolden: answerGolden, newMatch: newMatch,
  setView: setView, toggleSetting: toggleSetting, beginAssign: beginAssign, clearKey: clearKey,
  key: key, trainToggle: trainToggle, trainSkip: trainSkip, trainReset: trainReset,
  trainProgram: trainProgram, tick: tick, clearHistory: clearHistory,
  _state: S
};
export default Controller;
