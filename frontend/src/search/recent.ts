/* ===========================================================================
   Recherches récentes.

   Ce sont les FRAPPES qui sont mémorisées, pas les résultats ouverts. La
   tentation inverse est forte (« reprendre le dossier d'hier »), mais un
   résultat mémorisé est un nom de dossier ou de pièce recopié hors du contrôle
   d'accès : le jour où un administrateur retire l'utilisateur d'une pièce, la
   palette continuerait d'en afficher le nom. C'est exactement ce que le hook de
   recherche refuse déjà en ne posant aucun cache (voir hooks/useSearch.ts) —
   même raison, même conclusion ici.

   Une frappe, elle, n'appartient qu'à celui qui l'a tapée et ne révèle rien
   qu'il ne savait pas déjà.
   =========================================================================== */

const STORAGE_KEY = 'en.search.recent';
/** Au-delà, la liste cesse d'être un raccourci et redevient une liste à lire. */
const MAX = 5;
/** Une lettre seule ne se « reprend » pas : la retaper coûte moins cher que la
    lire. Le seuil de la recherche elle-même reste à 1, ce n'est pas le même. */
const MIN_LENGTH = 2;

/* Tous les accès sont gardés : en navigation privée, ou quand la stratégie de
   groupe de l'étude bloque le stockage local, `localStorage` LÈVE au lieu de
   renvoyer vide — une palette qui ne s'ouvre plus pour cette raison serait une
   régression bien pire que l'absence d'historique. */

export function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0).slice(0, MAX);
  } catch {
    return [];
  }
}

/** Ajoute une frappe en tête et renvoie la liste à jour (la même que relirait
    `readRecentSearches`, pour que l'appelant n'ait pas à relire le stockage). */
export function pushRecentSearch(query: string): string[] {
  const value = query.trim();
  if (value.length < MIN_LENGTH) return readRecentSearches();

  // Comparaison insensible à la casse : « Dupont » et « dupont » sont la même
  // recherche, deux lignes pour elles ne feraient que remplir la liste.
  const next = [value, ...readRecentSearches().filter(v => v.toLowerCase() !== value.toLowerCase())]
    .slice(0, MAX);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Historique perdu, recherche intacte. */
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* idem */
  }
}
