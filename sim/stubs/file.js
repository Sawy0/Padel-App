// Browser stand-in for @system.file, backed by localStorage.
export default {
  readText({ uri, success, fail }) {
    const v = localStorage.getItem(uri);
    v === null ? fail && fail() : success({ text: v });
  },
  writeText({ uri, text }) { localStorage.setItem(uri, text); }
};
