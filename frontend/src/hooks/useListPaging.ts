import { useMemo, useState } from 'react';

export interface ListPaging<T> {
  search: string;
  setSearch: (value: string) => void;
  perPage: number;
  setPerPage: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  pages: number;
  /** Lignes de la page courante. */
  rows: T[];
  /** Nombre de lignes après filtrage (≠ total du jeu de données). */
  filteredCount: number;
}

/**
 * Recherche + pagination côté client des listes reconstruites de la V1.
 *
 * Côté production, filtre et pagination sont faits par le serveur ; ici les jeux
 * de démonstration tiennent en mémoire. Le jour où les endpoints existent, ce
 * hook est remplacé par des paramètres de requête — la forme des écrans, elle,
 * ne bouge pas.
 */
export function useListPaging<T>(
  rows: T[],
  match: (row: T, query: string) => boolean,
  initialPerPage = 25,
): ListPaging<T> {
  const [search, setSearch] = useState('');
  const [perPage, setPerPageState] = useState(initialPerPage);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => match(row, q));
  }, [rows, search, match]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;

  return {
    search,
    setSearch: value => {
      setSearch(value);
      setPage(1);
    },
    perPage,
    setPerPage: value => {
      setPerPageState(value);
      setPage(1);
    },
    page: current,
    setPage,
    pages,
    rows: filtered.slice(start, start + perPage),
    filteredCount: filtered.length,
  };
}

/** Phrase de pied de tableau à la manière de la V1 : « dossiers 1 à 25 sur 245 ». */
export function pagerInfo(unit: string, page: number, perPage: number, total: number): string {
  if (total === 0) return `aucun ${unit.replace(/s$/, '')}`;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return `${unit} ${from} à ${to} sur ${total}`;
}
