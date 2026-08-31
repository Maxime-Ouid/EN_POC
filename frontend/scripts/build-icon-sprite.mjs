#!/usr/bin/env node
/* ===========================================================================
   Génération du sprite d'icônes — `npm run build:icons`.

   Pourquoi ce script existe
   -------------------------
   Le sprite précédent était dessiné à la main (repris du prototype
   `index_16.html`). Trente-trois icônes, huit épaisseurs de trait différentes
   — 1.3, 1.5, 1.6, 1.7, 1.8, 1.9, 2 et 2.2 — des ancrages hors grille, et un
   `i-tag` dont le tracé sortait de son viewBox. À 16 px certaines icônes
   pesaient visiblement plus que leurs voisines, sans que personne puisse dire
   laquelle corriger : il n'y avait pas de règle, seulement 33 décisions
   indépendantes.

   La règle est maintenant tenue par un set publié. Ce fichier ne fait que
   traduire : un identifiant maison (`home`, `folder`, `seal`…) vers un nom
   Phosphor. Ajouter une icône = ajouter une ligne dans MAP, relancer.

   Le choix de la graisse `fill`
   -----------------------------
   Les icônes sont affichées entre 10 et 16 px dans cette application
   (`svg.icon` fait 16, `dashboard.css` descend à 10). En dessous de 14 px un
   trait de 1.5 px occupe un dixième de la largeur du glyphe : il se brouille.
   Une forme pleine garde sa silhouette. C'est le seul motif du choix — pas
   l'esthétique.

   Conséquence : la couleur porte tout. Elle vient de `currentColor`, donc du
   token `--icon-tint` posé sur `svg.icon`, que chaque office peut repeindre.
   Ne PAS écrire de couleur en dur ici : `npm run check:ds` échouerait, et à
   raison.

   Source : @iconify-json/ph (Phosphor Icons, MIT). Grille 256, pas 24.
   =========================================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(FRONTEND_DIR, 'src', 'components', 'atoms', 'IconSprite.tsx');
const SRC = join(FRONTEND_DIR, 'node_modules', '@iconify-json', 'ph', 'icons.json');

/* Phosphor publie chaque glyphe en six graisses, distinguées par un suffixe :
   `house` est le REGULAR (un contour), `house-fill` la forme pleine. Les noms
   de MAP sont donc écrits nus et le suffixe est appliqué ici, en un seul
   endroit — c'est aussi ce qui permet de changer d'avis sur la graisse sans
   toucher aux 40 lignes de correspondance. Oublier ce suffixe ne produit
   aucune erreur : le sprite se génère, et l'application affiche simplement des
   contours au lieu de formes pleines. Seul un rendu le montre. */
const WEIGHT = '-fill';

/* Exceptions de graisse — la distinction objet / symbole.
   -------------------------------------------------------
   `fill` convient aux icônes qui représentent une CHOSE : un dossier, un
   sceau, une cloche ont un intérieur, le remplir leur donne de la masse et
   c'est ce qui les sauve à 11 px.

   Elle ne convient pas aux icônes qui sont un SIGNE : `+`, `×`, un chevron,
   trois points n'ont pas d'intérieur. Phosphor résout le problème en les
   inscrivant dans un carré plein — `plus-fill` est un carré violet contenant
   un `+` en réserve. Sur cet écran ce serait un contresens : `x` est le bouton
   fermer d'un onglet de tableau de bord et `plus` son bouton d'ajout ; les
   encadrer les transforme en boutons pleins là où le bouton est déjà autour.

   `bold` donne le même signe en tracé épais — assez dense pour tenir à 11 px,
   sans le cadre. C'est la seule raison de cette liste : ne pas y ajouter une
   icône pour des motifs de goût, seulement quand `fill` change le sens. */
const WEIGHT_OVERRIDES = {
  plus: '-bold',
  check: '-bold',
  x: '-bold',
  dots: '-bold',
  link: '-bold',
  chevr: '-bold', // en `fill` : un triangle plein, pas le chevron attendu
  chevd: '-bold',
  list: '-bold', // en `fill` : un bloc plein illisible comme « liste »
  search: '-bold', // en `fill` : la lentille est opaque, la loupe ne se lit plus
};

/* --- Correspondance identifiant maison → nom Phosphor ----------------------
   Les 33 premiers identifiants reprennent EXACTEMENT ceux de l'ancien sprite :
   tout `<Icon id="…" />` déjà écrit continue de fonctionner. Ne pas renommer
   sans passer sur les appels.

   Les suivants sont le vocabulaire notarial. Ils n'étaient pas dans l'ancien
   sprite parce qu'il aurait fallu les dessiner ; Phosphor les porte déjà, sur
   la même grille et dans la même graisse que le reste — donc cohérents par
   construction, ce qu'un dessin maison n'aurait pas garanti. */
