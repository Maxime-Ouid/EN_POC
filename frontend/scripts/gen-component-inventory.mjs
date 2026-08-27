#!/usr/bin/env node
/* ===========================================================================
   Régénère l'inventaire des composants lu par le skill design-system.

     node scripts/gen-component-inventory.mjs > ../.claude/skills/design-system/references/composants.md

   Le rôle de chaque composant est LU dans son commentaire d'en-tête : la table
   ne se maintient pas à la main, elle se régénère. Un composant sans
   commentaire apparaît avec un « — », ce qui se voit — c'est voulu.
   =========================================================================== */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMPONENTS_DIR = fileURLToPath(new URL('../src/components', import.meta.url));

const LAYERS = [
  ['atoms', 'Atomes — éléments indivisibles'],
  ['molecules', 'Molécules — petits assemblages'],
  ['organisms', 'Organismes — blocs autonomes'],
  ['templates', 'Gabarits — structure de page'],
  ['pages', 'Écrans — composition complète'],
];

function describe(source) {
  const lines = source.split('\n');
  const idx = lines.findIndex(l => /^export function [A-Za-z0-9_]/.test(l));
  if (idx < 0) return null;

  const names = [...source.matchAll(/^export function ([A-Za-z0-9_]+)/gm)].map(m => m[1]);

  // Bloc de commentaire contigu juste au-dessus de l'export, lu dans l'ordre.
  let start = idx - 1;
  while (start >= 0 && /^\s*(\/\*\*|\*|\*\/|\/\/)/.test(lines[start])) start--;
  let desc = lines
    .slice(start + 1, idx)
    .map(l => l.replace(/^\s*(\/\*\*|\*\/|\*|\/\/)/, '').trim())
    .filter(Boolean)
    .join(' ');

  // Première phrase seulement : un point suivi d'une espace, jamais celui de
  // « §6.4 », « DESIGN_SYSTEM.md » ou « .card ».
  const firstSentence = desc.match(/^(.{25,}?[a-zéèêà)\]"»])\.\s/);
  if (firstSentence) desc = `${firstSentence[1]}.`;
  desc = desc.replace(/\|/g, '\\|').trim();
  if (desc.length > 130) desc = `${desc.slice(0, 127).replace(/\s+\S*$/, '')}…`;

  return { names, desc };
}

let out = `# Inventaire des composants

Généré depuis le code : \`node scripts/gen-component-inventory.mjs\` (dans \`frontend/\`).
Ne pas modifier à la main — corriger le commentaire d'en-tête du composant, puis régénérer.

Le catalogue interactif, avec les props et les variantes réellement montées,
se lance avec \`npm run dev\` puis \`?view=ui-kit\`.
`;

for (const [dir, title] of LAYERS) {
  out += `\n## ${title}\n\n| Composant | Rôle |\n|---|---|\n`;
  const files = readdirSync(join(COMPONENTS_DIR, dir))
    .filter(f => f.endsWith('.tsx'))
    .sort();
  for (const file of files) {
    const found = describe(readFileSync(join(COMPONENTS_DIR, dir, file), 'utf8'));
    if (!found) continue;
    out += `| \`${found.names.join('`, `')}\` | ${found.desc || '—'} |\n`;
  }
}

process.stdout.write(out);
