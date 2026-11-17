# Feuille de route de Porkonia World

Mise à jour à chaque passe. Les cases cochées sont faites et vérifiées ; « en partie » dit ce qui manque.
Le détail technique et les mesures sont dans `CLAUDE.md`, la vision de Kenny dans `VISION.md`.

## 0. Socle (fait)
- [x] Mesures : triangles, appels de dessin, coût par famille d'objets.
- [x] Vite, modules ES, `engine/` `world/` `game/`, décor à la demande.
- [x] Hasard séparé par ville, lint, contrôle sans écran (`npm test`), CI, boucle tolérante aux pannes.

## 1. Ce qui était fragile
- [ ] Mesure sur un vrai téléphone : Kenny ouvre l'aperçu avec `?mesure` et envoie le tableau. Rien ne remplace ça.
- [x] Triangles, première passe : voitures 2,5 fois plus légères, façades allégées au-delà de 190 m (Économe) ou 260 m (Haute). Douzi City passe de 7,2 à 4,6 M de triangles dans la passe principale, la route de 1,3 à 0,9 M.
- [ ] Triangles, suite : personnages au loin (72 citoyens à 3 000 triangles), arbres, nombre d'appels de dessin (il a monté : 812 à Douzi).
- [x] Murs, toits, haies, murets : découpés par bloc de 1 024 m et triés par la caméra.
- [x] Téléportation : au plus 7 ms de fabrication de tuiles par image, le reste attend l'image suivante.
- [ ] Plan d'une ville calculé à l'approche (possible depuis les graines par ville).

## 2. Conduite (première version faite, à régler en jouant)
- [x] Quatre modèles cartoon calculés en code (Porkette, Berline Groin, Fourgon du Marché, Bolide Truffe), roues qui tournent et braquent, chacun avec son caractère. Touche G pour en changer.
- [x] Physique : adhérence, dérapage au frein à main (Espace), contre-braquage, transfert de masse visible. En partie : réglée par simulation, jamais essayée manette ou doigts en main. À régler avec Kenny.
- [x] Collisions : bâtiments, arbres, rochers, gros objets ; mobilier, voitures garées et circulation s'envolent. En partie : haies et clôtures de ville se traversent encore, le train aussi.
- [x] Cochons et citoyens renversés : ils volent en gesticulant, roulent, puis se relèvent. En partie : c'est un corps rigide qui tournoie, pas un pantin articulé (le citoyen standard n'a pas de squelette).
- [x] Sensations : caméra de poursuite, champ de vision à la vitesse, traces de pneus, fumée, poussière, secousses, score de dérapage avec record.
- [x] Son : moteur, crissement, chocs, couinements, klaxon (H). En partie : synthétisé à l'aveugle, jamais écouté ; à régler à l'oreille.
- [x] Commandes tactiles : bouton frein à main.
- [ ] Plus tard : dégâts visibles, radio, courses contre la montre, garage, habitants qui s'écartent au klaxon.

## 3. Paysage (première passe faite)
- [x] Bocage : champs irréguliers partout en plaine (blé, colza, prairies, luzerne, labours, lavande, chaume), chemins de terre, haies en 3D sur les limites. Reste : murets, clôtures, barrières.
- [x] Routes de campagne plus claires, accotements sablés, ligne centrale discrète. Reste : bas-côtés fleuris, alignements d'arbres, chemins creux.
- [ ] Lumière et ciel plus doux, lointains bleutés. (Fait : le ciel n'affiche plus de grands pans faux à hauteur d'homme.)
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
