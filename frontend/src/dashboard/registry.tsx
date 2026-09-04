/* ===========================================================================
   Catalogue des widgets.

   Ce fichier est la seule source de vérité sur « ce qui peut être posé sur un
   accueil » : la bibliothèque d'ajout, les templates et le rendu de la grille
   le lisent tous les trois. Ajouter un widget, c'est ajouter une entrée ici —
   pas une migration Django, pas un changement d'API, pas une ligne dans un
   template (les templates nomment des identifiants, ils ne décrivent pas de
   tailles).

   Ce fichier n'est PAS le miroir d'une table côté serveur : le backend stocke
   des placements sans jamais connaître les identifiants (voir types.ts). Un
   widget retiré d'ici disparaît donc des accueils qui le portaient encore, sans
   erreur et sans nettoyage de base à prévoir.
   =========================================================================== */

import type { WidgetDefinition } from './types';
import {
  ActionTileWidget,
  ActionsRapidesWidget,
  ActiviteWidget,
  AnnuaireWidget,
  DossiersActifsWidget,
  DossiersRecentsWidget,
  FacturationWidget,
  MembresConnectesWidget,
  ModulesWidget,
  PortefeuillesWidget,
  QuestionsEnAttenteWidget,
  QuestionsWidget,
  QuiEstConnecteWidget,
  StockageParEspaceWidget,
  StockageWidget,
} from './widgets';

/* --- Trois gabarits, et pas un de plus --------------------------------------
   La grille fait 12 colonnes sur 12 lignes (types.ts). Trois tailles suffisent
   à la remplir exactement, et s'y tenir est ce qui fait qu'un écran tombe juste
   au lieu de laisser des bandes vides :

     STAT   3 × 3   quatre chiffres-clés = une bande pleine (3 lignes)
     PANEL  6 × 9   deux panneaux = le reste de l'écran, à la ligne près
     SIDE   3 × 9   une colonne étroite à côté d'un panneau (6 + 3 + 3 = 12)

   L'écran canonique — quatre STAT puis deux PANEL — occupe 12 lignes pile.
   Une taille inventée hors de ces trois-là se voit tout de suite : elle laisse
   un trou que la grille fermée ne sait pas combler.

   POURQUOI STAT FAIT 3 LIGNES ET NON 2 (corrigé le 31/08/2026). Une StatCard
   demande environ 150 px : libellé, pastille d'icône, valeur en gros, et pour
   « Stockage utilisé » une barre de progression avec sa légende. À 2 lignes
   (~103 px avec la hauteur de ligne réelle), le contenu débordait et chaque
   carte affichait sa propre barre de défilement — un tableau de bord qui
   défile dans ses cases est exactement ce que la grille fermée cherche à
   éviter. La taille MINIMALE vaut 3 elle aussi : on ne doit pas pouvoir
   reproduire le défaut en redimensionnant à la main.
   ------------------------------------------------------------------------ */
const STAT = { w: 3, h: 3 };
const STAT_MIN = { w: 2, h: 3 };
const PANEL = { w: 6, h: 9 };
const PANEL_MIN = { w: 3, h: 4 };
const SIDE = { w: 3, h: 9 };
const SIDE_MIN = { w: 2, h: 4 };

/**
 * Identifiant de la carte multi-actions. HÉRITÉ du widget « Raccourcis » qu'elle
 * remplace — voir son entrée plus bas. Nommé ici parce que l'écran d'accueil a
 * besoin de le reconnaître (c'est le seul widget qui se configure).
 */
export const ACTIONS_CARD_ID = 'raccourcis';

