// Emberlyn — boot and the one loop.
//
// Screens: title, play, paused, win, lose. Mouse and keyboard both work:
// click a card (or press 1-7), then Enter/Space to play it; P pauses,
// M mutes, R rematches from an end screen, T returns to the title.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|lose stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. ?bot=1 auto-plays a whole duel with the autopilot and
// writes the result to window.__result and the status line, for the playtest.
import { BEST_KEY, DIFFICULTY, RECORD_KEY, START_LIFE, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createDuel, resolveTurn } from './deck.js';
import { chooseBaronCard, choosePlayerCard } from './ai.js';
import { createRenderer, SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_REMATCH, ACTION_TITLE, createInput } from './input.js';
import { createSound } from './sound.js';
import { playFullGame, stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const bot = params.get('bot') === '1';
const uibot = params.get('uibot') === '1';
const botTarget = params.get('target') ?? null;
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const difficultyParam = params.get('diff');
const difficultyKey = DIFFICULTY[difficultyParam] ? difficultyParam : 'adept';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const sound = createSound();

function readRecord() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECORD_KEY) ?? '{}');
    return {
      wins: raw.wins | 0,
      losses: raw.losses | 0,
      bestDamage: Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0,
    };
  } catch {
    return { wins: 0, losses: 0, bestDamage: 0 };
  }
}

