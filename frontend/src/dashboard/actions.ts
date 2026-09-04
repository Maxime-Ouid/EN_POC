/* ===========================================================================
   Catalogue des ACTIONS RAPIDES.

   Un widget de suivi répond à « où en est-on ? ». Une action rapide répond à
   « je veux faire ça, maintenant » — et elle doit le FAIRE, pas déposer
   l'utilisateur devant l'écran où le bouton se trouve. « Créer un dossier »
   ouvre donc la fenêtre de création, pas la liste des dossiers.

   Ce fichier est la seule source de vérité sur ce qu'on peut déclencher depuis
   l'accueil. Il est lu par trois endroits :

     - la carte « Actions rapides » et les tuiles unitaires (widgets.tsx) ;
     - la fenêtre de configuration de la carte (QuickActionsModal.tsx) ;
     - App.tsx, qui EXÉCUTE (`runAction`) — lui seul sait ouvrir une modale.

   Deux règles tenues ici :

   1. AUCUNE ACTION MENTEUSE. Un libellé promet ce qui va se passer. Le dépôt
      de fichier exige un dossier ouvert : l'action ouvre le dernier dossier
      créé (et la liste s'il n'y en a aucun), ce que son libellé dit.
   2. LES DROITS FILTRENT LE CATALOGUE, pas seulement les boutons. Une action
      réservée aux administrateurs ne s'affiche pas grisée chez un client :
      elle n'existe pas pour lui, ni dans la carte, ni dans la bibliothèque de
      widgets (voir `allowedActionKeys`).
   =========================================================================== */

/** Qui exécute l'action. */
export type QuickActionRunner =
  /** L'application : navigation, ouverture d'une modale (App.runAction). */
  | 'app'
  /**
   * La coquille : la palette de recherche vit dans AppShell, au-dessus de
   * l'accueil, et son ouverture passe par le contexte de commandes
   * (components/templates/shellCommands.ts) — pas par App.tsx, qui est encore
   * au-dessus et n'a pas cet état chez lui.
   */
  | 'shell';

export interface QuickActionDefinition {
  /**
   * Identifiant COURT, en minuscules-tirets. Il voyage dans les réglages du
   * placement (`WidgetPlacement.options`), que le serveur borne à 120
   * caractères par valeur : c'est ce qui interdit les clés bavardes, et la
   * vérification en bas de ce fichier le rappelle si on l'oublie.
   */
  key: string;
  /** Ce que promet le bouton — à l'impératif, comme partout dans l'interface. */
  label: string;
  /** Ce qui va réellement se passer, pour la bibliothèque et la configuration. */
  desc: string;
  icon: string;
  runner: QuickActionRunner;
  /**
   * Réservée à qui administre l'étude (le prédicat `canManageOffice` d'App :
   * admin ou superadmin). Le serveur refuse déjà l'écriture aux autres — on
   * évite ici de proposer un geste qui finirait en 403.
   */
  officeOnly?: boolean;
}

export const QUICK_ACTIONS: QuickActionDefinition[] = [
  {
    key: 'dossier',
    label: 'Créer un dossier',
    desc: 'Ouvre la fenêtre de création d’un dossier, modèle d’arborescence compris.',
    icon: 'folder',
    runner: 'app',
  },
  {
    key: 'depot',
    label: 'Déposer un fichier',
    desc: 'Ouvre le dernier dossier créé, prêt à recevoir un dépôt.',
    icon: 'clip',
    runner: 'app',
  },
  {
    key: 'recherche',
    label: 'Rechercher',
    desc: 'Ouvre la recherche transverse (⌘K) : dossiers, clients, questions, factures.',
    icon: 'search',
    runner: 'shell',
  },
  {
    key: 'invite',
    label: 'Inviter un utilisateur',
    desc: 'Ouvre la création d’un compte ou le rattachement d’un utilisateur existant.',
    icon: 'send',
    runner: 'app',
    officeOnly: true,
  },
  {
    key: 'modele',
    label: 'Créer un modèle',
    desc: 'Ouvre la création d’un modèle de dossier, dans Personnalisation.',
    icon: 'file',
    runner: 'app',
    officeOnly: true,
  },
  /* --- Destinations ---------------------------------------------------------
     Une destination n'est pas une action, mais elle a sa place dans la même
     carte : ce que l'utilisateur veut, c'est une liste de gestes fréquents, et
     séparer « ouvrir » de « créer » dans deux widgets voisins n'aurait de sens
     que pour qui a écrit le code. C'est aussi ce que faisait le widget
     « Raccourcis » d'origine, dont cette carte est la suite.
     --------------------------------------------------------------------- */
  {
    key: 'portefeuilles',
    label: 'Portefeuilles',
    desc: 'Ouvre l’écran des portefeuilles.',
    icon: 'layers',
    runner: 'app',
  },
  {
    key: 'annuaire',
    label: 'Annuaire de l’étude',
    desc: 'Ouvre la liste des membres de l’office.',
    icon: 'users',
    runner: 'app',
  },
  {
    key: 'stats',
    label: 'Statistiques',
    desc: 'Ouvre les statistiques et la facturation.',
    icon: 'clock',
    runner: 'app',
  },
  {
    key: 'apparence',
    label: 'Personnalisation',
    desc: 'Ouvre les réglages de l’office : identité, apparence, modules, modèles.',
    icon: 'settings',
    runner: 'app',
  },
];

