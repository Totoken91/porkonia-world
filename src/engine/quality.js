// Réglages de qualité (Ultra, Haute, Économe)

// ---------- détection des capacités et niveau de qualité
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const QUALITIES = {
  ultra: { label: 'Ultra', pr: 2.0, shadow: 4096, shadowR: 220, shadowEvery: 1, grass: 64000, grassR: 78, treeNear: 520, cardR: 700, detailR: 700, propK: 1.2, treeMid: 2400, treeFar: 8000, reflect: 0.5, rays: true, msaa: 4, trees: 1.0, bloom: 1, partsLite: 0 },
  haute: { label: 'Haute', pr: 1.25, shadow: 2048, shadowR: 170, shadowEvery: 2, grass: 34000, grassR: 62, treeNear: 330, cardR: 520, detailR: 420, propK: 0.8, treeMid: 1700, treeFar: 4800, reflect: 0, rays: false, msaa: 2, trees: 0.85, bloom: 1, partsLite: 260 },
  mobile: { label: 'Économe', pr: 1.0, shadow: 1024, shadowR: 110, shadowEvery: 3, grass: 15000, grassR: 46, treeNear: 190, cardR: 260, detailR: 240, propK: 0.5, treeMid: 1100, treeFar: 3200, reflect: 0, rays: false, msaa: 0, trees: 0.6, bloom: 0, partsLite: 190 },
};
export let QKEY = (() => { try { return localStorage.getItem('porkonia-q3') || (IS_TOUCH ? 'mobile' : 'haute'); } catch (e) { return 'haute'; } })();
if (!QUALITIES[QKEY]) QKEY = 'haute';
export let Q = QUALITIES[QKEY];
