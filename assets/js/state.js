import { DEFAULT_PINCH_THRESHOLD } from './constants.js';

// Single shared store: MediaPipe writes into `hand` asynchronously (its own
// detection rate), the render loop reads from it every animation frame.
export const state = {
  mode: 'draw', // 'draw' | 'game'
  pinchThresholdRatio: DEFAULT_PINCH_THRESHOLD,
  hand: {
    present: false,
    side: null, // 'right' | 'left' | null — which physical hand is currently active
    landmarks: null, // raw MediaPipe landmarks (camera space, for the skeleton overlay)
    fingerPos: null, // index fingertip in display/mirrored space {x, y} — raw, used for collision math
    prevFingerPos: null,
    smoothFingerPos: null, // eased copy of fingerPos, used for anything drawn on screen
    isPinching: false,
    pinchRatio: 0,
    isPointing: false, // index finger extended — the "actively gesturing" pose
    isOpenHand: false, // all four fingers extended — the clear/reset pose
    lastSeenAt: 0,
  },
};