export const QUICK_ACTIONS_BY_KEY: Record<string, QuickActionDefinition> = Object.fromEntries(
  QUICK_ACTIONS.map(a => [a.key, a]),
);

/**
 * Actions praticables par ce membre. Filtre le catalogue ENTIER : ce qui n'est
 * pas là n'est proposé nulle part.
 */
export function allowedActionKeys(canManageOffice: boolean): string[] {
  return QUICK_ACTIONS.filter(a => !a.officeOnly || canManageOffice).map(a => a.key);
}

/* --- Contenu de la carte, rangé dans les réglages du placement -------------
   Le serveur stocke les réglages d'un widget sans les interpréter : un
   dictionnaire plat de scalaires, 10 clés au plus, 120 caractères par valeur
   (voir backend validators._clean_widget_options). D'où UNE clé, `actions`,
   qui porte la liste ORDONNÉE des identifiants séparés par des virgules —
   plutôt qu'un booléen par action, qui perdrait l'ordre choisi et mangerait
   les 10 clés disponibles.
   ------------------------------------------------------------------------ */

/** Clé de réglage portant la liste des actions de la carte. */
export const ACTIONS_OPTION_KEY = 'actions';

/** Longueur maximale d'une valeur de réglage, côté serveur. */
const OPTION_VALUE_MAX = 120;

/**
 * Au-delà, la carte cesse d'être une liste de gestes fréquents pour devenir un
 * second menu — et sur le gabarit étroit (3 × 9) les libellés se chevauchent.
 */
export const MAX_CARD_ACTIONS = 8;

/** Contenu par défaut : les gestes du quotidien d'abord, les destinations ensuite. */
export const DEFAULT_CARD_ACTIONS = [
  'dossier',
  'depot',
  'recherche',
  'portefeuilles',
  'annuaire',
  'stats',
];

type PlacementOptions = Record<string, string | number | boolean> | undefined;

/**
 * Actions à afficher dans la carte, pour un placement donné.
 *
 * Les inconnues et les interdites sont écartées SILENCIEUSEMENT, comme le fait
 * `resolveWidgets` pour les widgets : un catalogue qui évolue ou un rôle qui
 * change ne doit pas casser un accueil rangé, ni afficher un bouton mort.
 * Réglage absent = contenu par défaut, ce qui rend la carte utile dès son
 * ajout sans passer par la configuration.
 */
export function readCardActions(options: PlacementOptions, allowed: readonly string[]): string[] {
  const raw = options?.[ACTIONS_OPTION_KEY];
  const keys =
    typeof raw === 'string'
      ? raw.split(',').map(k => k.trim()).filter(Boolean)
      : DEFAULT_CARD_ACTIONS;
  const seen = new Set<string>();
  return keys
    .filter(k => QUICK_ACTIONS_BY_KEY[k] && allowed.includes(k) && !seen.has(k) && seen.add(k))
    .slice(0, MAX_CARD_ACTIONS);
}

/**
 * Réglages à enregistrer pour une sélection d'actions.
 *
 * La liste est tronquée à ce que le serveur accepte de stocker plutôt que de
 * partir en 400 au moment de l'enregistrement — l'utilisateur ne comprendrait
 * pas qu'une case cochée fasse échouer la sauvegarde de tout son accueil.
 */
export function writeCardActions(keys: readonly string[]): Record<string, string> {
  const kept: string[] = [];
  for (const key of keys.slice(0, MAX_CARD_ACTIONS)) {
    if (!QUICK_ACTIONS_BY_KEY[key] || kept.includes(key)) continue;
    const next = [...kept, key];
    if (next.join(',').length > OPTION_VALUE_MAX) break;
    kept.push(key);
  }
  return { [ACTIONS_OPTION_KEY]: kept.join(',') };
}

/* --- Garde-fous de développement ------------------------------------------
   Deux erreurs impossibles à voir en relisant le catalogue, et qui ne se
   manifesteraient qu'à l'enregistrement, chez l'utilisateur : une clé que le
   validateur du serveur refuse, et un catalogue devenu trop bavard pour tenir
   dans une valeur de réglage.
   ------------------------------------------------------------------------ */
if (import.meta.env.DEV) {
  const badKeys = QUICK_ACTIONS.filter(a => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.key));
  if (badKeys.length > 0) {
    console.warn(
      `[dashboard] clés d'action refusées par le serveur : ${badKeys.map(a => a.key).join(', ')} — ` +
        'minuscules et tirets uniquement (voir backend validators._clean_slug).',
    );
  }
  const longest = QUICK_ACTIONS.slice(0, MAX_CARD_ACTIONS).map(a => a.key).join(',');
  if (longest.length > OPTION_VALUE_MAX) {
    console.warn(
      `[dashboard] ${MAX_CARD_ACTIONS} actions font ${longest.length} caractères, ` +
        `au-delà des ${OPTION_VALUE_MAX} que le serveur stocke — raccourcir des clés ` +
        'ou baisser MAX_CARD_ACTIONS.',
    );
  }
}
