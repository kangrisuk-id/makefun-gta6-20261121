// Palmera Bay city generation: road grid, buildings, parks, beach, districts and spawn data.
import { mulberry32, randRange, randInt, pick } from './random.js';

export const WORLD = { w: 3600, h: 2400 };
export const ROAD_X = [280, 860, 1440, 2020, 2600, 3120];
export const ROAD_Y = [280, 840, 1400, 1960];
export const ROAD_HALF = 72;

const ROOFS = ['#e2725b','#d95d6a','#e8a15c','#c95b8f','#5ba8a0','#7a6fc0','#d9c27a','#b5654d','#4f83b8','#8fbf6f'];
const SIGNS = ['CAFÉ SOL','HOTEL MAR','PALM MALL','TACOS REY','CLUB NEON','GYM 24','BANCO AZUL','CINE LOMA','PIZZA MAR','SURF SHOP','AUTO FIX','DENTIST','LIBROS','FARMACIA','BAR LUNA','OFICINAS','MERCADO','TATTOO','JOYAS','PUERTO'];
const DISTRICTS = [
  { x: 0, y: 0, w: 1150, h: 1120, name: 'Coral Heights' },
  { x: 1150, y: 0, w: 1450, h: 1120, name: 'Downtown Palmera' },
  { x: 2600, y: 0, w: 1000, h: 1120, name: 'Marina Palms' },
  { x: 0, y: 1120, w: 1150, h: 1280, name: 'Solano Yards' },
  { x: 1150, y: 1120, w: 1450, h: 1280, name: 'Old Market' },
  { x: 2600, y: 1120, w: 1000, h: 1280, name: 'Loma Beach' },
];
export function districtAt(x, y) {
  if (x > 3260) return 'Palmera Shore';
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'Palmera Bay';
}
export function onRoad(x, y) {
  return ROAD_X.some(rx => Math.abs(x - rx) < ROAD_HALF) || ROAD_Y.some(ry => Math.abs(y - ry) < ROAD_HALF);
}
export function nearestRoadPoint(x, y) {
  let best = { x, y, d: 1e9 };
  for (const rx of ROAD_X) { const d = Math.abs(x - rx); if (d < best.d) best = { x: rx, y, d }; }
  for (const ry of ROAD_Y) { const d = Math.abs(y - ry); if (d < best.d) best = { x, y: ry, d }; }
  return best;
}

export function buildCity(seed = 7) {
  const rng = mulberry32(seed);
  const buildings = [], trees = [], lamps = [];
  const xEdges = [90, ...ROAD_X.flatMap(x => [x - ROAD_HALF - 26, x + ROAD_HALF + 26]), WORLD.w - 430];
  const yEdges = [90, ...ROAD_Y.flatMap(y => [y - ROAD_HALF - 26, y + ROAD_HALF + 26]), WORLD.h - 90];
  const blocks = [];
  for (let i = 0; i < xEdges.length - 1; i += 2) for (let j = 0; j < yEdges.length - 1; j += 2)
    blocks.push({ x: xEdges[i], y: yEdges[j], w: xEdges[i + 1] - xEdges[i], h: yEdges[j + 1] - yEdges[j] });
  let signIdx = 0;
  blocks.forEach((b, bi) => {
    if (b.w < 120 || b.h < 120) return;
    const kindRoll = rng();
    if (bi % 11 === 5) { // park block
      blocks[bi] = { ...b, kind: 'park' };
      for (let t = 0; t < 14; t++) trees.push({ x: randRange(rng, b.x + 30, b.x + b.w - 30), y: randRange(rng, b.y + 30, b.y + b.h - 30), r: randRange(rng, 13, 22), park: true });
      return;
    }
    if (bi % 13 === 7) { blocks[bi] = { ...b, kind: 'parking' }; return; }
    blocks[bi] = { ...b, kind: 'buildings' };
    const cols = b.w > 380 ? 2 : 1, rows = b.h > 380 ? 2 : 1;
    for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
      const pad = 16, bw = (b.w - pad * (cols + 1)) / cols, bh = (b.h - pad * (rows + 1)) / rows;
      buildings.push({
        x: b.x + pad + cx * (bw + pad), y: b.y + pad + cy * (bh + pad), w: bw, h: bh,
        color: pick(rng, ROOFS), floors: randInt(rng, 2, 9),
        sign: rng() < 0.55 ? SIGNS[signIdx++ % SIGNS.length] : '',
        shade: randRange(rng, 0.85, 1.1),
      });
    }
    void kindRoll;
  });
  // Palm trees line the streets and the beach.
  for (const rx of ROAD_X) for (let y = 60; y < WORLD.h - 40; y += 150) if (!onRoad(rx + 92, y)) trees.push({ x: rx + 92, y: y + randRange(rng, -18, 18), r: randRange(rng, 10, 15) });
  for (let y = 120; y < WORLD.h - 60; y += 110) trees.push({ x: randRange(rng, 3200, 3300), y, r: randRange(rng, 12, 18) });
  for (const rx of ROAD_X) for (const ry of ROAD_Y) lamps.push({ x: rx - ROAD_HALF - 8, y: ry - ROAD_HALF - 8 });
  const parked = [];
  const carColors = ['#e74c3c','#3498db','#f1c40f','#2ecc71','#ecf0f1','#9b59b6','#e67e22','#1abc9c','#fd79a8','#95a5a6'];
  for (const b of blocks.filter(b => b.kind === 'parking'))
    for (let i = 0; i < 5; i++) parked.push({ x: b.x + 40 + i * 62, y: b.y + b.h / 2, angle: Math.PI / 2, color: pick(rng, carColors), model: randInt(rng, 0, 2) });
  for (let i = 0; i < 26; i++) {
    const alongX = rng() < 0.5, road = alongX ? pick(rng, ROAD_Y) : pick(rng, ROAD_X);
    const t = randRange(rng, 140, (alongX ? WORLD.w : WORLD.h) - 500);
    parked.push(alongX
      ? { x: t, y: road - ROAD_HALF - 16, angle: 0, color: pick(rng, carColors), model: randInt(rng, 0, 2) }
      : { x: road - ROAD_HALF - 16, y: t, angle: Math.PI / 2, color: pick(rng, carColors), model: randInt(rng, 0, 2) });
  }
  return { buildings, trees, lamps, blocks, parked,
    hospital: { x: 860, y: 1960, label: 'Clínica del Sol' },
    garage: { x: 560, y: 1680 }, pier: { x: 3300, y: 1180 }, warehouse: { x: 1740, y: 1680 } };
}
export function circleHitsBuilding(city, x, y, r) {
  for (const b of city.buildings)
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  return null;
}
