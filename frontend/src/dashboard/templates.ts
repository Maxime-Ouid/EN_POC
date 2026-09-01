/* ===========================================================================
   Templates d'accueil.

   Un template ne nomme que des widgets, onglet par onglet : les positions sont
   calculées par `packWidgets` (layout.ts). Deux conséquences voulues — changer
   la taille par défaut d'un widget met à jour les huit templates d'un coup, et
   aucun template ne peut contenir de chevauchement.

   CHAQUE ONGLET DOIT TENIR EN 12 × 12. `packWidgets` écarte silencieusement ce
   qui déborde (avec un avertissement en développement) : un onglet trop chargé
   perd donc des widgets au lieu de rendre l'écran défilant. La règle de
   composition qui tombe juste, avec les gabarits de registry.tsx :

       quatre STAT (bande de 2 lignes) + deux PANEL      = 12 lignes pile
       un PANEL + deux SIDE                              = 12 colonnes pile

   Deux familles, parce qu'elles répondent à des questions différentes :

     rôle     ce que la plateforme SAIT de l'utilisateur (OfficeMembership.role).
              Sert de défaut : personne n'arrive sur un accueil vide.
     métier   ce que l'utilisateur FAIT de ses journées. La plateforme ne le sait
              pas — il n'y a pas de champ « je suis clerc » côté serveur — donc
              ces templates ne sont jamais appliqués tout seuls : ils sont
              proposés dans la galerie, et c'est le choix de l'utilisateur qui
              est ensuite mémorisé (DashboardState.template).

   Ne pas inventer un champ « profil métier » côté backend tant que ce choix
   n'est pas observé : la galerie enregistre déjà lequel a été pris, c'est la
   donnée qui manquerait pour trancher.
   =========================================================================== */

import { packWidgets } from './layout';
import type { DashboardPage } from './types';

export type TemplateFamily = 'role' | 'metier';

export interface DashboardTemplate {
  id: string;
  name: string;
  desc: string;
  icon: string;
  family: TemplateFamily;
  /** Rôle d'office dont ce template est le défaut — voir `templateForRole`. */
  defaultForRole?: string;
  pages: DashboardPage[];
}

interface PageSpec {
  name: string;
  widgets: string[];
}

/** Décrit un template par ses onglets et, dans chacun, la liste de ses widgets. */
function template(
  id: string,
  name: string,
  desc: string,
  icon: string,
  family: TemplateFamily,
  pages: PageSpec[],
  defaultForRole?: string,
): DashboardTemplate {
  return {
    id,
    name,
    desc,
    icon,
    family,
    defaultForRole,
    // L'identifiant d'onglet est dérivé du template : appliquer deux fois le
    // même template donne les mêmes identifiants, donc l'onglet actif survit.
    pages: pages.map((page, index) => ({
      id: `${id}-${index + 1}`,
      name: page.name,
      widgets: packWidgets(page.widgets),
    })),
  };
}

const STATS_OFFICE = ['dossiers-actifs', 'stockage', 'questions-en-attente', 'membres-connectes'];

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  /* --- Par rôle d'office --------------------------------------------------- */
  template(
    'superadmin',
    'Pilotage de l’office',
    'Les chiffres de l’étude sur un écran, la consommation et la facturation sur l’autre.',
    'shield',
    'role',
    [
      { name: 'Pilotage', widgets: [...STATS_OFFICE, 'stockage-par-espace', 'activite-recente'] },
      { name: 'Office', widgets: ['annuaire', 'qui-est-connecte', 'facturation'] },
    ],
    'superadmin',
  ),
  template(
    'admin',
    'Administration',
    'Le suivi des dossiers et des accès, sans les chiffres de facturation.',
    'settings',
    'role',
    [
      { name: 'Suivi', widgets: [...STATS_OFFICE, 'questions-a-traiter', 'activite-recente'] },
      { name: 'Office', widgets: ['annuaire', 'qui-est-connecte', 'modules-actifs'] },
    ],
    'admin',
  ),
  template(
    'membre',
    'Travail courant',
    'Les dossiers en cours et les questions à traiter, l’activité sur un second écran.',
    'folder',
    'role',
    [
      { name: 'Mon travail', widgets: [...STATS_OFFICE, 'dossiers-recents', 'questions-a-traiter'] },
      { name: 'Suivi', widgets: ['activite-recente', 'raccourcis', 'qui-est-connecte'] },
    ],
    'membre',
  ),
  template(
    'client',
    'Espace client',
    'Ce qui concerne ses propres dossiers, sans rien de la gestion de l’étude.',
    'building',
    'role',
    [{ name: 'Mes dossiers', widgets: ['dossiers-recents', 'questions-a-traiter'] }],
    'client',
  ),

  /* --- Par métier ---------------------------------------------------------- */
  template(
    'notaire',
    'Notaire',
    'Vue d’ensemble des dossiers et des questions, puis le suivi de l’étude.',
    'seal',
    'metier',
    [
      {
        name: 'Vue d’ensemble',
        widgets: [...STATS_OFFICE, 'portefeuilles-recents', 'questions-a-traiter'],
      },
      { name: 'Suivi', widgets: ['activite-recente', 'qui-est-connecte', 'raccourcis'] },
    ],
  ),
  template(
    'clerc',
    'Clerc / collaborateur',
    'Les dossiers du jour et les questions ouvertes, l’étude à portée d’onglet.',
    'file',
    'metier',
    [
      { name: 'Mon travail', widgets: [...STATS_OFFICE, 'dossiers-recents', 'questions-a-traiter'] },
      { name: 'Étude', widgets: ['annuaire', 'raccourcis', 'qui-est-connecte'] },
    ],
  ),
  template(
    'assistante',
    'Assistant·e',
    'Les raccourcis et les dossiers récents d’abord, l’annuaire ensuite.',
    'link',
    'metier',
    [
      { name: 'Au quotidien', widgets: ['dossiers-recents', 'raccourcis', 'qui-est-connecte'] },
      { name: 'Étude', widgets: ['annuaire', 'activite-recente'] },
    ],
  ),
  template(
    'client-externe',
    'Client externe',
    'Le strict nécessaire : ses dossiers, ses questions, ce qui a bougé.',
    'eye',
    'metier',
    [
      { name: 'Mes dossiers', widgets: ['dossiers-recents', 'questions-a-traiter'] },
      { name: 'Activité', widgets: ['activite-recente', 'raccourcis'] },
    ],
  ),
];

export const TEMPLATES_BY_ID: Record<string, DashboardTemplate> = Object.fromEntries(
  DASHBOARD_TEMPLATES.map(t => [t.id, t]),
);

/** Template servi à quelqu'un qui n'a jamais rien réorganisé. */
export function templateForRole(role: string | undefined): DashboardTemplate {
  const match = DASHBOARD_TEMPLATES.find(t => t.defaultForRole === role);
  // Un rôle inconnu (ou absent, le temps que la session charge) retombe sur le
  // template le plus restreint plutôt que sur le plus riche : mieux vaut un
  // accueil trop pauvre qu'un accueil qui montre la facturation de l'étude.
  return match ?? TEMPLATES_BY_ID.client;
}

/** Copie profonde des onglets d'un template — l'original ne doit jamais être muté. */
export function pagesOf(t: DashboardTemplate): DashboardPage[] {
  return t.pages.map(page => ({ ...page, widgets: page.widgets.map(w => ({ ...w })) }));
}
