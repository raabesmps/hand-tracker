import { CANVAS_W, CANVAS_H } from '../constants.js';
import { state } from '../state.js';

const CLICK_COOLDOWN_MS = 350; // guards against one pinch firing twice

let cursorEl = null;
let cooldownUntil = 0;
let wasPinching = false;

function ensureDom() {
  if (cursorEl) return;
  cursorEl = document.createElement('div');
  cursorEl.className = 'gesture-cursor';
  // Classic Windows-style arrow silhouette: sharp tip, near-straight left
  // edge, and a thin notched "flag" tail — the outline that actually reads
  // as "a mouse pointer" rather than a generic dart/triangle.
  cursorEl.innerHTML = `
    <svg viewBox="0 0 24 24" width="26" height="26">
      <path d="M5 3 L5 18.5 L8.6 15.1 L11.3 21.6 L13.7 20.6 L11 14.4 L16.7 14.4 Z" />
    </svg>`;
  document.body.appendChild(cursorEl);
}

export function setActive(active) {
  ensureDom();
  cursorEl.style.display = active ? 'block' : 'none';
  // Hide the real browser cursor so the fake pointer reads as "the" cursor
  // instead of a second dot chasing it around.
  document.body.classList.toggle('gesture-mouse-active', active);
}

function fireClick(el) {
  // Restart the pulse animation even if it's still mid-way from a fast double pinch.
  cursorEl.classList.remove('clicked');
  void cursorEl.offsetWidth; // force reflow
  cursorEl.classList.add('clicked');
  el.click();
}

export function update() {
  ensureDom();
  const { present, smoothFingerPos, isPinching } = state.hand;

  if (!present || !smoothFingerPos) {
    cursorEl.style.opacity = '0';
    wasPinching = false;
    return;
  }
  cursorEl.style.opacity = '1';

  const x = (smoothFingerPos.x / CANVAS_W) * window.innerWidth;
  const y = (smoothFingerPos.y / CANVAS_H) * window.innerHeight;
  cursorEl.style.left = `${x}px`;
  cursorEl.style.top = `${y}px`;

  // pointer-events: none on the cursor keeps it out of its own hit test.
  const elUnder = document.elementFromPoint(x, y);
  const clickable = elUnder ? elUnder.closest('button, a, input, [role="button"]') : null;
  cursorEl.classList.toggle('over-target', !!clickable);

  const now = performance.now();
  if (isPinching && !wasPinching && clickable && now > cooldownUntil) {
    fireClick(clickable);
    cooldownUntil = now + CLICK_COOLDOWN_MS;
  }
  wasPinching = isPinching;
}
