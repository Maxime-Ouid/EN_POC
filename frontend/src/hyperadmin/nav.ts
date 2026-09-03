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
 * Les cinq rubriques que le document de vision confie à l'application
 * d'administration (§5.1), rangées par ce qu'on y fait :
 *
 *   Plateforme  — le parc lui-même : les offices, et le reporting consolidé
 *                 et transverse qui les compare (§4.6, second niveau).
 *   Diffusion   — les annonces envoyées aux EN (maintenance, nouveauté,
 *                 alerte), avec leur ciblage.
 *   Conformité  — le journal de sécurité transverse (§7.7, objectif OS10) et
 *                 la reprise V1 → cible (§10), qui est un chantier daté et non
 *                 une fonction permanente : elle quittera ce rail le jour où
 *                 le dernier office aura basculé.
 *
 * La console n'avait qu'une rubrique jusqu'au 03/09/2026, et son commentaire
 * annonçait déjà « facturation, journal transverse » comme suites attendues.
 */
export const HYPERADMIN_NAV: NavSection[] = [
  {
    label: 'Plateforme',
    items: [
      { key: 'offices', icon: 'building', label: 'Offices' },
      { key: 'reporting', icon: 'grid', label: 'Reporting consolidé' },
    ],
  },
  {
    label: 'Diffusion',
    items: [{ key: 'notifications', icon: 'bell', label: 'Annonces aux EN' }],
  },
  {
    label: 'Conformité',
    items: [
      { key: 'securite', icon: 'shield', label: 'Journal de sécurité' },
      { key: 'migration', icon: 'register', label: 'Reprise V1 → cible' },
    ],
  },
];

/** Libellé du fil d'Ariane de chaque rubrique. */
export const HYPERADMIN_CRUMBS: Record<string, string> = {
  offices: 'Offices',
  reporting: 'Reporting consolidé',
  notifications: 'Annonces aux EN',
  securite: 'Journal de sécurité',
  migration: 'Reprise V1 → cible',
};

/** Disposition imposée de la console : rail vertical, sans mention de marque grise. */
export function hyperadminThemeState(): ThemeState {
  return withLayout(defaultThemeState(), {
    // Le défaut du produit, écrit explicitement : la console ne le tient pas de
    // LAYOUT_DEFAULTS par hasard, c'est un choix qu'on a pris et documenté.
    navPlacement: 'left',
    // Trois sections désormais, contre une seule jusqu'au 03/09/2026 : les
    // nommer redevient utile, c'est ce qui distingue « Plateforme » de
    // « Conformité » dans un rail devenu long.
    showSectionLabels: true,
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
