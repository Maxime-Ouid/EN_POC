/* ===========================================================================
   Documentation des props lue DANS LE CODE, pas recopiée à côté.

   Les sources des composants sont importées en texte brut (`?raw`) et confiées
   à parser.ts. Conséquence voulue : la table des props ne peut pas mentir —
   renommer une prop ou changer son type met le UI kit à jour tout seul, et une
   prop ajoutée sans documentation apparaît quand même. Une doc maintenue à la
   main aurait divergé en deux semaines.

   Le coût : ce fichier ne fonctionne que sous Vite (import.meta.glob), et
   n'embarque les sources que dans le bundle du UI kit, jamais dans l'app.
   =========================================================================== */

import { parseComponentDoc, exportedComponents, type ComponentDoc } from './parser';

export type { ComponentDoc, PropDoc } from './parser';

const RAW = import.meta.glob('../components/*/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const CACHE = new Map<string, ComponentDoc>();

/** Documentation d'un composant, par son nom exporté. */
export function docFor(name: string): ComponentDoc {
  const cached = CACHE.get(name);
  if (cached) return cached;

  let path = '';
  let source = '';
  for (const [p, s] of Object.entries(RAW)) {
    if (new RegExp(`export function ${name}\\b`).test(s)) {
      path = p;
      source = s;
      break;
    }
  }
  const doc = parseComponentDoc(source, name, path.replace('../', ''));
  CACHE.set(name, doc);
  return doc;
}

/** Tous les noms de composants exportés, par niveau — sert de garde-fou : le
 *  UI kit signale ceux qui n'ont pas encore de spécimen. */
export function allExportedComponents(): Record<string, string[]> {
  const byLevel: Record<string, string[]> = {};
  for (const [p, s] of Object.entries(RAW)) {
    const level = p.replace('../', '').split('/')[1];
    (byLevel[level] ??= []).push(...exportedComponents(s));
  }
  for (const level of Object.keys(byLevel)) byLevel[level].sort();
  return byLevel;
}
