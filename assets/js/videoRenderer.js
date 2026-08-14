import { CANVAS_W, CANVAS_H, COLORS } from './constants.js';
import { state } from './state.js';

// drawConnectors / drawLandmarks come from the MediaPipe drawing_utils CDN script.

export function drawVideoAndSkeleton(ctx, videoEl) {
  if (videoEl.readyState < 2) return; // no frame decoded yet

  ctx.save();
  // Mirror so the feed behaves like a mirror (move your hand right, it
  // moves right on screen). Landmarks are drawn under the same transform
  // so the skeleton lines up with the mirrored hand.
  ctx.translate(CANVAS_W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, CANVAS_W, CANVAS_H);

  // state.hand.landmarks stays populated through brief tracking dropouts
  // (needed so the slice game can bridge the gap), so gate the skeleton
  // on `present` too — otherwise it freezes on the last known pose instead
  // of disappearing when the hand actually isn't detected right now.
  const lm = state.hand.landmarks;
  if (state.hand.present && lm) {
    drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: COLORS.accent, lineWidth: 3 });
    drawLandmarks(ctx, lm, { color: COLORS.accent2, radius: 3 });
  }
  ctx.restore();
}

export function drawCursor(ctx) {
  const { present, smoothFingerPos, isPinching } = state.hand;
  if (!present || !smoothFingerPos) return;

  ctx.beginPath();
  ctx.arc(smoothFingerPos.x, smoothFingerPos.y, isPinching ? 10 : 7, 0, Math.PI * 2);
  ctx.fillStyle = isPinching ? COLORS.accent2 : COLORS.accent;
  ctx.fill();
}
