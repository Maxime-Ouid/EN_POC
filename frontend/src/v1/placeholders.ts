/* ===========================================================================
   Rubriques de la navigation V1 dont AUCUNE capture n'a été fournie.

   Chacune donne ce qui est établi (le libellé, l'URL quand elle a été lue dans
   la barre d'état du navigateur, la trace indirecte laissée ailleurs dans
   l'interface) et ce qui manque pour la reconstruire.

   Une rubrique disparaît de ce fichier le jour où son écran existe : la
   longueur de cette liste mesure exactement ce qui reste à relever côté client.

   Sorties le 03/09/2026, parce qu'une matière établie ailleurs dans les
   captures a permis de les reconstruire — chacune affichant à l'écran ce qui
   reste supposé : Annuaire des clients, Statistiques de connexions, Transfert
   de fichiers, Structmaker, Support.
   =========================================================================== */

import type { V1PlaceholderScreenProps } from '../components';
import type { V1ScreenKey } from './nav';

export const PLACEHOLDERS: Partial<Record<V1ScreenKey, V1PlaceholderScreenProps>> = {
  'exports-multiples': {
    role: "Exporter en une fois la documentation de plusieurs dossiers.",
    known: [{ label: 'Source', value: 'Libellé du sous-menu Dossiers uniquement' }],
  },
  'duplication-dossier': {
    role: "Dupliquer un dossier au sein de l'étude — à ne pas confondre avec « Duplications entre études », qui est un écran distinct et, lui, documenté.",
    known: [{ label: 'Source', value: 'Libellé du sous-menu Dossiers uniquement' }],
  },
  'dossiers-inactifs': {
    known: [{ label: 'Source', value: 'Entrée survolée dans le sous-menu (capture 115130)' }],
  },
  'rapports-maj': {
    known: [{ label: 'Source', value: 'Libellé du sous-menu Dossiers uniquement' }],
  },
  'annuaire-societes': {
    known: [{ label: 'Source', value: 'Libellé du sous-menu Annuaires uniquement' }],
  },
  'changement-titulaire': {
    role: "Transférer la titularité d'un dossier d'un membre de l'étude à un autre.",
    known: [{ label: 'URL relevée', value: '?page=swapcreateurdossier (capture 113854)' }],
  },
  telechargements: {
    known: [
      { label: 'Source', value: 'Rubrique de premier niveau, jamais dépliée sur les captures' },
      {
        label: 'Piste',
        value:
          "La carte « Aide » de l'accueil (113344) distribue trois documents — manuel utilisateur, support d'utilisation, formulaire de création d'un accès administrateur : c'est le contenu le plus probable de la rubrique, sans preuve",
      },
      { label: 'Inconnu', value: "On ignore si cette rubrique a un sous-menu" },
    ],
  },
  'suivi-exportations': {
    known: [{ label: 'Source', value: 'Libellé du sous-menu Activités uniquement' }],
  },
  'espace-promoteurs': {
    known: [{ label: 'Source', value: 'Rubrique de premier niveau, jamais ouverte sur les captures' }],
  },
  'outils-controle-integrite': {
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
  'outils-import-katz': {
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
  'outils-import-oudot': {
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
  'outils-reader-csv': {
    known: [{ label: 'Source', value: 'Libellé du sous-menu Outils uniquement' }],
  },
};
