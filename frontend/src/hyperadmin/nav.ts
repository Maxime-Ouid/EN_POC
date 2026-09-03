/* ===========================================================================
   Navigation et disposition de la console hyperadmin.

   La console n'est pas l'espace d'une étude : elle n'a ni thème d'office ni
   sélecteur de modules. Elle emprunte pourtant la MÊME coquille que
   l'application (AppShell), avec le MÊME rail vertical.

   Essayée d'abord en « barre d'onglets » (03/09/2026), la console y empilait
   deux barres pleine largeur : l'une pour la marque et l'unique rubrique,
   l'autre pour l'identité, la déconnexion et les commandes de l'écran. Deux
   fois la même hauteur perdue en haut de page pour six éléments qui tiennent
   dans une colonne. Le rail les regroupe et rend à l'écran sa pleine hauteur —
   c'est aussi la disposition par défaut d'un office, donc celle que l'on
   reconnaît en passant de l'une à l'autre.

   La disposition passe par le thème et non par une prop d'AppShell, parce que
   c'est le thème qui écrit `data-nav-placement` sur <html> : c'est lui que le
   CSS lit pour décaler le contenu. Deux mains sur cette décision (une prop
   pour le rendu, un attribut pour la géométrie) finiraient par se contredire.
   =========================================================================== */

import type { NavSection } from '../components/organisms/navModel';
import { applyTheme, defaultThemeState, withLayout, type ThemeState } from '../theme';

/**
 * Un seul écran pour l'instant — la liste des offices. Le rail l'affiche donc
 * seul, et c'est volontaire : il nomme l'endroit où l'on se trouve et
 * accueillera les rubriques suivantes (facturation, journal transverse) sans
 * changer de coquille.
 */
export const HYPERADMIN_NAV: NavSection[] = [
  {
    label: 'Plateforme',
    items: [{ key: 'offices', icon: 'building', label: 'Offices' }],
  },
];

/** Disposition imposée de la console : rail vertical, sans mention de marque grise. */
export function hyperadminThemeState(): ThemeState {
  return withLayout(defaultThemeState(), {
    // Le défaut du produit, écrit explicitement : la console ne le tient pas de
    // LAYOUT_DEFAULTS par hasard, c'est un choix qu'on a pris et documenté.
    navPlacement: 'left',
    showSectionLabels: false,
    // La marque grise est une promesse faite aux ÉTUDES ; dans la console de
    // Notantis, « propulsé par Notantis » n'a rien à annoncer.
    showPoweredBy: false,
  });
}

/**
 * Applique cette disposition avant le premier rendu — pendant de
 * `applyThemeEarly()` pour les offices. Elle pose aussi la largeur du rail
 * (`--nav-w`) et le reste des variables : sans elle, la console démarrerait
 * sur le CSS d'un office quitté (le cache local de l'hôte) avant de le
 * remplacer sous les yeux.
 */
export function applyHyperadminTheme(): ThemeState {
  const state = hyperadminThemeState();
  applyTheme(state);
  return state;
}
