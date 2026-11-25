// Fitness session: duration, heart rate, and an ESTIMATED calorie count.
// Calories use the Keytel et al. heart-rate formula (age, weight, sex). It is an estimate,
// not Huawei Health's figure, and is only meaningful for roughly 90-170 bpm.
function create() {
  return { running: false, started: false, secs: 0, kcal: 0, hrSum: 0, hrN: 0, hrMax: 0 };
}

function kcalPerMin(hr, p) {
  var v;
  if (p.sex === 'F') v = (-20.4022 + 0.4472 * hr - 0.1263 * p.weight + 0.074 * p.age) / 4.184;
  else v = (-55.0969 + 0.6309 * hr + 0.1988 * p.weight + 0.2017 * p.age) / 4.184;
  return v > 0 ? v : 0;
}

// Advance by dt seconds using the latest heart rate (0 = no reading).
function tick(se, dt, hr, p) {
  if (!se.running) return;
  se.secs += dt;
  if (hr > 0) {
    se.kcal += kcalPerMin(hr, p) * dt / 60;
    se.hrSum += hr * dt; se.hrN += dt;
    if (hr > se.hrMax) se.hrMax = hr;
  }
}

function avgHr(se) { return se.hrN > 0 ? Math.round(se.hrSum / se.hrN) : 0; }

var Session = { create: create, kcalPerMin: kcalPerMin, tick: tick, avgHr: avgHr };
export default Session;
