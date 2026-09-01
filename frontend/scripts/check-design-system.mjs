#!/usr/bin/env node
/* ===========================================================================
   Garde-fou du design system — `npm run check:ds`.

   Trois dérives, toutes constatées sur de vrais projets, qu'aucun typage ne
   rattrape et qu'une relecture humaine laisse passer une fois sur deux :

     1. une couleur écrite en dur au lieu d'un token  → la personnalisation par
        office ne l'atteint pas, l'écran reste bleu Notantis chez une étude qui
        a tout repeint en vert ;
     2. une classe CSS qui n'existe pas               → l'élément s'affiche nu,
        sans erreur, souvent seulement dans un état rare (hover, vide, erreur) ;
     3. une classe de composant recopiée à la main    → le composant évolue, la
        copie non.

   Le script ne dépend de rien (Node seul) et se lit en dix minutes : il doit
   pouvoir être corrigé par quiconque le voit échouer.
   =========================================================================== */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = join(FRONTEND_DIR, 'src');
const BASELINE_PATH = join(FRONTEND_DIR, 'scripts', 'design-system-baseline.json');

/* --- Référence (baseline) -------------------------------------------------
   Le prototype d'origine contenait des couleurs littérales et des classes de
   composants recopiées. Les reprendre toutes d'un coup aurait voulu dire
   toucher à des écrans qui marchent, sans rapport avec le sujet du moment ;
   les ignorer aurait rendu ce script inutile (il aurait échoué dès le premier
   jour, donc plus personne ne l'aurait lancé).

   D'où la référence : ce qui existait au moment de la mise en place est
   accepté, tout écart NOUVEAU fait échouer. Le nombre de lignes de ce fichier
   ne doit que diminuer.

   `npm run check:ds -- --strict`          ignore la référence (dette totale).
   `npm run check:ds -- --update-baseline` la réécrit — à ne faire qu'après
                                           avoir CORRIGÉ, jamais pour se taire.
   ------------------------------------------------------------------------ */

/* --- Chemins ---------------------------------------------------------------
   Tous les chemins manipulés ici sont en séparateurs `/`, y compris sous
   Windows. Sans cette normalisation, les clés de la référence generée sur une
   machine (`src/styles/components.css::…`) ne correspondent à rien sur l'autre
   (`src\styles\components.css::…`) et les 57 écarts hérités ressortent tous
   comme nouveaux — constaté, pas théorique.
   ------------------------------------------------------------------------ */
// Découpe sur les deux séparateurs plutôt que sur `path.sep` : le comportement
// devient identique quel que soit l'OS, donc testable partout.
const toPosix = p => p.split(/[\\/]/).join('/');
const relPath = file => toPosix(relative(FRONTEND_DIR, file));

/* --- Ce qui a le DROIT de contenir des couleurs littérales ---------------- */
// tokens.css EST la palette ; schema.ts porte les mêmes valeurs par défaut pour
// l'écran de personnalisation ; color.ts manipule des couleurs par nature.
const COLOR_LITERAL_ALLOWED = [
  'src/styles/tokens.css',
  'src/theme/schema.ts',
  'src/theme/color.ts',
  'src/theme/engine.ts',
];

