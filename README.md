# emberlyn-card-duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Unge32/emberlyn-card-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Unge32/emberlyn-card-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**EMBERLYN — Duel of the Cinder Cartomancer.** Wren Emberlyn, cartomancer of the last cinder, sits down against Baron Ashwick — the Hollow Dealer who never loses a table. A 1-v-1 card duel in the desktop browser: title screen, both hands on the table, life totals, a visible score, and win and lose screens.

The signature is the **Ember Chain**: play the same suit three turns running and the Cinder Surge erupts — +6 damage and draw 2 cards. The suits run a cycle — Ember beats Thorn, Thorn beats Tide, Tide beats Ember, Stone is neutral but hits +1 harder — and the higher card wins each clash and deals its damage while the loser deals nothing. Three one-of-a-kind cards hide in the 43-card deck: the **Phoenix of Emberlyn** (deals 12, heals 8), the **Tidewell Chalice** (deals 11, heals 5) and the **Stoneheart Aegis** (deals 11, gains 5 shield). Three difficulties — Apprentice, Adept, Master — each with its own Baron brain: the Master reads your chain suit and counters it.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network, just static files under `game/`.

Controls: **click a card** (or press **1–7**), then **Enter / Space** to play it · **P** pause · **M** mute · **R** rematch from an end screen · **T** title screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=seno-angga&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
