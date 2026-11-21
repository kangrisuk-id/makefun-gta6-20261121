// HUD and minimap: cash, health, wanted stars, weapon, objective, phone, district, speed.
import { WORLD, ROAD_X, ROAD_Y, districtAt } from './city-map.js';
import { missionTarget, objectiveText, currentMission } from './missions-story.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12,14,26,0.88)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,110,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}
export function drawHUD(ctx, G, W, H) {
  ctx.textAlign = 'left';
  // Top-left: cash, health, respect.
  panel(ctx, 14, 14, 252, 86);
  ctx.fillStyle = '#7dff9a'; ctx.font = 'bold 24px system-ui'; ctx.fillText(`$${G.cash.toLocaleString('en-US')}`, 26, 44);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 12px system-ui'; ctx.fillText(`RESPECT ★ ${G.respect}`, 160, 44);
  ctx.fillStyle = '#3a0f16'; ctx.fillRect(26, 56, 224, 13);
  ctx.fillStyle = G.player.health > 30 ? '#e8435f' : '#ff2222'; ctx.fillRect(26, 56, 224 * Math.max(0, G.player.health) / 100, 13);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.fillText('HEALTH', 26, 66);
  ctx.fillStyle = '#cfe6ff'; ctx.font = '12px system-ui';
  ctx.fillText(G.player.car ? `IN CAR · ${G.player.car.kind === 'police' ? 'POLICE CRUISER' : 'VEHICLE'}` : 'ON FOOT', 26, 90);
  // Top-right: wanted stars + weapon.
  panel(ctx, W - 266, 14, 252, 86);
  ctx.font = '26px system-ui'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < G.wanted ? '#ffd21f' : 'rgba(255,255,255,0.22)'; ctx.fillText('★', W - 34 - i * 30, 46); }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
  ctx.fillText(G.player.car ? '—' : `PISTOL  ${G.reloading ? 'RELOADING…' : `${G.ammo} / ∞`}`, W - 26, 68);
  ctx.fillStyle = '#ffb3ba'; ctx.font = '11px system-ui';
  ctx.fillText(G.wanted > 0 ? 'POLICE IN PURSUIT' : 'No heat', W - 26, 88);
  ctx.textAlign = 'left';
  // Objective panel (top centre).
  const m = currentMission(G);
  panel(ctx, W / 2 - 250, 14, 500, 58);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(m ? m.title.toUpperCase() : 'PALMERA BAY — FREE ROAM', W / 2, 36);
  ctx.fillStyle = '#fff'; ctx.font = '13px system-ui';
  ctx.fillText(objectiveText(G), W / 2, 58);
  ctx.textAlign = 'left';
  // Phone messages.
  const msg = G.phone[0];
  if (msg && G.phoneT > 0) {
    panel(ctx, W - 300, 112, 286, 74);
    ctx.fillStyle = '#7dd7ff'; ctx.font = 'bold 11px system-ui'; ctx.fillText(`📱 ${msg.from}`, W - 286, 132);
    ctx.fillStyle = '#eef4ff'; ctx.font = '12px system-ui'; wrapText(ctx, msg.text, W - 286, 150, 258, 15);
  }
  // Banner.
  if (G.banner && G.banner.t > 0) {
    ctx.fillStyle = 'rgba(10,8,20,0.78)'; ctx.fillRect(0, H * 0.30, W, 86);
    ctx.fillStyle = '#ffd21f'; ctx.font = 'bold 34px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(G.banner.title, W / 2, H * 0.30 + 40);
    ctx.fillStyle = '#fff'; ctx.font = '16px system-ui'; ctx.fillText(G.banner.sub, W / 2, H * 0.30 + 68);
    ctx.textAlign = 'left';
  }
  // Bottom-right: district + speed.
  panel(ctx, W - 216, H - 64, 202, 50);
  ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'right';
  ctx.fillText(districtAt(G.player.x, G.player.y), W - 28, H - 40);
  ctx.fillStyle = '#fff'; ctx.font = '12px system-ui';
  ctx.fillText(G.player.car ? `${Math.round(Math.abs(G.player.car.speed) * 0.36)} km/h` : 'WASD move · E car · Click shoot', W - 28, H - 22);
  ctx.textAlign = 'left';
  // Direction arrow to target at screen edge of view.
  drawObjectiveArrow(ctx, G, W, H);
  drawMinimap(ctx, G, 14, H - 178, 226, 150);
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW) { ctx.fillText(line, x, yy); line = ''; yy += lh; if (yy > y + lh * 2) { ctx.fillText(line + '…', x, yy); return; } }
    line += w + ' ';
  }
  ctx.fillText(line, x, yy);
}
function drawObjectiveArrow(ctx, G, W, H) {
  const t = missionTarget(G); if (!t || G.screen !== 'play') return;
  const dx = t.x - G.player.x, dy = t.y - G.player.y, d = Math.hypot(dx, dy);
  if (d < 130) return;
  const a = Math.atan2(dy, dx);
  const cx = W / 2 + Math.cos(a) * 120, cy = H / 2 + Math.sin(a) * 120;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
  ctx.fillStyle = '#ffcd3c'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffcd3c'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(d / 10)}m`, cx, cy - 18); ctx.textAlign = 'left';
}
function drawMinimap(ctx, G, x, y, w, h) {
  ctx.save();
  panel(ctx, x - 4, y - 4, w + 8, h + 24);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip();
  ctx.fillStyle = '#2c3e50'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1d7fb8'; ctx.fillRect(x + w * (3370 / WORLD.w), y, w * (230 / WORLD.w), h); // ocean
  ctx.fillStyle = '#f2d492'; ctx.fillRect(x + w * (3180 / WORLD.w), y, w * (190 / WORLD.w), h);
  ctx.strokeStyle = '#e8e2cf'; ctx.lineWidth = 2;
  for (const rx of ROAD_X) { ctx.beginPath(); ctx.moveTo(x + w * rx / WORLD.w, y); ctx.lineTo(x + w * rx / WORLD.w, y + h); ctx.stroke(); }
  for (const ry of ROAD_Y) { ctx.beginPath(); ctx.moveTo(x, y + h * ry / WORLD.h); ctx.lineTo(x + w, y + h * ry / WORLD.h); ctx.stroke(); }
  const px = (wx) => x + w * wx / WORLD.w, py = (wy) => y + h * wy / WORLD.h;
  for (const car of G.cars) if (car.kind === 'police') { ctx.fillStyle = Math.floor(G.time * 4) % 2 ? '#ff4040' : '#4080ff'; ctx.fillRect(px(car.x) - 2, py(car.y) - 2, 5, 5); }
  const t = missionTarget(G);
  if (t) { ctx.fillStyle = '#ffcd3c'; ctx.beginPath(); ctx.arc(px(t.x), py(t.y), 5 + Math.sin(G.time * 5) * 1.5, 0, 7); ctx.fill(); }
  for (const car of G.cars) if (car.isTarget) { ctx.fillStyle = '#ffd700'; ctx.fillRect(px(car.x) - 3, py(car.y) - 3, 6, 6); }
  // Player arrow.
  ctx.save(); ctx.translate(px(G.player.x), py(G.player.y)); ctx.rotate(G.player.car ? G.player.car.angle : G.player.aimAngle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.fill(); ctx.restore();
  ctx.restore();
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 10px system-ui'; ctx.fillText('PALMERA BAY', x + 2, y + h + 15);
}
