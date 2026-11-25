# Padel-App — padel scorer + training timer for Huawei Watch Fit 3

A Lite Wearable (JS) app for the Huawei Watch Fit 3 (portrait screen, 408 px wide × 480 px tall; Huawei lists it as 480 × 408).

## Features
- **Score**: `♥ - 15 - 30 - 40 - game`. At 40-40 → DEUCE → advantage (two in a row wins; lose the
  advantage point and it's back to deuce). When the game returns to deuce a **2nd time**, a popup
  offers **Golden point** (next point wins) or carry on with advantage. Settings: golden point
  `Ask` / `Always` / `Off`.
- Sets: 6 games (win by 2) or short sets (first to 4, tie-break at 3-3); tie-break to 7, to 10, or off; best of 3 or 1 set; optional 10-point super tie-break decider.
- **Input**: tap the YOU / THEM panel, **or** a physical button: Settings → *My button* → press the key you
  want for yourself; any other key then scores for THEM. **UNDO** reverts any point.
- **Fitness session (FIT tab)**: live heart rate, duration, avg/max HR and an *estimated* calorie count
  (Keytel heart-rate formula using the age / weight / sex you set under Settings → Profile). Live HR and kcal also show
  on the Score screen. This is the app's own tracking: it does **not** write into Huawei Health.
- **Win rate**: win %, W-L, last 5 form, streak, points-won %, games-won %. Matches are saved automatically on finish.
- Match, history, settings and training progress persist across app restarts.

## Layout
```
huawei-watch/entry/src/main/
  config.json
  js/default/app.js
  js/default/common/   scoring.js  session.js  stats.js  controller.js   (all logic, UI-agnostic)
  js/default/pages/index/  index.hml / .css / .js                         (the watch UI)
tests/scoring.test.js   `npm test`  – rules, golden point, tie-break, session/calories, stats, key mapping
sim/index.html          browser simulator running the real page code
```

## Run the simulator / tests
```
npm test
npx http-server -p 8000 .        # or: python3 -m http.server 8000
# then open http://localhost:8000/sim/index.html  (keys: Z / M; ?view=Stats|Session|Settings|Profile jumps to a screen)
```

## Build & install on the watch
`huawei-watch/` is a complete DevEco Studio project (Lite Wearable, FA model, JS). Tested with DevEco Studio 6.1.1 / HarmonyOS SDK 6.1.1(24).

1. DevEco Studio → **File → Open** → select the `huawei-watch` folder (not the repo root).
2. **Preview**: open `pages/index/index.hml` → Previewer, or Device Manager → Lite Wearable simulator.
   Set the device to a **408 × 480 portrait rectangle** (Fit 3: 408 wide, 480 tall) rather than the 454 × 454 round default.
3. **Command-line build** (unsigned HAP → `entry/build/default/outputs/default/`):
   ```
   cd huawei-watch
   set DEVECO_SDK_HOME=C:\Program Files\Huawei\DevEco Studio\sdk
   "C:\Program Files\Huawei\DevEco Studio\tools\node\node.exe" "C:\Program Files\Huawei\DevEco Studio\tools\hvigor\bin\hvigorw.js" --mode module -p product=default -p module=entry@default assembleHap --no-daemon
   ```
4. **Install on the Fit 3**: sign in under File → Project Structure → Signing Configs → *Automatically generate signature*
   (needs a Huawei developer account), enable Developer mode on the watch via the Huawei Health app, connect, and Run.

**Lite Wearable gotchas (the compiler enforces these):** no `class="{{...}}"` bindings, no `position`, no `line-height`,
no per-side borders. Overlays live in a `<stack>`. `entry/src/main/js/package.json` must stay without a `"type"` field,
or the build leaves `require()` unbundled and the app crashes with *require is not defined*.

## Recommended use with the watch's built-in Padel workout
Third-party apps (as far as I know) cannot start or feed Huawei's own Padel workout, which is the only thing that
records to Huawei Health with its own HR/calorie numbers. Either start the system Padel workout for official data and use
this app only for scoring, or use this app's FIT tab for in-app HR/calorie tracking. Which of the two can run side by side on the
Fit 3 is untested.

## Things to verify on a real watch (not testable off-device)
- **Physical key events.** The page handles `onkey` with `{code, action}` and scores on key-down. Lite Wearable
  firmware may reserve the side button for system use (back/home), and the Fit 3 has a single side
  button, so touch is the primary input; two-button assignment works on watches that deliver two key codes.
- Heart rate: `@system.sensor` `subscribeHeartRate` and the `ohos.permission.READ_HEALTH_DATA` entry in `config.json` are from memory of the Lite Wearable docs; the permission name may differ.
- `@system.file` / `@system.vibrator` API names follow the Lite Wearable docs; the `♥` glyph depends on the watch font.
