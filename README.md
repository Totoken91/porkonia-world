# Porkonia World

Simulation 3D de Porkonia, le pays fictif de Kenny : on s'y balade à pied, en voiture (vue habitacle) ou à dos de cochon, entre 31 villes reliées par routes et voies ferrées. Tout est généré par le code, sans image IA ni modèle importé.

## Lancer

```sh
npm install
npm run dev       # développement : http://localhost:8080, rechargement à chaud
npm run build     # construit dist/ avec Vite
npm run serve     # sert dist/ sur http://localhost:8080
```

Le site est déployé par Vercel, qui lance `npm run build` lui-même : `dist/` n'est pas dans le dépôt. La branche `main` part en ligne directement.

Touches : ZQSD ou flèches, Maj courir, E voiture, P cochon, V vue, Espace frein, M carte. Sur téléphone : joystick à gauche, glisser à droite.

À ajouter à la fin de l'adresse :

- `?mesure` : mesure les images par seconde, les appels de dessin et les triangles sur l'appareil, à Douzi City, à Nouvelle Groin et sur une route de campagne, puis affiche un tableau.
- `?pause` : mode test, le jeu ne rend une image que sur demande (utilisé par `tools/shot.mjs`).

## Arborescence

- `index.html` : la page, ses styles et l'interface.
- `src/` : le jeu, en modules ES sans dépendance circulaire. Du plus bas au plus haut :
  `core` (rendu, terrain, eau), `registry` (registres du décor, tuiles à la demande), `state`, `tracks`, `scenery`, `assets` (citoyen, cochon, voiture), `props`, `towns`, `landmarks`, `creatures`, `vegetation`, `ambiance`, `roads`, `train`, `ui`, `explore`, `world` (assemble le décor), `game` (boucle et démarrage). `main.js` est le point d'entrée, `data.js` télécharge les données, `mesure.js` n'est chargé qu'avec `?mesure`.
- `data/` : `world2.js` (terrain, villes, voies), `cz.js` (citoyens et cochon), `car.js` (voiture), en modules ES, et les entrées du générateur (`cls.npy`, `cities.json`, `pop.json`).
- `tools/` : `shot.mjs` (captures et profilage sans écran), `diff.py` (compare deux séries de captures), `terrain.py` (régénère `world2.js`).
- `bake/` : cuisson des modèles depuis des champs de distance (`cz.c`, `bake.py`, `car2.py`).

Voir `CLAUDE.md` pour l'état du projet, les règles et la suite.
