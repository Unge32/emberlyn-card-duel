// Canvas renderer: the table, the hands, the cards and every screen.
// All art is drawn with canvas paths — no image files, no network.
import { START_LIFE, SUITS, VIEW } from './config.js';
import { cardName } from './deck.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const CARD_W = 118;
const CARD_H = 164;
const MINI_W = 74;
const MINI_H = 104;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The four suit glyphs, drawn as vector paths. */
function drawSuit(ctx, glyph, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size / 12);
  ctx.lineJoin = 'round';
  const s = size;
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.42, -s * 0.28, s * 0.5, s * 0.12, s * 0.28, s * 0.34);
    ctx.bezierCurveTo(s * 0.42, s * 0.52, s * 0.1, s * 0.62, 0, s * 0.5);
    ctx.bezierCurveTo(-s * 0.32, s * 0.58, -s * 0.5, s * 0.3, -s * 0.34, s * 0.02);
    ctx.bezierCurveTo(-s * 0.22, -s * 0.2, -s * 0.12, -s * 0.28, 0, -s * 0.5);
    ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.55, -s * 0.2, s * 0.45, s * 0.45, 0, s * 0.5);
    ctx.bezierCurveTo(-s * 0.45, s * 0.45, -s * 0.55, -s * 0.2, 0, -s * 0.5);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, size / 16);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(0, s * 0.42);
    ctx.stroke();
  } else if (glyph === 'wave') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.1);
    ctx.bezierCurveTo(-s * 0.25, -s * 0.45, 0, s * 0.15, s * 0.25, -s * 0.2);
    ctx.bezierCurveTo(s * 0.4, -s * 0.4, s * 0.5, -s * 0.25, s * 0.5, -s * 0.1);
    ctx.bezierCurveTo(s * 0.25, s * 0.25, 0, -s * 0.35, -s * 0.25, 0);
    ctx.bezierCurveTo(-s * 0.4, s * 0.2, -s * 0.5, s * 0.05, -s * 0.5, -s * 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.28);
    ctx.bezierCurveTo(-s * 0.2, s * 0.02, s * 0.1, s * 0.5, s * 0.5, s * 0.24);
    ctx.lineTo(s * 0.5, s * 0.42);
    ctx.bezierCurveTo(s * 0.1, s * 0.66, -s * 0.2, s * 0.2, -s * 0.5, s * 0.44);
    ctx.closePath();
    ctx.fill();
  } else {
    // stone: hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(a) * s * 0.5;
      const py = Math.sin(a) * s * 0.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#3b2f5e';
  ctx.fill();
  ctx.strokeStyle = '#b197fc';
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 7, y + 7, w - 14, h - 14, 7);
  ctx.strokeStyle = 'rgba(177,151,252,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawSuit(ctx, 'flame', x + w / 2, y + h / 2, Math.min(w, h) * 0.42, '#b197fc');
}

