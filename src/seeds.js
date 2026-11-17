// Générateurs aléatoires du décor : un par ville et par phase, pour que modifier une ville ne déplace rien ailleurs.
//
// Jusqu'à la v9, tout le pays tirait dans un seul générateur : ajouter un banc à Douzi City décalait les trente
// autres villes, les fermes et les forêts. Pour séparer les phases sans rien changer à l'image, chacune repart du
// point exact où l'ancien générateur unique en était quand elle commençait (nombre de tirages déjà consommés).
// Ces nombres sont figés ci-dessous : ne pas les recalculer. Une phase ou une ville nouvelle n'a pas d'entrée et
// reçoit une graine tirée de son nom.
import { mulberry, hashStr, QKEY } from './core.js';

const GRAINE_V9 = 1212, PAS = 0x6D2B79F5;
const apres = n => mulberry((GRAINE_V9 + Math.imul(n, PAS)) | 0);

const MONUMENTS = {
  "Truffe-sur-Neige": 0,
  "Nouvelle Groin": 4,
  "Lard-sur-Mer": 6,
  "Bièreval": 28,
  "Côte-Rib": 30,
  "Port-Cochon": 32,
  "Saint-Jambon": 37,
  "Val-Lardon": 45,
  "Lardombre": 47,
  "Biermont": 51,
  "Douzi City": 57,
  "Groinkbourg": 64,
  "Hamelot": 69,
  "Saucissonnia": 78,
  "Charcuta": 82,
  "Porcinia": 84,
  "Rôtiville": 88,
  "Porcheville": 90,
  "Lardonville": 93,
  "Saint-Grill": 98,
  "Fumeterre": 106,
  "Brassefort": 108,
  "Groin-des-Champs": 117,
  "Salais-sur-Feu": 119,
  "Verres-en-Vallée": 121,
  "Jambonneau": 123,
  "Belle-Côte": 128,
  "Grasset Occidental": 202,
  "Lardanne": 358,
  "Porcalis": 360,
  "Grasset du Cap Goustru": 366,
};
const VILLES = {
  "Truffe-sur-Neige": 752,
  "Nouvelle Groin": 1539,
  "Lard-sur-Mer": 14150,
  "Bièreval": 21776,
  "Côte-Rib": 26410,
  "Port-Cochon": 28528,
  "Saint-Jambon": 40644,
  "Val-Lardon": 47767,
  "Lardombre": 52121,
  "Biermont": 54531,
  "Douzi City": 64511,
  "Groinkbourg": 160644,
  "Hamelot": 170768,
  "Saucissonnia": 174071,
  "Charcuta": 186056,
  "Porcinia": 196655,
  "Rôtiville": 207480,
  "Porcheville": 214240,
  "Lardonville": 219736,
  "Saint-Grill": 226344,
  "Fumeterre": 227307,
  "Brassefort": 230177,
  "Groin-des-Champs": 236185,
  "Salais-sur-Feu": 238940,
  "Verres-en-Vallée": 240865,
  "Jambonneau": 247865,
  "Belle-Côte": 255519,
  "Grasset Occidental": 265456,
  "Lardanne": 268980,
  "Porcalis": 271397,
  "Grasset du Cap Goustru": 274515,
};
const PHASES = {
  "fermes": 278215,
  "campagne": 280429,
  "troupeaux": 301032,
  "forets": 314978,
};
// après les forêts, dont la densité dépend du réglage de qualité
const PHASES_PAR_REGLAGE = {
  foin: {"mobile": 6694780, "haute": 6792445, "ultra": 6856260},
  oiseaux: {"mobile": 6736929, "haute": 6833951, "ultra": 6899377},
};

const de = (table, cle, nom) => table[cle] !== undefined ? apres(table[cle]) : mulberry(hashStr(nom + ':' + cle));
export const rngMonuments = ville => de(MONUMENTS, ville, 'monuments');
export const rngVille = ville => de(VILLES, ville, 'ville');
export const rngPhase = phase => PHASES_PAR_REGLAGE[phase] ? apres(PHASES_PAR_REGLAGE[phase][QKEY]) : de(PHASES, phase, 'phase');
