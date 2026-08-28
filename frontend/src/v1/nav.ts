/* ===========================================================================
   Navigation de l'Espace Notarial ACTUEL (V1, admin.espacenotarial.com),
   reconstruite à l'identique avec les composants du design system V2.

   Source : captures de l'interface de production rangées dans
   docs/reference-v1/ (relevé du 25/08/2026, office de démonstration
   « BRIAND & HAMON »). L'ordre des rubriques, les libellés et les sous-menus
   sont ceux constatés à l'écran, y compris quand ils surprennent — le but de
   cette reconstruction est de servir de base de discussion sur ce qui doit
   bouger en V2, pas de corriger la V1 en douce.

   Ce qui n'a PAS été observé est signalé comme tel :
     - les sous-menus de « Téléchargements », « Transfert de fichiers »,
       « Espace promoteurs » et « Support » n'ont jamais été dépliés sur les
       captures : ces rubriques sont donc modélisées SANS sous-entrées, ce qui
       est une hypothèse, pas un fait ;
     - la 2ᵉ entrée du sous-menu « Personnalisation » était masquée par le
       curseur ; elle est lue « En-tête des emails » — à confirmer côté client.
   =========================================================================== */

import type { NavSection } from '../components';

/** Clé d'écran de la reconstruction V1 (une par entrée de navigation). */
export type V1ScreenKey =
  | 'accueil'
  | 'dossiers'
  | 'exports-multiples'
  | 'espaces-clients'
  | 'duplication-dossier'
  | 'duplications-etudes'
  | 'dossiers-inactifs'
  | 'rapports-maj'
  | 'annuaire-etude'
  | 'annuaire-clients'
  | 'annuaire-societes'
  | 'admins-par-dossier'
  | 'changement-titulaire'
  | 'telechargements'
  | 'stats-consultations'
  | 'stats-connexions'
  | 'suivi-exportations'
  | 'qui-est-connecte'
  | 'facturation'
  | 'transfert-fichiers'
  | 'espace-promoteurs'
  | 'perso-coordonnees'
  | 'perso-emails'
  | 'perso-apparence'
  | 'perso-accueil'
  | 'perso-espace-client'
  | 'perso-modules'
  | 'outils-transfert-data'
  | 'outils-structmaker'
  | 'outils-controle-integrite'
  | 'outils-import-katz'
  | 'outils-import-oudot'
  | 'outils-reader-csv'
  | 'support';

/**
 * Sections de la sidebar. La V1 n'affiche aucun intitulé de groupe : les
 * libellés servent uniquement de clés React et sont masqués à l'écran par
 * `hideSectionLabels` sur l'AppShell.
 */