export const WIDGETS: WidgetDefinition[] = [
  /* --- Chiffres ----------------------------------------------------------- */
  {
    id: 'dossiers-actifs',
    name: 'Dossiers actifs',
    desc: "Nombre de dossiers ouverts dans l'office et évolution du mois.",
    icon: 'folder',
    category: 'chiffres',
    screen: 'datarooms',
    defaultSize: STAT,
    minSize: STAT_MIN,
    render: ctx => <DossiersActifsWidget {...ctx} />,
  },
  {
    id: 'stockage',
    name: 'Stockage utilisé',
    desc: "Volume consommé rapporté à l'offre souscrite.",
    icon: 'layers',
    category: 'chiffres',
    screen: 'stats',
    defaultSize: STAT,
    minSize: STAT_MIN,
    render: ctx => <StockageWidget {...ctx} />,
  },
  {
    id: 'questions-en-attente',
    name: 'Questions en attente',
    desc: 'Compteur des questions sans réponse, avec alerte au-delà de 48 h.',
    icon: 'msg',
    category: 'chiffres',
    screen: 'datarooms',
    defaultSize: STAT,
    minSize: STAT_MIN,
    render: ctx => <QuestionsEnAttenteWidget {...ctx} />,
  },
  {
    id: 'membres-connectes',
    name: 'Membres connectés',
    desc: "Comptes actuellement connectés sur les comptes de l'étude.",
    icon: 'users',
    category: 'chiffres',
    screen: 'users',
    defaultSize: STAT,
    minSize: STAT_MIN,
    render: ctx => <MembresConnectesWidget {...ctx} />,
  },

  /* --- Suivi -------------------------------------------------------------- */
  {
    id: 'activite-recente',
    name: 'Activité récente',
    desc: "Derniers dépôts, questions et connexions de l'office.",
    icon: 'clock',
    category: 'suivi',
    screen: 'stats',
    defaultSize: PANEL,
    minSize: PANEL_MIN,
    render: ctx => <ActiviteWidget {...ctx} />,
  },
  {
    id: 'questions-a-traiter',
    name: 'Questions à traiter',
    desc: 'Les questions ouvertes, de la plus ancienne à la plus récente.',
    icon: 'msg',
    category: 'suivi',
    screen: 'datarooms',
    defaultSize: PANEL,
    minSize: PANEL_MIN,
    render: ctx => <QuestionsWidget {...ctx} />,
  },
  {
    id: 'qui-est-connecte',
    name: 'Qui est connecté',
    desc: 'Sessions ouvertes en ce moment et depuis combien de temps.',
    icon: 'eye',
    category: 'suivi',
    screen: 'stats',
    defaultSize: SIDE,
    minSize: SIDE_MIN,
    render: ctx => <QuiEstConnecteWidget {...ctx} />,
  },

  /* --- Listes ------------------------------------------------------------- */
  {
    id: 'portefeuilles-recents',
    name: 'Portefeuilles récents',
    desc: 'Les portefeuilles ouverts en dernier, avec leur statut.',
    icon: 'layers',
    category: 'listes',
    screen: 'portfolios',
    defaultSize: PANEL,
    minSize: PANEL_MIN,
    render: ctx => <PortefeuillesWidget {...ctx} />,
  },
  {
    id: 'dossiers-recents',
    name: 'Dossiers récents',
    desc: 'Les derniers dossiers créés ou consultés, ouvrables en un clic.',
    icon: 'folder',
    category: 'listes',
    screen: 'datarooms',
    defaultSize: PANEL,
    minSize: PANEL_MIN,
    render: ctx => <DossiersRecentsWidget {...ctx} />,
  },
  {
    id: 'stockage-par-espace',
    name: 'Stockage par espace client',
    desc: 'Répartition du volume entre les espaces, alerte sur les débordements.',
    icon: 'building',
    category: 'listes',
    screen: 'stats',
    defaultSize: PANEL,
    minSize: PANEL_MIN,
    render: ctx => <StockageParEspaceWidget {...ctx} />,
  },
  {
    id: 'facturation',
    name: 'Facturation',
    desc: 'Les dernières périodes facturées et leur montant hors taxes.',
    icon: 'file',
    category: 'listes',
    screen: 'stats',
    defaultSize: SIDE,
    minSize: SIDE_MIN,
    render: ctx => <FacturationWidget {...ctx} />,
  },

  /* --- Office ------------------------------------------------------------- */
  {
    id: 'annuaire',
    name: "Annuaire de l'étude",
    desc: 'Membres de l’office, leur groupe et leur dernier accès.',
    icon: 'users',
    category: 'office',
    screen: 'users',
    defaultSize: PANEL,
    minSize: PANEL_MIN,
    render: ctx => <AnnuaireWidget {...ctx} />,
  },
  {
    id: 'modules-actifs',
    name: 'Modules',
    desc: "Modules Notantis activés pour l'office.",
    icon: 'grid',
    category: 'office',
    screen: 'settings',
    defaultSize: SIDE,
    minSize: SIDE_MIN,
    render: ctx => <ModulesWidget {...ctx} />,
  },

  /* --- Actions -------------------------------------------------------------
     Ces widgets n'abrègent aucun écran : ils déclenchent un geste (voir
     actions.ts). D'où `screen: null` partout ici — le cadre n'affiche donc pas
     de lien « Tout voir », qui n'aurait aucune destination.

     POURQUOI TROIS TUILES ET PAS UNE PAR ACTION. Le catalogue compte neuf
     actions ; en faire neuf widgets doublerait la bibliothèque pour y mettre
     neuf fois la même chose. Les trois retenues sont celles qu'on veut sous la
     main en permanence, à côté des chiffres-clés ; les six autres se posent
     dans la carte, qui existe pour ça.
     ---------------------------------------------------------------------- */
  {
    // Identifiant HÉRITÉ du widget « Raccourcis », volontairement conservé :
    // c'est lui qui est écrit dans les accueils déjà rangés et dans les
    // templates. Le renommer aurait fait disparaître la carte de tous les
    // accueils qui la portaient (resolveWidgets écarte les inconnus), pour ne
    // gagner qu'un nom de variable plus joli.
    id: ACTIONS_CARD_ID,
    name: 'Actions rapides',
    desc: 'Les gestes du quotidien en un clic — contenu au choix.',
    icon: 'link',
    category: 'actions',
    screen: null,
    defaultSize: SIDE,
    minSize: SIDE_MIN,
    render: (ctx, { options }) => <ActionsRapidesWidget {...ctx} options={options} />,
  },
  {
    id: 'action-dossier',
    name: 'Créer un dossier',
    desc: 'Tuile unique : ouvre la création d’un dossier.',
    icon: 'folder',
    category: 'actions',
    screen: null,
    defaultSize: STAT,
    minSize: STAT_MIN,
    bare: true,
    action: 'dossier',
    render: ctx => <ActionTileWidget {...ctx} actionKey="dossier" />,
  },
  {
    id: 'action-depot',
    name: 'Déposer un fichier',
    desc: 'Tuile unique : ouvre le dernier dossier créé, prêt pour un dépôt.',
    icon: 'clip',
    category: 'actions',
    screen: null,
    defaultSize: STAT,
    minSize: STAT_MIN,
    bare: true,
    action: 'depot',
    render: ctx => <ActionTileWidget {...ctx} actionKey="depot" />,
  },
  {
    id: 'action-invite',
    name: 'Inviter un utilisateur',
    desc: 'Tuile unique : ouvre l’invitation d’un membre ou d’un client.',
    icon: 'send',
    category: 'actions',
    screen: null,
    defaultSize: STAT,
    minSize: STAT_MIN,
    bare: true,
    action: 'invite',
    render: ctx => <ActionTileWidget {...ctx} actionKey="invite" />,
  },
];

