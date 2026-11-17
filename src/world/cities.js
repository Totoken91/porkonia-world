// Les 31 villes : produits, taille, monuments, devise, population
import { clamp } from '../engine/util.js';
import { STATIONS } from './land.js';

export const PRODUITS = {
  voyageurs: { nom: 'Voyageurs', wagon: 'voyageurs', taux: 34 },
  biere: { nom: 'Fûts de Douzi Ambrée', wagon: 'futs', taux: 30 },
  citerne: { nom: 'Bière en citerne', wagon: 'citerne', taux: 32 },
  malt: { nom: "Malt d'orge", wagon: 'tremie', tint: [226, 190, 110], taux: 22 },
  vin: { nom: 'Vin des Grands Coteaux', wagon: 'futs', taux: 34 },
  truffes: { nom: 'Truffes des neiges', wagon: 'frigo', taux: 52 },
  raclette: { nom: 'Meules de raclette', wagon: 'frigo', taux: 30 },
  saucissons: { nom: 'Saucissons de minuit', wagon: 'frigo', taux: 31 },
  charcuterie: { nom: 'Charcuterie fine', wagon: 'frigo', taux: 33 },
  jambons: { nom: 'Jambons fumés', wagon: 'frigo', taux: 32 },
  lardons: { nom: 'Lardons', wagon: 'frigo', taux: 24 },
  porcelets: { nom: 'Porcelets (vivants, bavards)', wagon: 'porcs', taux: 40 },
  cereales: { nom: 'Céréales', wagon: 'tremie', tint: [232, 200, 90], taux: 20 },
  sel: { nom: 'Sel de la Frontière', wagon: 'tremie', tint: [245, 245, 245], taux: 21 },
  charbon: { nom: 'Charbon de bois', wagon: 'tremie', tint: [44, 40, 38], taux: 20 },
  chaises: { nom: 'Chaises de banquet niveau VI', wagon: 'chaises', taux: 28 },
  chopes: { nom: 'Chopes et verres (fragile)', wagon: 'couvert', taux: 36 },
  terminaux: { nom: 'Terminaux beiges', wagon: 'couvert', taux: 30 },
  cornichons: { nom: 'Cornichons homologués', wagon: 'couvert', taux: 25 },
  saindoux: { nom: 'Saindoux', wagon: 'citerne', taux: 26 },
  sauce: { nom: 'Sauce Douzi', wagon: 'citerne', taux: 31 },
  moutarde: { nom: 'Moutarde de Belle-Côte', wagon: 'couvert', taux: 27 },
  poisson: { nom: 'Poisson du port', wagon: 'frigo', taux: 29 },
  formulaires: { nom: 'Formulaires B77 (vierges)', wagon: 'couvert', taux: 26 },
  cotes: { nom: 'Côtes de porc', wagon: 'frigo', taux: 30 },
  frites: { nom: 'Frites de Lardombre', wagon: 'frigo', taux: 27 },
};
const META = {
  'Douzi City': { size: 5, prod: ['chaises', 'formulaires'], lm: ['palais', 'statue'], devise: 'Capitale. Sept terrasses, 11 400 tavernes.' },
  'Hamelot': { size: 4, prod: ['vin', 'jambons'], lm: ['chateau'], devise: 'Forteresse, tram et vignes de Stanley.' },
  'Port-Cochon': { size: 4, prod: ['poisson', 'sel'], lm: ['phare'], devise: 'Le port. Contrôle des bateaux très sérieux.' },
  'Nouvelle Groin': { size: 3, prod: ['terminaux', 'cereales'], lm: ['antenne'], devise: 'Ville nouvelle, câbles anciens.' },
  'Belle-Côte': { size: 3, prod: ['moutarde', 'poisson'], lm: ['phare', 'eglise'], devise: 'Côte est, moutarde forte.' },
  'Saucissonnia': { size: 3, prod: ['saucissons'], lm: ['fumoir', 'eglise'], devise: 'Ici, minuit dure un saucisson.' },
  'Bièreval': { size: 3, prod: ['biere', 'citerne'], lm: ['brasserie'], devise: 'Sur la Route du Malt.' },
  'Brassefort': { size: 3, prod: ['biere', 'malt'], lm: ['brasserie', 'chateau'], devise: 'Ville-brasserie fortifiée.' },
  'Biermont': { size: 2, prod: ['malt', 'biere'], lm: ['brasserie'], devise: 'Malterie de montagne.' },
  'Truffe-sur-Neige': { size: 2, prod: ['truffes', 'raclette'], lm: ['eglise'], montagne: true, devise: 'Neige, chalets, truffes.' },
  'Verres-en-Vallée': { size: 2, prod: ['chopes'], lm: ['eglise'], montagne: true, devise: 'Souffleurs de chopes.' },
  'Fumeterre': { size: 2, prod: ['jambons', 'charbon'], lm: ['fumoir'], devise: 'Ville de brumes aromatiques.' },
  'Lard-sur-Mer': { size: 2, prod: ['poisson', 'lardons'], lm: ['phare'], devise: 'Baie du Lard.' },
  'Val-Lardon': { size: 2, prod: ['lardons', 'cereales'], lm: ['moulin'], devise: 'Au bord de la rivière.' },
  'Porcheville': { size: 2, prod: ['porcelets'], lm: ['statue'], devise: 'Élevage et lac tranquille.' },
  'Groin-des-Champs': { size: 2, prod: ['cereales', 'porcelets'], lm: ['moulin'], devise: 'Grenier de la plaine centrale.' },
  'Jambonneau': { size: 2, prod: ['jambons'], lm: ['chope'], devise: 'Jambonneaux et quais venteux.' },
  'Côte-Rib': { size: 2, prod: ['cotes'], lm: ['phare'], devise: 'Au bout du viaduc de la baie.' },
  'Rôtiville': { size: 2, prod: ['charbon', 'cotes'], lm: ['fumoir'], devise: 'Entre deux lacs, un barbecue.' },
  'Saint-Jambon': { size: 3, prod: ['jambons', 'charcuterie'], lm: ['eglise'], devise: 'Le jambon y est consacré.' },
  'Lardanne': { size: 2, prod: ['lardons'], lm: ['chope'], devise: 'Plaine est.' },
  'Saint-Grill': { size: 2, prod: ['charbon'], lm: ['eglise', 'fumoir'], devise: 'Côte est, braises perpétuelles.' },
  'Charcuta': { size: 2, prod: ['charcuterie'], lm: ['fumoir'], devise: 'Charcutiers du nord-est.' },
  'Groinkbourg': { size: 3, prod: ['cornichons'], lm: ['statue'], devise: 'Capitale du cornichon homologué.' },
  'Porcinia': { size: 2, prod: ['porcelets'], lm: ['moulin'], devise: 'Bout du réseau, côté levant.' },
  'Salais-sur-Feu': { size: 2, prod: ['sel'], lm: ['fumoir'], devise: 'Sel et fumée sur la côte sud.' },
  'Grasset Occidental': { size: 2, prod: ['saindoux'], lm: ['chope'], devise: "L'un des deux Grasset." },
  'Grasset du Cap Goustru': { size: 1, prod: ['saindoux', 'poisson'], lm: ['phare'], devise: "L'autre Grasset, tout au bout." },
  'Porcalis': { size: 3, prod: ['sauce'], lm: ['eglise'], devise: 'Patrie de la Sauce Douzi.' },
  'Lardonville': { size: 2, prod: ['lardons', 'frites'], lm: ['chope'], devise: 'Façade ouest, pluie loyale.' },
  'Lardombre': { size: 2, prod: ['frites'], lm: ['moulin'], devise: 'Frites et poules Wi-Fi.' },
};
const CITY = {"Douzi City": {"pop": 2800000, "region": "Bassin central de la Mousse", "spec": "Administration, cuisines centrales, fret alimentaire", "lm": ["palais", "statue"]}, "Truffe-sur-Neige": {"pop": 18400, "region": "Terres Gelées du Groin", "spec": "Truffes sous serre, entretien des convois, bière de garde", "lm": ["eglise"]}, "Nouvelle Groin": {"pop": 192000, "region": "Lisière nord-ouest de la Forêt des Défenses", "spec": "Bois de construction, tonnellerie, quartier industriel", "lm": ["antenne"]}, "Lard-sur-Mer": {"pop": 118000, "region": "Baie du Lard", "spec": "Station maritime, cabotage, porc aux algues", "lm": ["phare"]}, "Bièreval": {"pop": 73000, "region": "Forêt des Défenses", "spec": "Brassage forestier, merrains et malt fumé", "lm": ["brasserie"]}, "Côte-Rib": {"pop": 17600, "region": "Côte occidentale", "spec": "Côtes de porc fumées, réparation des treuils", "lm": ["fumoir"]}, "Port-Cochon": {"pop": 346000, "region": "Baie du Lard", "spec": "Commerce maritime, entrepôts froids, douanes", "lm": ["phare", "statue"]}, "Saint-Jambon": {"pop": 129000, "region": "Forêt des Défenses", "spec": "Pèlerinage charcutier, hôtellerie, jambons de procession", "lm": ["eglise"]}, "Val-Lardon": {"pop": 97000, "region": "Vallée occidentale de la Mousse", "spec": "Navigation intérieure, logements ouvriers, maintenance", "lm": ["moulin"]}, "Biermont": {"pop": 214000, "region": "Vallée des Brasseurs", "spec": "Université brassicole, analyses, petites brasseries", "lm": ["brasserie", "chope"]}, "Lardonville": {"pop": 156000, "region": "Côte du Bacon", "spec": "Administration régionale, marchés couverts, fret côtier", "lm": ["statue"]}, "Saint-Grill": {"pop": 22400, "region": "Côte du Bacon", "spec": "Grilles, broches, métallurgie culinaire", "lm": ["fumoir"]}, "Fumeterre": {"pop": 88000, "region": "Comté du Grésil", "spec": "Fumage, séchage du bois, bière fumée", "lm": ["fumoir"]}, "Verres-en-Vallée": {"pop": 121000, "region": "Presqu’île de la Couenne et Plaines Grasses", "spec": "Verrerie, bouteilles, petits vignobles", "lm": ["chope"]}, "Grasset Occidental": {"pop": 44000, "region": "Presqu’île de la Couenne", "spec": "Pêche, petites conserveries, cabotage des archipels", "lm": ["phare"]}, "Groinkbourg": {"pop": 173000, "region": "Piémont des Monts du Porc", "spec": "Garnison, réparations routières, réserves alimentaires", "lm": ["chateau"]}, "Hamelot": {"pop": 66000, "region": "Monts du Jambon", "spec": "Fumoirs, brasseries, Grands Coteaux viticoles", "lm": ["chateau", "fumoir"]}, "Saucissonnia": {"pop": 231000, "region": "Nord-Est intérieur", "spec": "Boyaux alimentaires et techniques, saucisses, pompes", "lm": ["fumoir", "eglise"]}, "Rôtiville": {"pop": 142000, "region": "Monts du Jambon", "spec": "Bains, rôtis, récupération de chaleur des fours", "lm": ["fumoir"]}, "Porcheville": {"pop": 109000, "region": "Piémont oriental", "spec": "Halles à porches, maçonnerie et transit", "lm": ["statue"]}, "Charcuta": {"pop": 187000, "region": "Côte nord-est", "spec": "Découpe, emballage, exportation et design culinaire", "lm": ["antenne"]}, "Porcinia": {"pop": 264000, "region": "Façade orientale", "spec": "Tourisme balnéaire, hôtellerie, restauration portuaire", "lm": ["phare"]}, "Groin-des-Champs": {"pop": 32800, "region": "Plaines Grasses", "spec": "Élevage, aliments porcins, coopératives céréalières", "lm": ["moulin"]}, "Salais-sur-Feu": {"pop": 28600, "region": "Grande Prairie et bord du Lac des Rillettes", "spec": "Conserves de porc, autoclaves et chaleur géothermale", "lm": ["fumoir"]}, "Jambonneau": {"pop": 138000, "region": "Coteaux de la Bière", "spec": "Ambassades, congrès, houblon et bière diplomatique", "lm": ["statue", "chope"]}, "Lardanne": {"pop": 24700, "region": "Val Fumé", "spec": "Fumoirs, tuiles noires, vergers et jambon fumé", "lm": ["fumoir"]}, "Belle-Côte": {"pop": 203000, "region": "Mer de Porkonia", "spec": "Séjours balnéaires, port de plaisance, cuisine littorale", "lm": ["phare", "eglise"]}, "Porcalis": {"pop": 38400, "region": "Pâturages du Sud", "spec": "Élevage de plein air, jardins, pépinières et maltage", "lm": ["moulin"]}, "Grasset du Cap Goustru": {"pop": 47000, "region": "Cap Goustru", "spec": "Sel, réserves de secours, desserte du cap", "lm": ["phare"]}, "Brassefort": {"pop": 92000, "region": "Vallée des Brasseurs", "spec": "Brasseries fortifiées, chaudières et tonnellerie", "lm": ["brasserie", "chateau"]}, "Lardombre": {"pop": 12600, "region": "Lisière orientale de la Forêt des Défenses", "spec": "Salaisons en caves, marché nocturne et bière de cave", "lm": ["chope"]}};
for (const st of STATIONS) {
  const m = st.meta = META[st.name] || { size: 2, prod: ['cereales'], lm: [] };
  const c = CITY[st.name]; if (!c) continue;
  Object.assign(m, c);
  m.size = c.pop > 1e6 ? 5 : c.pop >= 135000 ? 4 : c.pop >= 60000 ? 3 : c.pop >= 25000 ? 2 : 1;
  m.R = c.pop > 1e6 ? 1000 : clamp(62 * Math.pow(c.pop / 1000, 0.33), 190, 460);
  m.montagne = st.name === 'Truffe-sur-Neige';
}
