/* ===========================================================================
   Sémantique de correspondance de la recherche, côté client.

   Doit rester d'accord avec `_name_starts_with` (backend/datarooms/views.py) :
   un nom correspond s'il contient un MOT qui COMMENCE par la frappe — pas une
   sous-chaîne quelconque (« e » ne doit pas ramener « Succession Martin »), et
   pas non plus le seul début du nom complet (« foch » doit trouver « Vente
   Guerin - 8 avenue Foch »).

   Deux usages, et c'est pour ça que la règle vit ici plutôt que recopiée dans
   chacun : le filtre local de la liste Dossiers (App.tsx), et la mise en
   évidence des lettres trouvées dans la palette (atoms/Highlight.tsx). Le
   serveur reste seul juge de ce qui est renvoyé ; ce fichier ne fait que dire
   les mêmes choses au même endroit.
   =========================================================================== */

/** Tout ce qui n'est ni lettre, ni chiffre, ni lettre accentuée : les noms de
    pièces séparent leurs mots par espace, tiret, underscore, point, apostrophe…
    les énumérer serait en oublier, d'où la définition en négatif. */
const SEPARATOR = '[^0-9A-Za-zÀ-ÖØ-öø-ÿ]';

/** Métacaractères d'expression régulière — une frappe en cours passe forcément
    par des motifs incomplets (« ( », « [ »), et un nom de dossier peut
    légitimement contenir « + » ou « ( ». Sans échappement, `new RegExp` lève
    au milieu de la saisie. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Motif « début de mot ». Le groupe 1 capture le séparateur consommé (vide en
 * début de chaîne) — c'est ce qui permet à la mise en évidence de ne souligner
 * que la frappe, sans avaler le tiret ou l'espace qui la précède.
 */
export function wordStartPattern(query: string, flags = 'i'): RegExp {
  return new RegExp(`(^|${SEPARATOR})${escapeRegExp(query)}`, flags);
}

/** Vrai si `text` contient un mot commençant par `query`. Une frappe vide ne
    filtre rien (elle ne « ne correspond à rien », elle ne demande rien). */
export function matchesWordStart(text: string, query: string): boolean {
  const needle = query.trim();
  if (!needle) return true;
  return wordStartPattern(needle).test(text);
}
