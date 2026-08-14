import { CANVAS_W, CANVAS_H, COLORS } from '../constants.js';
import { state } from '../state.js';

const CLEAR_HOLD_MS = 700; // how long to hold an open hand before it wipes the canvas

// Persisted on an offscreen canvas so the trail survives across frames
// without redrawing the whole history every tick.
const trailCanvas = document.createElement('canvas');
trailCanvas.width = CANVAS_W;
trailCanvas.height = CANVAS_H;
const trailCtx = trailCanvas.getContext('2d');

let points = []; // last few stroke points, used to draw a smoothed curve
let openSince = null;
let awaitingClose = false; // must fully close the hand once before re-arming
let clearProgress = 0; // 0..1, drives the hold-to-clear ring

export function reset() {
  trailCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  points = [];
}

// Draws through the midpoint of each consecutive pair with a quadratic
// curve — the standard trick for turning a raw jittery polyline into a
// smooth freehand stroke, using the middle point as the curve's control.
function extendStroke(p) {
  points.push(p);
  if (points.length > 3) points.shift();
  if (points.length < 3) return;

  const [p0, p1, p2] = points;
  const midA = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const midB = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  trailCtx.strokeStyle = COLORS.accent;
  trailCtx.lineWidth = 4;
  trailCtx.lineCap = 'round';
  trailCtx.lineJoin = 'round';
  trailCtx.beginPath();
  trailCtx.moveTo(midA.x, midA.y);
  trailCtx.quadraticCurveTo(p1.x, p1.y, midB.x, midB.y);
  trailCtx.stroke();
}

export function update() {
  const { present, smoothFingerPos, isPinching, isOpenHand, isPointing } = state.hand;

  if (isOpenHand && !awaitingClose) {
    if (openSince === null) openSince = performance.now();
    clearProgress = Math.min(1, (performance.now() - openSince) / CLEAR_HOLD_MS);
    if (clearProgress >= 1) {
      reset();
      openSince = null;
      awaitingClose = true;
      clearProgress = 0;
    }
  } else {
    if (!isOpenHand) awaitingClose = false;
    openSince = null;
    clearProgress = 0;
  }

  // Pinching lifts the "pen"; an open hand also lifts it (mid-gesture toward
  // clearing); and only an extended index finger counts as pointing — a
  // closed fist moving across the screen shouldn't leave a trail.
  if (!present || isPinching || isOpenHand || !isPointing) {
    points = [];
    return;
  }

  extendStroke(smoothFingerPos);
}

export function render(ctx) {
  ctx.drawImage(trailCanvas, 0, 0);

  if (clearProgress > 0 && state.hand.fingerPos) {
    const { x, y } = state.hand.fingerPos;
    ctx.beginPath();
    ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + clearProgress * Math.PI * 2);
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
