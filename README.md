# Porkonia World

Simulation 3D de Porkonia, le pays fictif de Kenny : on s'y balade à pied, en voiture (vue habitacle) ou à dos de cochon, entre 31 villes reliées par routes et voies ferrées. Tout est généré par le code, sans image IA ni modèle importé.

## Lancer

```sh
npm install
npm run dev       # développement : http://localhost:8080, rechargement à chaud
npm run build     # construit dist/ avec Vite
npm run serve     # sert dist/ sur http://localhost:8080
npm test          # lint, build et contrôle sans écran (démarrage, erreurs, empreinte du décor)
```

Le site est déployé par Vercel, qui lance `npm run build` lui-même : `dist/` n'est pas dans le dépôt. La branche `main` part en ligne directement.

Touches : ZQSD ou flèches, Maj courir, E voiture, P cochon, V vue, M carte. En voiture : Espace frein à main (dérapage), G changer de modèle, H klaxon. Sur téléphone : joystick à gauche, glisser à droite, bouton frein à main.

À ajouter à la fin de l'adresse :

- `?mesure` : mesure les images par seconde, les appels de dessin et les triangles sur l'appareil, à Douzi City, à Nouvelle Groin et sur une route de campagne, puis affiche un tableau.
- `?pause` : mode test, le jeu ne rend une image que sur demande (utilisé par `tools/shot.mjs`).

## Arborescence

- `index.html` : la page et son interface.
- `src/` : le jeu, en modules ES sans dépendance circulaire.
  - `engine/` : le moteur (rendu, lumière, textures, maillages à la demande).
  - `world/` : le décor (relief, villes, accessoires, végétation, routes, voies) et ses graines aléatoires.
  - `game/` : le jeu (balade, habitants, carte, sons, boucle d'image, démarrage, mode `?mesure`).
  - `main.js` est le point d'entrée, `data.js` télécharge les données, `style.css` porte l'interface.
- `data/` : `world2.js` (terrain, villes, voies), `cz.js` (citoyens et cochon), en modules ES, et les entrées du générateur (`cls.npy`, `cities.json`, `pop.json`).
- `tools/` : `check.mjs` (contrôle sans écran), `shot.mjs` (captures et profilage), `diff.py` (compare deux séries de captures), `terrain.py` (régénère `world2.js`).
- `bake/` : cuisson des citoyens et du cochon depuis des champs de distance (`cz.c`, `bake.py`). Les voitures sont calculées en jeu (`src/world/cars.js`).

Voir `ROADMAP.md` pour la feuille de route et `CLAUDE.md` pour l'état du projet et les règles.
