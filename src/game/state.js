// État partagé du jeu : partie en cours, commandes, horloge, balade

// ---------- état du jeu
export const game = {
  money: 1500, cap: 3, lvl: 0, horn: 'classique', slots: [null, null, null], offers: {}, offersAt: {}, now: 0,
  stoppedAt: -1, panelOpen: false, route: null, ff: 1, sound: true, voice: false, stats: { livraisons: 0, gains: 0, km: 0 },
  lastStation: 0, tickerT: 30, nextOverspeed: 0, started: false, routeReverseAt: -1, routeManual: false,
};

// ---------- commandes
export const input = { dragging: false, keys: {} };

export const clock = { simT: 0 };

// ---------- état de l'exploration
export const EX = {
  on: true, mode: 'pied', view: 'ext',
  P: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, bob: 0, run: false },
  // voiture : position, cap, vitesse dans le monde (vx, vz) et le long du cap (v), état du dérapage ; voir game/drive.js
  car: { x: 0, y: 0, z: 0, yaw: 0, v: 0, vx: 0, vz: 0, yawRate: 0, drift: false, pitch: 0, roll: 0, lean: 0, dive: 0, spin: 0, mesh: null, model: 'porkette', orbit: 0, orbitP: 0.24, lookY: 0, lookP: 0, steer: 0 },
  inp: { fx: 0, fz: 0, kx: 0, kz: 0, jx: 0, jz: 0, run: false, brake: false, kb: false, hb: false },
  city: -1, hudT: 0, saveT: 0,
  pig: { x: 0, y: 0, z: 0, yaw: 0, mesh: null, U: null, ph: 0, amp: 0 },
};
export const EX_SAVE = 'porkonia-explore-v1';