/* --- Classes de composants : où chacune a le droit d'être écrite ---------- */
// Une classe ne doit apparaître que dans le fichier du composant qui la porte
// (et dans le CSS qui la définit). Ailleurs, c'est une réimplémentation.
const COMPONENT_CLASSES = {
  btn: 'Button',
  'stat-card': 'StatCard',
  pill: 'Pill',
  tag: 'Tag',
  badge: 'Badge',
  avatar: 'Avatar',
  'nav-item': 'NavItem',
  'table-card': 'TableCard',
  breadcrumb: 'Breadcrumb',
  slideover: 'Slideover',
};
const COMPONENT_FILES = {
  btn: ['Button.tsx', 'ButtonRow.tsx', 'IconButton.tsx'],
  'stat-card': ['StatCard.tsx'],
  pill: ['Pill.tsx', 'ProtoPill.tsx'],
  tag: ['Tag.tsx'],
  badge: ['Badge.tsx'],
  avatar: ['Avatar.tsx', 'AvatarStack.tsx'],
  'nav-item': ['NavItem.tsx'],
  'table-card': ['TableCard.tsx'],
  breadcrumb: ['Breadcrumb.tsx'],
  slideover: ['Slideover.tsx', 'DocumentSlideover.tsx'],
};
// Le UI kit montre les composants ET leurs classes : il est hors périmètre.
const COMPONENT_CLASS_EXEMPT_DIRS = ['src/uikit'];

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?)\s*\(/g;

const violations = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(SRC_DIR).filter(f => /\.(tsx?|css)$/.test(f));

function report(file, line, rule, message) {
  violations.push({ file: relPath(file), line, rule, message });
}

/* --- 1. Couleurs codées en dur ------------------------------------------- */
function checkHardcodedColors(file, lines) {
  const rel = relPath(file);
  if (COLOR_LITERAL_ALLOWED.includes(rel)) return;

  lines.forEach((text, i) => {
    if (text.trimStart().startsWith('*') || text.trimStart().startsWith('//')) return;
    for (const match of [...text.matchAll(HEX), ...text.matchAll(FUNCTIONAL_COLOR)]) {
      report(
        file,
        i + 1,
        'couleur-en-dur',
        `${match[0]} — utiliser un token (var(--…), voir src/styles/tokens.css)`,
      );
    }
  });
}

/* --- 2. Classes CSS inexistantes ----------------------------------------- */
function collectDefinedClasses(cssFiles) {
  const defined = new Set();
  for (const file of cssFiles) {
    const css = readFileSync(file, 'utf8');
    for (const match of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(match[1]);
  }
  return defined;
}

function checkUnknownClasses(file, lines, defined) {
  lines.forEach((text, i) => {
    // Seulement les className="..." littéraux : une classe construite par
    // template ou par variable n'est pas analysable statiquement, et deviner
    // ferait plus de bruit que de bien.
    for (const match of text.matchAll(/className=(?:"([^"{}]*)"|'([^'{}]*)')/g)) {
      const value = match[1] ?? match[2] ?? '';
      for (const cls of value.split(/\s+/).filter(Boolean)) {
        if (!/^-?[_a-zA-Z][\w-]*$/.test(cls)) continue;
        if (!defined.has(cls)) {
          report(file, i + 1, 'classe-inconnue', `.${cls} n'est définie dans aucun CSS du projet`);
        }
      }
    }
  });
}

/* --- 3. Classes de composants recopiées ---------------------------------- */
function checkComponentClasses(file, lines) {
  const rel = relPath(file);
  if (rel.endsWith('.css')) return;
  if (COMPONENT_CLASS_EXEMPT_DIRS.some(dir => rel.startsWith(`${dir}/`))) return;
  const basename = rel.split('/').pop();

  lines.forEach((text, i) => {
    for (const [cls, component] of Object.entries(COMPONENT_CLASSES)) {
      if (COMPONENT_FILES[cls]?.includes(basename)) continue;
      // `(?![\\w-])` et pas un simple `\\b` : `.tag-menu` ou `.btn-row` ne sont PAS
      // des recopies de `.tag`/`.btn`, ce sont des classes distinctes qui
      // commencent par le même mot. Un `\\b` s'arrête au tiret et les signalait
      // toutes — un bruit qui pousse à ajouter des exemptions plutôt qu'à lire.
      const inClassName = new RegExp(`className=(?:"|'|\`)[^"'\`]*\\b${cls}(?![\\w-])`);
      if (inClassName.test(text)) {
        report(
          file,
          i + 1,
          'composant-recopie',
          `classe .${cls} écrite à la main — importer <${component}> à la place`,
        );
      }
    }
  });
}

const cssFiles = files.filter(f => f.endsWith('.css'));
const definedClasses = collectDefinedClasses(cssFiles);

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  checkHardcodedColors(file, lines);
  if (file.endsWith('.tsx')) {
    checkUnknownClasses(file, lines, definedClasses);
    checkComponentClasses(file, lines);
  }
}

/* --- Comparaison à la référence ------------------------------------------- */
// Clé volontairement SANS le numéro de ligne : déplacer du code ne doit pas
// faire échouer le script, seul un écart supplémentaire le doit.
const keyOf = v => `${v.file}::${v.rule}::${v.message}`;

function tally(items) {
  const counts = {};
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] ?? 0) + 1;
  return counts;
}

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const updating = argv.includes('--update-baseline');
const counts = tally(violations);

