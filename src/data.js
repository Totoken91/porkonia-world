// Données lourdes (relief, citoyens) : deux modules à part, téléchargés en parallèle dès le lancement.
export const worldData = import('../data/world2.js').then(m => m.default);
export const czData = import('../data/cz.js').then(m => m.default);
