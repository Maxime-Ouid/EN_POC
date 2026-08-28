/* ===========================================================================
   Analyse d'un fichier de composant : description, props, type hérité.

   Volontairement dépourvu de toute dépendance à Vite ou au DOM — c'est ce qui
   permet de le tester hors navigateur (voir la vérification faite au moment de
   l'écriture du UI kit). La lecture effective des sources vit dans
   introspect.ts, qui n'ajoute que le import.meta.glob.
   =========================================================================== */

export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  /** Commentaire JSDoc ou `//` placé au-dessus de la prop. */
  doc?: string;
}

export interface ComponentDoc {
  name: string;
  level: string;
  /** Chemin affichable, ex. « components/atoms/Button.tsx ». */
  path: string;
  /** Commentaire placé juste au-dessus de la fonction du composant. */
  description?: string;
  props: PropDoc[];
  /** Interface héritée, ex. « ButtonHTMLAttributes<HTMLButtonElement> ». */
  extendsFrom?: string;
  /** Renseigné quand les props sont un alias de type et non une interface. */
  aliasOf?: string;
}

function cleanComment(block: string): string | undefined {
  const text = block
    .split('\n')
    .map(l =>
      l
        .trim()
        .replace(/^\/\*\*?/, '')
        .replace(/\*\/$/, '')
        .replace(/^\*\s?/, '')
        .replace(/^\/\/\s?/, ''),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}

/** Commentaire contigu qui précède la ligne `at` (JSDoc ou suite de `//`). */
function commentAbove(source: string, at: number): string | undefined {
  const before = source.slice(0, at);
  const jsdoc = before.match(/\/\*\*([\s\S]*?)\*\/\s*$/);
  if (jsdoc) return cleanComment(jsdoc[0]);
  const lines = before.split('\n');
  const collected: string[] = [];
  for (let i = lines.length - 2; i >= 0; i--) {
    const l = lines[i].trim();
    if (l.startsWith('//')) collected.unshift(l);
    else break;
  }
  return collected.length ? cleanComment(collected.join('\n')) : undefined;
}

/**
 * Découpe le corps d'une interface en membres, en respectant l'imbrication.
 *
 * On ne compte QUE `{}`, `()` et `[]`. Compter aussi `<>` cassait tout : la
 * flèche d'un type fonction (`(next: boolean) => void`) contient un `>` qui
 * faisait passer la profondeur en négatif, si bien que les `;` suivants
 * n'étaient plus vus comme des séparateurs et que les props fusionnaient.
 * Un `;` ne peut de toute façon apparaître dans un `<…>` qu'à l'intérieur d'un
 * `{…}`, déjà suivi.
 */
function splitMembers(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if ('{(['.includes(c)) depth++;
    if ('})]'.includes(c)) depth--;
    if (c === ';' && depth === 0) {
      out.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim()) out.push(current);
  return out;
}

function parseProps(source: string, name: string): Pick<ComponentDoc, 'props' | 'extendsFrom' | 'aliasOf'> {
  const alias = source.match(new RegExp(`export type ${name}Props\\s*=\\s*([^;]+);`));
  if (alias) return { props: [], aliasOf: alias[1].trim() };

  const start = source.search(new RegExp(`export interface ${name}Props\\b`));
  if (start === -1) return { props: [] };
  const header = source.slice(start, source.indexOf('{', start));
  const extendsMatch = header.match(/extends\s+([^{]+)/);
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(open + 1, end);

  const props: PropDoc[] = [];
  for (const raw of splitMembers(body)) {
    const member = raw.trimStart();
    // isole la déclaration de son commentaire
    const declMatch = member.match(/(?:^|\n)\s*([A-Za-z_$][\w$]*)(\??)\s*:\s*([\s\S]+)$/);
    if (!declMatch) continue;
    const doc = cleanComment(member.slice(0, member.indexOf(declMatch[1])));
    props.push({
      name: declMatch[1],
      required: declMatch[2] !== '?',
      type: declMatch[3].replace(/\s+/g, ' ').replace(/;?\s*(\/\/.*)?$/, '').trim(),
      doc,
    });
  }
  return { props, extendsFrom: extendsMatch?.[1].trim() };
}


/** Documentation complète d'un composant, à partir du texte de son fichier. */
export function parseComponentDoc(source: string, name: string, shortPath: string): ComponentDoc {
  const level = shortPath.split('/')[1] ?? '';
  const fnAt = source.search(new RegExp(`export function ${name}\\b`));
  return {
    name,
    level,
    path: shortPath,
    description: fnAt >= 0 ? commentAbove(source, fnAt) : undefined,
    ...parseProps(source, name),
  };
}

/** Noms des composants exportés par un fichier. */
export function exportedComponents(source: string): string[] {
  return Array.from(source.matchAll(/export function ([A-Z][\w$]*)/g), m => m[1]);
}
