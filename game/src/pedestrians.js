// Pedestrians, police officers on foot and hostile shooters: wandering, fleeing, chasing, shooting.
import { ROAD_X, ROAD_Y, circleHitsBuilding, WORLD } from './city-map.js';
import { clamp, randRange, pick, dist, angleTo } from './random.js';

const SHIRTS = ['#ff7675','#74b9ff','#ffeaa7','#55efc4','#fd79a8','#dfe6e9','#fab1a0','#81ecec','#a29bfe','#fdcb6e'];
let nextId = 1;
export function makePed(x, y, kind = 'ped') {
  return { id: nextId++, x, y, angle: randRange(Math.random, 0, 6.28), speed: 0, kind,
    color: kind === 'cop' ? '#2d3a67' : kind === 'hostile' ? '#6c2b2b' : pick(Math.random, SHIRTS),
    health: kind === 'hostile' ? 60 : 40, state: 'walk', tx: x, ty: y, thinkCd: randRange(Math.random, 0, 2),
    shootCd: randRange(Math.random, 0.5, 1.5), cash: Math.floor(randRange(Math.random, 4, 38)), dead: false };
}
export function spawnPeds(G, count) {
  for (let i = 0; i < count; i++) {
    const horiz = G.rng() < 0.5, road = horiz ? pick(G.rng, ROAD_Y) : pick(G.rng, ROAD_X);
    const side = G.rng() < 0.5 ? -88 : 88, t = randRange(G.rng, 120, (horiz ? WORLD.w : WORLD.h) - 460);
    const x = horiz ? t : road + side, y = horiz ? road + side : t;
    if (dist(x, y, G.player.x, G.player.y) < 120) continue;
    G.peds.push(makePed(x, y));
  }
}
export function spawnCopPed(G) {
  const a = randRange(G.rng, 0, Math.PI * 2);
  const ped = makePed(clamp(G.player.x + Math.cos(a) * 380, 60, WORLD.w - 60), clamp(G.player.y + Math.sin(a) * 380, 60, WORLD.h - 60), 'cop');
  G.peds.push(ped); return ped;
}
export function spawnHostile(G, x, y) { const p = makePed(x, y, 'hostile'); p.state = 'fight'; G.peds.push(p); return p; }

function pickWanderTarget(G, ped) {
  const horiz = G.rng() < 0.5, road = horiz ? pick(G.rng, ROAD_Y) : pick(G.rng, ROAD_X);
  const side = G.rng() < 0.5 ? -88 : 88, t = clamp(ped[horiz ? 'x' : 'y'] + randRange(G.rng, -320, 320), 90, (horiz ? WORLD.w : WORLD.h) - 420);
  ped.tx = horiz ? t : road + side; ped.ty = horiz ? road + side : t;
}
export function updatePeds(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    ped.thinkCd -= dt; ped.shootCd -= dt;
    let speed = 55, tx = ped.tx, ty = ped.ty;
    const danger = G.dangerAt(ped.x, ped.y);
    if (ped.kind === 'cop' && G.wanted > 0) {
      tx = p.x; ty = p.y; speed = dist(ped.x, ped.y, p.x, p.y) > 30 ? 148 : 0;
      if (!p.car && dist(ped.x, ped.y, p.x, p.y) < 30) G.events.push('copTouch');
    } else if (ped.kind === 'hostile') {
      const d = dist(ped.x, ped.y, p.x, p.y);
      if (d > 190) { tx = p.x; ty = p.y; speed = 120; }
      else if (d < 90) { tx = ped.x * 2 - p.x; ty = ped.y * 2 - p.y; speed = 80; }
      else speed = 0;
      if (d < 300 && ped.shootCd <= 0) { ped.shootCd = randRange(G.rng, 0.8, 1.6); G.events.push({ type: 'npcShoot', ped }); }
      ped.angle = angleTo(ped.x, ped.y, p.x, p.y);
    } else if (danger) {
      ped.state = 'flee'; tx = ped.x * 2 - danger.x; ty = ped.y * 2 - danger.y; speed = 165;
    } else {
      ped.state = 'walk';
      if (dist(ped.x, ped.y, tx, ty) < 14 || ped.thinkCd <= 0) { pickWanderTarget(G, ped); ped.thinkCd = randRange(G.rng, 3, 7); }
    }
    if (speed > 0) {
      const a = angleTo(ped.x, ped.y, tx, ty); ped.angle = a;
      const nx = ped.x + Math.cos(a) * speed * dt, ny = ped.y + Math.sin(a) * speed * dt;
      if (!circleHitsBuilding(G.city, nx, ped.y, 9)) ped.x = nx;
      if (!circleHitsBuilding(G.city, ped.x, ny, 9)) ped.y = ny;
      ped.speed = speed;
    } else ped.speed = 0;
    // Stepping in front of a fast car is bad for everyone.
    for (const car of G.cars) {
      if (Math.abs(car.speed) > 90 && dist(ped.x, ped.y, car.x, car.y) < 24 && !ped._runCd) {
        ped._runCd = 1; ped.health -= 45; G.events.push({ type: 'pedHit', ped, byPlayer: car === p.car || (p.car && car === p.car) });
      }
    }
    if (ped._runCd) ped._runCd -= dt;
    if (ped.health <= 0 && !ped.dead) { ped.dead = true; G.events.push({ type: 'pedDown', ped }); }
  }
  G.peds = G.peds.filter(ped => !ped.dead || G.time - (ped.deadAt ?? (ped.deadAt = G.time)) < 20);
  const walkers = G.peds.filter(x => x.kind === 'ped').length;
  if (walkers < 20 && G.rng() < dt * 0.6) spawnPeds(G, 1);
}
