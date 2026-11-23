// Emberlyn — Duel of the Cinder Cartomancer.
// A 1-v-1 card duel: Wren Emberlyn vs Baron Ashwick, the Hollow Dealer.
// Tunables for the table, the hands and the duel rules.
export const VIEW = { width: 1280, height: 800 };
export const BEST_KEY = 'emberlyn-best-damage';
export const RECORD_KEY = 'emberlyn-record';
export const STEP = 1 / 60;

export const START_LIFE = 60;
export const HAND_SIZE = 5;
export const HAND_MAX = 7;
export const CHAIN_TARGET = 3;
export const CHAIN_SURGE_DAMAGE = 6;
export const CLASH_BONUS = 2;

export const DIFFICULTY = {
  apprentice: { label: 'Apprentice', baronLife: 50, ai: 'easy', blurb: 'Plays loose and careless.' },
  adept: { label: 'Adept', baronLife: 60, ai: 'greedy', blurb: 'A fair, cunning duel.' },
  master: { label: 'Master', baronLife: 75, ai: 'cunning', blurb: 'Reads your suits. Counters them.' },
};

// Four suits. The cycle: Ember > Thorn > Tide > Ember. Stone is neutral:
// it never gains or grants the advantage bonus, but hits +1 harder.
export const SUITS = {
  ember: { name: 'Ember', color: '#e8590c', light: '#ff922b', beats: 'thorn', glyph: 'flame' },
  thorn: { name: 'Thorn', color: '#2b8a3e', light: '#69db7c', beats: 'tide', glyph: 'leaf' },
  tide: { name: 'Tide', color: '#1971c2', light: '#4dabf7', beats: 'ember', glyph: 'wave' },
  stone: { name: 'Stone', color: '#868e96', light: '#adb5bd', beats: null, glyph: 'hex' },
};
export const SUIT_ORDER = ['ember', 'thorn', 'tide', 'stone'];
