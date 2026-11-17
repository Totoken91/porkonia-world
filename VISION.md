# La vision de Kenny, dans ses mots

À lire avant toute passe visuelle. Ce sont ses phrases, pas une interprétation.

- « une vraie simulation de porkonia de fou avec habitants, on peut se balader à pied, en voiture, les villes et leurs détails à chacunes […] faut qu'on puisse se balader partout sur la map et que ce soit magnifique partout »
- « je ne cherche pas le photo réalisme je cherche le cartoony colory porkonia 3D 90's »
- « un pure banger ABSOLU »
- Sur la voiture : « je voudrais du fps genre t dans l'habitacle de la voiture »
- « faut qu'on puisse se déplacer à dos de cochon standard aussi »
- « les villes et les paysages manquent de détails et de vie »
- « y'a d'immenses progrès à faire au niveau ville assets paysages détails, tous les détails qu'on peut trouver dans une ville, là ça fait vide »
- Sur les maisons : « très moches et juste posées dans l'herbe en random genre y'a pas de route »
- Sur le sol : pas de brins d'herbe en 3D (« ça fait trop »), améliorer le sol autrement.
- Sur les arbres : « très bizarres », à retravailler.
- Dernier avis sur l'ensemble (v8) : « c encore très moche ».

## Les huit photos de référence (dans `refs/`)

Kenny a fourni huit photos de villes et l'atlas du pays (`refs/atlas.png`, `refs/photo-1…8`). Les regarder avant de modéliser. Ce qu'elles montrent :

1. Bourg agricole vu d'une route en lacet : toits de tuiles orange, potagers, silos et petite usine au milieu des maisons.
2. Vieux village de pierre au bord d'un lac : toits d'ardoise serrés, linge aux fenêtres, cheminées qui fument.
3. Ville fluviale au crépuscule : quais éclairés, grand bâtiment sur la falaise, usine à silos, tour-soucoupe sur pilier.
4. Avenue bordée de platanes : immeubles clairs à toits de tuiles, façade couverte de lierre, marché, voitures garées.
5. Rue pavée de nuit : arcades de pierre, alambics en cuivre dans les boutiques, tram, étals, ville étagée sur la colline.
6. Brasserie fortifiée sur un éperon rocheux : tours à toits pointus, cheminées d'usine, téléphérique, montagnes.
7. Front de mer sous la pluie : promenade à palmiers, forteresse sur le rocher, tour-soucoupe.
8. Plaine céréalière : moissonneuse au premier plan, bourg avec clocher, silos et entrepôts.

Attribution proposée par Claude, jamais confirmée par Kenny : 1 Groin-des-Champs ou Douzi City, 2 Jambonneau, 3 Porcinia ou Belle-Côte, 4 Lardanne, 5 Porcalis, 6 Brassefort, 7 Biermont ou Val-Lardon. À lui faire valider.

Point commun à retenir : pierre et tuiles, relief, et l'industrie alimentaire (cuivre, silos, cuves) mêlée aux rues, pas rangée dans une zone à part.

## Ce qui manque encore pour exécuter la vision

- L'export complet de Porkopédia. `porkopedia/extrait.json` ne contient que 8 articles et le catalogue des titres, sans les sections consacrées à des personnes. Les spécialités et populations des 31 villes sont déjà dans `src/c_scenery.js` (`CITY`).
- Le moteur des personnages (`citizen.h`, `porc4.h`) : dépôt Totoken91/Porkonia-Movie-Studio, dossier `moteur-3d/`.
