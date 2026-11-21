// Palmera Bay: Vice Run — a top-down open-world crime game in one sunny coastal city.
// Rio Solano, a broke courier, takes a chain of jobs from fixer Marisol Vega: meet, steal,
// collect, escape, and one last warehouse run — then the bay is free to roam.
// This module wires the city, traffic, pedestrians, missions, combat, wanted system and HUD.
import { mulberry32, clamp, dist, angleTo, randRange } from './random.js';
import { buildCity, circleHitsBuilding, nearestRoadPoint, WORLD } from './city-map.js';
import { InputControls } from './input-controls.js';
import { SoundBank } from './audio-sounds.js';
import { spawnParkedCars, spawnTraffic, spawnPoliceCar, updateVehicles, updatePlayerDriving } from './vehicles-traffic.js';
import { spawnPeds, spawnCopPed, spawnHostile, updatePeds, makePed } from './pedestrians.js';
import { STORY_INTRO, PACKAGE_SPOTS, updateMission } from './missions-story.js';
import { drawWorld } from './render-world.js';
import { drawHUD } from './hud-minimap.js';
import { loadSave, storeSave, hasSave } from './save-game.js';
import { stageShot } from './shots-scenes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = new InputControls(canvas);
const sounds = new SoundBank();
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

function createGame(seedValue) {
  const rng = mulberry32(seedValue * 7919 + 13);
  const G = {
    rng, time: 0, screen: shotName ? 'play' : 'title', frozen: false,
    city: buildCity(7), cars: [], peds: [], bullets: [], particles: [], events: [],
    player: { x: 1470, y: 905, angle: 0, aimAngle: 0, health: 100, car: null, moving: false },
    cam: { x: 1470, y: 905 }, cash: 120, respect: 0,
    heat: 0, hiddenTime: 0, bustTimer: 0, policeTimer: 0, crimeCd: 0,
    ammo: 12, reloading: 0, fireCd: 0, muzzle: 0, lastShotAt: -99, lastShotPos: { x: 0, y: 0 },
    missionIndex: 0, phase: 'start', storyDone: false, packages: PACKAGE_SPOTS.map(p => ({ ...p, got: false })),
    targetCar: null, hostilesLeft: 0, sideJob: null,
    phone: [], phoneT: 0, banner: null, saveSoon: false, shake: 0,
    get wanted() { return this.heat <= 0 ? 0 : Math.min(5, Math.ceil(this.heat)); },
    dangerAt(x, y) {
      if (this.time - this.lastShotAt < 0.7 && dist(x, y, this.lastShotPos.x, this.lastShotPos.y) < 260) return this.lastShotPos;
      if (this.player.car && Math.abs(this.player.car.speed) > 240 && dist(x, y, this.player.x, this.player.y) < 130) return this.player;
      return null;
    },
    addWanted(n, why) {
      if (this.crimeCd > 0 && n < 2) return;
      this.heat = clamp(Math.max(this.heat, n) + (this.heat >= n ? 0.25 : 0), 0, 5);
      this.hiddenTime = 0; this.crimeCd = 0.8;
      if (why) this.banner = { title: 'WANTED', sub: why, t: 1.6 };
    },
    spawnFinaleHostiles() {
      this.hostilesLeft = 5;
      for (const [dx, dy] of [[150, -60], [210, 40], [120, 110], [240, -110], [180, 150]]) {
        let hx = this.player.x + dx, hy = this.player.y + dy;
        if (circleHitsBuilding(this.city, hx, hy, 12)) { const snap = nearestRoadPoint(hx, hy); hx = snap.x; hy = snap.y; }
        spawnHostile(this, hx, hy);
      }
    },
    saveNow() { storeSave(this); },
  };
  spawnParkedCars(G);
  spawnTraffic(G, 18);
  spawnPeds(G, 24);
  // The coral coupe Marisol wants, parked near the Old Market crossing.
  let best = null, bestD = 1e9;
  for (const car of G.cars) if (car.kind === 'parked') { const d = dist(car.x, car.y, 1560, 1330); if (d < bestD) { bestD = d; best = car; } }
  if (best) { best.color = '#ff5a4e'; best.isTarget = true; G.targetCar = best; }
  return G;
}

