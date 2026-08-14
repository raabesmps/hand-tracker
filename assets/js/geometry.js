export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Shortest distance from point p to the segment a-b (used to detect
// a fingertip swipe crossing through a moving object between two frames).
export function distToSegment(p, a, b) {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

// The helpers below all expect landmarks already scaled to pixel space
// (landmark.x * canvasWidth, landmark.y * canvasHeight). MediaPipe's raw
// coordinates are normalized separately per axis (0..1 of width, 0..1 of
// height), so comparing/measuring them directly — without rescaling first —
// distorts every distance whenever width and height differ, which is
// exactly our case (640x480).

// A finger reads as extended when its tip sits farther from the wrist than
// its own PIP joint.
export function isFingerExtended(landmarksPx, pipIdx, tipIdx) {
  const wrist = landmarksPx[0];
  return dist(landmarksPx[tipIdx], wrist) > dist(landmarksPx[pipIdx], wrist);
}

export function isIndexExtended(landmarksPx) {
  return isFingerExtended(landmarksPx, 6, 8);
}

// Open hand = all four non-thumb fingers extended. Thumb is skipped — it
// moves sideways rather than up/down, so this heuristic doesn't hold for it.
export function isHandOpen(landmarksPx) {
  const fingers = [
    [6, 8], // index: pip, tip
    [10, 12], // middle
    [14, 16], // ring
    [18, 20], // pinky
  ];
  return fingers.every(([pip, tip]) => isFingerExtended(landmarksPx, pip, tip));
}
