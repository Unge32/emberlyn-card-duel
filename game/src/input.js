// Keyboard + mouse input. Actions are consumed once per frame by main.js;
// clicks are mapped against the rects the renderer published on its last draw.
import { VIEW } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_REMATCH = 8;
export const ACTION_TITLE = 16;

export function createInput(canvas, getRects) {
  let actions = 0;
  let selectedIndex = -1;
  let click = null;

  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  function onKey(event) {
    if (event.repeat) return;
    const key = event.key;
    if (key === ' ' || key === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (key === 'p' || key === 'P') actions |= ACTION_PAUSE;
    else if (key === 'm' || key === 'M') actions |= ACTION_MUTE;
    else if (key === 'r' || key === 'R') actions |= ACTION_REMATCH;
    else if (key === 't' || key === 'T') actions |= ACTION_TITLE;
    else if (key >= '1' && key <= '7') selectedIndex = Number(key) - 1;
  }

  function onClick(event) {
    click = toGameCoords(event);
  }

  window.addEventListener('keydown', onKey);
  canvas.addEventListener('click', onClick);

  return {
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    takeSelected() {
      const out = selectedIndex;
      selectedIndex = -1;
      return out;
    },
    /** The last click (game coords), consumed once. */
    takeClick() {
      const out = click;
      click = null;
      return out;
    },
    /** Which hand card (index) sits under point p, or -1. */
    handIndexAt(p) {
      if (!p) return -1;
      const rects = getRects().handRects;
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
      }
      return -1;
    },
    difficultyAt(p) {
      if (!p) return null;
      for (const r of getRects().difficultyRects) {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return r.key;
      }
      return null;
    },
    startPressed(p) {
      if (!p) return false;
      const r = getRects().startRect;
      return !!r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    },
  };
}
