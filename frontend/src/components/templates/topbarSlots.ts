import { createContext, useContext } from 'react';

/* ===========================================================================
   Emplacements de la topbar prêtés aux écrans.

   POURQUOI DES PORTAILS ET NON DES PROPS
   Depuis la suppression de la barre d'outils de l'accueil (01/09/2026), les
   onglets d'écrans et les boutons « Dispositions » / « Personnaliser » vivent
   dans la topbar. Or celle-ci est montée par AppShell, très au-dessus de
   DashboardScreen, et ces commandes pilotent un état qui n'appartient qu'à
   l'accueil (mode édition, écran courant, bibliothèque ouverte).

   Les faire remonter en props aurait obligé App.tsx — puis PrototypeDemo,
   V1AppView, UiKit… — à porter l'état du tableau de bord pour le seul plaisir
   de le redescendre. AppShell expose donc deux conteneurs vides et l'écran y
   projette ce qu'il veut : la topbar ignore ce qu'elle affiche, l'accueil garde
   son état chez lui, et un écran qui ne s'en sert pas ne coûte rien (les
   conteneurs sont masqués tant qu'ils sont vides — voir `.topbar-slot:empty`).

   Les éléments sont exposés en état et non en `ref` : un `ref` rempli après le
   rendu ne réveille personne, et les écrans projetteraient dans le vide au
   premier rendu.
   =========================================================================== */

export interface TopbarSlots {
  /** Début de barre, avant la recherche — les onglets d'écrans. */
  start: HTMLElement | null;
  /** Fin de barre, avant la cloche — les boutons de l'écran. */
  end: HTMLElement | null;
}

const EMPTY: TopbarSlots = { start: null, end: null };

export const TopbarSlotsContext = createContext<TopbarSlots>(EMPTY);

/**
 * Emplacements offerts par la coquille. Hors AppShell (démos, tests isolés),
 * renvoie deux `null` : l'écran se contente alors de ne rien projeter, plutôt
 * que de planter sur un contexte absent.
 */
export function useTopbarSlots(): TopbarSlots {
  return useContext(TopbarSlotsContext);
}
