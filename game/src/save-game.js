// localStorage save: cash, mission progress, story flag and player position.
const KEY = 'palmera-bay-vice-run.save.v1';
export function loadSave() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function storeSave(G) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: G.cash, missionIndex: G.missionIndex, storyDone: G.storyDone,
      x: Math.round(G.player.x), y: Math.round(G.player.y), respect: G.respect,
    }));
  } catch { /* private mode: play on without saving */ }
}
export function hasSave() { return loadSave() !== null; }
