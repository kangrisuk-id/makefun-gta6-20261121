// Deterministic screenshot scenes for ?shot=title|onfoot|chase|mission&seed=<n>.
// Each scene is staged with the real game state and then frozen, so a headless browser
// captures exactly what gameplay looks like.
import { makeCar } from './vehicles-traffic.js';
import { makePed } from './pedestrians.js';
import { STORY_INTRO } from './missions-story.js';

function stagedCar(G, x, y, angle, color, kind = 'traffic', speed = 0) {
  const car = makeCar(x, y, angle, color, kind); car.speed = speed; G.cars.push(car); return car;
}
function stagedPed(G, x, y, kind = 'ped', color) {
  const ped = makePed(x, y, kind); if (color) ped.color = color; G.peds.push(ped); return ped;
}
export function stageShot(G, name) {
  G.frozen = true; G.screen = 'play';
  G.cash = 2450; G.respect = 3; G.player.health = 92;
  if (name === 'onfoot') {
    G.player.x = 1470; G.player.y = 905; G.player.aimAngle = -0.6;
    G.missionIndex = 0; G.phone = [STORY_INTRO[0]]; G.phoneT = 999;
    stagedCar(G, 1330, 874, 0, '#e74c3c', 'traffic', 150);
    stagedCar(G, 1620, 806, Math.PI, '#3498db', 'traffic', 140);
    stagedCar(G, 1376, 700, Math.PI / 2, '#f1c40f', 'traffic', 130);
    stagedCar(G, 1290, 960, 0, '#2ecc71', 'parked');
    stagedPed(G, 1520, 930); stagedPed(G, 1420, 940); stagedPed(G, 1560, 880); stagedPed(G, 1390, 870); stagedPed(G, 1600, 950);
    G.cam.x = G.player.x; G.cam.y = G.player.y;
  } else if (name === 'chase') {
    G.missionIndex = 3; G.phase = 'start';
    G.heat = 4; G.cash = 3900; G.player.health = 74; G.ammo = 9;
    const car = stagedCar(G, 1560, 874, 0, '#e74c3c', 'traffic', 330);
    G.player.car = car; G.player.x = car.x; G.player.y = car.y;
    stagedCar(G, 1330, 830, 0.15, '#f5f6fa', 'police', 320);
    stagedCar(G, 1380, 925, -0.12, '#f5f6fa', 'police', 310);
    stagedCar(G, 1180, 874, 0, '#f5f6fa', 'police', 300);
    stagedCar(G, 1780, 806, Math.PI, '#9b59b6', 'traffic', 120);
    stagedPed(G, 1700, 930); stagedPed(G, 1450, 940, 'cop'); stagedPed(G, 1660, 790);
    for (let i = 0; i < 14; i++) G.particles.push({ x: car.x - 40 - i * 7, y: car.y + 16 + Math.sin(i) * 5, r: 5 + (i % 3), color: '#8a8a92', life: 9, maxLife: 9, vx: 0, vy: 0 });
    G.cam.x = car.x + 60; G.cam.y = car.y;
  } else if (name === 'mission') {
    G.missionIndex = 4; G.phase = 'fight'; G.hostilesLeft = 3; G.cash = 6100; G.player.health = 68; G.ammo = 7;
    G.player.x = 1880; G.player.y = 1440; G.player.aimAngle = 0.1;
    G.banner = { title: 'AMBUSH', sub: 'Clear the warehouse crew!', t: 999 };
    stagedPed(G, 2005, 1395, 'hostile'); stagedPed(G, 2050, 1470, 'hostile'); stagedPed(G, 1980, 1338, 'hostile');
    stagedPed(G, 1720, 1335); stagedPed(G, 1690, 1500);
    stagedCar(G, 1730, 1370, 0, '#ff5a4e', 'parked');
    stagedCar(G, 2210, 1436, Math.PI, '#3498db', 'traffic', 90);
    G.muzzle = 5;
    G.bullets.push({ x: 1945, y: 1428, angle: 0.1, speed: 0, life: 9, fromPlayer: true });
    G.bullets.push({ x: 1992, y: 1422, angle: 0.1, speed: 0, life: 9, fromPlayer: true });
    G.cam.x = 1930; G.cam.y = 1440;
  } else { // title
    G.screen = 'title';
    G.player.x = 1440; G.player.y = 905;
    stagedCar(G, 1300, 874, 0, '#e74c3c', 'traffic', 120);
    stagedCar(G, 1620, 806, Math.PI, '#f1c40f', 'traffic', 110);
    stagedPed(G, 1520, 930); stagedPed(G, 1380, 940);
    G.cam.x = 1500; G.cam.y = 860;
  }
}
