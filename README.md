# Padel-App — padel scorer + training timer for Huawei Watch Fit 3

A Lite Wearable (JS) app for the Huawei Watch Fit 3 (480×408 screen).

## Features
- **Score**: `♥ - 15 - 30 - 40 - game`. At 40-40 → DEUCE → advantage (two in a row wins; lose the
  advantage point and it's back to deuce). When the game returns to deuce a **2nd time**, a popup
  offers **Golden point** (next point wins) or carry on with advantage. Settings: golden point
  `Ask` / `Always` / `Off`.
- Sets to 6 (win by 2), tie-break at 6-6 (to 7), best of 3 or 1 set, optional 10-point super tie-break decider.
- **Input**: tap the YOU / THEM panel, **or** a physical button: Settings → *My button* → press the key you
  want for yourself; any other key then scores for THEM. **UNDO** reverts any point.
- **Training**: built-in timed programs (Quick 15 / Padel 30 / Full 45) with drill name, coaching tip,
  countdown, and vibration at each block change. Runs *while you score* — current drill shows on the Score screen.
- **Win rate**: win %, W-L, last 5 form, streak, points-won %, games-won %. Matches are saved automatically on finish.
- Match, history, settings and training progress persist across app restarts.

## Layout
```
huawei-watch/entry/src/main/
  config.json
  js/default/app.js
  js/default/common/   scoring.js  training.js  stats.js  controller.js   (all logic, UI-agnostic)
  js/default/pages/index/  index.hml / .css / .js                         (the watch UI)
tests/scoring.test.js   `npm test`  – rules, golden point, tie-break, training, stats, key mapping
sim/index.html          browser simulator running the real page code
```

## Run the simulator / tests
```
npm test
python3 -m http.server 8000      # then open http://localhost:8000/sim/index.html  (keys: Z / M = the two buttons)
```

## Install on the watch
1. DevEco Studio → New Project → **Lite Wearable → Empty Ability (JS)**, name `Padel Score`.
2. Copy `huawei-watch/entry/src/main/js/default/*` over the project's `entry/src/main/js/default/`,
   and merge `config.json` (keep the template's icon/string resources).
3. Run on the Fit 3 / Wearable Simulator (Huawei developer account + watch debug mode needed), or build a signed HAP for AppGallery.

## Things to verify on a real watch (not testable off-device)
- **Physical key events.** The page handles `onkey` with `{code, action}` and scores on key-down. Lite Wearable
  firmware may reserve the side button for system use (back/home), and the Fit 3 has a single side
  button, so touch is the primary input; two-button assignment works on watches that deliver two key codes.
- `@system.file` / `@system.vibrator` API names follow the Lite Wearable docs; the `♥` glyph depends on the watch font.
