// World renderer: sun-soaked Palmera Bay — roads, roofs, palms, beach, cars, people, effects.
import { WORLD, ROAD_X, ROAD_Y, ROAD_HALF, districtAt } from './city-map.js';
import { missionTarget } from './missions-story.js';

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export function drawWorld(ctx, G, viewW, viewH) {
  const camX = G.cam.x - viewW / 2, camY = G.cam.y - viewH / 2;
  ctx.fillStyle = '#c9b18c'; ctx.fillRect(0, 0, viewW, viewH); // sun-baked pavement base
  ctx.save(); ctx.translate(-camX, -camY);
  // Beach sand and ocean on the east edge.
  ctx.fillStyle = '#f2d492'; ctx.fillRect(3180, 0, 190, WORLD.h);
  const grad = ctx.createLinearGradient(3370, 0, WORLD.w, 0);
  grad.addColorStop(0, '#3ec6d8'); grad.addColorStop(1, '#1668a8');
  ctx.fillStyle = grad; ctx.fillRect(3370, 0, WORLD.w - 3370, WORLD.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
  for (let y = 40; y < WORLD.h; y += 90) { ctx.beginPath(); ctx.moveTo(3370, y); ctx.bezierCurveTo(3420, y + 18, 3470, y - 18, 3560, y + 8); ctx.stroke(); }
  // Blocks: parks, parking lots, building plots.
  for (const b of G.city.blocks) {
    if (!b.kind) continue;
    if (camCull(b, camX, camY, viewW, viewH)) continue;
    ctx.fillStyle = b.kind === 'park' ? '#79b657' : b.kind === 'parking' ? '#8d8d94' : '#bfae94';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (b.kind === 'parking') { ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2; for (let x = b.x + 26; x < b.x + b.w - 20; x += 62) { ctx.strokeRect(x, b.y + b.h / 2 - 34, 46, 68); } }
    if (b.kind === 'park') { ctx.fillStyle = '#8fce72'; ctx.fillRect(b.x + 18, b.y + 18, b.w - 36, b.h - 36); }
  }
  drawRoads(ctx);
  // Buildings with sunset shadows, roofs, details and signs.
  for (const b of G.city.buildings) {
    if (camCull(b, camX, camY, viewW, viewH)) continue;
    ctx.fillStyle = 'rgba(60,30,20,0.35)'; ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h * 0.32);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(b.x, b.y + b.h - 14, b.w, 14);
    ctx.strokeStyle = 'rgba(40,20,10,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    ctx.fillStyle = 'rgba(255,240,200,0.8)';
    const cols = Math.max(2, Math.floor(b.w / 34)), rows = Math.max(2, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if ((i * 7 + j * 13 + b.floors) % 3) ctx.fillRect(b.x + 12 + i * 30, b.y + 12 + j * 30, 13, 9);
    if (b.sign && b.w > 110) {
      ctx.fillStyle = 'rgba(20,16,32,0.85)'; const sw = ctx.measureText(b.sign).width;
      ctx.fillRect(b.x + b.w / 2 - b.sign.length * 4.4 - 8, b.y + b.h / 2 - 13, b.sign.length * 8.8 + 16, 26);
      ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + 5); void sw;
    }
  }
  // Mission beacon: a pillar of gold light.
  const target = missionTarget(G);
  if (target && G.screen === 'play') {
    const pulse = 0.65 + Math.sin(G.time * 4) * 0.25;
    const grd = ctx.createLinearGradient(0, target.y - 320, 0, target.y);
    grd.addColorStop(0, 'rgba(255,205,60,0)'); grd.addColorStop(1, `rgba(255,205,60,${pulse})`);
    ctx.fillStyle = grd; ctx.fillRect(target.x - 16, target.y - 320, 32, 320);
    ctx.fillStyle = '#ffcd3c'; ctx.beginPath(); ctx.ellipse(target.x, target.y, 30, 13, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(target.x, target.y, 30 + Math.sin(G.time * 4) * 5, 13, 0, 0, 7); ctx.stroke();
  }
  for (const pack of G.packages) if (!pack.got && (G.missionIndex === 2 && !G.storyDone)) drawPickup(ctx, pack.x, pack.y, '#ff9f43');
  if (G.sideJob) drawPickup(ctx, G.sideJob.x, G.sideJob.y, '#54e0ff');
  // Palm trees.
  for (const t of G.city.trees) {
    if (t.x < camX - 60 || t.x > camX + viewW + 60 || t.y < camY - 60 || t.y > camY + viewH + 60) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(t.x + 8, t.y + 8, t.r, t.r * 0.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2e7d46'; ctx.lineWidth = 5;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + t.x; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.quadraticCurveTo(t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r - 6, t.x + Math.cos(a) * t.r * 1.5, t.y + Math.sin(a) * t.r * 1.5 + 5); ctx.stroke(); }
    ctx.fillStyle = '#3f9e58'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.55, 0, 7); ctx.fill();
  }
  for (const car of G.cars) drawCar(ctx, G, car);
  for (const ped of G.peds) drawPed(ctx, ped);
  if (!G.player.car) drawPlayer(ctx, G);
  drawBulletsAndParticles(ctx, G);
  ctx.restore();
  // Sunset wash over everything.
  const wash = ctx.createLinearGradient(0, 0, viewW, viewH);
  wash.addColorStop(0, 'rgba(255,140,60,0.10)'); wash.addColorStop(0.6, 'rgba(255,80,120,0.05)'); wash.addColorStop(1, 'rgba(40,20,90,0.13)');
  ctx.fillStyle = wash; ctx.fillRect(0, 0, viewW, viewH);
}
function camCull(b, camX, camY, w, h) { return b.x + b.w < camX - 40 || b.x > camX + w + 40 || b.y + b.h < camY - 40 || b.y > camY + h + 40; }
function drawRoads(ctx) {
  ctx.fillStyle = '#4a4a52';
  for (const x of ROAD_X) ctx.fillRect(x - ROAD_HALF, 0, ROAD_HALF * 2, WORLD.h);
  for (const y of ROAD_Y) ctx.fillRect(0, y - ROAD_HALF, WORLD.w, ROAD_HALF * 2);
  ctx.fillStyle = '#cfc4a5'; // sidewalks
  for (const x of ROAD_X) { ctx.fillRect(x - ROAD_HALF - 13, 0, 13, WORLD.h); ctx.fillRect(x + ROAD_HALF, 0, 13, WORLD.h); }
  for (const y of ROAD_Y) { ctx.fillRect(0, y - ROAD_HALF - 13, WORLD.w, 13); ctx.fillRect(0, y + ROAD_HALF, WORLD.w, 13); }
  ctx.strokeStyle = '#f7e08a'; ctx.lineWidth = 4; ctx.setLineDash([26, 22]);
  for (const x of ROAD_X) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.h); ctx.stroke(); }
  for (const y of ROAD_Y) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.w, y); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; // crosswalks
  for (const x of ROAD_X) for (const y of ROAD_Y) for (let i = -2; i <= 2; i++) { ctx.fillRect(x - ROAD_HALF - 10, y + i * 24 - 6, 20, 11); ctx.fillRect(x + i * 24 - 6, y - ROAD_HALF - 10, 11, 20); }
}
function drawPickup(ctx, x, y, color) {
  const bob = Math.sin(performance.now() / 300) * 4;
  ctx.fillStyle = color; rr(ctx, x - 13, y - 13 + bob, 26, 26, 5); ctx.fill();
  ctx.fillStyle = '#221a10'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('$', x, y + 6 + bob);
}
export function drawCar(ctx, G, car) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, -24, -11, 52, 26, 8); ctx.fill();
  if (car === G.player.car) { // headlight cones
    const cone = ctx.createLinearGradient(26, 0, 120, 0);
    cone.addColorStop(0, 'rgba(255,240,170,0.30)'); cone.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(26, -9); ctx.lineTo(122, -30); ctx.lineTo(122, 30); ctx.lineTo(26, 9); ctx.fill();
  }
  ctx.fillStyle = car.health < 40 ? '#555' : car.color;
  rr(ctx, -26, -13, 52, 26, 8); ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,0.9)'; rr(ctx, -6, -10, 18, 20, 4); ctx.fill(); // windshield/cabin
  ctx.fillStyle = 'rgba(180,230,255,0.85)'; rr(ctx, 6, -9, 6, 18, 3); ctx.fill();
  ctx.fillStyle = '#1c1c22'; for (const [wx, wy] of [[-17, -14], [17, -14], [-17, 11], [17, 11]]) { rr(ctx, wx - 5, wy, 11, 5, 2); ctx.fill(); }
  ctx.fillStyle = '#fff6bf'; ctx.fillRect(24, -10, 3, 6); ctx.fillRect(24, 4, 3, 6);
  ctx.fillStyle = '#ff3b30'; ctx.fillRect(-27, -10, 3, 6); ctx.fillRect(-27, 4, 3, 6);
  if (car.kind === 'police') {
    ctx.fillStyle = '#20305e'; rr(ctx, -26, -13, 52, 7, 4); ctx.fill(); rr(ctx, -26, 6, 52, 7, 4); ctx.fill();
    const flash = Math.floor(G.time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d6bff'; rr(ctx, -7, -4, 14, 8, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 0, -7.5);
  }
  if (car.model === 1) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-20, -3, 34, 6); }
  if (car.model === 2) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-24, -13, 10, 26); }
  ctx.restore();
  if (car.isTarget) {
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -G.time * 30;
    ctx.beginPath(); ctx.arc(car.x, car.y, 44, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★ TARGET CAR', car.x, car.y - 52);
  }
  if (car.health < 55) { ctx.fillStyle = 'rgba(40,40,40,0.5)'; ctx.beginPath(); ctx.arc(car.x - 18, car.y - 16, 7 + Math.sin(G.time * 9) * 2, 0, 7); ctx.fill(); }
}
function drawPed(ctx, ped) {
  ctx.save(); ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(2, 3, 10, 6, 0, 0, 7); ctx.fill();
  if (ped.dead) { ctx.rotate(Math.PI / 2); }
  ctx.fillStyle = ped.color; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(2, 0, 5.5, 0, 7); ctx.fill();
  if (ped.kind === 'cop') { ctx.fillStyle = '#ffd94d'; ctx.fillRect(-6, -8, 3, 3); ctx.fillStyle = '#20305e'; ctx.beginPath(); ctx.arc(2, 0, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(3, 0, 4, 0, 7); ctx.fill(); }
  if (ped.kind === 'hostile') { ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(6 + Math.cos(ped.angle) * 12, 2 + Math.sin(ped.angle) * 0); ctx.stroke(); }
  ctx.restore();
  if (ped.kind === 'hostile' && !ped.dead) { // enemy marker: a red chevron and ring
    ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ped.x, ped.y, 14, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ff2d2d'; ctx.beginPath(); ctx.moveTo(ped.x - 6, ped.y - 24); ctx.lineTo(ped.x + 6, ped.y - 24); ctx.lineTo(ped.x, ped.y - 16); ctx.fill();
  }
  if (ped.health < 40 && !ped.dead) { ctx.fillStyle = '#c0392b'; ctx.fillRect(ped.x - 12, ped.y - 20, 24, 4); ctx.fillStyle = '#2ecc71'; ctx.fillRect(ped.x - 12, ped.y - 20, 24 * Math.max(0, ped.health) / 60, 4); }
}
function drawPlayer(ctx, G) {
  const p = G.player;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 4, 11, 7, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(4 + Math.cos(p.aimAngle) * 17, Math.sin(p.aimAngle) * 17); ctx.stroke(); // pistol
  ctx.fillStyle = '#ff8c42'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill(); // Rio's sunset shirt
  ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(1, 0, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#26221f'; ctx.beginPath(); ctx.arc(0, -1, 6, Math.PI * 0.9, Math.PI * 1.9); ctx.fill(); // hair cap
  ctx.restore();
  if (G.muzzle > 0) { ctx.fillStyle = 'rgba(255,220,120,0.9)'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.aimAngle) * 24, p.y + Math.sin(p.aimAngle) * 24, 7, 0, 7); ctx.fill(); }
}
function drawBulletsAndParticles(ctx, G) {
  ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2;
  for (const b of G.bullets) { ctx.beginPath(); ctx.moveTo(b.x - Math.cos(b.angle) * 10, b.y - Math.sin(b.angle) * 10); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
export { districtAt };