function saveRecord(record) {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify({ wins: record.wins, losses: record.losses }));
    window.localStorage.setItem(BEST_KEY, String(record.bestDamage));
  } catch {
    // Storage can be off: the record then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, seed, difficultyKey);
  let painted = 0;
  function paint() {
    renderer.draw(scene.duel, scene.screen, {
      selectedIndex: -1,
      muted: false,
      record: readRecord(),
      difficulties: DIFFICULTY,
      difficultyKey,
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runBot() {
  // Auto-play full duels (seed search) until the wanted outcome appears,
  // or the first finished duel when no target was asked for.
  let duel = null;
  let tried = 0;
  for (let s = 0; s < 400 && tried < 400; s += 1) {
    tried += 1;
    const candidate = playFullGame(seed + s, difficultyKey);
    if (!candidate) continue;
    duel = candidate;
    if (!botTarget || candidate.winner === botTarget) break;
  }
  if (!duel) {
    window.__result = { outcome: 'incomplete', tried };
    announce('Bot playtest: no duel finished.');
    return;
  }
  const record = readRecord();
  const won = duel.winner === 'player';
  if (won) record.wins += 1;
  else record.losses += 1;
  record.bestDamage = Math.max(record.bestDamage, duel.playerDamage);
  saveRecord(record);
  window.__result = {
    outcome: won ? 'win' : 'lose',
    winner: duel.winner,
    turns: duel.turn,
    playerLife: duel.playerLife,
    baronLife: duel.baronLife,
    playerDamage: duel.playerDamage,
    baronDamage: duel.baronDamage,
    surges: duel.surgeCount,
    bestChain: duel.bestChain,
    phoenixPlayed: duel.phoenixPlayed,
    seed: duel.seed,
    tried,
  };
  announce(
    `Bot playtest: ${won ? 'Wren wins' : 'Ashwick wins'} in ${duel.turn} turns. ` +
      `Damage ${duel.playerDamage} vs ${duel.baronDamage}. Surges ${duel.surgeCount}, best chain ${duel.bestChain}.`,
  );
  const screen = won ? SCREEN_WIN : SCREEN_LOSE;
  let painted = 0;
  function paint() {
    renderer.draw(duel, screen, {
      selectedIndex: -1,
      muted: true,
      record,
      difficulties: DIFFICULTY,
      difficultyKey,
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, () => renderer.state);
  let screen = SCREEN_TITLE;
  let duel = createDuel(seed, difficultyKey);
  let selectedIndex = -1;
  let currentDifficulty = difficultyKey;
  let record = readRecord();
  let recorded = false;

  function startGame() {
    duel = createDuel(Math.floor(createRandom(Date.now() % 4294967296).next() * 4294967296), currentDifficulty);
    selectedIndex = -1;
    recorded = false;
    screen = SCREEN_PLAY;
    announce(`Playing. ${START_LIFE} life each. Play a card.`);
  }

  function finishDuel() {
    const won = duel.winner === 'player';
    screen = won ? SCREEN_WIN : SCREEN_LOSE;
    if (!recorded) {
      recorded = true;
      if (won) record.wins += 1;
      else record.losses += 1;
      record.bestDamage = Math.max(record.bestDamage, duel.playerDamage);
      saveRecord(record);
    }
    if (won) sound.win();
    else sound.lose();
    announce(
      won
        ? `Wren wins in ${duel.turn} turns. Damage ${duel.playerDamage}.`
        : `Ashwick wins in ${duel.turn} turns. Damage ${duel.playerDamage}.`,
    );
  }

  function playSelected() {
    if (screen !== SCREEN_PLAY || selectedIndex < 0) return;
    const playerCard = duel.playerHand[selectedIndex];
    if (!playerCard) return;
    const baronCard = chooseBaronCard(duel);
    if (!baronCard) return;
    const rec = resolveTurn(duel, playerCard, baronCard);
    selectedIndex = -1;
    if (rec.surge) sound.surge();
    else sound.play();
    if (duel.over) finishDuel();
    else announce(`Turn ${duel.turn}. ${duel.log[duel.log.length - 1]}`);
  }

  function handleClick(p) {
    if (!p) return;
    if (screen === SCREEN_TITLE) {
      const diff = input.difficultyAt(p);
      if (diff) {
        currentDifficulty = diff;
        sound.select();
        return;
      }
      if (input.startPressed(p)) startGame();
      return;
    }
    if (screen === SCREEN_PLAY) {
      const idx = input.handIndexAt(p);
      if (idx >= 0) {
        selectedIndex = idx;
        sound.select();
      }
      return;
    }
    if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      // Clicking anywhere on an end screen rematches.
      startGame();
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    const actions = input.takeActions();
    const keySelected = input.takeSelected();
    const click = input.takeClick();

    if (keySelected >= 0 && screen === SCREEN_PLAY && keySelected < duel.playerHand.length) {
      selectedIndex = keySelected;
      sound.select();
    }
    if (click) handleClick(click);

    if (actions & ACTION_MUTE) {
      sound.toggleMute();
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PLAY) playSelected();
    }
    if (actions & ACTION_REMATCH && (screen === SCREEN_WIN || screen === SCREEN_LOSE)) startGame();
    if (actions & ACTION_TITLE && screen !== SCREEN_TITLE) {
      screen = SCREEN_TITLE;
      duel = createDuel(seed, currentDifficulty);
      announce('Title screen.');
    }

    renderer.draw(duel, screen, {
      selectedIndex,
      muted: sound.muted,
      record,
      difficulties: DIFFICULTY,
      difficultyKey: currentDifficulty,
    });
    // Playtest hooks: the bot driver reads these, the game never writes them elsewhere.
    window.__screen = screen;
    window.__selected = selectedIndex;
    window.__duel = {
      turn: duel.turn,
      playerLife: duel.playerLife,
      baronLife: duel.baronLife,
      playerHand: duel.playerHand.length,
      baronHand: duel.baronHand.length,
      handValues: duel.playerHand.map((c) => c.value),
      handSuits: duel.playerHand.map((c) => c.suit),
      over: duel.over,
      winner: duel.winner,
      chainCount: duel.chainCount,
      surges: duel.surgeCount,
    };
  }

  announce('Emberlyn. Wren Emberlyn versus Baron Ashwick. Press Space or click to sit down.');
  requestAnimationFrame(frame);

  // ?uibot=1: a self-test driver that fires REAL DOM mouse/keyboard events
  // through the same listeners a human uses, and records every screen it
  // reaches. The playtest reads window.__uibot and the status line.
  if (uibot) {
    const results = { steps: [] };
    window.__uibot = results;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    function mouse(x, y) {
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: rect.left + (x * rect.width) / VIEW.width,
          clientY: rect.top + (y * rect.height) / VIEW.height,
        }),
      );
    }
    function kb(key, code) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true }));
    }
    (async () => {
      try {
        await sleep(400);
        results.title = window.__screen;
        mouse(640, 429);
        await sleep(200); // Adept difficulty button
        mouse(640, 628);
        await sleep(300); // SIT DOWN
        results.afterStart = window.__screen;
        kb('p', 'KeyP');
        await sleep(200);
        results.pause = window.__screen;
        kb('p', 'KeyP');
        await sleep(200);
        results.resume = window.__screen;
        let turns = 0;
        while (window.__screen === 'play' && turns < 40) {
          const hand = window.__duel.playerHand;
          const pick = Math.min(hand, 3);
          kb(String(pick), `Digit${pick}`);
          await sleep(120);
          results[`selected_${turns}`] = window.__selected;
          kb('Enter', 'Enter');
          await sleep(250);
          turns += 1;
        }
        results.turns = turns;
        results.end = window.__screen;
        results.duel = window.__duel;
        kb('r', 'KeyR');
        await sleep(300);
        results.afterRematch = window.__screen;
        kb('t', 'KeyT');
        await sleep(200);
        results.afterTitle = window.__screen;
        results.done = true;
        announce(`UI bot: ${JSON.stringify(results)}`);
      } catch (e) {
        results.error = String(e);
      }
      window.__uibotDone = true;
    })();
  }
}

if (shot) runShot(shot);
else if (bot) runBot();
else runGame();
