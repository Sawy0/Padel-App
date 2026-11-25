// Simulated heart-rate sensor: wanders around 125 bpm.
let t = null;
export default {
  subscribeHeartRate({ success }) {
    let hr = 118;
    clearInterval(t);
    t = setInterval(() => { hr = Math.max(95, Math.min(165, hr + Math.round((Math.random() - 0.4) * 6))); success({ heartRate: hr }); }, 1000);
  },
  unsubscribeHeartRate() { clearInterval(t); }
};
