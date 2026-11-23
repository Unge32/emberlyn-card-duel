// The duel itself: deck, hands, the Ember Chain, specials and turn resolution.
// Pure logic (no DOM, no canvas) so Node can simulate whole duels for the playtest.
import {
  CHAIN_SURGE_DAMAGE,
  CHAIN_TARGET,
  CLASH_BONUS,
  DIFFICULTY,
  HAND_MAX,
  HAND_SIZE,
  START_LIFE,
  SUIT_ORDER,
  SUITS,
} from './config.js';
import { createRandom, shuffle } from './random.js';

let uid = 0;

/** One card. `special` is null or one of 'phoenix' | 'tidewell' | 'stoneheart'. */
export function makeCard(suit, value, special = null) {
  uid += 1;
  return { id: uid, suit, value, special };
}

export const SPECIALS = {
  phoenix: {
    name: 'Phoenix of Emberlyn',
    text: 'Wren\u2019s signature. Deals 12, heals 8.',
    value: 12,
    suit: 'ember',
  },
  tidewell: {
    name: 'Tidewell Chalice',
    text: 'Deals 11, heals 5.',
    value: 11,
    suit: 'tide',
  },
  stoneheart: {
    name: 'Stoneheart Aegis',
    text: 'Deals 11, gains 5 shield.',
    value: 11,
    suit: 'stone',
  },
};

/** The 43-card shared deck: 4 suits x values 1-10, plus the three signature cards. */
export function buildDeck() {
  const deck = [];
  for (const suit of SUIT_ORDER) {
    for (let value = 1; value <= 10; value += 1) deck.push(makeCard(suit, value));
  }
  for (const [key, spec] of Object.entries(SPECIALS)) {
    deck.push(makeCard(spec.suit, spec.value, key));
  }
  return deck;
}

export function cardName(card) {
  if (card.special) return SPECIALS[card.special].name;
  return `${SUITS[card.suit].name} ${card.value}`;
}

/** Suit advantage: +3 damage when your suit beats the rival's suit. Stone never does. */
export function advantageBonus(attackerSuit, defenderSuit) {
  return SUITS[attackerSuit].beats === defenderSuit ? 3 : 0;
}

/** Base damage of a card before advantage, chain or clash: Stone hits +1 harder. */
export function baseDamage(card) {
  return card.value + (card.suit === 'stone' ? 1 : 0);
}

export function createDuel(seed, difficultyKey = 'adept') {
  const difficulty = DIFFICULTY[difficultyKey] ?? DIFFICULTY.adept;
  const random = createRandom(seed);
  const deck = shuffle(buildDeck(), random);
  const duel = {
    seed,
    difficultyKey,
    difficulty,
    random,
    deck,
    playerHand: [],
    baronHand: [],
    playerLife: START_LIFE,
    baronLife: difficulty.baronLife,
    playerShield: 0,
    baronShield: 0,
    turn: 1,
    discard: [],
    chainSuit: null, // suit of the last card Wren played
    chainCount: 0, // consecutive turns Wren played chainSuit
    bestChain: 0,
    playerDamage: 0,
    baronDamage: 0,
    surgeCount: 0,
    phoenixPlayed: false,
    over: false,
    winner: null, // 'player' | 'baron'
    log: [],
    lastPlay: null, // { playerCard, baronCard, ... } of the last resolved turn
    phase: 'await-play', // 'await-play' | 'reveal' | 'over'
  };
  for (let i = 0; i < HAND_SIZE; i += 1) {
    duel.playerHand.push(deck.pop());
    duel.baronHand.push(deck.pop());
  }
  duel.log.push(`Wren Emberlyn meets Baron Ashwick — ${difficulty.label} duel.`);
  duel.log.push('Play a card each turn. Same suit 3 turns running: Cinder Surge!');
  return duel;
}

function draw(duel, hand, who) {
  if (duel.deck.length === 0) {
    // Reshuffle the discard pile so a long duel never runs dry.
    if (duel.discard.length === 0) return null;
    duel.deck = shuffle(duel.discard.splice(0), duel.random);
    duel.log.push('The discard pile is shuffled back into the deck.');
  }
  if (hand.length >= HAND_MAX) return null;
  const card = duel.deck.pop();
  hand.push(card);
  return card;
}

function applyDamage(duel, target, amount) {
  let left = amount;
  if (target === 'player' && duel.playerShield > 0) {
    const blocked = Math.min(duel.playerShield, left);
    duel.playerShield -= blocked;
    left -= blocked;
  }
  if (target === 'baron' && duel.baronShield > 0) {
    const blocked = Math.min(duel.baronShield, left);
    duel.baronShield -= blocked;
    left -= blocked;
  }
  if (target === 'player') duel.playerLife = Math.max(0, duel.playerLife - left);
  else duel.baronLife = Math.max(0, duel.baronLife - left);
  return left;
}

function heal(duel, target, amount) {
  const cap = target === 'player' ? START_LIFE : duel.difficulty.baronLife;
  if (target === 'player') duel.playerLife = Math.min(cap, duel.playerLife + amount);
  else duel.baronLife = Math.min(cap, duel.baronLife + amount);
}

