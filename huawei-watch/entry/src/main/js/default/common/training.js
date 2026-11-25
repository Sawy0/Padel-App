// Built-in padel training programs: a list of timed blocks.
// block = [name, seconds, coaching tip]
var PROGRAMS = [
  { id: 'quick', name: 'Quick 15', blocks: [
    ['Warm-up', 120, 'Jog, arm circles, split-steps'],
    ['FH / BH rally', 180, 'Cross-court, soft hands'],
    ['Volleys at net', 180, 'Short backswing, punch'],
    ['Bandeja', 180, 'Slice, stay sideways'],
    ['Serve & return', 180, 'Serve to the T, low return'],
    ['Cool-down', 60, 'Stretch shoulders & legs']
  ] },
  { id: 'std', name: 'Padel 30', blocks: [
    ['Warm-up', 240, 'Jog, mobility, split-steps'],
    ['Back-glass play', 300, 'Let it bounce off the glass'],
    ['Volleys at net', 240, 'Short backswing, punch'],
    ['Bandeja', 240, 'Continental grip, slice'],
    ['Vibora', 240, 'Side spin, aim at the fence'],
    ['Lob + smash', 240, 'Deep lob, then bajada/smash'],
    ['Serve & return', 240, 'Serve to the T, low return'],
    ['Cool-down', 60, 'Stretch shoulders & legs']
  ] },
  { id: 'full', name: 'Full 45', blocks: [
    ['Warm-up', 300, 'Jog, mobility, split-steps'],
    ['FH / BH rally', 300, 'Cross-court, soft hands'],
    ['Back-glass play', 360, 'Let it bounce off the glass'],
    ['Volleys at net', 360, 'Short backswing, punch'],
    ['Bandeja', 300, 'Continental grip, slice'],
    ['Vibora', 300, 'Side spin, aim at the fence'],
    ['Smash / bajada', 300, 'Contact in front, finish low'],
    ['Lob', 180, 'High and deep over the net player'],
    ['Serve & return', 240, 'Serve to the T, low return'],
    ['Cool-down', 60, 'Stretch shoulders & legs']
  ] }
];

function find(id) {
  for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].id === id) return PROGRAMS[i];
  return PROGRAMS[1];
}

function create(id) {
  var p = find(id);
  return { id: p.id, idx: 0, left: p.blocks[0][1], running: false, done: false };
}

function total(id) {
  var p = find(id), t = 0;
  for (var i = 0; i < p.blocks.length; i++) t += p.blocks[i][1];
  return t;
}

function elapsed(tr) {
  var p = find(tr.id), t = 0;
  for (var i = 0; i < tr.idx && i < p.blocks.length; i++) t += p.blocks[i][1];
  if (!tr.done) t += p.blocks[tr.idx][1] - tr.left; else t = total(tr.id);
  return t;
}

// Move to next block. Returns 'block' | 'done'.
function next(tr) {
  var p = find(tr.id);
  tr.idx++;
  if (tr.idx >= p.blocks.length) {
    tr.idx = p.blocks.length - 1;
    tr.left = 0; tr.done = true; tr.running = false;
    return 'done';
  }
  tr.left = p.blocks[tr.idx][1];
  return 'block';
}

// Advance by dt seconds. Returns null | 'block' | 'done'.
function tick(tr, dt) {
  if (!tr.running || tr.done) return null;
  var p = find(tr.id), ev = null;
  tr.left -= dt;
  while (tr.left <= 0 && !tr.done) {
    var over = -tr.left;
    ev = next(tr);
    if (ev === 'block') tr.left -= over;
  }
  return ev;
}

var Training = { PROGRAMS: PROGRAMS, find: find, create: create, total: total,
                 elapsed: elapsed, next: next, tick: tick };
export default Training;
