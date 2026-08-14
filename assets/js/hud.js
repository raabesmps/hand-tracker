import { state } from './state.js';

const badgeHand = document.getElementById('badge-hand');
const badgePinch = document.getElementById('badge-pinch');
const badgeFps = document.getElementById('badge-fps');

const SIDE_LABEL = { right: 'D', left: 'E' };

export function updateHud(fps) {
  const { present, isPinching, pinchRatio, side } = state.hand;

  badgeHand.textContent = `mão: ${present ? SIDE_LABEL[side] || '?' : '—'}`;
  badgeHand.classList.toggle('active', present);

  badgePinch.textContent = present
    ? `pinça: ${isPinching ? 'sim' : 'não'} (${Math.round(pinchRatio * 100)}%)`
    : 'pinça: —';
  badgePinch.classList.toggle('active', isPinching);

  badgeFps.textContent = `fps: ${fps || '—'}`;
}
