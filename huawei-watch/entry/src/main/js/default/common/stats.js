// Win-rate statistics from saved match records.
function makeRecord(m) {
  return { t: Date.now(), won: m.winner === 0, sets: m.sets, sw: m.setsWon,
           pts: m.totals.points, games: m.totals.games };
}

function pct(a, b) { return (a + b) === 0 ? null : Math.round(100 * a / (a + b)); }

function summary(records) {
  var n = records.length, wins = 0, pw = 0, pl = 0, gw = 0, gl = 0, i;
  for (i = 0; i < n; i++) {
    var r = records[i];
    if (r.won) wins++;
    pw += r.pts[0]; pl += r.pts[1];
    gw += r.games[0]; gl += r.games[1];
  }
  var form = [];
  for (i = Math.max(0, n - 5); i < n; i++) form.push(records[i].won ? 'W' : 'L');
  var streak = 0, kind = '';
  if (n) {
    kind = records[n - 1].won ? 'W' : 'L';
    for (i = n - 1; i >= 0 && records[i].won === (kind === 'W'); i--) streak++;
  }
  var rate = pct(wins, n - wins);
  return {
    n: n, wins: wins, losses: n - wins,
    rate: rate === null ? '--' : rate + '%',
    ptsRate: pct(pw, pl) === null ? '--' : pct(pw, pl) + '%',
    gamesRate: pct(gw, gl) === null ? '--' : pct(gw, gl) + '%',
    form: form.reverse().join(' ') || '-',     // most recent first
    streak: n ? streak + kind : '-'
  };
}

var Stats = { makeRecord: makeRecord, summary: summary };
export default Stats;
