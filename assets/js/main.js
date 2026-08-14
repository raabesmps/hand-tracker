import { CANVAS_W, CANVAS_H } from './constants.js';
import { state } from './state.js';
import { initHandTracking } from './handTracking.js';
import { drawVideoAndSkeleton, drawCursor } from './videoRenderer.js';
import * as drawMode from './modes/drawMode.js';
import * as sliceGame from './modes/sliceGame.js';
import * as mouseMode from './modes/mouseMode.js';
import { initUI } from './ui.js';
import { updateHud } from './hud.js';

const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d');
canvasEl.width = CANVAS_W;
canvasEl.height = CANVAS_H;

const statusEl = document.getElementById('status');

initUI();
initHandTracking({
  videoEl,
  onStatus: (text, isError) => {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  },
});

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = performance.now();
let fps = 0;

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // clamp to avoid physics jumps on tab-switch
  lastTime = now;

  frameCount++;
  if (now - fpsTimer > 500) {
    fps = Math.round((frameCount * 1000) / (now - fpsTimer));
    frameCount = 0;
    fpsTimer = now;
  }

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawVideoAndSkeleton(ctx, videoEl);

  if (state.mode === 'draw') {
    drawMode.update();
    drawMode.render(ctx);
  } else if (state.mode === 'game') {
    sliceGame.update(dt);
    sliceGame.render(ctx);
  } else if (state.mode === 'cursor') {
    mouseMode.update();
  }

  drawCursor(ctx);
  updateHud(fps);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
