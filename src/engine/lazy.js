// Maillages à la demande : fabriqués à leur première apparition, libérés au loin
import * as THREE from 'three';
import { renderer } from './renderer.js';

// ---------- maillages à la demande
// Une tuile de décor (accessoires, éléments de façade, arbres) garde seulement la liste de ses instances.
// Son maillage est fabriqué à sa première apparition et libéré quand la caméra s'en éloigne nettement.
// La règle de visibilité reste celle de l'appelant : l'image est la même qu'avec tous les maillages créés d'avance.
// Entrée : { mesh: null, make: () => Object3D, parent, own, rank } ; `own` = la géométrie appartient au maillage.
export const LAZY = { live: 0, made: 0, dropped: 0 };
// Rang de dessin. À matériau et profondeur égaux, three.js dessine les objets dans leur ordre de création, et au loin
// cet ordre décide quel objet l'emporte quand le tampon de profondeur ne les sépare plus. Une tuile reçoit donc à son
// inscription le rang qu'aurait eu son maillage créé d'avance : l'image ne dépend pas du moment où il est fabriqué.
let rankBase = 0, rankN = 0;
export function lazyRankStart() { rankBase = new THREE.Object3D().id; rankN = 0; }   // avant d'inscrire une série de tuiles
export const lazyRank = () => rankBase + (++rankN) * 1e-6;
const rankOf = it => it.object.userData.rank ?? it.id;
renderer.setOpaqueSort((a, b) => a.groupOrder !== b.groupOrder ? a.groupOrder - b.groupOrder : a.renderOrder !== b.renderOrder ? a.renderOrder - b.renderOrder
  : a.material.id !== b.material.id ? a.material.id - b.material.id : a.z !== b.z ? a.z - b.z : rankOf(a) - rankOf(b));
export function lazyShow(e, visible, far) {
  if (visible) {
    if (!e.mesh) {
      const m = e.mesh = e.make(); let k = 0;
      m.traverse(o => { o.matrixAutoUpdate = false; o.userData.rank = e.rank + (k++) * 1e-8; });
      e.parent.add(m); LAZY.live++; LAZY.made++;
    }
    e.mesh.visible = true;
  } else if (e.mesh) {
    e.mesh.visible = false;
    if (far) {
      e.parent.remove(e.mesh);
      e.mesh.traverse(o => { if (o.isMesh) { if (e.own) o.geometry.dispose(); if (o.dispose) o.dispose(); } });
      e.mesh = null; LAZY.live--; LAZY.dropped++;
    }
  }
}
// distance au-delà de laquelle un maillage masqué est libéré (marge pour ne pas le refaire à chaque demi-tour)
export const lazyFar = R => R * 1.4 + 300;