function drawLifeBar(ctx, x, y, w, h, life, max, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  const frac = Math.max(0, life / max);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, h - 4, (h - 4) / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const state = {
    handRects: [], // { card, x, y, w, h } for the player's hand
    difficultyRects: [], // { key, x, y, w, h } on the title screen
    startRect: null,
    tableRects: [],
  };

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform((canvas.width / VIEW.width) * 1, 0, 0, canvas.height / VIEW.height, 0, 0);
  }

  function drawBackground() {
    const g = ctx.createRadialGradient(640, 340, 80, 640, 400, 900);
    g.addColorStop(0, '#1d5c38');
    g.addColorStop(0.55, '#123f26');
    g.addColorStop(1, '#0a2415');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.strokeStyle = 'rgba(255, 215, 130, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(640, 400, 560, 300, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawCard(ctx2, card, x, y, w, h, selected) {
    const suit = SUITS[card.suit];
    const special = !!card.special;
    ctx2.save();
    ctx2.textBaseline = 'top';
    roundRect(ctx2, x, y, w, h, 10);
    ctx2.fillStyle = special ? '#fff7e0' : '#f8f9fa';
    ctx2.fill();
    ctx2.strokeStyle = special ? '#e6a817' : suit.color;
    ctx2.lineWidth = special ? 4 : 2.5;
    ctx2.stroke();
    if (selected) {
      roundRect(ctx2, x - 5, y - 5, w + 10, h + 10, 13);
      ctx2.strokeStyle = '#ffd43b';
      ctx2.lineWidth = 4;
      ctx2.stroke();
    }
    const scale = w / CARD_W;
    ctx2.fillStyle = suit.color;
    ctx2.font = `bold ${Math.round(26 * scale)}px Georgia, serif`;
    ctx2.textAlign = 'left';
    ctx2.textBaseline = 'top';
    ctx2.fillText(String(card.value), x + 10 * scale, y + 8 * scale);
    drawSuit(ctx2, suit.glyph, x + 20 * scale, y + 46 * scale, 26 * scale, suit.color);
    drawSuit(ctx2, suit.glyph, x + w / 2, y + h * 0.52, 44 * scale, suit.color);
    ctx2.fillStyle = '#343a40';
    ctx2.font = `bold ${Math.round(13 * scale)}px Georgia, serif`;
    ctx2.textAlign = 'center';
    ctx2.fillText(suit.name.toUpperCase(), x + w / 2, y + h - 34 * scale);
    if (special) {
      ctx2.fillStyle = '#8a6d00';
      ctx2.font = `bold ${Math.round(11 * scale)}px Georgia, serif`;
      ctx2.fillText(cardName(card), x + w / 2, y + h - 18 * scale);
    }
    ctx2.textAlign = 'left';
    ctx2.restore();
  }

  function drawTitle(duel, ui) {
    const record = ui.record;
    state.difficultyRects = [];
    state.startRect = null;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd43b';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText('EMBERLYN', 640, 96);
    ctx.fillStyle = '#ffe8cc';
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillText('Duel of the Cinder Cartomancer', 640, 178);
    ctx.fillStyle = '#e9ecef';
    ctx.font = '21px Georgia, serif';
    ctx.fillText('Wren Emberlyn, cartomancer of the last cinder, sits down against', 640, 238);
    ctx.fillText('Baron Ashwick — the Hollow Dealer who never loses a table.', 640, 266);
    ctx.fillStyle = '#ffd43b';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('Signature: the EMBER CHAIN — play the same suit 3 turns running', 640, 316);
    ctx.fillText('to unleash the Cinder Surge: +6 damage and draw 2 cards.', 640, 344);

    // Difficulty buttons
    const keys = Object.keys(ui.difficulties);
    const bw = 260;
    const bh = 74;
    const gap = 30;
    const total = keys.length * bw + (keys.length - 1) * gap;
    let x = 640 - total / 2;
    const y = 392;
    keys.forEach((key) => {
      const d = ui.difficulties[key];
      const selected = ui.difficultyKey === key;
      roundRect(ctx, x, y, bw, bh, 12);
      ctx.fillStyle = selected ? '#e8590c' : 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.strokeStyle = selected ? '#ffd43b' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Georgia, serif';
      ctx.fillText(d.label, x + bw / 2, y + 32);
      ctx.fillStyle = '#ffe8cc';
      ctx.font = '14px Georgia, serif';
      ctx.fillText(d.blurb, x + bw / 2, y + 58);
      state.difficultyRects.push({ key, x, y, w: bw, h: bh });
      x += bw + gap;
    });

    ctx.fillStyle = '#ced4da';
    ctx.font = '18px Georgia, serif';
    ctx.fillText('Ember beats Thorn · Thorn beats Tide · Tide beats Ember · Stone is neutral, +1 damage', 640, 508);
    ctx.fillText('Higher card wins the clash (+2). Phoenix, Tidewell and Stoneheart are one-of-a-kind.', 640, 534);
    ctx.fillText('Click a card or press 1–7, then Enter to play. P pauses · M mutes.', 640, 560);

    roundRect(ctx, 490, 596, 300, 64, 12);
    ctx.fillStyle = '#e8590c';
    ctx.fill();
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText('SIT DOWN  (Space)', 640, 638);
    state.startRect = { x: 490, y: 596, w: 300, h: 64 };

    if (record.bestDamage > 0 || record.wins + record.losses > 0) {
      ctx.fillStyle = '#adb5bd';
      ctx.font = '17px Georgia, serif';
      ctx.fillText(
        `Table record: ${record.wins} wins · ${record.losses} losses · best damage ${record.bestDamage}`,
        640,
        700,
      );
    }
    ctx.textAlign = 'left';
  }

  function drawPlay(duel, selectedIndex, muted) {
    state.handRects = [];
    // Baron row
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe8cc';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('Baron Ashwick — the Hollow Dealer', 48, 34);
    drawLifeBar(ctx, 48, 46, 320, 20, duel.baronLife, duel.difficulty.baronLife, '#e03131');
    ctx.fillStyle = '#e9ecef';
    ctx.font = '18px Georgia, serif';
    ctx.fillText(`Life ${duel.baronLife} / ${duel.difficulty.baronLife}`, 382, 64);
    if (duel.baronShield > 0) {
      ctx.fillStyle = '#74c0fc';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillText(`Shield ${duel.baronShield}`, 560, 64);
    }
    // Baron's face-down hand
    const bCount = duel.baronHand.length;
    const bStartX = 700;
    for (let i = 0; i < bCount; i += 1) {
      drawCardBack(ctx, bStartX + i * 52, 14, MINI_W, MINI_H);
    }
    ctx.fillStyle = '#adb5bd';
    ctx.font = '16px Georgia, serif';
    ctx.fillText(`${bCount} cards · deck ${duel.deck.length}`, 700, 140);

    // Centre table: last played cards
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe8cc';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(`— Turn ${duel.turn} —`, 640, 178);
    const last = duel.lastPlay;
    if (last) {
      drawCard(ctx, last.baronCard, 480, 196, CARD_W, CARD_H, false);
      drawCard(ctx, last.playerCard, 682, 196, CARD_W, CARD_H, false);
      ctx.fillStyle = '#ffd43b';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText('VS', 640, 262);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Georgia, serif';
      const line = last.surge
        ? 'CINDER SURGE! +6 damage, draw 2'
        : last.clash === 'player'
          ? 'Wren wins the clash (+2)'
          : last.clash === 'baron'
            ? 'Ashwick wins the clash (+2)'
            : 'Even clash';
      ctx.fillText(line, 640, 392);
      ctx.fillStyle = '#e9ecef';
      ctx.font = '18px Georgia, serif';
      ctx.fillText(
        `Wren dealt ${last.dealtToBaron}  ·  Ashwick dealt ${last.dealtToPlayer}`,
        640,
        420,
      );
    } else {
      ctx.fillStyle = '#ced4da';
      ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText('No cards on the table yet — play your first card.', 640, 280);
    }

    // Ember Chain meter
    const chainX = 48;
    const chainY = 196;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd43b';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('EMBER CHAIN', chainX, chainY);
    for (let i = 0; i < 3; i += 1) {
      const cx = chainX + i * 46;
      const cy = chainY + 22;
      ctx.beginPath();
      ctx.arc(cx + 16, cy + 16, 16, 0, Math.PI * 2);
      ctx.fillStyle = duel.chainSuit && i < duel.chainCount ? SUITS[duel.chainSuit].color : 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (duel.chainSuit && i < duel.chainCount) {
        drawSuit(ctx, SUITS[duel.chainSuit].glyph, cx + 16, cy + 16, 18, '#fff');
      }
    }
    ctx.fillStyle = '#e9ecef';
    ctx.font = '17px Georgia, serif';
    const chainText = duel.chainSuit
      ? `${SUITS[duel.chainSuit].name} ×${duel.chainCount} — ${3 - duel.chainCount} more for the Surge`
      : 'Play a suit to start the chain';
    ctx.fillText(chainText, chainX, chainY + 74);
    ctx.fillText(`Surges this duel: ${duel.surgeCount} · best chain: ${duel.bestChain}`, chainX, chainY + 100);

    // Duel log
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd43b';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('DUEL LOG', 1232, chainY);
    ctx.fillStyle = '#e9ecef';
    ctx.font = '14px Georgia, serif';
    duel.log.slice(-4).forEach((line, i) => {
      ctx.fillText(line.slice(0, 46), 1232, chainY + 26 + i * 22);
    });
    ctx.textAlign = 'left';

    // Score strip
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(
      `Damage dealt: ${duel.playerDamage}   ·   Damage taken: ${duel.baronDamage}   ·   Score ${duel.playerDamage - duel.baronDamage}`,
      48,
      452,
    );

    // Player row
    ctx.fillStyle = '#ffe8cc';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('Wren Emberlyn — the Cinder Cartomancer', 48, 498);
    drawLifeBar(ctx, 48, 510, 320, 20, duel.playerLife, START_LIFE, '#40c057');
    ctx.fillStyle = '#e9ecef';
    ctx.font = '18px Georgia, serif';
    ctx.fillText(`Life ${duel.playerLife} / ${START_LIFE}`, 382, 528);
    if (duel.playerShield > 0) {
      ctx.fillStyle = '#74c0fc';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillText(`Shield ${duel.playerShield}`, 560, 528);
    }
    ctx.fillStyle = '#adb5bd';
    ctx.font = '16px Georgia, serif';
    ctx.fillText(muted ? 'Muted (M)' : 'Sound on (M) · P pauses', 1050, 528);

    // Player hand
    const n = duel.playerHand.length;
    const totalW = n * CARD_W + (n - 1) * 14;
    let hx = 640 - totalW / 2;
    const hy = 560;
    duel.playerHand.forEach((card, i) => {
      const selected = i === selectedIndex;
      const y = selected ? hy - 18 : hy;
      drawCard(ctx, card, hx, y, CARD_W, CARD_H, selected);
      ctx.fillStyle = '#ced4da';
      ctx.font = '15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), hx + CARD_W / 2, hy + CARD_H + 20);
      state.handRects.push({ card, x: hx, y, w: CARD_W, h: CARD_H });
      hx += CARD_W + 14;
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe8cc';
    ctx.font = '18px Georgia, serif';
    ctx.fillText('Click a card (or press 1–7), then Enter / Space to play it', 640, 770);
    ctx.textAlign = 'left';
  }

  function drawEnd(duel, record, won) {
    drawPlay(duel, -1, false);
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? '#ffd43b' : '#ffa8a8';
    ctx.font = 'bold 72px Georgia, serif';
    ctx.fillText(won ? 'WREN WINS!' : 'ASHWICK WINS', 640, 250);
    ctx.fillStyle = '#fff';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText(
      won
        ? 'The Hollow Dealer folds. The cinders are yours, cartomancer.'
        : 'The Hollow Dealer keeps the table. Shuffle up and try again.',
      640,
      306,
    );
    ctx.fillStyle = '#e9ecef';
    ctx.font = '22px Georgia, serif';
    ctx.fillText(`Turns: ${duel.turn} · Damage dealt: ${duel.playerDamage} · Cinder Surges: ${duel.surgeCount}`, 640, 372);
    ctx.fillText(`Best chain: ${duel.bestChain} · Phoenix played: ${duel.phoenixPlayed ? 'yes' : 'no'}`, 640, 404);
    ctx.fillText(`Table record: ${record.wins} wins · ${record.losses} losses · best damage ${record.bestDamage}`, 640, 436);
    roundRect(ctx, 440, 480, 400, 64, 12);
    ctx.fillStyle = '#e8590c';
    ctx.fill();
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('REMATCH  (R)', 640, 522);
    ctx.fillStyle = '#ced4da';
    ctx.font = '19px Georgia, serif';
    ctx.fillText('Press T for the title screen', 640, 588);
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('PAUSED', 640, 380);
    ctx.font = '22px Georgia, serif';
    ctx.fillText('Press P or Space to resume', 640, 430);
    ctx.textAlign = 'left';
  }

  return {
    state,
    fit,
    draw(duel, screen, ui) {
      fit();
      drawBackground();
      if (screen === SCREEN_TITLE) drawTitle(duel, ui);
      else if (screen === SCREEN_WIN) drawEnd(duel, ui.record, true);
      else if (screen === SCREEN_LOSE) drawEnd(duel, ui.record, false);
      else {
        drawPlay(duel, ui.selectedIndex, ui.muted);
        if (screen === SCREEN_PAUSED) drawPaused();
      }
    },
  };
}
