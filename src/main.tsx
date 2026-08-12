import Game from './game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score')!;
const btnRestart = document.getElementById('btn-restart')!;
const btnPause = document.getElementById('btn-pause')!;

const game = new Game(canvas, (score) => {
  scoreEl.textContent = `Puntuación: ${score}`;
});

btnRestart.addEventListener('click', () => {
  game.reset();
  btnPause.textContent = 'Pausa';
});
btnPause.addEventListener('click', () => {
  game.togglePause();
  btnPause.textContent = game.isPaused ? 'Reanudar' : 'Pausa';
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') {
    game.togglePause();
    btnPause.textContent = game.isPaused ? 'Reanudar' : 'Pausa';
    return;
  }
  game.handleKey(e.key);
});

// Basic touch support: tap left/right/top/bottom of canvas to change direction
canvas.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const t = ev.touches[0];
  const x = t.clientX - rect.left;
  const y = t.clientY - rect.top;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  if (dx > dy) {
    game.setDirection(x < cx ? 'ArrowLeft' : 'ArrowRight');
  } else {
    game.setDirection(y < cy ? 'ArrowUp' : 'ArrowDown');
  }
});

window.addEventListener('resize', () => game.fitToContainer());
game.fitToContainer();
game.start();