export const NAV_V1: NavSection[] = [
  {
    label: 'v1',
    items: [
      { key: 'accueil', icon: 'home', label: 'Accueil' },
      {
        key: 'dossiers-group',
        icon: 'folder',
        label: 'Dossiers',
        items: [
          { key: 'dossiers', label: 'Dossiers' },
          { key: 'exports-multiples', label: 'Exports multiples' },
          { key: 'espaces-clients', label: 'Espaces clients' },
          { key: 'duplication-dossier', label: "Duplication d'un dossier" },
          { key: 'duplications-etudes', label: 'Duplications entre études' },
          { key: 'dossiers-inactifs', label: 'Dossiers inactifs' },
          { key: 'rapports-maj', label: 'Rapports de mise à jour' },
        ],
      },
      {
        key: 'annuaires-group',
        icon: 'users',
        label: 'Annuaires',
        items: [
          { key: 'annuaire-etude', label: "Annuaire de l'étude" },
          { key: 'annuaire-clients', label: 'Annuaire des clients' },
          { key: 'annuaire-societes', label: 'Annuaire des sociétés' },
          { key: 'admins-par-dossier', label: 'Administrateurs par dossier' },
          { key: 'changement-titulaire', label: 'Changement de titulaire' },
        ],
      },
      { key: 'telechargements', icon: 'down', label: 'Téléchargements' },
      {
        key: 'activites-group',
        icon: 'clock',
        label: 'Activités',
        items: [
          { key: 'stats-consultations', label: 'Statistiques de consultations' },
          { key: 'stats-connexions', label: 'Statistiques de connexions' },
          { key: 'suivi-exportations', label: 'Suivi des exportations' },
          { key: 'qui-est-connecte', label: 'Qui est connecté ?' },
          { key: 'facturation', label: 'Facturation du service' },
        ],
      },
      { key: 'transfert-fichiers', icon: 'send', label: 'Transfert de fichiers' },
      { key: 'espace-promoteurs', icon: 'building', label: 'Espace promoteurs' },
      {
        key: 'personnalisation-group',
        icon: 'settings',
        label: 'Personnalisation',
        items: [
          { key: 'perso-coordonnees', label: "Coordonnées et logo de l'office" },
          { key: 'perso-emails', label: 'En-tête des emails' },
          { key: 'perso-apparence', label: 'Apparence' },
          { key: 'perso-accueil', label: 'Accueil & mentions' },
          { key: 'perso-espace-client', label: 'Espace client' },
          { key: 'perso-modules', label: 'Modules & modèles' },
        ],
      },
      {
        key: 'outils-group',
        icon: 'grid',
        label: 'Outils',
        items: [
          { key: 'outils-transfert-data', label: 'Transfert Data' },
          { key: 'outils-structmaker', label: 'Structmaker' },
          { key: 'outils-controle-integrite', label: "Contrôle d'intégrité" },
          { key: 'outils-import-katz', label: 'Import "Katz / Wargny"' },
          { key: 'outils-import-oudot', label: 'Import "Oudot.net"' },
          { key: 'outils-reader-csv', label: 'EspaceNotarialReader -> CSV' },
        ],
      },
      { key: 'support', icon: 'msg', label: 'Support' },
    ],
  },
];

/** Libellé affiché dans le fil d'Ariane pour chaque écran. */
export const V1_CRUMBS: Record<V1ScreenKey, string> = {
  accueil: 'Accueil',
  dossiers: 'Dossiers',
  'exports-multiples': 'Exports multiples',
  'espaces-clients': 'Espaces clients',
  'duplication-dossier': "Duplication d'un dossier",
  'duplications-etudes': 'Duplications entre études',
  'dossiers-inactifs': 'Dossiers inactifs',
  'rapports-maj': 'Rapports de mise à jour',
  'annuaire-etude': "Annuaire de l'étude",
  'annuaire-clients': 'Annuaire des clients',
  'annuaire-societes': 'Annuaire des sociétés',
  'admins-par-dossier': 'Administrateurs par dossier',
  'changement-titulaire': 'Changement de titulaire',
  telechargements: 'Téléchargements',
  'stats-consultations': 'Statistiques de consultations',
  'stats-connexions': 'Statistiques de connexions',
  'suivi-exportations': 'Suivi des exportations',
  'qui-est-connecte': 'Qui est connecté ?',
  facturation: 'Facturation du service',
  'transfert-fichiers': 'Transfert de fichiers',
  'espace-promoteurs': 'Espace promoteurs',
  'perso-coordonnees': "Coordonnées et logo de l'office",
  'perso-emails': 'En-tête des emails',
  'perso-apparence': 'Apparence',
  'perso-accueil': 'Accueil & mentions',
  'perso-espace-client': 'Espace client',
  'perso-modules': 'Modules & modèles',
  'outils-transfert-data': 'Transfert Data',
  'outils-structmaker': 'Structmaker',
  'outils-controle-integrite': "Contrôle d'intégrité",
  'outils-import-katz': 'Import "Katz / Wargny"',
  'outils-import-oudot': 'Import "Oudot.net"',
  'outils-reader-csv': 'EspaceNotarialReader -> CSV',
  support: 'Support',
};

/** Onglet de l'écran Personnalisation correspondant à une entrée de navigation. */
export const PERSO_TABS: Record<string, string> = {
  'perso-coordonnees': 'coordonnees',
  'perso-emails': 'emails',
  'perso-apparence': 'apparence',
  'perso-accueil': 'accueil',
  'perso-espace-client': 'espace-client',
  'perso-modules': 'modules',
};
