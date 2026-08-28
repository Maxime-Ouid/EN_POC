import { createContext, useContext } from 'react';

/** Texte tapé dans le champ de filtre, en minuscules. Vide = tout afficher. */
export const FilterContext = createContext('');

export function useMatchesFilter(name: string): boolean {
  const filter = useContext(FilterContext);
  return !filter || name.toLowerCase().includes(filter);
}
