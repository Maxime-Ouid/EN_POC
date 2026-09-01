/* ===========================================================================
   État de repli du rail, côté React.

   Le « pourquoi » de la séparation office / personne est dans engine.ts, au
   dessus de `withCollapsedNav`. Ce fichier ne traite que la mécanique : d'où
   part l'état, ce qui le fait changer, et ce qui est enregistré.

   L'ÉCRAN ÉTROIT NE VERROUILLE RIEN, IL PROPOSE. Sous 1024 px, 236 px de
   navigation mangent le quart utile de la page : le rail se replie tout seul.
   Mais le bouton reste actif — quelqu'un qui cherche un intitulé doit pouvoir
   rouvrir la colonne. Et ce qu'il fait là n'est PAS enregistré : sa préférence
   reste celle du grand écran, pour qu'une consultation depuis un portable ne
   change pas ce qu'il retrouvera le lendemain sur son poste.
   =========================================================================== */

import { useCallback, useEffect, useState } from 'react';
import {
  NAV_NARROW_QUERY,
  isNarrowViewport,
  loadNavCollapsePreference,
  persistNavCollapsePreference,
} from './engine';

export interface NavCollapse {
  collapsed: boolean;
  toggle: () => void;
  /**
   * Déplie sans condition. Appelé quand l'office change la taille de sa
   * navigation : sans cela, choisir « Large » dans Personnalisation pendant que
   * le rail est replié ne changerait rien à l'écran, et le réglage passerait
   * pour cassé.
   */
  expand: () => void;
}

export function useNavCollapse(): NavCollapse {
  const [collapsed, setCollapsed] = useState(
    () => isNarrowViewport() || loadNavCollapsePreference(),
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(NAV_NARROW_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      // Retour au grand écran : on rend à la personne ce qu'elle avait choisi
      // là, et non l'état que la fenêtre réduite lui avait imposé.
      setCollapsed(event.matches ? true : loadNavCollapsePreference());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      if (!isNarrowViewport()) persistNavCollapsePreference(next);
      return next;
    });
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    if (!isNarrowViewport()) persistNavCollapsePreference(false);
  }, []);

  return { collapsed, toggle, expand };
}
