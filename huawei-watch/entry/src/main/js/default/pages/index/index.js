import file from '@system.file';
import vibrator from '@system.vibrator';
import sensor from '@system.sensor';
import ctl from '../../common/controller.js';

var STORE = 'internal://app/padel.json';

var adapter = {
  read: function (cb) {
    file.readText({
      uri: STORE,
      success: function (d) { cb(d.text); },
      fail: function () { cb(''); }
    });
  },
  write: function (text) {
    file.writeText({ uri: STORE, text: text, fail: function () {} });
  }
};

export default {
  data: ctl.vm(),
  timer: null,

  onInit() {
    var self = this;
    ctl.init(adapter, {
      vibrate: function (kind) { vibrator.vibrate({ mode: kind === 'long' ? 'long' : 'short' }); },
      redraw: function () { self.refresh(); },
      startHR: function (cb) {
        sensor.subscribeHeartRate({
          success: function (ret) { cb(ret.heartRate); },
          fail: function () {}
        });
      },
      stopHR: function () { sensor.unsubscribeHeartRate(); }
    });
  },
  onShow() {
    var self = this;
    this.refresh();
    if (!this.timer) this.timer = setInterval(function () { ctl.tick(); }, 1000);
  },
  onHide() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },
  onDestroy() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  refresh() {
    var v = ctl.vm();
    for (var k in v) this[k] = v[k];
  },

  // score
  tapMe() { ctl.point(0); },
  tapOpp() { ctl.point(1); },
  undo() { ctl.undo(); },
  newMatch() { ctl.newMatch(); },
  goldenYes() { ctl.answerGolden(true); },
  goldenNo() { ctl.answerGolden(false); },

  // physical buttons. Event shape can differ by firmware: act on key-down only.
  onKey(e) {
    if (!e) return;
    if (e.action !== undefined && e.action !== 0) return;
    ctl.key(e.code);
  },

  // navigation
  goMatch() { ctl.setView('match'); },
  goStats() { ctl.setView('stats'); },
  goSession() { ctl.setView('session'); },
  goSettings() { ctl.setView('settings'); },

  // stats / training / settings
  clearHistory() { ctl.clearHistory(); },
  sessionToggle() { ctl.sessionToggle(); },
  goProfile() { ctl.settingsPage(1); },
  tAge() { ctl.toggleSetting('age'); },
  tWeight() { ctl.toggleSetting('weight'); },
  tSex() { ctl.toggleSetting('sex'); },
  tSets() { ctl.toggleSetting('sets'); },
  tGolden() { ctl.toggleSetting('golden'); },
  tFinal() { ctl.toggleSetting('finalSet'); },
  tGps() { ctl.toggleSetting('gps'); },
  tTb() { ctl.toggleSetting('tb'); },
  tHaptics() { ctl.toggleSetting('haptics'); },
  assignKey() { ctl.beginAssign(); },
  clearKey() { ctl.clearKey(); }
};
