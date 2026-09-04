/* ===========================================================================
   Vocabulaire du tableau de bord modulable.

   Trois notions à ne pas confondre :

     - un WIDGET est une définition (registry.tsx) : un identifiant, un libellé,
       une taille naturelle et une façon de se dessiner. Il n'a pas de position.
     - un PLACEMENT est une position dans la grille de QUELQU'UN. C'est la seule
       chose qui voyage jusqu'au serveur (OfficeMembership.dashboard).
     - un TEMPLATE est une liste de placements toute faite (templates.ts), le
       point de départ d'un profil qui n'a encore rien réorganisé.

   Le serveur ne connaît QUE les placements, et seulement leur forme : les
   identifiants de widgets ne sont validés nulle part côté Django (voir
   validators.clean_dashboard_payload). C'est volontaire — ajouter un widget ne
   doit pas demander de migration — et cela a une conséquence qu'il faut tenir :
   une disposition lue peut contenir un widget supprimé depuis. `resolveWidgets`
   les écarte silencieusement plutôt que de faire planter l'accueil.
   =========================================================================== */

import type { ReactNode } from 'react';
import type { PillKind } from '../components/atoms/Pill';

/* --- Géométrie de la grille ------------------------------------------------
   La grille est FERMÉE : 12 colonnes sur 12 lignes, et c'est tout. Un écran ne
   défile pas, il se remplit — et quand il est plein, on ouvre un onglet.

   C'est un choix de produit, pas une limite technique : un tableau de bord dont
   il faut faire défiler le bas cesse d'être un tableau de bord, puisqu'il ne
   montre plus tout d'un coup d'œil. La conséquence à assumer est qu'ajouter un
   widget à un écran plein est REFUSÉ, avec un message qui propose l'onglet.

   La hauteur d'une ligne n'est donc pas une constante : elle se calcule sur la
   place réellement disponible (voir DashboardScreen), avec un plancher pour que
   les widgets restent lisibles dans une fenêtre courte — dans ce cas seulement,
   la page redevient défilante.
   ------------------------------------------------------------------------ */

export const DASHBOARD_COLS = 12;
export const DASHBOARD_ROWS = 12;

/** Espace entre deux cases, en pixels — doit rester d'accord avec DashboardGrid. */
export const DASHBOARD_MARGIN = 16;

/**
 * Plancher de la hauteur de ligne. En deçà, on laisse la page défiler plutôt
 * que d'écraser les cartes.
 *
 * La valeur n'est pas arbitraire : le plus petit gabarit (STAT, 3 lignes — voir
 * registry.tsx) doit rester au-dessus des ~150 px qu'exige une carte de
 * chiffre-clé. Avec 3 lignes et une marge de 16 px entre elles, il faut
 * 3 × 40 + 2 × 16 = 152 px. Baisser ce plancher, c'est ramener les barres de
 * défilement à l'intérieur des cartes.
 */
export const DASHBOARD_MIN_ROW_HEIGHT = 40;

/** Hauteur d'une ligne pour une hauteur disponible donnée. */
export function rowHeightFor(availableHeight: number): number {
  const usable = availableHeight - DASHBOARD_MARGIN * (DASHBOARD_ROWS - 1);
  return Math.max(DASHBOARD_MIN_ROW_HEIGHT, Math.floor(usable / DASHBOARD_ROWS));
}

/** Position et taille d'un widget dans la grille de quelqu'un. */
export interface WidgetPlacement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Réglages propres au widget. Le backend les borne sans les interpréter. */
  options?: Record<string, string | number | boolean>;
}

/** Un onglet : un écran complet de widgets, nommé par son propriétaire. */
export interface DashboardPage {
  id: string;
  name: string;
  widgets: WidgetPlacement[];
}

/** Ce qui est stocké pour un membre : son template d'origine et ses onglets. */
export interface DashboardState {
  /** Template appliqué en dernier — sert à afficher « vous êtes parti de… ». */
  template: string | null;
  pages: DashboardPage[];
}

/** Au-delà, la barre d'onglets devient illisible et le stockage déraisonnable. */
export const DASHBOARD_MAX_PAGES = 8;

/** Un nom d'onglet plus long ne tient pas dans la barre. */
export const DASHBOARD_MAX_PAGE_NAME = 32;

/** Familles de widgets, pour regrouper la bibliothèque d'ajout. */
export type WidgetCategory = 'chiffres' | 'suivi' | 'listes' | 'office' | 'actions';