const MAP = {
  // — navigation et structure
  home: 'house',
  layers: 'stack',
  folder: 'folder',
  file: 'file-text',
  grid: 'squares-four',
  list: 'list',
  building: 'buildings',

  // — personnes et échanges
  msg: 'chat-circle',
  users: 'users',
  send: 'paper-plane-tilt',
  bell: 'bell',

  // — actions
  plus: 'plus',
  check: 'check',
  x: 'x',
  search: 'magnifying-glass',
  filter: 'funnel',
  dots: 'dots-three',
  eye: 'eye',
  settings: 'gear',
  logout: 'sign-out',
  down: 'download-simple',
  up: 'upload-simple',
  link: 'link',
  clip: 'paperclip',

  // — direction
  chevr: 'caret-right',
  chevd: 'caret-down',
  arrleft: 'arrow-left',

  // — état et métadonnées
  clock: 'clock',
  lock: 'lock-simple',
  shield: 'shield-check',
  tag: 'tag',
  zip: 'file-zip',
  seal: 'seal',

  // — vocabulaire notarial (nouveau)
  stamp: 'stamp',
  scroll: 'scroll',
  gavel: 'gavel',
  scales: 'scales',
  certificate: 'certificate',
  signature: 'signature',
  register: 'notebook',
};

/* --- Génération ---------------------------------------------------------- */
let set;
try {
  set = JSON.parse(readFileSync(SRC, 'utf8'));
} catch {
  console.error(
    "\n  Source introuvable : @iconify-json/ph n'est pas installé.\n" +
      '  Depuis EN_POC-frontend-composants/frontend :  npm install\n',
  );
  process.exit(1);
}

const symbols = [];
const missing = [];

for (const [id, phName] of Object.entries(MAP)) {
  if (!/^[a-z0-9]+$/.test(id)) {
    // ICON_IDS plus bas extrait les identifiants avec /id="i-([a-z0-9]+)"/.
    // Un tiret ou une majuscule ici et l'icône disparaît silencieusement de la
    // liste — donc du UI kit — sans que rien n'échoue. On refuse tout de suite.
    console.error(`  Identifiant invalide (attendu [a-z0-9]+) : ${id}`);
    process.exit(1);
  }
  const weight = WEIGHT_OVERRIDES[id] ?? WEIGHT;
  const icon = set.icons[phName + weight];
  if (!icon) {
    missing.push(`${id} → ${phName}${weight}`);
    continue;
  }
  const w = icon.width ?? set.width ?? 24;
  const h = icon.height ?? set.height ?? 24;
  const body = icon.body.replace(/\s+/g, ' ').trim();
  symbols.push(`  <symbol id="i-${id}" viewBox="0 0 ${w} ${h}">${body}</symbol>`);
}

if (missing.length) {
  console.error('\n  Icônes absentes de Phosphor :\n    ' + missing.join('\n    ') + '\n');
  process.exit(1);
}

/* Garde-fou de graisse. Phosphor dessine TOUTES ses graisses en aplats — même
   le regular, dont le « trait » est un contour rempli. On ne peut donc pas
   distinguer une forme pleine d'un contour en inspectant le tracé : ni
   `stroke`, ni `fill="none"` n'apparaissent dans aucune des deux. La seule
   chose vérifiable est que le suffixe a bien été appliqué au moment de la
   recherche — c'est exactement l'erreur qui s'est produite, et elle n'a été
   visible qu'en rasterisant le sprite. */
const graisses = new Set([WEIGHT, ...Object.values(WEIGHT_OVERRIDES)]);
const sansSuffixe = Object.entries(MAP)
  .map(([id, n]) => n + (WEIGHT_OVERRIDES[id] ?? WEIGHT))
  .filter(n => ![...graisses].some(g => n.endsWith(g)));
if (sansSuffixe.length) {
  console.error(`\n  Graisse non appliquée sur : ${sansSuffixe.join(', ')}\n`);
  process.exit(1);
}

const inutiles = Object.keys(WEIGHT_OVERRIDES).filter(id => !(id in MAP));
if (inutiles.length) {
  // Une exception qui ne vise plus rien est une exception qu'on croit active.
  console.error(`\n  Exception de graisse sans icône correspondante : ${inutiles.join(', ')}\n`);
  process.exit(1);
}

const version = JSON.parse(
  readFileSync(join(FRONTEND_DIR, 'node_modules', '@iconify-json', 'ph', 'package.json'), 'utf8'),
).version;

const file = `// ATTENTION — fichier généré. Ne pas éditer à la main : la prochaine
// exécution de \`npm run build:icons\` écrasera toute modification.
//
// Source  : Phosphor Icons (@iconify-json/ph ${version}), graisse \`fill\`, MIT.
// Recette : scripts/build-icon-sprite.mjs — la correspondance identifiant →
//           nom Phosphor y est tenue, avec le motif du choix de la graisse.
//
// Les formes n'ont pas de couleur propre : elles héritent de \`currentColor\`,
// donc du token \`--icon-tint\` posé sur \`svg.icon\` (components.css). C'est ce
// qui permet à un office de repeindre ses icônes sans toucher au code.
const SPRITE_SYMBOLS = \`
${symbols.join('\n')}
\`;

/** Identifiants disponibles, sans le préfixe \`i-\` — c'est ce qu'attend la prop
 *  \`id\` de <Icon>. Dérivé du sprite lui-même : ajouter un symbole suffit à le
 *  faire apparaître partout où cette liste est utilisée (le UI kit notamment). */
export const ICON_IDS: string[] = Array.from(
  SPRITE_SYMBOLS.matchAll(/id="i-([a-z0-9]+)"/g),
  m => m[1],
);

export function IconSprite() {
  return (
    <svg
      style={{ display: 'none' }}
      dangerouslySetInnerHTML={{ __html: SPRITE_SYMBOLS }}
    />
  );
}
`;

writeFileSync(OUT, file, 'utf8');
console.log(`  IconSprite.tsx écrit — ${symbols.length} icônes (Phosphor ${version}, graisse fill).`);
