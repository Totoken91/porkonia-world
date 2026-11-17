# Porkonia World : notes pour Claude

Répondre à Kenny en français, court (il lit sur téléphone). Envoyer les fichiers directement, jamais de zip.

## Direction artistique (validée par Kenny)
- Cartoon coloré « Porkonia 3D années 90 », pas de photoréalisme. Spectaculaire, plein de détails et de vie partout.
- Tout est calculé en code : aucune image IA, aucun modèle importé.
- Les citoyens viennent du citoyen standard `citizen.h` et les cochons à quatre pattes de `porc4.h` (dépôt Totoken91/Porkonia-Movie-Studio, dossier `moteur-3d/`). Ne pas redessiner ces personnages ; ne pas modifier le cochon à quatre pattes.
- Pas de design d'interface générique. L'interface actuelle (bordeaux et crème) est acceptée.
- Les trains restent dans le monde mais leur gameplay est mis de côté : priorité à la balade.
- Avant de livrer : regarder des images fixes et faire une passe d'autocritique.

## État (v9, 17 nov. 2026)
- 31 villes placées d'après l'atlas, tailles selon la population, quadrillage de rues, îlots (centre, faubourg, pavillons, place, parc, zone d'activité), 40 routes entre villes, voies ferrées avec un train autonome.
- Environ 44 000 accessoires, 2 700 voitures garées, 46 000 arbres, habitants et circulation autour du joueur.
- Trois réglages : Ultra, Haute, Économe (défaut sur tactile). Résolution adaptative.
- Mesures en Économe après la passe d'optimisation : 2,5 à 7 M de triangles et 180 à 700 appels de dessin par image. Jamais mesuré sur une vraie carte graphique.

## Ce que Kenny trouve encore moche ou manquant
1. Les bâtiments sont des boîtes à toit simple : il faut des volumes cartoon.
2. Aucune ville n'a l'identité de ses photos : pierre et tuiles, industrie alimentaire mêlée aux rues (alambics en cuivre, silos, cuves), tram, tours-soucoupes, téléphérique, brasserie fortifiée.
3. Villes à plat en quadrillage, pas étagées sur le relief.
4. Le cochon de monte paraît translucide et brillant ; pas de cavalier visible en vue extérieure.
5. Pas de son, pas de rivière, arbres et gares traversables, habitants jamais assis.
6. Porkopédia n'est pas encore intégrée (Kenny doit fournir un export).

## Pistes techniques pour la migration
- Passer à Vite avec des modules ES ; aujourd'hui les fichiers de `src/` partagent un seul espace global et l'ordre de concaténation compte.
- Charger les villes et les modèles à la demande au lieu de tout construire au démarrage.
- Douzi City est trois fois plus lourde que le reste : façades en morceaux de 350 m, arbres proches.
- Mesurer les images par seconde sur le téléphone de Kenny avant toute nouvelle passe visuelle.

## Tester sans écran
`python3 tools/shot.py <ultra|haute|mobile> <préfixe> <L> <H> "js1||js2" [prof]` ouvre `dist/index.html?pause` dans Chrome, exécute chaque expression, rend deux images et enregistre une capture. Avec un sixième argument, affiche triangles et appels de dessin. Aides disponibles dans la page : `aer(ville, dist, hauteur, angle, da, db)`, `pe.view(typeAccessoire, k, dist, h, angle)`, `pe.go(x, z, lacet, tangage)`. Ne pas écrire `||` à l'intérieur d'une expression.

## Pièges connus
- Linéariser les couleurs des feuilles (`linCol`).
- Appeler `computeBoundingSphere()` sur un maillage instancié avant `freeAfterUpload`.
- Tout maillage instancié couvrant le pays doit être découpé en tuiles et inscrit dans `PROPS.meshes` pour être masqué au loin.
- `cls.npy` vient de la carte météo de Porkonia ; `tools/terrain.py` écrit aussi `hF.npy` et `aoF.npy` (ignorés par git, régénérables).
