// Padel scoring engine. Pure functions, ES5 style (watch JS runtime is conservative).
// Team 0 = YOU, team 1 = THEM.
var HEART = '♥';
var LABELS = [HEART, '15', '30', '40'];

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function startGame(s) {
  s.points = [0, 0];
  s.deuces = 0;
  s.goldenAsked = false;
  s.pendingGolden = false;
  s.golden = s.cfg.golden === 'always';
}

function newMatch(cfg) {
  cfg = cfg || {};
  var s = {
    cfg: {
      sets: cfg.sets === 1 ? 1 : 3,
      golden: cfg.golden || 'ask',          // 'ask' | 'always' | 'off'
      finalSet: cfg.finalSet || 'set',      // 'set' | 'supertb'
      gps: cfg.gps === 4 ? 4 : 6,           // games per set; 4 = short set (first to 4, tie-break at 3-3)
      tb: (cfg.tb === 0 || cfg.tb === 10) ? cfg.tb : 7   // tie-break points; 0 = no tie-break
    },
    sets: [],            // finished sets: {g:[a,b], tb:[a,b]|null}
    games: [0, 0],
    points: [0, 0],
    tb: false,
    superTb: false,
    deuces: 0,
    golden: false,
    goldenAsked: false,
    pendingGolden: false,
    setsWon: [0, 0],
    winner: null,
    totals: { points: [0, 0], games: [0, 0] }
  };
  startGame(s);
  return s;
}

function setsNeeded(s) { return Math.ceil(s.cfg.sets / 2); }

function endSet(s, t, viaTb) {
  var o = 1 - t;
  if (s.superTb) {
    s.sets.push({ g: t === 0 ? [1, 0] : [0, 1], tb: s.points.slice() });
  } else {
    s.games[t]++;
    s.totals.games[t]++;
    s.sets.push({ g: s.games.slice(), tb: viaTb ? s.points.slice() : null });
  }
  s.setsWon[t]++;
  if (s.setsWon[t] >= setsNeeded(s)) {
    s.winner = t;
    return;
  }
  s.games = [0, 0];
  s.tb = false;
  s.superTb = false;
  startGame(s);
  if (s.cfg.finalSet === 'supertb' && s.cfg.sets === 3 &&
      s.setsWon[0] === 1 && s.setsWon[1] === 1) {
    s.tb = true;
    s.superTb = true;
  }
}

function winGame(s, t) {
  var gps = s.cfg.gps;
  var g = s.games[t] + 1;
  if (g >= gps && (gps === 4 || g - s.games[1 - t] >= 2)) {
    endSet(s, t, false);          // endSet adds the deciding game
    return;
  }
  s.games[t]++;
  s.totals.games[t]++;
  var tbAt = gps === 4 ? 3 : 6;
  if (s.cfg.tb > 0 && s.games[0] === tbAt && s.games[1] === tbAt) {
    s.tb = true;
    s.points = [0, 0];
    return;
  }
  startGame(s);
}

function point(m, t) {
  if (m.winner !== null || m.pendingGolden) return m;
  var s = clone(m);
  var o = 1 - t;
  s.totals.points[t]++;

  if (s.tb) {
    s.points[t]++;
    var target = s.superTb ? 10 : s.cfg.tb;
    if (s.points[t] >= target && s.points[t] - s.points[o] >= 2) endSet(s, t, true);
    return s;
  }

  var wasDeuce = s.points[0] >= 3 && s.points[0] === s.points[1];
  if (wasDeuce && s.golden) { winGame(s, t); return s; }

  s.points[t]++;
  if (s.points[t] >= 4 && s.points[t] - s.points[o] >= 2) { winGame(s, t); return s; }

  if (s.points[0] >= 3 && s.points[0] === s.points[1]) {
    s.deuces++;
    // 1st deuce plays normally. Coming back to deuce a 2nd time => offer golden point.
    if (s.deuces >= 2 && !s.goldenAsked && s.cfg.golden === 'ask') s.pendingGolden = true;
  }
  return s;
}

function answerGolden(m, yes) {
  if (!m.pendingGolden) return m;
  var s = clone(m);
  s.pendingGolden = false;
  s.goldenAsked = true;
  s.golden = !!yes;
  return s;
}

// What to print on the two score panels.
function display(m) {
  if (m.tb) {
    return { p: [String(m.points[0]), String(m.points[1])],
             note: m.superTb ? 'SUPER TIE-BREAK' : 'TIE-BREAK' };
  }
  var a = m.points[0], b = m.points[1];
  if (a >= 3 && b >= 3) {
    if (a === b) return { p: ['40', '40'], note: m.golden ? 'GOLDEN POINT' : 'DEUCE' };
    return a > b ? { p: ['AD', '40'], note: 'ADVANTAGE' } : { p: ['40', 'AD'], note: 'ADVANTAGE' };
  }
  return { p: [LABELS[a], LABELS[b]], note: '' };
}

function setSummary(m) {
  var out = [];
  for (var i = 0; i < m.sets.length; i++) {
    var st = m.sets[i];
    out.push(st.g[0] + '-' + st.g[1]);
  }
  return out.join('  ');
}

var Scoring = {
  HEART: HEART, newMatch: newMatch, point: point, answerGolden: answerGolden,
  display: display, setSummary: setSummary, clone: clone
};
export default Scoring;