/**
 * Resolve one turn: both sides have chosen a card. Returns the resolution
 * record (also stored as duel.lastPlay) for the renderer and the log.
 */
export function resolveTurn(duel, playerCard, baronCard) {
  const removeFrom = (hand, card) => {
    const i = hand.findIndex((c) => c.id === card.id);
    if (i >= 0) hand.splice(i, 1);
  };
  removeFrom(duel.playerHand, playerCard);
  removeFrom(duel.baronHand, baronCard);

  // Ember Chain: Wren's signature mechanic. Three turns running with the
  // same suit triggers the Cinder Surge: +6 damage and draw 2 cards.
  let surge = false;
  if (duel.chainSuit === playerCard.suit) duel.chainCount += 1;
  else {
    duel.chainSuit = playerCard.suit;
    duel.chainCount = 1;
  }
  duel.bestChain = Math.max(duel.bestChain, duel.chainCount);
  if (duel.chainCount >= CHAIN_TARGET) {
    surge = true;
    duel.surgeCount += 1;
    duel.chainCount = 0;
    duel.chainSuit = null;
  }

  let playerDmg = baseDamage(playerCard) + advantageBonus(playerCard.suit, baronCard.suit);
  let baronDmg = baseDamage(baronCard) + advantageBonus(baronCard.suit, playerCard.suit);
  if (surge) playerDmg += CHAIN_SURGE_DAMAGE;
  // Clash: the higher card wins the exchange and deals its damage; the
  // loser deals nothing. On a tie both cards land.
  let clash = null;
  if (playerCard.value > baronCard.value) {
    playerDmg += CLASH_BONUS;
    baronDmg = 0;
    clash = 'player';
  } else if (baronCard.value > playerCard.value) {
    baronDmg += CLASH_BONUS;
    playerDmg = 0;
    clash = 'baron';
  }

  // Specials resolve before damage lands.
  let playerHeal = 0;
  let baronHeal = 0;
  let playerShieldGain = 0;
  let baronShieldGain = 0;
  if (playerCard.special === 'phoenix') {
    playerHeal = 8;
    duel.phoenixPlayed = true;
  }
  if (playerCard.special === 'tidewell') playerHeal = 5;
  if (playerCard.special === 'stoneheart') playerShieldGain = 5;
  if (baronCard.special === 'phoenix') baronHeal = 8;
  if (baronCard.special === 'tidewell') baronHeal = 5;
  if (baronCard.special === 'stoneheart') baronShieldGain = 5;

  if (playerShieldGain > 0) duel.playerShield += playerShieldGain;
  if (baronShieldGain > 0) duel.baronShield += baronShieldGain;
  if (playerHeal > 0) heal(duel, 'player', playerHeal);
  if (baronHeal > 0) heal(duel, 'baron', baronHeal);

  const dealtToBaron = applyDamage(duel, 'baron', playerDmg);
  const dealtToPlayer = applyDamage(duel, 'player', baronDmg);
  duel.playerDamage += dealtToBaron;
  duel.baronDamage += dealtToPlayer;
  duel.discard.push(playerCard, baronCard);

  const record = {
    turn: duel.turn,
    playerCard,
    baronCard,
    playerDmg,
    baronDmg,
    dealtToBaron,
    dealtToPlayer,
    surge,
    clash,
    playerHeal,
    baronHeal,
    playerShieldGain,
    baronShieldGain,
  };
  duel.lastPlay = record;

  const parts = [`Turn ${duel.turn}: ${cardName(playerCard)} (${playerDmg}) vs ${cardName(baronCard)} (${baronDmg}).`];
  if (surge) parts.push('CINDER SURGE! +6 damage, draw 2.');
  if (playerHeal > 0) parts.push(`Wren heals ${playerHeal}.`);
  if (baronHeal > 0) parts.push(`Ashwick heals ${baronHeal}.`);
  if (playerShieldGain > 0) parts.push('Wren gains 5 shield.');
  if (baronShieldGain > 0) parts.push('Ashwick gains 5 shield.');
  if (clash === 'player') parts.push('Wren wins the clash (+2).');
  if (clash === 'baron') parts.push('Ashwick wins the clash (+2).');
  duel.log.push(parts.join(' '));
  while (duel.log.length > 6) duel.log.shift();

  if (duel.baronLife <= 0 || duel.playerLife <= 0) {
    duel.over = true;
    duel.winner = duel.baronLife <= 0 && duel.playerLife > 0 ? 'player' : 'baron';
    if (duel.baronLife <= 0 && duel.playerLife <= 0) {
      duel.winner = dealtToBaron >= dealtToPlayer ? 'player' : 'baron';
    }
    duel.log.push(
      duel.winner === 'player'
        ? 'The Hollow Dealer falls. Wren Emberlyn wins the duel!'
        : 'Wren Emberlyn falls. Baron Ashwick keeps the table.',
    );
  } else {
    duel.turn += 1;
    const pDraw = draw(duel, duel.playerHand, 'player');
    const bDraw = draw(duel, duel.baronHand, 'baron');
    if (surge) {
      draw(duel, duel.playerHand, 'player');
      draw(duel, duel.playerHand, 'player');
    }
    if (pDraw) duel.log.push(`Wren draws ${cardName(pDraw)}.`);
  }
  return record;
}
