# Feuille de route de Porkonia World

Mise à jour à chaque passe. Les cases cochées sont faites et vérifiées ; « en partie » dit ce qui manque.
Le détail technique et les mesures sont dans `CLAUDE.md`, la vision de Kenny dans `VISION.md`.

## 0. Socle (fait)
- [x] Mesures : triangles, appels de dessin, coût par famille d'objets.
- [x] Vite, modules ES, `engine/` `world/` `game/`, décor à la demande.
- [x] Hasard séparé par ville, lint, contrôle sans écran (`npm test`), CI, boucle tolérante aux pannes.

## 1. Ce qui était fragile
- [ ] Mesure sur un vrai téléphone : Kenny ouvre l'aperçu avec `?mesure` et envoie le tableau. Rien ne remplace ça.
- [ ] Triangles : alléger voitures, façades au loin, personnages au loin.
- [ ] Murs, toits, haies, murets : découpés par tuile et triés par la caméra, au lieu d'un maillage pour tout le pays.
- [ ] Téléportation : fabrication des tuiles étalée sur plusieurs images.
- [ ] Plan d'une ville calculé à l'approche (possible depuis les graines par ville).

## 2. Conduite
- [ ] Modèles de voitures cartoon calculés en code, plusieurs types, roues qui tournent et braquent.
- [ ] Physique : adhérence, dérapage au frein à main, contre-braquage, transfert de masse visible.
- [ ] Collisions : bâtiments, arbres, voitures, mobilier urbain qui vole.
- [ ] Cochons et citoyens renversés : ils volent, roulent, puis se relèvent.
- [ ] Sensations : caméra de poursuite, champ de vision à la vitesse, traces de pneus, fumée, poussière.
- [ ] Son : moteur, crissement, chocs, couinements (premier son du jeu).
- [ ] Commandes tactiles : frein à main.
- [ ] Plus tard : dégâts visibles, klaxon, radio, courses contre la montre, garage.

## 3. Paysage
- [ ] Bocage : champs en mosaïque (blé, colza, prairies, labours), haies, murets, clôtures.
- [ ] Routes de campagne plus étroites et plus claires, bas-côtés fleuris, alignements d'arbres.
- [ ] Lumière et ciel plus doux, lointains bleutés.
- [ ] Arbres plus ronds, plus cartoon.
- [ ] Petits charmes : fleurs, meules, calvaires, lavoirs, moulins, épouvantails, troupeaux.
- [ ] Rivières et ponts.
- [ ] Relief plus lisible : collines, villages perchés, routes en lacet.

## 4. Villes (liste de Kenny, `CLAUDE.md`)
- [ ] Bâtiments en volumes cartoon au lieu de boîtes.
- [ ] Identité par ville d'après les huit photos (pierre et tuiles, alambics, silos, tram, tours-soucoupes, téléphérique, brasserie fortifiée). Attribution des photos à valider par Kenny.
- [ ] Villes étagées sur le relief.
- [ ] Habitants assis, marchés, terrasses vivantes.

## 5. Personnages et monture
- [ ] Cochon de monte : rendu opaque et mat, cavalier visible en vue extérieure.
- [ ] Arbres et gares infranchissables à pied.

## 6. Contenu
- [ ] Porkopédia dans le jeu (attend l'export complet de Kenny).
- [ ] Jeu de conduite de train : garder en réserve ou retirer (décision de Kenny).
