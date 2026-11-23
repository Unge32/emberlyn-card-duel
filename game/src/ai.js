// Baron Ashwick's brain. Three minds, one dealer:
// - easy (Apprentice): plays loose — a random card, sometimes a bad one.
// - greedy (Adept): picks the card that deals the most right now.
// - cunning (Master): greedy, plus it reads Wren's chain suit and counters
//   it, and holds its healing cards until its life is low.
import { advantageBonus, baseDamage, cardName } from './deck.js';
import { SUITS } from './config.js';

/** Score a Baron card against what Wren is likely to play. Higher is better. */
function scoreCard(card, duel, playerLikelySuit) {
  let score = baseDamage(card);
  if (playerLikelySuit) score += advantageBonus(card.suit, playerLikelySuit);
  if (card.special === 'phoenix') score += duel.baronLife <= 14 ? 14 : 4;
  if (card.special === 'tidewell') score += duel.baronLife <= 14 ? 9 : 2;
  if (card.special === 'stoneheart') score += duel.baronLife <= 12 ? 8 : 2;
  return score;
}

export function chooseBaronCard(duel) {
  const hand = duel.baronHand;
  if (hand.length === 0) return null;
  const mode = duel.difficulty.ai;

  if (mode === 'easy') {
    // Apprentice Ashwick: mostly random, occasionally the best card anyway.
    if (duel.random.next() < 0.65) return hand[duel.random.int(hand.length)];
  }

  // What suit is Wren most likely to play? Her chain suit (she is building
  // it) or the suit she played most recently.
  let playerLikelySuit = duel.chainSuit;
  if (mode === 'cunning' && !playerLikelySuit && duel.lastPlay) {
    playerLikelySuit = duel.lastPlay.playerCard.suit;
  }

  let best = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    let score = scoreCard(card, duel, playerLikelySuit);
    if (mode === 'cunning' && playerLikelySuit && SUITS[card.suit].beats === playerLikelySuit) {
      score += 2; // counter Wren's likely suit
    }
    if (mode === 'easy') score += duel.random.next() * 6; // sloppy
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/**
 * The autopilot Wren: used by the screenshot scenes and the bot playtest.
 * Greedy like the Adept Baron, but it also feeds its own Ember Chain:
 * it prefers the chain suit when it is one card from a Surge.
 */
export function choosePlayerCard(duel) {
  const hand = duel.playerHand;
  if (hand.length === 0) return null;
  let best = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    let score = baseDamage(card);
    const rival = duel.lastPlay ? duel.lastPlay.baronCard.suit : null;
    if (rival) score += advantageBonus(card.suit, rival);
    if (duel.chainSuit && card.suit === duel.chainSuit) score += duel.chainCount === 2 ? 8 : 3;
    if (card.special === 'phoenix') score += duel.playerLife <= 14 ? 12 : 3;
    if (card.special === 'tidewell') score += duel.playerLife <= 14 ? 8 : 2;
    if (card.special === 'stoneheart') score += duel.playerLife <= 12 ? 7 : 2;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

export function describeChoice(card) {
  return card ? cardName(card) : 'no card';
}
