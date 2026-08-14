import { state } from './state.js';
import * as drawMode from './modes/drawMode.js';
import * as sliceGame from './modes/sliceGame.js';
import * as mouseMode from './modes/mouseMode.js';

const HINTS = {
  draw: '🤏 Pinça levanta a "caneta". 🖐️ Mão aberta e parada por 1s limpa o traço.',
  game: '🤏 A pinça é só o golpe especial (fatia tudo na tela). Fatiar fruta por fruta é passando o dedo por cima dela.',
  cursor: '🖐️ Aponte pro botão e feche a pinça pra clicar — funciona em qualquer botão da página, sem precisar de mouse.',
};

export function initUI() {
  const btnModeDraw = document.getElementById('btn-mode-draw');
  const btnModeGame = document.getElementById('btn-mode-game');
  const btnModeMouse = document.getElementById('btn-mode-mouse');
  const btnClear = document.getElementById('btn-clear');
  const pinchSlider = document.getElementById('pinch-sensitivity');
  const pinchValueLabel = document.getElementById('pinch-value');
  const hintEl = document.getElementById('hint');

  function setMode(mode) {
    state.mode = mode;
    btnModeDraw.classList.toggle('active', mode === 'draw');
    btnModeGame.classList.toggle('active', mode === 'game');
    btnModeMouse.classList.toggle('active', mode === 'cursor');

    btnClear.style.display = mode === 'cursor' ? 'none' : '';
    btnClear.textContent = mode === 'draw' ? 'Limpar traço' : 'Reiniciar jogo';

    hintEl.textContent = HINTS[mode];
    mouseMode.setActive(mode === 'cursor');
  }

  btnModeDraw.addEventListener('click', () => setMode('draw'));
  btnModeGame.addEventListener('click', () => setMode('game'));
  btnModeMouse.addEventListener('click', () => setMode('cursor'));

  btnClear.addEventListener('click', () => {
    if (state.mode === 'draw') drawMode.reset();
    else if (state.mode === 'game') sliceGame.reset();
  });

  pinchSlider.addEventListener('input', () => {
    state.pinchThresholdRatio = Number(pinchSlider.value) / 100;
    pinchValueLabel.textContent = `${pinchSlider.value}%`;
  });

  setMode('draw');
}
