// The story of Palmera Bay: courier Rio Solano takes one last chain of jobs for fixer Marisol Vega.
// Five missions in order, phone messages, markers and payouts; then repeatable free-roam deliveries.
import { dist } from './random.js';

export const STORY_INTRO = [
  { from: 'MARISOL', text: 'Rio? It\'s Marisol. I have work — real money. Meet me at the Loma pier. Come on foot, look casual.' },
  { from: 'RIO', text: 'Last time you said that, I swam home. …Fine. On my way.' },
];
export const MISSIONS = [
  { id: 'meet', title: '1 · First Light', objective: 'Meet Marisol at the Loma pier',
    target: { x: 3300, y: 1180 }, radius: 70, reward: 150,
    phone: { from: 'MARISOL', text: 'Good, you came. A coral-red coupe is parked by the Old Market — bring it to the Solano garage. Quietly.' },
    done: 'Marisol met. She has a job for you.' },
  { id: 'steal', title: '2 · Coral Coupe', objective: 'Steal the coral-red coupe and deliver it to the Solano garage',
    target: null, radius: 60, reward: 600,
    phone: { from: 'MARISOL', text: 'Nice driving. Next: four courier packs got scattered across town. Grab them all, fast.' },
    done: 'Coupe delivered to the garage.' },
  { id: 'packages', title: '3 · Scattered Packs', objective: 'Collect the courier packages (0/4)',
    target: null, radius: 46, reward: 800,
    phone: { from: 'MARISOL', text: 'That\'s all four. Rio — the packs were bait. The police are onto you. Lose them. NOW.' },
    done: 'All packages collected!' },
  { id: 'escape', title: '4 · Lose the Heat', objective: 'Escape the police — break their line of sight and stay hidden',
    target: null, radius: 0, reward: 500,
    phone: { from: 'MARISOL', text: 'You\'re clear. One last thing: the Vega crew is waiting at the warehouse. End it, then drive to the pier.' },
    done: 'You lost the police.' },
  { id: 'finale', title: '5 · Last Run on the Bay', objective: 'Clear the warehouse, then escape to the pier',
    target: { x: 1850, y: 1620 }, radius: 320, reward: 5000,
    phone: { from: 'MARISOL', text: 'It\'s done, Rio. The bay is yours again. Free as the tide — I\'ll call when there\'s more work.' },
    done: 'STORY COMPLETE — Palmera Bay is yours.' },
];
export const PACKAGE_SPOTS = [
  { x: 1440, y: 470 }, { x: 620, y: 840 }, { x: 2210, y: 1400 }, { x: 1440, y: 2140 },
];
export function currentMission(G) { return G.storyDone ? null : MISSIONS[G.missionIndex]; }
export function missionTarget(G) {
  const m = currentMission(G); if (!m) return G.sideJob;
  if (m.id === 'steal') return G.phase === 'deliver' ? { x: 560, y: 1680 } : (G.targetCar ? { x: G.targetCar.x, y: G.targetCar.y } : null);
  if (m.id === 'packages') return G.packages.find(p => !p.got) ?? null;
  if (m.id === 'escape') return null;
  if (m.id === 'finale') return G.phase === 'getaway' ? { x: 3300, y: 1180 } : m.target;
  return m.target;
}
export function objectiveText(G) {
  const m = currentMission(G);
  if (!m) return G.sideJob ? `Side job: deliver the pack to ${G.sideJob.name} — $${G.sideJob.pay}` : 'Free roam — find a glowing pack for a side job, or just cruise Palmera Bay';
  if (m.id === 'steal') return G.phase === 'deliver' ? 'Deliver the coral coupe to the Solano garage (gold marker)' : 'Steal the coral-red coupe near the Old Market (gold car)';
  if (m.id === 'packages') return `Collect the courier packages (${G.packages.filter(p => p.got).length}/4)`;
  if (m.id === 'finale' && G.phase === 'getaway') return 'Getaway! Drive to the Loma pier';
  if (m.id === 'finale') return `Clear the warehouse crew (${G.hostilesLeft} left)`;
  return m.objective;
}
export function completeMission(G) {
  const m = currentMission(G); if (!m) return;
  G.cash += m.reward; G.respect += 1;
  G.banner = { title: 'MISSION COMPLETE', sub: `${m.title}  ·  +$${m.reward}`, t: 3.4 };
  G.phone.push(m.phone); G.events.push('missionDone');
  G.missionIndex += 1; G.phase = 'start';
  if (m.id === 'packages') { G.addWanted(3, 'The packs were bait — police ambush!'); }
  if (G.missionIndex >= MISSIONS.length) { G.storyDone = true; G.missionIndex = MISSIONS.length - 1; }
  G.saveSoon = true;
}
export function updateMission(G, dt) {
  const m = currentMission(G); if (!m) { updateSideJob(G); return; }
  const p = G.player;
  if (m.id === 'meet' && dist(p.x, p.y, m.target.x, m.target.y) < m.radius) completeMission(G);
  else if (m.id === 'steal') {
    if (G.phase === 'start' && p.car && p.car.isTarget) { G.phase = 'deliver'; G.banner = { title: 'CAR ACQUIRED', sub: 'Take it to the Solano garage', t: 2.4 }; }
    if (G.phase === 'deliver' && p.car && p.car.isTarget && dist(p.x, p.y, 560, 1680) < 90) {
      p.car.isTarget = false; completeMission(G);
    }
  } else if (m.id === 'packages') {
    for (const pack of G.packages) if (!pack.got && dist(p.x, p.y, pack.x, pack.y) < m.radius) {
      pack.got = true; G.events.push('pickup'); G.banner = { title: 'PACKAGE', sub: `${G.packages.filter(x => x.got).length} of 4 collected`, t: 1.6 };
    }
    if (G.packages.every(x => x.got)) completeMission(G);
  } else if (m.id === 'escape') {
    if (G.wanted === 0) completeMission(G);
  } else if (m.id === 'finale') {
    if (G.phase === 'start' && dist(p.x, p.y, m.target.x, m.target.y) < m.radius) {
      G.phase = 'fight'; G.spawnFinaleHostiles(); G.banner = { title: 'AMBUSH', sub: 'Clear the warehouse crew!', t: 2.4 };
    } else if (G.phase === 'fight' && G.hostilesLeft <= 0) {
      G.phase = 'getaway'; G.addWanted(2, 'Shots fired at the warehouse'); G.banner = { title: 'GETAWAY', sub: 'Lose yourself — then reach the pier', t: 2.4 };
    } else if (G.phase === 'getaway' && dist(p.x, p.y, 3300, 1180) < 90) completeMission(G);
  }
}
function updateSideJob(G) {
  if (!G.sideJob) {
    if (G.rng() < 0.004) {
      const spots = [{ x: 860, y: 500, name: 'Coral Heights' }, { x: 2600, y: 1760, name: 'Loma Beach' }, { x: 2020, y: 620, name: 'Downtown' }];
      G.sideJob = { ...spots[Math.floor(G.rng() * spots.length)], pay: 150 + Math.floor(G.rng() * 150) };
    }
    return;
  }
  if (dist(G.player.x, G.player.y, G.sideJob.x, G.sideJob.y) < 60) {
    G.cash += G.sideJob.pay; G.banner = { title: 'DELIVERY DONE', sub: `+$${G.sideJob.pay}`, t: 2.2 };
    G.events.push('missionDone'); G.sideJob = null; G.saveSoon = true;
  }
}
