// Vehicles: player driving physics, AI traffic on the road grid, parked cars and police pursuit.
import { ROAD_X, ROAD_Y, ROAD_HALF, circleHitsBuilding, WORLD } from './city-map.js';
import { clamp, randRange, pick, dist, wrapAngle, angleTo } from './random.js';

export const CAR_COLORS = ['#e74c3c','#3498db','#f1c40f','#2ecc71','#ecf0f1','#9b59b6','#e67e22','#1abc9c','#fd79a8','#7f8c8d','#ff6b81','#48dbfb'];
let nextId = 1;
export function makeCar(x, y, angle, color, kind = 'traffic') {
  return { id: nextId++, x, y, angle, speed: 0, color, kind, model: nextId % 3, health: 100,
    dirX: Math.cos(angle), dirY: Math.sin(angle), turnCd: 0, honkCd: randRange(Math.random, 2, 9),
    blocked: 0, isTarget: false, driver: kind === 'traffic' };
}
export function spawnParkedCars(G) {
  for (const p of G.city.parked) G.cars.push(makeCar(p.x, p.y, p.angle, p.color, 'parked'));
}
export function spawnTraffic(G, count) {
  for (let i = 0; i < count; i++) {
    const horiz = G.rng() < 0.5, road = horiz ? pick(G.rng, ROAD_Y) : pick(G.rng, ROAD_X);
    const dir = G.rng() < 0.5 ? 1 : -1, t = randRange(G.rng, 160, (horiz ? WORLD.w : WORLD.h) - 500);
    let x, y, angle;
    if (horiz) { x = t; y = road + (dir > 0 ? 34 : -34); angle = dir > 0 ? 0 : Math.PI; }
    else { y = t; x = road + (dir > 0 ? -34 : 34); angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    if (dist(x, y, G.player.x, G.player.y) < 180) continue;
    const car = makeCar(x, y, angle, pick(G.rng, CAR_COLORS), 'traffic');
    car.speed = randRange(G.rng, 120, 180); G.cars.push(car);
  }
}
export function spawnPoliceCar(G) {
  const a = randRange(G.rng, 0, Math.PI * 2), d = randRange(G.rng, 520, 640);
  const x = clamp(G.player.x + Math.cos(a) * d, 80, WORLD.w - 80), y = clamp(G.player.y + Math.sin(a) * d, 80, WORLD.h - 80);
  const car = makeCar(x, y, angleTo(x, y, G.player.x, G.player.y), '#f5f6fa', 'police');
  car.speed = 200; G.cars.push(car); return car;
}
function carAhead(G, car) {
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  for (const o of G.cars) {
    if (o === car) continue;
    const dx = o.x - car.x, dy = o.y - car.y, fwd = dx * fx + dy * fy, side = Math.abs(dx * -fy + dy * fx);
    if (fwd > 10 && fwd < 78 && side < 22) return o;
  }
  if (G.player.car) { const dx = G.player.car.x - car.x, dy = G.player.car.y - car.y, fwd = dx * fx + dy * fy, side = Math.abs(dx * -fy + dy * fx); if (fwd > 10 && fwd < 78 && side < 22) return G.player.car; }
  return null;
}
function driveAlongRoads(G, car, dt) {
  car.turnCd -= dt; car.honkCd -= dt;
  const ahead = carAhead(G, car);
  const target = ahead ? 60 : 175;
  car.speed += clamp(target - car.speed, -260 * dt, 120 * dt);
  if (ahead && car.speed < 40) { car.blocked += dt; if (car.blocked > 1.6 && car.honkCd <= 0) { car.honkCd = randRange(G.rng, 3, 8); G.events.push('honk'); car.blocked = 0; } }
  else car.blocked = 0;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt, ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!circleHitsBuilding(G.city, nx, ny, 20)) { car.x = nx; car.y = ny; } else car.speed = 0;
  // At an intersection, sometimes turn (snapping to the correct right-hand lane).
  if (car.turnCd <= 0) {
    const ix = ROAD_X.find(rx => Math.abs(car.x - rx) < 10), iy = ROAD_Y.find(ry => Math.abs(car.y - ry) < 10);
    if (ix !== undefined && iy !== undefined && G.rng() < 0.55) {
      const horiz = Math.abs(Math.cos(car.angle)) > 0.5;
      const dir = G.rng() < 0.5 ? 1 : -1;
      if (horiz) { car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2; car.x = ix + (dir > 0 ? -34 : 34); }
      else { car.angle = dir > 0 ? 0 : Math.PI; car.y = iy + (dir > 0 ? 34 : -34); }
      car.turnCd = 1.2;
    }
  }
  car.x = clamp(car.x, 40, WORLD.w - 40); car.y = clamp(car.y, 40, WORLD.h - 40);
}
function drivePolice(G, car, dt) {
  const p = G.player, targetAngle = angleTo(car.x, car.y, p.x, p.y);
  let diff = wrapAngle(targetAngle - car.angle);
  const chaseSpeed = p.car ? 360 : 250;
  car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
  const want = Math.abs(diff) > 2.2 ? -80 : chaseSpeed;
  car.speed += clamp(want - car.speed, -300 * dt, 200 * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt, ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!circleHitsBuilding(G.city, nx, ny, 20)) { car.x = nx; car.y = ny; }
  else { car.speed = -60; car.angle += 0.7 * dt; G.events.push('crashSmall'); }
  if (dist(car.x, car.y, p.x, p.y) < 40 && Math.abs(car.speed) > 120) G.events.push('policeRam');
}
export function updateVehicles(G, dt) {
  for (const car of G.cars) {
    if (car === G.player.car || car.health <= 0) continue;
    if (car.kind === 'traffic') driveAlongRoads(G, car, dt);
    else if (car.kind === 'police') drivePolice(G, car, dt);
  }
  G.cars = G.cars.filter(c => c.kind !== 'police' || G.wanted > 0 || dist(c.x, c.y, G.player.x, G.player.y) < 900);
  // Keep the streets alive: top traffic back up away from the player.
  const trafficCount = G.cars.filter(c => c.kind === 'traffic').length;
  if (trafficCount < 16 && G.rng() < dt * 0.7) spawnTraffic(G, 1);
}
export function updatePlayerDriving(G, dt, input) {
  const car = G.player.car; if (!car) return;
  const fwd = input.down('KeyW', 'ArrowUp'), back = input.down('KeyS', 'ArrowDown');
  const steer = (input.down('KeyA', 'ArrowLeft') ? -1 : 0) + (input.down('KeyD', 'ArrowRight') ? 1 : 0);
  if (fwd) car.speed += 300 * dt;
  if (back) car.speed -= (car.speed > 10 ? 420 : 160) * dt;
  car.speed -= car.speed * 0.55 * dt; // drag
  if (!fwd && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 60 * dt);
  car.speed = clamp(car.speed, -150, 430);
  if (Math.abs(car.speed) > 4) car.angle += steer * 1.9 * dt * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 160, 0.3, 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt, ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!circleHitsBuilding(G.city, nx, car.y, 20)) car.x = nx; else { if (Math.abs(car.speed) > 140) G.events.push('crash'); car.speed *= -0.25; }
  if (!circleHitsBuilding(G.city, car.x, ny, 20)) car.y = ny; else { if (Math.abs(car.speed) > 140) G.events.push('crash'); car.speed *= -0.25; }
  car.x = clamp(car.x, 36, WORLD.w - 36); car.y = clamp(car.y, 36, WORLD.h - 36);
  G.player.x = car.x; G.player.y = car.y; G.player.angle = car.angle;
  // Running into traffic wrecks both cars a little and draws heat.
  for (const o of G.cars) {
    if (o === car) continue;
    if (dist(o.x, o.y, car.x, car.y) < 38) {
      o.health -= Math.abs(car.speed) * 0.06; o.speed = car.speed * 0.4; o.angle = car.angle;
      if (Math.abs(car.speed) > 150 && !o._hitCd) { o._hitCd = 1; G.events.push('hitCar'); }
    }
    if (o._hitCd) o._hitCd -= dt;
  }
}
export { ROAD_HALF };
