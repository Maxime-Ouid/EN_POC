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

   Le choix de la graisse `duotone`, en bicolore
   ---------------------------------------------
   Chaque glyphe duotone est fait de DEUX tracés : un contour, et une forme
   d'accent que Phosphor pose à 20 % d'opacité. Sur phosphoricons.com les deux
   sont de la même couleur — l'accent n'est qu'une ombre du contour. Ici ils
   sont dissociés : le contour prend `currentColor`, l'accent prend le token
   `--icon-accent`. C'est ce qui rend le jeu identifiable au lieu d'emprunté,
   pour le prix d'un attribut.

   La répartition des rôles est délibérée. Le contour porte le CONTRASTE : il
   hérite de la couleur de texte du contexte, donc il reste lisible partout, y
   compris quand un office repeint tout. L'accent ne porte que l'IDENTITÉ : à
   55 % d'opacité il ne serait pas conforme s'il était seul, mais il ne l'est
   jamais. D'où le fait que `svg.icon` ne fixe PAS de couleur — les surcharges
   existantes (`.nav-item.active .icon{color:…}`) recolorent le contour comme
   avant, sans rien savoir du sprite.

   Ce que ce choix coûte, pour mémoire : duotone est une graisse de contour.
   Entre 10 et 13 px — le chrome du tableau de bord — les glyphes sont plus
   pâles qu'une forme pleine ne le serait. C'était un arbitrage conscient, pas
   un oubli ; le remettre en cause veut dire repasser en `-fill`.

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
const WEIGHT = '-duotone';

/** Couleur et opacité du tracé d'accent. L'opacité reste dans le balisage —
 *  et non dans une feuille de style — parce qu'une règle CSS ne traverse pas
 *  le shadow DOM créé par `<use>` : elle ne pourrait jamais atteindre ce
 *  `<path>`. Les variables CSS, elles, y passent, d'où le `var()`. */
const ACCENT_FILL = 'var(--icon-accent)';
const ACCENT_OPACITY = '.55';

/* Exceptions de graisse — la distinction objet / signe.
   -----------------------------------------------------
   Duotone suppose un glyphe qui a un INTÉRIEUR : un dossier, un sceau, une
   cloche ont une surface à teinter. Un `+`, un `×`, un chevron, trois points
   n'en ont pas. Phosphor comble alors le vide en posant l'accent en CARRÉ
   derrière le signe — `plus-duotone` est un `+` sur un carré teinté. Sur cet
   écran ce serait un contresens : `x` est le bouton fermer d'un onglet et
   `plus` son bouton d'ajout ; leur ajouter un fond en fait des boutons à
   l'intérieur d'un bouton.

   `bold` donne le même signe en tracé épais, sans fond, et assez dense pour
   tenir à 11 px. C'est la seule raison de cette liste : ne pas y ajouter une
   icône par goût, seulement quand l'accent change le sens du signe.

   `search` et `list` n'y sont PAS, alors qu'ils y étaient en graisse `fill` :
   la lentille de la loupe était opaque en plein, elle redevient un simple ton
   en duotone ; même chose pour les barres de la liste. */
const WEIGHT_OVERRIDES = {
  plus: '-bold',
  check: '-bold',
  x: '-bold',
  dots: '-bold',
  link: '-bold',
  chevr: '-bold', // l'accent duotone en fait un triangle, pas le chevron attendu
  chevd: '-bold',
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
  let body = icon.body.replace(/\s+/g, ' ').trim();

  /* Dissociation des deux tons. Le tracé d'accent est celui qui porte un
     attribut `opacity` — Phosphor l'écrit APRÈS le `d`, et sa position varie
     d'une icône à l'autre : `folder-duotone` l'a en second, `house-duotone`
     en premier. Viser `:first-child` peindrait donc le contour une fois sur
     deux (constaté). Seul l'attribut `opacity` est un repère fiable.

     Les glyphes en graisse `bold` n'en ont pas : ils restent monochromes,
     ce qui est exactement voulu pour un `+` ou un `×`. */
  let accents = 0;
  body = body.replace(/<path([^>]*?)opacity="[^"]*"([^>]*?)\/>/g, (_m, avant, apres) => {
    accents += 1;
    const attrs = (avant + apres).replace(/fill="[^"]*"/g, '').replace(/\s+/g, ' ').trimEnd();
    return `<path${attrs} fill="${ACCENT_FILL}" opacity="${ACCENT_OPACITY}"/>`;
  });

  const attendu = (WEIGHT_OVERRIDES[id] ?? WEIGHT) === WEIGHT;
  if (attendu && accents === 0) {
    // Un duotone sans accent est un contour nu : l'icône s'afficherait, en
    // paraissant simplement plus terne que ses voisines. Rien ne le signale.
    console.error(`  ${id} (${phName}${weight}) : aucun tracé d'accent trouvé.`);
    process.exit(1);
  }

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
// Source  : Phosphor Icons (@iconify-json/ph ${version}), graisse \`duotone\`, MIT.
// Recette : scripts/build-icon-sprite.mjs — la correspondance identifiant →
//           nom Phosphor y est tenue, avec le motif du choix de la graisse.
//
// Chaque glyphe a deux tons : le CONTOUR hérite de \`currentColor\`, donc de la
// couleur de texte du contexte — c'est lui qui porte le contraste et que les
// règles existantes (.nav-item.active .icon) recolorent. L'ACCENT est peint en
// \`var(--icon-accent)\`, le token que chaque office peut changer.
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
console.log(`  IconSprite.tsx écrit — ${symbols.length} icônes (Phosphor ${version}, graisse ${WEIGHT.slice(1)}).`);