/* --- Auto-test : `--self-test` -------------------------------------------
   Garde-fou du garde-fou. La référence a déjà été rendue inopérante une fois
   sous Windows (clés en `\` d'un côté, `/` de l'autre : les 57 écarts hérités
   ressortaient tous comme nouveaux, le script devenait inutilisable sur la
   machine de développement). Ces trois assertions le rattraperaient.
   ------------------------------------------------------------------------ */
if (argv.includes('--self-test')) {
  const checks = [
    ['chemin Windows normalisé', toPosix('src\\styles\\components.css') === 'src/styles/components.css'],
    ['chemin POSIX inchangé', toPosix('src/styles/components.css') === 'src/styles/components.css'],
    [
      'aucune clé de référence en séparateur Windows',
      Object.keys(existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : {}).every(
        k => !k.includes('\\'),
      ),
    ],
  ];
  const failed = checks.filter(([, ok]) => !ok);
  for (const [label, ok] of checks) console.log(`${ok ? 'ok  ' : 'ÉCHEC'} ${label}`);
  process.exit(failed.length ? 1 : 0);
}

if (updating) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`, 'utf8');
  console.log(
    `Référence réécrite : ${violations.length} écart(s) acceptés dans ${relative(FRONTEND_DIR, BASELINE_PATH)}.`,
  );
  process.exit(0);
}

const baseline = !strict && existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : {};

const isNew = v => {
  const key = keyOf(v);
  const allowed = baseline[key] ?? 0;
  if (allowed <= 0) return true;
  baseline[key] = allowed - 1; // chaque occurrence connue n'absorbe qu'un écart
  return false;
};
const flagged = violations.filter(isNew);

/* --- Sortie --------------------------------------------------------------- */
const accepted = violations.length - flagged.length;
const acceptedNote = accepted > 0 ? ` (${accepted} écart(s) hérités, voir la référence)` : '';

if (flagged.length === 0) {
  console.log(`Design system : ${files.length} fichiers vérifiés, aucun écart nouveau${acceptedNote}.`);
  process.exit(0);
}

const byRule = flagged.reduce((acc, v) => {
  (acc[v.rule] ??= []).push(v);
  return acc;
}, {});

const EXPLAIN = {
  'couleur-en-dur':
    "Une couleur en dur échappe à la personnalisation par office : l'étude qui repeint son espace ne verra pas ce point changer.",
  'classe-inconnue':
    "La classe n'existe dans aucun CSS : l'élément s'affichera sans style, sans erreur au build.",
  'composant-recopie':
    "La classe du composant est recopiée : le jour où le composant change, cette copie ne suit pas.",
};

for (const [rule, items] of Object.entries(byRule)) {
  console.error(`\n${rule} (${items.length})`);
  console.error(`  ${EXPLAIN[rule]}`);
  for (const v of items) console.error(`  ${v.file}:${v.line}  ${v.message}`);
}
console.error(`\n${flagged.length} écart(s) nouveau(x) au design system${acceptedNote}.`);
process.exit(1);
