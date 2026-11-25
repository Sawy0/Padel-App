// App controller: all state + actions + a flat view-model. UI-agnostic so the watch page,
// the browser simulator and the tests all drive the exact same code.
import Scoring from './scoring.js';
import Session from './session.js';
import Stats from './stats.js';

var VIEWS = ['match', 'stats', 'session', 'settings'];
var UNDO_MAX = 40;
var RECORD_MAX = 100;

function defaults() {
  return { sets: 3, golden: 'ask', finalSet: 'set', gps: 6, tb: 7, haptics: true, myKey: null, age: 30, weight: 75, sex: 'M' };
}

var S = {
  view: 'match',
  settings: defaults(),
  match: null,
  undo: [],
  records: [],
  session: null,
  hr: 0,
  hrAt: 0,
  settingsPage: 0,
  lastTick: 0,
  assigning: false,
  confirmClear: false,
  keyNote: '',
  adapter: null,
  hooks: { vibrate: function () {}, redraw: function () {}, startHR: function () {}, stopHR: function () {} }
};
S.match = Scoring.newMatch(S.settings);
S.session = Session.create();

function redraw() { S.hooks.redraw(); }
function buzz(kind) { if (S.settings.haptics) S.hooks.vibrate(kind); }

function save() {
  if (!S.adapter) return;
  S.adapter.write(JSON.stringify({
    settings: S.settings, records: S.records, match: S.match, session: S.session, savedAt: Date.now()
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
      if (d.session) {
        S.session = d.session;
        if (S.session.running) {
          if (d.savedAt) S.session.secs += Math.max(0, (Date.now() - d.savedAt) / 1000);
          startHR();
        }
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
  S.view = v; S.settingsPage = 0; S.assigning = false; S.confirmClear = false; S.keyNote = '';
  redraw();
}

function cycle(list, cur) { return list[(list.indexOf(cur) + 1) % list.length]; }

function toggleSetting(k) {
  var s = S.settings;
  if (k === 'sets') s.sets = s.sets === 3 ? 1 : 3;
  else if (k === 'golden') s.golden = cycle(['ask', 'always', 'off'], s.golden);
  else if (k === 'finalSet') s.finalSet = s.finalSet === 'set' ? 'supertb' : 'set';
  else if (k === 'gps') s.gps = s.gps === 6 ? 4 : 6;
  else if (k === 'tb') s.tb = s.tb === 7 ? 10 : (s.tb === 10 ? 0 : 7);
  else if (k === 'haptics') s.haptics = !s.haptics;
  else if (k === 'age') s.age = s.age >= 80 ? 15 : s.age + 5;
  else if (k === 'weight') s.weight = s.weight >= 140 ? 40 : s.weight + 5;
  else if (k === 'sex') s.sex = s.sex === 'M' ? 'F' : 'M';
  if ((k === 'sets' || k === 'golden' || k === 'finalSet' || k === 'gps' || k === 'tb') && pristine(S.match)) S.match = Scoring.newMatch(s);  // apply right away
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

// ---- fitness session ----
function startHR() {
  S.hooks.startHR(function (hr) { S.hr = hr; S.hrAt = Date.now(); });
}
function sessionToggle() {
  var se = S.session;
  if (se.running) { se.running = false; S.hooks.stopHR(); }
  else { S.session = se = Session.create(); se.running = true; se.started = true; S.hr = 0; startHR(); }
  S.lastTick = Date.now();
  buzz('short'); save(); redraw();
}
function currentHr() { return (Date.now() - S.hrAt < 15000) ? S.hr : 0; }

// Call about once a second from the UI. Uses wall-clock delta so it never drifts.
function tick() {
  var now = Date.now();
  var dt = (now - S.lastTick) / 1000;
  S.lastTick = now;
  if (!S.session.running) return;
  Session.tick(S.session, dt, currentHr(), S.settings);
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
  var m = S.match, d = Scoring.display(m), se = S.session;
  var st = Stats.summary(S.records);
  var setsLine = 'Sets ' + m.setsWon[0] + '-' + m.setsWon[1];
  var done = Scoring.setSummary(m);
  if (done) setsLine += '  (' + done + ')';
  var won = m.winner === 0;
  var hr = se.running ? currentHr() : 0;
  var hrTxt = hr ? String(hr) : '--';
  var kcal = String(Math.round(se.kcal));
  var strip = se.running ? Scoring.HEART + ' ' + hrTxt + '   ' + kcal + ' kcal' :
              (se.started ? 'Session ended' : 'Tap: start session');
  var assignTxt = S.assigning ? 'Press the button now...' :
                  (S.settings.myKey === null ? 'Not set' : 'You = key ' + S.settings.myKey);
  return {
    isMatch: S.view === 'match', isStats: S.view === 'stats',
    isSession: S.view === 'session',
    isSettings: S.view === 'settings' && S.settingsPage === 0,
    isProfile: S.view === 'settings' && S.settingsPage === 1,
    // match
    p0: d.p[0], p1: d.p[1], g0: String(m.games[0]), g1: String(m.games[1]),
    note: d.note, setsLine: setsLine, stripLine: strip,
    pendingGolden: m.pendingGolden, over: m.winner !== null,
    overText: won ? 'YOU WIN!' : 'THEY WIN',
    overScore: Scoring.setSummary(m),
    canUndo: S.undo.length > 0,
    // stats
    rate: st.rate, record: st.wins + 'W - ' + st.losses + 'L', matches: String(st.n),
    form: st.form, streak: st.streak, ptsRate: st.ptsRate, gamesRate: st.gamesRate,
    clearText: S.confirmClear ? 'Tap again to erase' : 'Clear history',
    // session
    sesHr: hrTxt, sesKcal: kcal, sesTime: mmss(se.secs),
    sesAvg: se.hrN > 0 ? String(Session.avgHr(se)) : '--',
    sesMax: se.hrMax ? String(se.hrMax) : '--',
    sesBtn: se.running ? 'STOP' : (se.started ? 'NEW SESSION' : 'START'),
    sesNote: se.running && !hr ? 'Waiting for heart rate...' : 'Calories are an estimate',
    // settings
    setSets: S.settings.sets === 3 ? 'Best of 3' : '1 set',
    setGolden: GOLD_TXT[S.settings.golden],
    setFinal: S.settings.finalSet === 'set' ? 'Full set' : 'Super TB',
    setGps: S.settings.gps === 6 ? '6 games' : '4 (short)',
    setTb: S.settings.tb ? S.settings.tb + ' pts' : 'Off',
    setHaptics: S.settings.haptics ? 'On' : 'Off',
    setKey: assignTxt, keyNote: S.keyNote, assigning: S.assigning,
    setAge: String(S.settings.age), setWeight: S.settings.weight + ' kg',
    setSex: S.settings.sex === 'M' ? 'Male' : 'Female'
  };
}

function settingsPage(n) { S.settingsPage = n; redraw(); }

var Controller = {
  init: init, vm: vm, point: point, undo: undo, answerGolden: answerGolden, newMatch: newMatch,
  setView: setView, toggleSetting: toggleSetting, beginAssign: beginAssign, clearKey: clearKey,
  key: key, sessionToggle: sessionToggle, tick: tick, clearHistory: clearHistory,
  settingsPage: settingsPage,
  _state: S
};
export default Controller;
