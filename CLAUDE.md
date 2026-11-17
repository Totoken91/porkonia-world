# Porkonia World : notes pour Claude

Répondre à Kenny en français, court (il lit sur téléphone). Envoyer les fichiers directement, jamais de zip.

Lire `VISION.md` avant toute passe visuelle : la vision de Kenny dans ses mots, la description de ses photos de référence et ce qui manque encore.

## Direction artistique (validée par Kenny)
- Cartoon coloré « Porkonia 3D années 90 », pas de photoréalisme. Spectaculaire, plein de détails et de vie partout.
- Tout est calculé en code : aucune image IA, aucun modèle importé.
- Les citoyens viennent du citoyen standard `citizen.h` et les cochons à quatre pattes de `porc4.h` (dépôt Totoken91/Porkonia-Movie-Studio, dossier `moteur-3d/`). Ne pas redessiner ces personnages ; ne pas modifier le cochon à quatre pattes.
- Pas de design d'interface générique. L'interface actuelle (bordeaux et crème) est acceptée.
- Les trains restent dans le monde mais leur gameplay est mis de côté : priorité à la balade.
- Avant de livrer : regarder des images fixes et faire une passe d'autocritique.

## État (v9 migrée, 17 nov. 2026)
- 31 villes placées d'après l'atlas, tailles selon la population, quadrillage de rues, îlots (centre, faubourg, pavillons, place, parc, zone d'activité), 40 routes entre villes, voies ferrées avec un train autonome.
- Environ 44 000 accessoires, 2 700 voitures garées, 46 000 arbres, habitants et circulation autour du joueur.
- Trois réglages : Ultra, Haute, Économe (défaut sur tactile). Résolution adaptative.
- Projet sous Vite, modules ES, décor fabriqué à la demande (voir « Architecture »). Vercel fait le build ; `dist/` n'est plus dans le dépôt.
- Étapes 1 (mesure), 2 (migration sans changement visuel) et consolidation du moteur terminées. Étape suivante : la liste ci-dessous, en commençant par les bâtiments.

## Ce que Kenny trouve encore moche ou manquant
1. Les bâtiments sont des boîtes à toit simple : il faut des volumes cartoon.
2. Aucune ville n'a l'identité de ses photos : pierre et tuiles, industrie alimentaire mêlée aux rues (alambics en cuivre, silos, cuves), tram, tours-soucoupes, téléphérique, brasserie fortifiée.
3. Villes à plat en quadrillage, pas étagées sur le relief.
4. Le cochon de monte paraît translucide et brillant ; pas de cavalier visible en vue extérieure.
5. Pas de son, pas de rivière, arbres et gares traversables, habitants jamais assis.
6. Porkopédia n'est pas encore intégrée (Kenny doit fournir un export).

## Architecture
`src/` : modules ES sans dépendance circulaire, en trois dossiers. Un module n'importe que plus bas que lui ; si un module bas a besoin d'un module haut, passer par un écouteur (`TIME_LISTENERS`, `mapState.draw`), jamais par un import à l'envers.
- `engine/` (moteur, ne connaît pas le contenu de Porkonia) : `util`, `quality`, `renderer`, `textures`, `lighting`, `lazy` (maillages à la demande), `geo`.
- `world/` (le décor) : `land` (relief, gares), `terrain`, `water`, `seeds`, `registry`, `tracks`, `cities` (table des 31 villes), `scenery`, `assets`, `props`, `towns`, `landmarks`, `creatures`, `vegetation`, `ambiance`, `roads`, `world` (assemble le tout), `signature`.
- `game/` (le jeu) : `state`, `train`, `ui`, `npc`, `explore` (la balade), `audio`, `map`, `hud`, `loop`, `debug` (`window.__pe`), `boot`, `mesure`, et `railgame` : le jeu de conduite de train, en sommeil (il ne tourne que si `EX.on` est faux). Ne pas le supprimer sans l'accord de Kenny.

Règles du moteur :
- Hasard (`world/seeds.js`) : chaque ville et chaque phase du décor a son générateur. Modifier une ville ne déplace plus les autres. Les graines actuelles reproduisent le décor de la v9 : ne pas les recalculer. Dans une ville, ajouter un tirage décale encore la suite de cette ville.
- Décor à la demande (`engine/lazy.js`, `lazyShow`) : accessoires, voitures garées, éléments de façade et arbres ne gardent que la liste de leurs instances par tuile. Le maillage est fabriqué à la première apparition et libéré au loin. Les éléments de façade sont recalculés par tuile depuis les bâtiments.
- Encore construit au démarrage : le plan des 31 villes, murs et toits (un seul maillage pour tout le pays), sols des villes, gares, monuments, train, textures.
- Une erreur dans une image ne fige pas le jeu (`game/loop.js`) ; une erreur durable ou la perte de la carte graphique affiche un message (`fatal`).

Avant de pousser : `npm test` (lint, build, puis contrôle sans écran : démarrage dans les trois réglages, aucune erreur, empreinte du décor, aller-retour ville-route, panne injectée). Si le décor change exprès : `npm run check -- --update`, et le dire dans le commit. La CI GitHub lance lint et build.

À faire dès que les bâtiments s'alourdissent (étape suivante) : découper murs et toits par ville ou par tuile, comme les façades. Aujourd'hui ce sont des boîtes de 12 triangles et un seul maillage suffit ; avec des volumes cartoon, non.

## Mesures (17 nov. 2026, Chrome sans carte graphique, 1280 × 720)
Les images par seconde n'ont toujours pas été mesurées sur une vraie carte graphique : ce conteneur n'en a pas (rendu logiciel, moins de 2 images par seconde, sans valeur). Kenny doit ouvrir le jeu avec `?mesure` sur son téléphone et envoyer le tableau.

Par image, identique avant et après migration (l'image n'a pas changé) :

| | Douzi City | Nouvelle Groin | Route de campagne |
|---|---|---|---|
| Économe | 7,9 M triangles, 661 appels | 4,0 M, 338 | 1,6 M, 338 |
| Haute | 11,1 M, 831 | 5,8 M, 418 | 2,5 M, 429 |
| Ultra | 18,4 M, 1 168 | 9,2 M, 554 | 6,4 M, 1 112 (dont reflets 4,0 M, 566) |

Ce que la migration a changé, en Économe :

| | Avant | Après |
|---|---|---|
| Calcul JavaScript par image (médiane) : Douzi, Nouvelle Groin, route | 18,7 / 14,3 / 13,2 ms | 11,1 / 8,9 / 7,0 ms |
| Objets dans la scène | 16 477 | environ 3 000 |
| Instances en mémoire | 560 000 | 64 000 à 140 000 |
| Mémoire JavaScript après démarrage | 337 Mo | 266 Mo |
| Démarrage complet | 11,5 s | 11,1 s |

Ce qui coûte le plus cher (Économe, passe principale) :
1. Éléments de façade : 3,8 M de triangles à Douzi City, soit 52 % de l'image (47 000 fenêtres, volets, portes à 66-180 triangles pièce).
2. Arbres : 16 % des triangles à Douzi, 38 % à Nouvelle Groin, et le premier poste d'appels de dessin (88 à 134).
3. Maillages jamais triés pour tout le pays (`frustumCulled = false`) : murs, toits, haies, murets, soit 380 000 triangles dessinés partout, même en rase campagne (30 % de l'image sur la route), et une seconde fois dans les ombres.
4. Personnages et voitures : 72 citoyens à 3 000 triangles, voitures à 6 350 triangles.
5. Démarrage : textures (3,8 s) et masque des voies (3 s) ; le décor ne pèse que 2,2 s.
6. Ultra : les reflets de l'eau redessinent toute la scène (4 M de triangles sur la route).

Pistes non faites (elles changeraient l'image ou demandent l'avis de Kenny) : niveaux de détail pour les façades, découper murs et toits par ville, alléger citoyens et voitures au loin, calculer le plan d'une ville seulement à l'approche (possible depuis que chaque ville a sa graine), étaler la fabrication des tuiles sur plusieurs images.

## Tester sans écran
`npm run build` puis `node tools/shot.mjs <ultra|haute|mobile> <préfixe> <L> <H> "js1||js2" [prof]` : sert `dist/`, ouvre la page avec `?pause` dans Chrome, exécute chaque expression, rend deux images et enregistre une capture. Avec un sixième argument, affiche triangles et appels de dessin. Aides disponibles dans la page : `aer(ville, dist, hauteur, angle, da, db)`, `pe.view(typeAccessoire, k, dist, h, angle)`, `pe.go(x, z, lacet, tangage)`, `pe.LAZY` (tuiles en mémoire). Ne pas écrire `||` à l'intérieur d'une expression.

Vérifier qu'un changement ne modifie pas l'image : lancer la même série de vues avant et après avec `SHOT_FIXE=1` (horloge et hasard figés ; `SHOT_URL=…` vise une autre version déjà servie), puis `python3 tools/diff.py <dossierAvant> <dossierAprès>`. La migration et la consolidation ont été validées ainsi, contre la version d'origine.

## Pièges connus
- Linéariser les couleurs des feuilles (`linCol`).
- Appeler `computeBoundingSphere()` sur un maillage instancié avant `freeAfterUpload`.
- Tout maillage instancié couvrant le pays doit être découpé en tuiles et inscrit dans `PROPS.meshes` pour être masqué au loin.
- `cls.npy` vient de la carte météo de Porkonia ; `tools/terrain.py` écrit aussi `hF.npy` et `aoF.npy` (ignorés par git, régénérables).
- Un maillage à la demande doit recevoir son rang de dessin à l'inscription (`lazyRankStart`, `lazyRank`) : à matériau et profondeur égaux, three.js dessine dans l'ordre de création.
- `registerFarCull` (dans `game/loop.js`) ignore les objets invisibles au moment où il s'exécute : ne rien masquer avant lui pendant le démarrage, sinon la distance d'affichage de ces objets change.
- three.js tire au hasard l'identifiant de chaque objet créé : dans une capture figée, créer plus ou moins d'objets décale le hasard des habitants. `tools/shot.mjs` remet la graine à chaque image pour cette raison.
