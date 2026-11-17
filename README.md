# Porkonia World

Simulation 3D de Porkonia, le pays fictif de Kenny : on s'y balade à pied, en voiture (vue habitacle) ou à dos de cochon, entre 31 villes reliées par routes et voies ferrées. Tout est généré par le code, sans image IA ni modèle importé.

## Lancer

```sh
npm run build     # recolle src/ + data/ dans dist/index.html
npm run serve     # http://localhost:8080
```

`dist/index.html` est autonome (three.js r160 chargé depuis jsdelivr). Ajouter `?pause` pour le mode test.

Touches : ZQSD ou flèches, Maj courir, E voiture, P cochon, V vue, Espace frein, M carte. Sur téléphone : joystick à gauche, glisser à droite.

## Arborescence

- `src/` : le jeu, concaténé dans l'ordre `a_core, b_tracks, c_scenery, d_train, d1_assets, d2_explore, d3_props, e_game` dans `template.html`.
- `data/` : `world2.js` (terrain, villes, voies), `cz.js` (citoyens et cochon), `car.js` (voiture), et les entrées du générateur (`cls.npy`, `cities.json`, `pop.json`).
- `tools/` : `assemble.py` (build), `terrain.py` (régénère `world2.js`), `shot.py` (captures et profilage sans écran).
- `bake/` : cuisson des modèles depuis des champs de distance (`cz.c`, `bake.py`, `car2.py`).
- `dist/` : la dernière version construite.

Voir `CLAUDE.md` pour l'état du projet, les règles et la suite.
