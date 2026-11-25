export default {
  vibrate({ mode }) { const l = document.getElementById('log'); if (l) l.textContent = 'bzzt (' + mode + ')'; }
};
