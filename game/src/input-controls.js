// Keyboard and mouse input: WASD/arrows, Shift sprint, E/F enter car, R reload, M mute, Esc/P pause.
export class InputControls {
  constructor(canvas) {
    this.keys = new Set(); this.mouse = { x: 0, y: 0, down: false };
    this.pressed = new Set();
    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.pressed.add('Mouse'); });
    addEventListener('mouseup', () => { this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  down(...codes) { return codes.some(c => this.keys.has(c)); }
  justPressed(...codes) { return codes.some(c => this.pressed.has(c)); }
  moveVector() {
    let x = 0, y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y -= 1;
    if (this.down('KeyS', 'ArrowDown')) y += 1;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len, active: x !== 0 || y !== 0 };
  }
  endFrame() { this.pressed.clear(); }
}
