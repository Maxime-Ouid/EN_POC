import type { ReactNode } from 'react';
import { wordStartPattern } from '../../search/match';

export interface HighlightProps {
  text: string;
  /** La frappe en cours. Vide = le texte est rendu tel quel. */
  query: string;
}

/**
 * Souligne dans `text` les lettres trouvées par la recherche.
 *
 * Ne souligne QUE ce qui a réellement fait correspondre : les mêmes débuts de
 * mot que le serveur (voir search/match.ts), pas toutes les occurrences des
 * lettres. Sinon la mise en évidence mentirait — chercher « n » allumerait le
 * « n » de « Succession », qui n'est justement pas une raison pour laquelle ce
 * résultat est là.
 */
export function Highlight({ text, query }: HighlightProps) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;

  // Boucle `exec` explicite plutôt que `matchAll` : le motif porte le
  // séparateur consommé dans son groupe 1, et on a besoin de sa longueur pour
  // décaler le début du surlignage — le séparateur (espace, tiret) ne fait pas
  // partie de ce que l'utilisateur a tapé.
  const pattern = wordStartPattern(needle, 'gi');
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match = pattern.exec(text);

  while (match !== null) {
    const start = match.index + match[1].length;
    const end = start + needle.length;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark className="hl" key={start}>
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
    match = pattern.exec(text);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
