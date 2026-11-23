// Screenshot scenes behind ?shot=start|play|win|lose (with &seed=N).
// Every scene is a real duel played forward by the autopilot — the win and
// lose scenes search seeds (deterministically, from the given seed) until a
// full game ends that way, so the frame shows a genuine outcome.
import { createDuel, resolveTurn } from './deck.js';
import { chooseBaronCard, choosePlayerCard } from './ai.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Play a whole duel with both sides on autopilot. Returns the finished duel or null. */
export function playFullGame(seed, difficultyKey, maxTurns = 80) {
  const duel = createDuel(seed, difficultyKey);
  let guard = 0;
  while (!duel.over && guard < maxTurns) {
    guard += 1;
    const playerCard = choosePlayerCard(duel);
    const baronCard = chooseBaronCard(duel);
    if (!playerCard || !baronCard) break;
    resolveTurn(duel, playerCard, baronCard);
  }
  return duel.over ? duel : null;
}

/** Play `turns` turns of a duel (mid-game table state). */
export function playTurns(seed, difficultyKey, turns) {
  const duel = createDuel(seed, difficultyKey);
  for (let t = 0; t < turns && !duel.over; t += 1) {
    const playerCard = choosePlayerCard(duel);
    const baronCard = chooseBaronCard(duel);
    if (!playerCard || !baronCard) break;
    resolveTurn(duel, playerCard, baronCard);
  }
  return duel;
}

/**
 * Stage the named scene. Returns { screen, duel }.
 * win/lose: seed-search for a real game that ends that way.
 */
export function stageShot(name, seed, difficultyKey) {
  if (name === 'play') {
    return { screen: SCREEN_PLAY, duel: playTurns(seed, difficultyKey, 4) };
  }
  if (name === 'win' || name === 'lose') {
    const want = name === 'win' ? 'player' : 'baron';
    for (let s = 0; s < 400; s += 1) {
      const duel = playFullGame(seed + s, difficultyKey);
      if (duel && duel.winner === want) {
        return { screen: want === 'player' ? SCREEN_WIN : SCREEN_LOSE, duel };
      }
    }
    // Fallback: show the closest full game either way.
    const duel = playFullGame(seed, difficultyKey) ?? playTurns(seed, difficultyKey, 10);
    return { screen: duel.winner === 'player' ? SCREEN_WIN : SCREEN_LOSE, duel };
  }
  return { screen: SCREEN_TITLE, duel: createDuel(seed, difficultyKey) };
}
