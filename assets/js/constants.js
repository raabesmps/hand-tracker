export const CANVAS_W = 640;
export const CANVAS_H = 480;

export const DEFAULT_PINCH_THRESHOLD = 0.4;

// How long a tracking dropout (motion blur, brief occlusion) is tolerated
// before we treat the hand as actually gone — keeps the skeleton/trail from
// flickering on a single missed frame.
export const TRACKING_GRACE_MS = 280;

// Exponential smoothing factor for the *visual* finger position (draw trail,
// mouse pointer). Lower = smoother but laggier. Collision math in the slice
// game deliberately skips this and uses the raw position instead.
export const POSITION_SMOOTHING = 0.4;

export const COLORS = {
  accent: '#6ee7f5',
  accent2: '#f56ee7',
  danger: '#ff6b6b',
  gold: '#ffd166',
};
