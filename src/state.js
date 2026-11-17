// État partagé du jeu : partie en cours, commandes, horloge de simulation

// ---------- état du jeu
export const game = {
  money: 1500, cap: 3, lvl: 0, horn: 'classique', slots: [null, null, null], offers: {}, offersAt: {}, now: 0,
  stoppedAt: -1, panelOpen: false, route: null, ff: 1, sound: true, voice: false, stats: { livraisons: 0, gains: 0, km: 0 },
  lastStation: 0, tickerT: 30, nextOverspeed: 0, started: false, routeReverseAt: -1, routeManual: false,
};

// ---------- commandes
export const input = { dragging: false, keys: {} };

export const clock = { simT: 0 };