export const WIDGETS_BY_ID: Record<string, WidgetDefinition> = Object.fromEntries(
  WIDGETS.map(w => [w.id, w]),
);

/** Libellés des familles, dans l'ordre d'affichage de la bibliothèque. */
export const WIDGET_CATEGORIES: { key: WidgetDefinition['category']; label: string }[] = [
  { key: 'chiffres', label: 'Chiffres clés' },
  { key: 'suivi', label: 'Suivi' },
  { key: 'listes', label: 'Listes' },
  { key: 'office', label: 'Office' },
  { key: 'actions', label: 'Actions' },
];

/* --- Couverture des écrans -------------------------------------------------
   « Chaque écran a sa version widget » est une promesse produit : elle doit
   pouvoir échouer bruyamment plutôt que se déliter écran par écran. La liste
   ci-dessous est donc écrite à la main — un écran ajouté à la navigation sans
   widget correspondant fait apparaître un avertissement en développement, ce
   que personne ne peut obtenir en relisant registry.tsx de temps en temps.

   `dashboard` en est volontairement absent : l'accueil ne s'abrège pas
   lui-même.
   ------------------------------------------------------------------------ */
export const SCREENS_EXPECTING_WIDGET = [
  'portfolios',
  'datarooms',
  'stats',
  'users',
  'settings',
] as const;

/** Écrans annoncés comme couverts mais qu'aucun widget n'abrège. */
export function screensWithoutWidget(): string[] {
  const covered = new Set(WIDGETS.map(w => w.screen).filter(Boolean));
  return SCREENS_EXPECTING_WIDGET.filter(screen => !covered.has(screen));
}

if (import.meta.env.DEV) {
  const missing = screensWithoutWidget();
  if (missing.length > 0) {
    console.warn(
      `[dashboard] écrans sans version widget : ${missing.join(', ')} — ` +
        'ajouter une entrée dans WIDGETS ou retirer l’écran de SCREENS_EXPECTING_WIDGET.',
    );
  }
}