let G = createGame(seed);
if (shotName) stageShot(G, shotName);
else { G.phone = [STORY_INTRO[0]]; G.phoneT = 10; }

function startNewGame() {
  G = createGame(1); G.screen = 'play';
  G.phone = [...STORY_INTRO]; G.phoneT = 9;
  G.banner = { title: 'PALMERA BAY', sub: 'Meet Marisol at the Loma pier', t: 3 };
  sounds.ensure();
}
function continueGame() {
  const save = loadSave(); if (!save) return startNewGame();
  G = createGame(1); G.screen = 'play';
  G.cash = save.cash ?? G.cash; G.missionIndex = save.missionIndex ?? 0; G.storyDone = !!save.storyDone;
  G.respect = save.respect ?? 0;
  G.player.x = save.x ?? G.player.x; G.player.y = save.y ?? G.player.y;
  G.cam.x = G.player.x; G.cam.y = G.player.y;
  sounds.ensure();
}
function respawn() {
  G.cash = Math.max(0, G.cash - 100); G.heat = 0; G.player.health = 100;
  G.player.car = null; G.player.x = 905; G.player.y = 1900; G.screen = 'play';
  G.cars = G.cars.filter(c => c.kind !== 'police'); G.peds = G.peds.filter(p => p.kind !== 'cop');
  G.banner = { title: 'CLÍNICA DEL SOL', sub: 'Patched up. It cost you $100.', t: 2.6 };
}
function nearestCar(maxD) {
  let best = null, bestD = maxD;
  for (const car of G.cars) { const d = dist(G.player.x, G.player.y, car.x, car.y); if (d < bestD) { bestD = d; best = car; } }
  return best;
}
function toggleCar() {
  const p = G.player;
  if (p.car) {
    const car = p.car; car.speed = 0; if (car.kind === 'traffic') car.kind = 'parked';
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    p.car = null; return;
  }
  const car = nearestCar(58); if (!car) return;
  if (car.driver || car.kind === 'traffic') {
    // Carjacking: the driver bails out and either flees or fights.
    const driver = makePed(car.x + 24, car.y + 10);
    if (G.rng() < 0.3) driver.kind = 'hostile';
    driver.color = '#a29bfe'; G.peds.push(driver);
    G.addWanted(1, 'Vehicle theft reported');
  }
  car.driver = false; p.car = car; p.x = car.x; p.y = car.y;
  sounds.horn();
}
function fireGun() {
  const p = G.player;
  if (p.car || G.reloading > 0 || G.fireCd > 0) return;
  // Punch instead when someone is right in front of Rio.
  for (const ped of G.peds) {
    if (!ped.dead && dist(p.x, p.y, ped.x, ped.y) < 36) {
      ped.health -= 26; sounds.punch();
      G.particles.push(...burst(ped.x, ped.y, '#ffd76a', 5));
      if (ped.kind === 'cop') G.addWanted(3, 'You assaulted an officer!');
      else G.addWanted(1, 'Assault reported');
      G.fireCd = 0.3; return;
    }
  }
  if (G.ammo <= 0) { G.reloading = 1.1; return; }
  G.ammo -= 1; G.fireCd = 0.16; G.muzzle = 0.06;
  G.lastShotAt = G.time; G.lastShotPos = { x: p.x, y: p.y };
  G.bullets.push({ x: p.x + Math.cos(p.aimAngle) * 20, y: p.y + Math.sin(p.aimAngle) * 20, angle: p.aimAngle, speed: 950, life: 0.7, fromPlayer: true });
  sounds.shot();
  G.addWanted(1, 'Shots fired');
  if (G.ammo === 0) G.reloading = 1.1;
}
function burst(x, y, color, n) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = G.rng() * 6.28, s = randRange(G.rng, 30, 130); out.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: randRange(G.rng, 2, 4.5), color, life: randRange(G.rng, 0.25, 0.6), maxLife: 0.6 }); }
  return out;
}
function processEvents() {
  for (const ev of G.events) {
    const type = typeof ev === 'string' ? ev : ev.type;
    if (type === 'honk') sounds.horn();
    else if (type === 'pickup') sounds.pickup();
    else if (type === 'missionDone') { sounds.cash(); G.saveSoon = true; }
    else if (type === 'crash') { sounds.crash(); G.shake = 0.35; G.particles.push(...burst(G.player.x, G.player.y, '#ffb347', 10)); if (G.player.car) G.player.car.health -= 12; }
    else if (type === 'hitCar') { sounds.crash(); G.addWanted(1, 'Hit and run'); }
    else if (type === 'policeRam') { G.player.health -= G.player.car ? 1.5 : 6; G.shake = Math.max(G.shake, 0.2); }
    else if (type === 'npcShoot') {
      const ped = ev.ped, a = angleTo(ped.x, ped.y, G.player.x, G.player.y) + randRange(G.rng, -0.14, 0.14);
      G.bullets.push({ x: ped.x, y: ped.y, angle: a, speed: 780, life: 0.6, fromPlayer: false });
      sounds.shot();
    } else if (type === 'pedHit') {
      if (ev.byPlayer) { G.addWanted(ev.ped.kind === 'cop' ? 3 : 2, 'You hit a pedestrian!'); G.shake = Math.max(G.shake, 0.18); }
      G.particles.push(...burst(ev.ped.x, ev.ped.y, '#e8435f', 6));
    } else if (type === 'pedDown') {
      const ped = ev.ped;
      G.particles.push(...burst(ped.x, ped.y, '#e8435f', 8));
      if (ped.kind === 'hostile' && G.phase === 'fight') G.hostilesLeft = Math.max(0, G.hostilesLeft - 1);
      if (ped.kind === 'cop') G.addWanted(3, 'Officer down!');
      if (dist(G.player.x, G.player.y, ped.x, ped.y) < 260) { G.cash += ped.cash; G.banner = { title: 'CASH', sub: `Picked up $${ped.cash} from the scene`, t: 1.4 }; sounds.cash(); }
    }
  }
  G.events.length = 0;
}
function updateBullets(dt) {
  for (const b of G.bullets) {
    if (!b.speed) continue;
    b.x += Math.cos(b.angle) * b.speed * dt; b.y += Math.sin(b.angle) * b.speed * dt; b.life -= dt;
    if (circleHitsBuilding(G.city, b.x, b.y, 3)) { b.life = 0; G.particles.push(...burst(b.x, b.y, '#ffd76a', 3)); continue; }
    if (b.fromPlayer) {
      for (const ped of G.peds) if (!ped.dead && dist(b.x, b.y, ped.x, ped.y) < 12) { ped.health -= 34; b.life = 0; G.particles.push(...burst(ped.x, ped.y, '#e8435f', 5)); if (ped.kind === 'cop') G.addWanted(3, 'You shot an officer!'); break; }
      if (b.life > 0) for (const car of G.cars) if (car !== G.player.car && dist(b.x, b.y, car.x, car.y) < 26) { car.health -= 16; b.life = 0; break; }
    } else if (dist(b.x, b.y, G.player.x, G.player.y) < (G.player.car ? 26 : 11)) {
      G.player.health -= G.player.car ? 3 : 8; b.life = 0; G.shake = Math.max(G.shake, 0.12);
    }
  }
  G.bullets = G.bullets.filter(b => b.life > 0 && b.speed);
  for (const pt of G.particles) { pt.x += (pt.vx ?? 0) * dt; pt.y += (pt.vy ?? 0) * dt; pt.life -= dt; }
  G.particles = G.particles.filter(pt => pt.life > 0);
}
function updateWanted(dt) {
  G.crimeCd -= dt; G.policeTimer -= dt;
  const copsNear = G.cars.some(c => c.kind === 'police' && dist(c.x, c.y, G.player.x, G.player.y) < 430)
    || G.peds.some(p => p.kind === 'cop' && dist(p.x, p.y, G.player.x, G.player.y) < 300);
  if (G.wanted > 0) {
    if (copsNear) G.hiddenTime = 0; else G.hiddenTime += dt;
    if (G.hiddenTime > 3.5) { G.heat = Math.max(0, G.heat - dt * 0.22); if (G.heat <= 0.05) G.heat = 0; }
    const wantCars = Math.min(5, G.wanted + 1);
    const policeCars = G.cars.filter(c => c.kind === 'police').length;
    if (policeCars < wantCars && G.policeTimer <= 0) { spawnPoliceCar(G); G.policeTimer = 1.6; }
    const copPeds = G.peds.filter(p => p.kind === 'cop').length;
    if (G.wanted >= 2 && copPeds < G.wanted - 1 && G.policeTimer <= 0) { spawnCopPed(G); G.policeTimer = 2; }
  } else {
    G.cars = G.cars.filter(c => c.kind !== 'police');
    G.peds = G.peds.filter(p => p.kind !== 'cop' || dist(p.x, p.y, G.player.x, G.player.y) > 200);
  }
  const p = G.player;
  const held = !p.car && G.peds.some(ped => ped.kind === 'cop' && dist(ped.x, ped.y, p.x, p.y) < 30);
  if (held && G.wanted > 0) { G.bustTimer += dt; if (G.bustTimer > 1.8) { G.screen = 'busted'; sounds.crash(); } }
  else G.bustTimer = Math.max(0, G.bustTimer - dt);
  if (p.health <= 0 && G.screen === 'play') { G.screen = 'wasted'; sounds.crash(); }
}
function updatePlayer(dt) {
  const p = G.player;
  p.aimAngle = angleTo(p.x, p.y, G.cam.x - canvas.width / 2 + input.mouse.x, G.cam.y - canvas.height / 2 + input.mouse.y);
  if (p.car) { updatePlayerDriving(G, dt, input); p.moving = Math.abs(p.car.speed) > 10; return; }
  const mv = input.moveVector();
  const speed = input.down('ShiftLeft', 'ShiftRight') ? 268 : 172;
  if (mv.active) {
    const nx = p.x + mv.x * speed * dt, ny = p.y + mv.y * speed * dt;
    if (!circleHitsBuilding(G.city, nx, p.y, 10)) p.x = nx;
    if (!circleHitsBuilding(G.city, p.x, ny, 10)) p.y = ny;
    p.angle = Math.atan2(mv.y, mv.x); p.moving = true;
  } else p.moving = false;
  p.x = clamp(p.x, 24, WORLD.w - 24); p.y = clamp(p.y, 24, WORLD.h - 24);
  for (const car of G.cars) if (Math.abs(car.speed) > 120 && dist(p.x, p.y, car.x, car.y) < 24 && !p._hurtCd) {
    p._hurtCd = 1; p.health -= 16; G.shake = 0.25; sounds.crash();
  }
  if (p._hurtCd) p._hurtCd -= dt;
  if (input.justPressed('KeyJ')) fireGun();
  if (input.mouse.down && G.fireCd <= 0) fireGun();
}
function update(dt) {
  G.time += dt;
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.phoneT > 0) G.phoneT -= dt; else if (G.phone.length > 1) { G.phone.shift(); G.phoneT = 7; }
  G.fireCd -= dt; G.muzzle -= dt; G.shake = Math.max(0, G.shake - dt);
  if (G.reloading > 0) { G.reloading -= dt; if (G.reloading <= 0) G.ammo = 12; }
  if (input.justPressed('KeyM')) sounds.muted = !sounds.muted;
  if (G.screen === 'title') {
    if (input.justPressed('KeyN') || input.justPressed('Mouse')) startNewGame();
    else if (input.justPressed('KeyC') && hasSave()) continueGame();
    input.endFrame(); return;
  }
  if (G.screen === 'busted' || G.screen === 'wasted') {
    if (input.justPressed('Enter') || input.justPressed('Mouse')) respawn();
    input.endFrame(); return;
  }
  if (input.justPressed('Escape', 'KeyP')) { G.screen = G.screen === 'paused' ? 'play' : 'paused'; input.endFrame(); return; }
  if (G.screen === 'paused') { input.endFrame(); return; }
  if (input.justPressed('KeyE', 'KeyF')) toggleCar();
  if (input.justPressed('KeyR') && G.ammo < 12) G.reloading = 1.1;
  updatePlayer(dt);
  updateVehicles(G, dt);
  updatePeds(G, dt);
  updateBullets(dt);
  updateMission(G, dt);
  processEvents();
  updateWanted(dt);
  if (G.saveSoon) { G.saveSoon = false; G.saveNow(); }
  const tx = G.player.x + (G.player.car ? Math.cos(G.player.car.angle) * 40 : 0);
  const ty = G.player.y + (G.player.car ? Math.sin(G.player.car.angle) * 40 : 0);
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 5);
  G.cam.x = clamp(G.cam.x, canvas.width / 2 - 200, WORLD.w - canvas.width / 2 + 200);
  G.cam.y = clamp(G.cam.y, canvas.height / 2 - 200, WORLD.h - canvas.height / 2 + 200);
  sounds.update(dt, !!G.player.car, G.player.car ? Math.abs(G.player.car.speed) / 430 : 0, G.wanted > 0);
  input.endFrame();
}
function drawOverlay() {
  const W = canvas.width, H = canvas.height;
  if (G.screen === 'title') {
    ctx.fillStyle = 'rgba(16,8,28,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd21f'; ctx.font = 'bold 74px system-ui'; ctx.fillText('PALMERA BAY', W / 2, H * 0.30);
    ctx.fillStyle = '#ff5e8a'; ctx.font = 'bold 40px system-ui'; ctx.fillText('— VICE RUN —', W / 2, H * 0.30 + 52);
    ctx.fillStyle = '#fff'; ctx.font = '17px system-ui';
    ctx.fillText('Courier Rio Solano takes one last chain of jobs for fixer Marisol Vega in a sun-soaked coastal city.', W / 2, H * 0.30 + 92);
    ctx.fillText('Steal cars, run packages, lose the police — and try to retire on the bay.', W / 2, H * 0.30 + 116);
    ctx.font = '15px system-ui'; ctx.fillStyle = '#cfe6ff';
    const controls = ['WASD / Arrows — move & drive      Shift — sprint      Mouse — aim, Click / J — punch & shoot',
      'E / F — enter & exit cars (carjack!)      R — reload      Esc / P — pause      M — mute'];
    controls.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.30 + 156 + i * 24));
    ctx.fillStyle = '#7dff9a'; ctx.font = 'bold 24px system-ui';
    ctx.fillText('CLICK or press N — NEW GAME', W / 2, H * 0.30 + 224);
    if (hasSave()) { ctx.fillStyle = '#7dd7ff'; ctx.fillText('Press C — CONTINUE', W / 2, H * 0.30 + 258); }
    ctx.textAlign = 'left';
  } else if (G.screen === 'busted' || G.screen === 'wasted') {
    ctx.fillStyle = 'rgba(10,6,16,0.72)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = G.screen === 'busted' ? '#5ea0ff' : '#ff2d2d'; ctx.font = 'bold 72px system-ui';
    ctx.fillText(G.screen === 'busted' ? 'BUSTED' : 'WASTED', W / 2, H * 0.44);
    ctx.fillStyle = '#fff'; ctx.font = '18px system-ui';
    ctx.fillText(G.screen === 'busted' ? 'The Palmera police walk you to the station. Bail and fees: $100.' : 'You wake up at Clínica del Sol. The bill: $100.', W / 2, H * 0.44 + 42);
    ctx.fillText('Press ENTER or click to continue', W / 2, H * 0.44 + 74);
    ctx.textAlign = 'left';
  } else if (G.screen === 'paused') {
    ctx.fillStyle = 'rgba(10,6,16,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd21f'; ctx.font = 'bold 44px system-ui';
    ctx.fillText('PAUSED', W / 2, H * 0.46); ctx.textAlign = 'left';
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last ?? now)) / 1000); frame.last = now;
  if (!G.frozen) update(dt || 0.016);
  else input.endFrame();
  ctx.save();
  if (G.shake > 0) ctx.translate(randRange(Math.random, -1, 1) * G.shake * 14, randRange(Math.random, -1, 1) * G.shake * 14);
  drawWorld(ctx, G, canvas.width, canvas.height);
  ctx.restore();
  if (G.screen !== 'title') drawHUD(ctx, G, canvas.width, canvas.height);
  drawOverlay();
  if (statusEl) statusEl.textContent = `Palmera Bay: Vice Run. Cash $${G.cash}, mission ${G.missionIndex + 1}, wanted ${G.wanted} stars.`;
  if (shotName) window.__shotReady = true;
}
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();
addEventListener('pointerdown', () => sounds.ensure(), { once: true });
requestAnimationFrame(frame);