export interface WidgetDefinition {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: WidgetCategory;
  /**
   * Écran dont ce widget est la version compacte, au sens des clés de
   * navigation d'App.tsx (`dashboard`, `datarooms`, `stats`…). `null` pour les
   * widgets qui n'abrègent aucun écran — les raccourcis, par exemple.
   *
   * C'est ce qui fait de « chaque écran a sa version widget » une propriété
   * vérifiable plutôt qu'une intention : voir le test de couverture en bas de
   * registry.tsx.
   */
  screen: string | null;
  /** Taille posée à l'ajout et dans les templates. */
  defaultSize: { w: number; h: number };
  /** En-deçà, le contenu devient illisible — la grille refuse de descendre. */
  minSize: { w: number; h: number };
  /**
   * Le contenu porte DÉJÀ sa propre carte : le cadre se réduit alors à la
   * couche d'édition, sans quoi on obtiendrait deux bordures concentriques.
   * Vrai pour les chiffres-clés (StatCard) et pour les tuiles d'action, dont
   * la carte entière EST le bouton. Non renseigné, la famille décide — c'était
   * la règle avant que les tuiles existent, et les widgets écrits sous cette
   * règle continuent de valoir ce qu'ils valaient.
   */
  bare?: boolean;
  /**
   * Action rapide dont ce widget est la tuile (voir dashboard/actions.ts).
   * C'est ce qui permet de ne PAS proposer dans la bibliothèque une tuile dont
   * l'action est fermée au membre — un widget qu'on peut ajouter pour n'y lire
   * qu'un refus n'a pas sa place dans un catalogue.
   */
  action?: string;
  render: (ctx: WidgetContext, props: WidgetRenderProps) => ReactNode;
}

/** Ce qu'un widget sait de SON placement au moment de se dessiner. */
export interface WidgetRenderProps {
  /**
   * Réglages du placement (voir `WidgetPlacement.options`) — le contenu choisi
   * de la carte d'actions, par exemple. Absents pour un widget qui n'en a pas.
   */
  options?: Record<string, string | number | boolean>;
  /**
   * L'accueil est en mode édition. Les widgets n'ont rien à en faire pour
   * l'instant (le CSS neutralise déjà les commandes de leur corps — voir
   * `.widget-editing .widget-body button` dans dashboard.css) ; c'est passé
   * pour qu'un widget dont l'état d'édition changerait le CONTENU n'ait pas à
   * inventer son propre chemin.
   */
  editing: boolean;
}

/* --- Données servies aux widgets -------------------------------------------
   Un widget ne va JAMAIS chercher ses données lui-même : il reçoit ce contexte.
   Sans cette règle, quinze widgets sur un même écran voudraient dire quinze
   chargements concurrents au montage de l'accueil, et une bibliothèque de
   widgets impossible à prévisualiser.
   ------------------------------------------------------------------------ */

export interface HomeStats {
  activeDatarooms: number;
  activeDeltaText: string;
  storageUsedGo: number;
  storageQuotaGo: number;
  pendingQuestions: number;
  pendingWarnText: string;
  connectedMembers: number;
  totalMembers: number;
}

export interface WidgetPortfolio {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  name: string;
  desc: string;
  status: { kind: PillKind; label: string };
}

export interface WidgetActivityEntry {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  text: ReactNode;
  time: string;
}

export interface WidgetQuestion {
  id: string;
  status: { kind: PillKind; label: string };
  object: string;
  meta: string;
}

export interface WidgetPerson {
  id: string;
  initials: string;
  name: string;
  detail: string;
  status?: { kind: PillKind; label: string };
}

export interface WidgetDataroom {
  id: string;
  name: string;
  meta: string;
}

export interface WidgetUsageRow {
  id: string;
  name: string;
  detail: string;
  percent: number;
  warning?: boolean;
}

export interface WidgetInvoice {
  id: string;
  period: string;
  detail: string;
  amount: string;
}

export interface WidgetModule {
  slug: string;
  name: string;
  enabled: boolean;
}

export interface WidgetContext {
  stats: HomeStats;
  portfolios: WidgetPortfolio[];
  activity: WidgetActivityEntry[];
  questions: WidgetQuestion[];
  members: WidgetPerson[];
  connected: WidgetPerson[];
  datarooms: WidgetDataroom[];
  usage: WidgetUsageRow[];
  invoices: WidgetInvoice[];
  modules: WidgetModule[];
  /** Ouvre l'écran complet correspondant — même clé que la navigation d'App. */
  navigate: (screen: string) => void;
  /**
   * Déclenche une action rapide (voir dashboard/actions.ts) : ouvrir la
   * création d'un dossier, la palette de recherche… Un widget ne fait donc
   * jamais l'action lui-même — il nomme le geste, l'application l'exécute.
   */
  runAction: (key: string) => void;
  /**
   * Actions praticables ici et maintenant : droits du membre, et commandes que
   * la coquille sait rendre. Ce qui n'y figure pas n'est proposé nulle part.
   */
  allowedActions: readonly string[];
}
