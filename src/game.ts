type Point = { x: number; y: number };
type Dir = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export default class Game {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private grid = 20;
  private snake: Point[] = [];
  private dir: Dir = 'ArrowRight';
  private nextDir: Dir | null = null;
  private food: Point = { x: 0, y: 0 };
  private speed = 8; // frames per second
  private frameAcc = 0;
  private lastTime = 0;
  private running = false;
  private onScore: (score: number) => void;
  public isPaused = false;

  constructor(canvas: HTMLCanvasElement, onScore: (s: number) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    this.ctx = ctx;
    this.onScore = onScore;
    this.reset();
  }

  reset() {
    const cols = Math.floor(this.canvas.width / this.grid);
    const rows = Math.floor(this.canvas.height / this.grid);
    this.snake = [
      { x: Math.floor(cols / 2), y: Math.floor(rows / 2) },
      { x: Math.floor(cols / 2) - 1, y: Math.floor(rows / 2) },
      { x: Math.floor(cols / 2) - 2, y: Math.floor(rows / 2) }
    ];
    this.dir = 'ArrowRight';
    this.nextDir = null;
    this.placeFood();
    this.speed = 8;
    this.onScore(this.snake.length - 3);
    this.isPaused = false;
    this.running = true;
    this.lastTime = performance.now();
    this.frameAcc = 0;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastTime = performance.now();
    }
  }

  get score() {
    return this.snake.length - 3;
  }

  handleKey(key: string) {
    this.setDirection(key as Dir);
  }

  setDirection(k: Dir) {
    // Prevent reversing
    const opposite: Record<Dir, Dir> = {
      ArrowUp: 'ArrowDown',
      ArrowDown: 'ArrowUp',
      ArrowLeft: 'ArrowRight',
      ArrowRight: 'ArrowLeft'
    };
    if (k === opposite[this.dir]) return;
    if (k !== this.dir) this.nextDir = k;
  }

  fitToContainer() {
    // keep canvas square and responsive
    const parent = this.canvas.parentElement!;
    const size = Math.min(parent.clientWidth, window.innerHeight - 120, 800);
    this.canvas.width = size;
    this.canvas.height = size;
    // after resizing, re-center snake
    this.reset();
  }

  private loop(now: number) {
    if (!this.running) return;
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (!this.isPaused) {
      this.frameAcc += delta;
      const interval = 1 / this.speed;
      if (this.frameAcc >= interval) {
        const steps = Math.floor(this.frameAcc / interval);
        this.frameAcc -= steps * interval;
        for (let i = 0; i < steps; i++) this.update();
      }
    }
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  private update() {
    if (this.nextDir) {
      this.dir = this.nextDir;
      this.nextDir = null;
    }
    const head = { ...this.snake[0] };
    if (this.dir === 'ArrowUp') head.y -= 1;
    if (this.dir === 'ArrowDown') head.y += 1;
    if (this.dir === 'ArrowLeft') head.x -= 1;
    if (this.dir === 'ArrowRight') head.x += 1;

    // wrap around
    const cols = Math.floor(this.canvas.width / this.grid);
    const rows = Math.floor(this.canvas.height / this.grid);
    head.x = (head.x + cols) % cols;
    head.y = (head.y + rows) % rows;

    // collision with self
    if (this.snake.some((s) => s.x === head.x && s.y === head.y)) {
      this.running = false;
      this.isPaused = true;
      return;
    }

    this.snake.unshift(head);

    // eat food?
    if (head.x === this.food.x && head.y === this.food.y) {
      this.placeFood();
      // speed up slowly
      this.speed = Math.min(20, this.speed + 0.25);
    } else {
      this.snake.pop();
    }

    this.onScore(this.score);
  }

  private placeFood() {
    const cols = Math.floor(this.canvas.width / this.grid);
    const rows = Math.floor(this.canvas.height / this.grid);
    let tries = 0;
    do {
      this.food = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows)
      };
      tries++;
      if (tries > 200) break;
    } while (this.snake.some((s) => s.x === this.food.x && s.y === this.food.y));
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    // background
    ctx.fillStyle = '#071126';
    ctx.fillRect(0, 0, w, h);

    // grid (subtle)
    const cols = Math.floor(w / this.grid);
    const rows = Math.floor(h / this.grid);
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.grid, 0);
      ctx.lineTo(i * this.grid, h);
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * this.grid);
      ctx.lineTo(w, j * this.grid);
      ctx.stroke();
    }

    // draw food
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(this.food.x * this.grid + 2, this.food.y * this.grid + 2, this.grid - 4, this.grid - 4);

    // draw snake
    for (let i = 0; i < this.snake.length; i++) {
      const s = this.snake[i];
      ctx.fillStyle = i === 0 ? '#00ffb3' : '#00d084';
      ctx.fillRect(s.x * this.grid + 1, s.y * this.grid + 1, this.grid - 2, this.grid - 2);
    }

    if (this.isPaused) {
      ctx.fillStyle = 'rgba(2,6,23,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 28px system-ui';
      ctx.fillText(this.running ? 'Pausado' : 'Game Over', w / 2, h / 2);
      ctx.font = '14px system-ui';
      ctx.fillText('Pulsa Reiniciar para volver a jugar', w / 2, h / 2 + 36);
    }
  }
}