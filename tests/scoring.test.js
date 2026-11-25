import assert from 'node:assert/strict';
import Scoring from '../huawei-watch/entry/src/main/js/default/common/scoring.js';
import Session from '../huawei-watch/entry/src/main/js/default/common/session.js';
import Stats from '../huawei-watch/entry/src/main/js/default/common/stats.js';
import Ctl from '../huawei-watch/entry/src/main/js/default/common/controller.js';

var n = 0;
function t(name, fn) { fn(); n++; console.log('ok -', name); }
function pts(m, seq) { seq.forEach(function (x) { m = Scoring.point(m, x); }); return m; }
function disp(m) { return Scoring.display(m).p.join(':') + ' ' + Scoring.display(m).note; }
var H = Scoring.HEART;

t('0 shows heart, then 15-30-40', function () {
  var m = Scoring.newMatch();
  assert.equal(disp(m), H + ':' + H + ' ');
  m = pts(m, [0]); assert.equal(disp(m), '15:' + H + ' ');
  m = pts(m, [0, 0]); assert.equal(disp(m), '40:' + H + ' ');
});
t('win game from 40 to love', function () {
  var m = pts(Scoring.newMatch(), [0, 0, 0, 0]);
  assert.deepEqual(m.games, [1, 0]); assert.deepEqual(m.points, [0, 0]);
});
t('40-40 = DEUCE, advantage, back to deuce, then advantage + win', function () {
  var m = pts(Scoring.newMatch({ golden: 'off' }), [0, 0, 0, 1, 1, 1]);
  assert.equal(disp(m), '40:40 DEUCE');
  m = pts(m, [0]); assert.equal(disp(m), 'AD:40 ADVANTAGE');
  m = pts(m, [1]); assert.equal(disp(m), '40:40 DEUCE');
  m = pts(m, [1]); assert.equal(disp(m), '40:AD ADVANTAGE');
  m = pts(m, [1]); assert.deepEqual(m.games, [0, 1]);
});
t('golden point is offered on the 2nd deuce only', function () {
  var m = pts(Scoring.newMatch(), [0, 0, 0, 1, 1, 1]);   // 1st deuce
  assert.equal(m.pendingGolden, false);
  m = pts(m, [0, 1]);                                    // AD then back to deuce (2nd)
  assert.equal(m.pendingGolden, true);
  var frozen = Scoring.point(m, 0);                      // popup blocks scoring
  assert.equal(frozen, m);
});
t('golden YES: next point at deuce wins game', function () {
  var m = pts(Scoring.newMatch(), [0, 0, 0, 1, 1, 1, 0, 1]);
  m = Scoring.answerGolden(m, true);
  assert.equal(disp(m), '40:40 GOLDEN POINT');
  m = pts(m, [1]); assert.deepEqual(m.games, [0, 1]);
});
t('golden NO: advantage continues and is not asked again', function () {
  var m = pts(Scoring.newMatch(), [0, 0, 0, 1, 1, 1, 0, 1]);
  m = Scoring.answerGolden(m, false);
  m = pts(m, [0, 1, 0, 1]); assert.equal(m.pendingGolden, false);
  m = pts(m, [0, 0]); assert.deepEqual(m.games, [1, 0]);
});
t('golden "always" mode: first deuce is sudden death, never asks', function () {
  var m = pts(Scoring.newMatch({ golden: 'always' }), [0, 0, 0, 1, 1, 1, 1]);
  assert.deepEqual(m.games, [0, 1]);
});
function game(m, w) { return pts(m, [w, w, w, w]); }
t('set 6-4, then 3rd game state resets', function () {
  var m = Scoring.newMatch({ sets: 1 });
  for (var i = 0; i < 4; i++) m = game(m, 1);
  for (i = 0; i < 6; i++) m = game(m, 0);
  assert.equal(m.winner, 0); assert.deepEqual(m.sets[0].g, [6, 4]);
});
t('tie-break at 6-6, first to 7 by 2', function () {
  var m = Scoring.newMatch({ sets: 1 });
  for (var i = 0; i < 5; i++) { m = game(m, 0); m = game(m, 1); }
  m = game(m, 0); m = game(m, 1);
  assert.equal(m.tb, true);
  m = pts(m, [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]); // 6-6
  m = pts(m, [1]); assert.equal(m.winner, null);   // 6-7 not enough
  m = pts(m, [1]); assert.equal(m.winner, 1); assert.deepEqual(m.sets[0].g, [6, 7]);
  assert.equal(m.sets[0].tb.join('-'), '6-8');
});
t('best of 3, super tie-break decider to 10', function () {
  var m = Scoring.newMatch({ finalSet: 'supertb' });
  for (var i = 0; i < 6; i++) m = game(m, 0);
  for (i = 0; i < 6; i++) m = game(m, 1);
  assert.equal(m.superTb, true);
  for (i = 0; i < 9; i++) m = pts(m, [0]);
  assert.equal(m.winner, null);
  m = pts(m, [0]); assert.equal(m.winner, 0); assert.deepEqual(m.setsWon, [2, 1]);
});
t('best of 3 ends 2-0', function () {
  var m = Scoring.newMatch();
  for (var i = 0; i < 12; i++) m = game(m, 0);
  assert.equal(m.winner, 0); assert.deepEqual(m.setsWon, [2, 0]);
  assert.deepEqual(m.totals.games, [12, 0]);
});
t('session: calories from heart rate (Keytel) and duration', function () {
  var p = { age: 30, weight: 75, sex: 'M' }, se = Session.create();
  Session.tick(se, 60, 140, p); assert.equal(se.secs, 0);          // not running -> ignored
  se.running = true;
  Session.tick(se, 60, 140, p);                                    // 1 minute at 140 bpm
  assert.ok(Math.abs(se.kcal - 12.95) < 0.1, 'kcal ' + se.kcal);     // ~12.95 kcal/min
  Session.tick(se, 60, 0, p);                                      // no reading: time counts, kcal doesn't
  assert.equal(se.secs, 120); assert.ok(se.kcal < 13);
  assert.equal(Session.avgHr(se), 140); assert.equal(se.hrMax, 140);
  assert.ok(Session.kcalPerMin(20, p) === 0);   // result is clamped, never negative
});
t('stats / win rate', function () {
  var w = { winner: 0, sets: [], setsWon: [2, 0], totals: { points: [50, 30], games: [12, 6] } };
  var l = { winner: 1, sets: [], setsWon: [0, 2], totals: { points: [30, 50], games: [6, 12] } };
  var s = Stats.summary([Stats.makeRecord(w), Stats.makeRecord(w), Stats.makeRecord(l)]);
  assert.equal(s.rate, '67%'); assert.equal(s.record, undefined); assert.equal(s.streak, '1L');
  assert.equal(s.form, 'L W W'); assert.equal(Stats.summary([]).rate, '--');
});
t('controller: key mapping, undo, history, golden popup', function () {
  var disk = '';
  var hrCb = null;
  Ctl.init({ read: function (cb) { cb(disk); }, write: function (x) { disk = x; } },
           { vibrate: function () {}, redraw: function () {}, stopHR: function () { hrCb = null; },
             startHR: function (cb) { hrCb = cb; } });
  Ctl.key(10); assert.equal(Ctl._state.match.totals.points[0], 0);   // unassigned = ignored
  Ctl.beginAssign(); Ctl.key(7);                                      // 7 = YOU
  Ctl.key(7); Ctl.key(99);                                            // other key = THEM
  assert.deepEqual(Ctl._state.match.points, [1, 1]);
  Ctl.undo(); assert.deepEqual(Ctl._state.match.points, [1, 0]);
  Ctl.setView('stats'); Ctl.key(7); assert.deepEqual(Ctl._state.match.points, [1, 0]); // keys only score on match view
  Ctl.setView('match');
  for (var i = 0; i < 3; i++) Ctl.point(0);                           // game for YOU
  assert.deepEqual(Ctl._state.match.games, [1, 0]);
  for (i = 0; i < 44; i++) Ctl.point(0);                              // rest of the match
  assert.equal(Ctl.vm().over, true); assert.equal(Ctl.vm().rate, '100%');
  Ctl.undo(); assert.equal(Ctl.vm().rate, '--');                       // undo removes the saved record
  assert.ok(JSON.parse(disk).settings.myKey === 7);
  Ctl.sessionToggle(); assert.ok(hrCb); hrCb(130);                      // session start subscribes to HR
  Ctl._state.lastTick -= 30000; Ctl.tick();                             // 30 s pass
  assert.equal(Ctl.vm().sesHr, '130'); assert.equal(Ctl.vm().sesTime, '0:30'); assert.ok(+Ctl.vm().sesKcal > 3);
  Ctl.sessionToggle(); assert.equal(hrCb, null);                        // stop unsubscribes                    // persisted
});
console.log('\n' + n + ' tests passed');
