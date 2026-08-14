import { CANVAS_W, CANVAS_H, TRACKING_GRACE_MS, POSITION_SMOOTHING } from './constants.js';
import { state } from './state.js';
import { dist, isIndexExtended, isHandOpen } from './geometry.js';

// Hands / Camera come from the MediaPipe CDN <script> tags loaded in index.html
// (they attach themselves to window, so no import needed here).

// We feed MediaPipe the raw, unmirrored camera frame (we only mirror the
// canvas drawing, not the actual video sent for detection). MediaPipe's
// handedness classifier assumes mirrored/selfie input, so its Left/Right
// labels come back swapped relative to the user's real anatomy — this
// undoes that swap. See: https://chuoling.github.io/mediapipe/solutions/hands.html
function anatomicalSide(mediapipeLabel) {
  return mediapipeLabel === 'Left' ? 'right' : 'left';
}

let lastActiveSide = null;

export async function initHandTracking({ videoEl, onStatus }) {
  onStatus('Pedindo acesso à câmera…');

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 2, // both hands so we can pick "the right one" and hand off between them
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  hands.onResults(handleResults);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: CANVAS_W, height: CANVAS_H },
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    onStatus('Câmera ativa — mostre a mão pro navegador.');

    const camera = new Camera(videoEl, {
      onFrame: async () => {
        await hands.send({ image: videoEl });
      },
      width: CANVAS_W,
      height: CANVAS_H,
    });
    camera.start();
  } catch (err) {
    onStatus(`Não deu pra acessar a câmera: ${err.message}`, true);
  }
}

function handleResults(results) {
  const handsList = results.multiHandLandmarks;
  const handednessList = results.multiHandedness;
  const now = performance.now();

  if (!handsList || handsList.length === 0) {
    // Grace period: don't immediately flip to "gone" on a single missed
    // frame — that's exactly what happens mid fast-swipe from motion blur,
    // and flickering `present` off breaks the draw trail and hides the
    // skeleton for no real reason.
    if (now - state.hand.lastSeenAt > TRACKING_GRACE_MS) {
      state.hand.present = false;
      state.hand.isPinching = false;
      state.hand.pinchRatio = 0;
      state.hand.isPointing = false;
      state.hand.isOpenHand = false;
      state.hand.side = null;
    }
    return;
  }

  // Prefer the anatomical right hand; fall back to whichever hand IS
  // visible (so throwing the right hand out of frame hands control to the
  // left one, and vice versa). If both are on screen, only the right counts.
  let chosenIdx = handsList.findIndex((_, i) => anatomicalSide(handednessList[i].label) === 'right');
  if (chosenIdx === -1) chosenIdx = 0;

  const side = anatomicalSide(handednessList[chosenIdx].label);
  const lm = handsList[chosenIdx];

  // Rescale once to pixel space so every distance calculation below (pinch,
  // finger-extended checks) reflects true proportions instead of mixing
  // two differently-scaled normalized axes (640 wide vs 480 tall).
  const px = lm.map((p) => ({ x: p.x * CANVAS_W, y: p.y * CANVAS_H }));

  const palmSize = dist(px[0], px[9]) || 1; // wrist -> middle MCP, a stand-in for hand size
  const pinchRatio = dist(px[4], px[8]) / palmSize;

  // A hand-off between left/right, or a gap long enough that `present`
  // already lapsed, means this is a fresh position — not a continuation of
  // whatever was being drawn/sliced a moment ago.
  const handedOff = side !== lastActiveSide;
  const gapTooLong = now - state.hand.lastSeenAt > TRACKING_GRACE_MS;
  const shouldBridge = !handedOff && !gapTooLong;

  state.hand.present = true;
  state.hand.side = side;
  state.hand.landmarks = lm;
  state.hand.prevFingerPos = shouldBridge ? state.hand.fingerPos : null;
  // Mirror into display space here, once, so every consumer works in the
  // same coordinates the user sees.
  state.hand.fingerPos = {
    x: CANVAS_W - px[8].x,
    y: px[8].y,
  };

  if (!shouldBridge || !state.hand.smoothFingerPos) {
    state.hand.smoothFingerPos = { ...state.hand.fingerPos };
  } else {
    state.hand.smoothFingerPos = {
      x: state.hand.smoothFingerPos.x + (state.hand.fingerPos.x - state.hand.smoothFingerPos.x) * POSITION_SMOOTHING,
      y: state.hand.smoothFingerPos.y + (state.hand.fingerPos.y - state.hand.smoothFingerPos.y) * POSITION_SMOOTHING,
    };
  }

  state.hand.pinchRatio = pinchRatio;
  state.hand.isPinching = pinchRatio < state.pinchThresholdRatio;
  state.hand.isPointing = isIndexExtended(px);
  state.hand.isOpenHand = isHandOpen(px);
  state.hand.lastSeenAt = now;
  lastActiveSide = side;
}
