# TabOverload.io

Chaotic neon endless runner: steer a ragdoll down an accelerating slope while
clicking for cookies, building ramps, and fighting off pop-up tabs.

**Play:** https://fanaustinca.github.io/taboverload/

## Controls
| Input | Action |
|---|---|
| Mouse X | Steer left/right |
| Left-click | +1 cookie |
| Right-click | Build a blue ramp ahead (lasts 4 s) — launches you over obstacles |
| Space | While ragdolled: pay 25 cookies to recover instantly |
| Letters / Enter | Answer the 4-letter word pop-up |

## Run locally
```bash
npm install        # once
npm run dev        # http://localhost:5173 with hot reload
npm run build      # production build -> dist/
npm run preview    # serve dist/ at http://localhost:4173
```

## Structure
```
index.html                 HUD + pop-up layer markup, start screen
src/
  main.js                  entry: boots Game, start button
  style.css                HUD, pop-ups, neon theme
  config.js                ALL tuning numbers (speed, ramps, economy, pop-ups)
  core/
    Game.js                renderer, bloom, scene, main loop, wires systems
    Input.js               mouse steer, L/R click, Space, key events
  world/
    Track.js               endless recycled track segments + obstacles
    Player.js              placeholder jointed ragdoll (run/air/ragdoll states)
    Ramps.js               right-click ramps with 4 s lifetime
  systems/
    Economy.js             cookies, click value, passive income
  ui/
    HUD.js                 cookie counter, leaderboard (bots), status
    PopupManager.js        schedules/owns pop-ups; register new minigames here
    popups/
      createWindow.js      fake browser-tab window chrome
      WordGuessPopup.js    4-letter / 4-guess word puzzle
      WindshieldAttack.js  opponent doodle scribbled over your screen
tools/screenshot.mjs       headless visual QA (puppeteer-core + Chrome)
```

## Debug console
`window.game` is exposed:
```js
game.popups.spawnByName('word')        // or 'windshield'
game.player.knockDown()
game.economy.add(100)
```

## Adding a pop-up minigame
Create a class in `src/ui/popups/` with `constructor(layer, ctx)`, `update(dt) -> bool`,
optional `onKey(e)`, and `destroy()`, then add it to `POPUP_TYPES` in `PopupManager.js`.
