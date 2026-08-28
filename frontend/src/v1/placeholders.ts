/* ===========================================================================
   Rubriques de la navigation V1 dont AUCUNE capture n'a été fournie.

   Chacune donne ce qui est établi (le libellé, l'URL quand elle a été lue dans
   la barre d'état du navigateur, la trace indirecte laissée ailleurs dans
   l'interface) et ce qui manque pour la reconstruire.

   Une rubrique disparaît de ce fichier le jour où son écran existe : la
   longueur de cette liste mesure exactement ce qui reste à relever côté client.
   =========================================================================== */

import type { V1PlaceholderScreenProps } from '../components';
import type { V1ScreenKey } from './nav';

export const PLACEHOLDERS: Partial<Record<V1ScreenKey, V1PlaceholderScreenProps>> = {
  'exports-multiples': {
    eyebrow: 'Dossiers',
    title: 'Exports multiples',
    role: "Exporter en une fois la documentation de plusieurs dossiers.",
    known: [{ label: 'Source', value: 'Libellé du sous-menu Dossiers uniquement' }],
  },
  'duplication-dossier': {
    eyebrow: 'Dossiers',
    title: "Duplication d'un dossier",
    role: "Dupliquer un dossier au sein de l'étude — à ne pas confondre avec « Duplications entre études », qui est un écran distinct et, lui, documenté.",
    known: [{ label: 'Source', value: 'Libellé du sous-menu Dossiers uniquement' }],
  },
  'dossiers-inactifs': {
    eyebrow: 'Dossiers',
    title: 'Dossiers inactifs',
    known: [{ label: 'Source', value: 'Entrée survolée dans le sous-menu (capture 115130)' }],
  },
  'rapports-maj': {
    eyebrow: 'Dossiers',
    title: 'Rapports de mise à jour',
    known: [{ label: 'Source', value: 'Libellé du sous-menu Dossiers uniquement' }],
  },
  'annuaire-clients': {
    eyebrow: 'Annuaires',
    title: 'Annuaire des clients',
    role: "Contacts extérieurs à l'étude, ajoutables comme membres d'un dossier.",
    known: [
      {
        label: 'Trace indirecte',
        value: "Existe comme onglet dans l'écran « Membres du dossier » (capture 114216), son contenu n'y est pas visible",
      },
    ],
  },
  'annuaire-societes': {
    eyebrow: 'Annuaires',
    title: 'Annuaire des sociétés',
    known: [{ label: 'Source', value: 'Libellé du sous-menu Annuaires uniquement' }],
  },
  'changement-titulaire': {
    eyebrow: 'Annuaires',
    title: 'Changement de titulaire',
    role: "Transférer la titularité d'un dossier d'un membre de l'étude à un autre.",
    known: [{ label: 'URL relevée', value: '?page=swapcreateurdossier (capture 113854)' }],
  },
  telechargements: {
    title: 'Téléchargements',
    known: [
      { label: 'Source', value: 'Rubrique de premier niveau, jamais dépliée sur les captures' },
      { label: 'Inconnu', value: "On ignore si cette rubrique a un sous-menu" },
    ],
  },
  'stats-connexions': {
    eyebrow: 'Activités',
    title: 'Statistiques de connexions',
    known: [
      {
        label: 'Hypothèse',
        value: "Probablement le même formulaire période/utilisateurs que « Statistiques de consultations » — à vérifier, pas à supposer",
      },
    ],
  },
  'suivi-exportations': {
    eyebrow: 'Activités',
    title: 'Suivi des exportations',
    known: [{ label: 'Source', value: 'Libellé du sous-menu Activités uniquement' }],
  },
  'transfert-fichiers': {
    title: 'Transfert de fichiers',
    role: 'Envoyer ou recevoir des fichiers volumineux avec un client.',
    known: [
      {
        label: 'Trace indirecte',
        value: "Tuile « TRANSFERT de fichiers volumineux » sur l'accueil (113344) et entrée du menu client (113322)",
      },
      { label: 'Inconnu', value: "L'écran administrateur lui-même n'est sur aucune capture" },
    ],
  },
  'espace-promoteurs': {
    title: 'Espace promoteurs',
    known: [{ label: 'Source', value: 'Rubrique de premier niveau, jamais ouverte sur les captures' }],
  },
  'outils-structmaker': {
    eyebrow: 'Outils',
    title: 'Structmaker',
    role: "Importer l'arborescence complète d'un dossier Windows vers une dataroom.",
    known: [{ label: 'Trace indirecte', value: "Descriptif de la tuile « Structmaker » de l'accueil (113344)" }],
  },
  'outils-controle-integrite': {
    eyebrow: 'Outils',
    title: "Contrôle d'intégrité",
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
  'outils-import-katz': {
    eyebrow: 'Outils',
    title: 'Import "Katz / Wargny"',
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
  'outils-import-oudot': {
    eyebrow: 'Outils',
    title: 'Import "Oudot.net"',
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
  'outils-reader-csv': {
    eyebrow: 'Outils',
    title: 'EspaceNotarialReader -> CSV',
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
  support: {
    title: 'Support',
    role: "Contact de l'équipe applicative et signalement d'incident.",
    known: [
      {
        label: 'Trace indirecte',
        value: "Carte « Support » de l'accueil : support.applicatif@paris.notaires.fr, 01.76.53.73.91, bouton « Envoyer un message »",
      },
      { label: 'Inconnu', value: "On ignore si la rubrique a un sous-menu" },
    ],
  },
};
