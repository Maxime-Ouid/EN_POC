import { useEffect, useMemo, useState } from 'react';
import {
  AppShell,
  LoginScreen,
  MfaScreen,
  PortfoliosScreen,
  DataroomsListScreen,
  type DataroomRow,
  DataroomDetailScreen,
  type DataroomDocument,
  NewDataroomModal,
  NewFolderModal,
  AccessRestrictionModal,
  ConfirmModal,
  DocumentPreview,
  HyperadminScreen,
  type HyperadminOfficeRow,
  NewOfficeModal,
  NewTemplateModal,
  TemplateEditorModal,
  OfficeUsersScreen,
  type OfficeUserRowData,
  OfficeUserModal,
  type OfficeUserModalMode,
  assignableRoles,
  StatsScreen,
  SettingsScreen,
  ModuleScreen,
  Card,
  type TreeNodeData,
} from './components';
import { DashboardScreen } from './dashboard';
import { useSession } from './hooks/useSession';
import { useTenantTheme } from './theme/useTenantTheme';
import { useDatarooms, useDataroomTree, type FolderTreeNode } from './hooks/useDatarooms';
import { useTags } from './hooks/useTags';
import { useAccessRestriction, type AccessTargetKind } from './hooks/useAccessRestrictions';
import { useOfficeUsers } from './hooks/useOfficeUsers';
import { useTemplates, useTemplateTree } from './hooks/useTemplates';
import { useHyperadminOffices } from './hooks/useHyperadminOffices';
import { useDocumentPreview } from './hooks/useDocumentPreview';
import { useModule } from './hooks/useModule';
import { api, type DocumentSummary, type TagColor, type TagSummary } from './api/endpoints';
import { matchesWordStart } from './search/match';
import type { LocalEntry } from './search/localEntries';
import {
  CLIENT_SPACE_OPTIONS,
  CLIENT_USAGE,
  CONNECTED_USERS,
  DEMO_HOME_STATS,
  HISTORY,
  INVOICES,
  MEMBERS,
  MODULE_CATALOG,
  NAV_SECTIONS,
  PORTFOLIOS,
  PORTFOLIO_OPTIONS,
  QA_ENTRIES,
  RECENT_ACTIVITY,
} from './data/demo';

/* ===========================================================================
   Application réelle de l'Espace Notarial V2 (POC).

   Même bibliothèque de composants et mêmes écrans que la maquette
   (PrototypeDemo.tsx), mais alimentés par le backend Django partout où un
   endpoint existe :

     - connexion, identité, offices, config d'office ....... /api/login,
       /api/whoami, /api/my-offices, /api/tenant-config
     - liste et création de dossiers ....................... /api/datarooms/
     - documents d'un dossier et dépôt de pièces ........... /api/datarooms/<id>/documents/
     - personnalisation visuelle de l'office ............... /api/tenant-theme/
     - modules activés et contenu d'un module .............. /api/tenant-config/,
       /api/modules/<slug>/ — la section « Modules » du menu n'existe que pour
       les modules réellement activés côté serveur

   Tout le reste (portefeuilles, arborescence de rubriques, Q&R, membres,
   historique d'audit, statistiques, facturation, sessions ouvertes, modèles)
   n'est pas encore modélisé côté serveur et s'affiche à partir des jeux de
   démonstration de src/data/demo.tsx. La pastille de la topbar le dit à
   l'écran : on ne laisse pas croire que ces chiffres sont réels.
   =========================================================================== */

type ScreenKey =
  | 'dashboard'
  | 'portfolios'
  | 'datarooms'
  | 'dataroom'
  | 'stats'
  | 'users'
  | 'settings'
  | 'hyperadmin';

/**
 * Un écran de module se note `module:<slug>` dans la navigation : la clé porte
 * le slug, il n'y a donc pas d'état parallèle à tenir synchronisé avec l'écran
 * courant. Les modules disponibles venant du serveur, ils ne peuvent pas
 * apparaître dans le type ScreenKey.
 */
const MODULE_PREFIX = 'module:';
const moduleSlugOf = (key: string) =>
  key.startsWith(MODULE_PREFIX) ? key.slice(MODULE_PREFIX.length) : null;

const CRUMB_LABELS: Record<ScreenKey, string> = {
  dashboard: 'Accueil',
  portfolios: 'Portefeuilles',
  datarooms: 'Dossiers',
  dataroom: 'Dossiers',
  stats: 'Statistiques & facturation',
  users: "Annuaire de l'étude",
  settings: 'Personnalisation',
  hyperadmin: 'Console Notantis',
};

/**
 * Nœud synthétique représentant la racine de la dataroom dans l'arbre passé à
 * `Explorer` — les documents à la racine (folder=None côté backend) n'ont pas
 * de dossier réel pour les porter. `DataroomDetailScreen` sélectionne
 * `tree[0].children[0]` par défaut s'il existe, sinon `tree[0]` : ce nœud est
 * donc toujours `tree[0]`, avec les vrais dossiers de premier niveau comme
 * enfants.
 */
const ROOT_NODE_ID = 'root';

/** Convertit un id de nœud de l'arbre (string) en id de dossier pour l'API (undefined = racine). */
function toParentId(nodeId: string | undefined): number | undefined {
  if (!nodeId || nodeId === ROOT_NODE_ID) return undefined;
  return Number(nodeId);
}

/** Cible d'une restriction d'accès, telle que la modale l'affiche. */
interface AccessTarget {
  kind: AccessTargetKind;
  /** Id de dossier (arbre) ou de document ; absent au niveau dataroom. */
  id?: string;
  label: string;
}

/**
 * Ramène la cible envoyée par l'écran à celle que comprend l'API : le nœud
 * racine de l'explorateur est synthétique (ROOT_NODE_ID), il n'existe pas comme
 * Folder côté serveur — restreindre « la racine » est donc restreindre la
 * dataroom elle-même.
 */
function toAccessTarget(
  target: { kind: 'dataroom' | 'folder' | 'document'; id?: string; label: string },
  dataroomName: string,
): AccessTarget {
  if (target.kind === 'folder' && (!target.id || target.id === ROOT_NODE_ID)) {
    return { kind: 'dataroom', label: dataroomName };
  }
  return target;
}

function toDataroomDocument(doc: DocumentSummary, username: string): DataroomDocument {
  return {
    id: String(doc.id),
    name: doc.name,
    status: { kind: 'neutral', label: 'Déposé' },
    addedBy: username || '—',
    date: formatDate(doc.uploaded_at),
    // Le backend ne renvoie pas encore la taille du fichier (Document n'expose
    // que name/file/uploaded_at) — pas de valeur inventée.
    size: '—',
    tags: doc.tags,
  };
}

/** « 1 dossier » / « 3 dossiers » — le pluriel s'accorde sur le nombre affiché,
    pas sur un autre. */
function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** Réduit un tag de l'API à ce dont le design system a besoin — il ne connaît
    ni `slug` ni `usage`. */
function toTagRef(tag: TagSummary) {
  return { id: tag.id, name: tag.name, color: tag.color };
}

/** Mappe l'arbre de dossiers (id numériques, forme API) vers TreeNodeData (id string, forme Explorer). */
function toTreeNodes(nodes: FolderTreeNode[]): TreeNodeData[] {
  return nodes.map(node => ({
    id: String(node.id),
    label: node.name,
    count: node.documentCount,
    children: node.children.length ? toTreeNodes(node.children) : undefined,
  }));
}

function countAllDocuments(nodes: FolderTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + node.documentCount + countAllDocuments(node.children), 0);
}

function findFolderLabel(nodes: TreeNodeData[], id: string): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.label;
    if (node.children) {
      const found = findFolderLabel(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Nom de fichier d'une pièce à partir de son id — l'écran ne renvoie que l'id au téléchargement. */
function documentName(
  documentsByFolder: Record<string, DataroomDocument[]>,
  documentId: string,
): string {
  for (const docs of Object.values(documentsByFolder)) {
    const found = docs.find(d => d.id === documentId);
    if (found) return found.name;
  }
  return 'document';
}

function initialsOf(name: string): string {
  const parts = name.replace(/[@.].*$/, '').split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function App() {
  const session = useSession();
  const authenticated = session.status === 'authenticated';
  const username = session.user?.username ?? '';
  /* Remonté au-dessus des hooks (il vivait juste avant le rendu) : le rôle de
     l'appelant dans l'office courant décide désormais s'il faut charger les
     modèles de dossier, pas seulement ce qu'un écran affiche. */
  const currentOffice = session.offices.find(o => o.name === session.tenant?.name);

  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [moduleSlug, setModuleSlug] = useState<string | null>(null);
  const [openDataroomId, setOpenDataroomId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newFolderModal, setNewFolderModal] = useState<{ parentId: string | undefined } | null>(null);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [mfaError, setMfaError] = useState<string | undefined>();
  const [userModal, setUserModal] = useState<OfficeUserModalMode | null>(null);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<OfficeUserRowData | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [accessTarget, setAccessTarget] = useState<AccessTarget | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  /** Modèle de dossier ouvert dans l'éditeur (id serveur), et création en cours. */
  const [openTemplateId, setOpenTemplateId] = useState<number | null>(null);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  /** Ouverture d'une étude depuis la console Notantis — l'appel provisionne une
      base, d'où l'état « occupé » distinct de l'ouverture de la modale. */
  const [newOfficeOpen, setNewOfficeOpen] = useState(false);
  const [newOfficeBusy, setNewOfficeBusy] = useState(false);
  const [newOfficeError, setNewOfficeError] = useState<string | null>(null);
  /** Avertissement non bloquant de la console (module refusé en silence…). */
  const [hyperadminNotice, setHyperadminNotice] = useState<string | null>(null);
  /** Enregistrement de l'identité de l'étude (nom + logo). */
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  /** Filtre de la barre de recherche de la liste Dossiers (côté client : la
      liste est déjà entièrement chargée, un appel serveur n'apporterait rien). */
  const [dataroomFilter, setDataroomFilter] = useState('');
  /** Tags cochés dans le menu de filtre de la liste Dossiers. Contrairement à la
      recherche par nom, ce filtre part au SERVEUR (`?tags=`) : le décompte
      affiché sous le tableau doit rester celui de l'office, pas celui de la
      page déjà chargée. */
  const [dataroomTagFilter, setDataroomTagFilter] = useState<number[]>([]);
  /** Dossier à ouvrir dans l'écran détail après un résultat de recherche, et
      compteur qui rend chaque demande distincte — voir DataroomDetailScreen. */
  const [focusFolder, setFocusFolder] = useState<{ id: string | undefined; nonce: number } | null>(null);

  const datarooms = useDatarooms(authenticated, dataroomTagFilter);
  // Le catalogue de tags est chargé dès la connexion : il alimente à la fois le
  // menu de filtre de la liste et les sélecteurs posés sur chaque dossier ou
  // pièce, et le charger par écran donnerait un menu vide au premier affichage.
  const tags = useTags(authenticated);
  const dataroomTree = useDataroomTree(screen === 'dataroom' ? openDataroomId : null);
  const openModule = useModule(moduleSlug);

  // L'annuaire alimente deux écrans : la page Annuaire et la liste à cocher de la
  // modale d'accès. Il n'est chargé que quand l'un des deux est à l'écran — un
  // membre simple n'y a de toute façon pas droit (403).
  const officeUsers = useOfficeUsers(authenticated && (screen === 'users' || accessTarget !== null));

  // Le rang hyperadmin est transverse aux offices : il vient de /api/whoami/ et
  // non du rôle porté par le membership de l'office courant (voir WhoAmI).
  const isHyperadmin = session.user?.is_hyperadmin ?? false;
  const hyperadminOffices = useHyperadminOffices(authenticated && isHyperadmin);

  /**
   * `/api/tenant-config/` répond 403 à qui n'est pas membre de l'office du
   * sous-domaine : un `tenant` nul vaut donc « connecté, mais pas membre ICI ».
   *
   * Le cas existe et n'est pas une anomalie : `login_view` laisse entrer un
   * hyperadmin sur n'importe quel sous-domaine précisément parce qu'il n'a, par
   * construction, aucun OfficeMembership nulle part (pas de sous-domaine dédié à
   * la console, décision documentée dans CLAUDE.md). Tous les écrans d'office
   * lui répondraient alors 403 — d'où `consoleOnly` : il n'a qu'une destination,
   * autant l'y mener directement plutôt que de lui présenter un menu dont chaque
   * entrée échoue.
   */
  const isOfficeMember = session.tenant !== null;
  const consoleOnly = isHyperadmin && !isOfficeMember;

  // Les modèles servent à DEUX endroits — la gestion dans Personnalisation et le
  // choix « Partir d'un modèle » à la création d'un dossier — d'où un chargement
  // au niveau de l'application. L'endpoint est réservé admin/superadmin, exactement
  // comme la création d'un dossier depuis le 01/09/2026 : les deux écrans qui s'en
  // servent sont donc déjà hors de portée d'un membre simple.
  const canManageOffice = assignableRoles(currentOffice?.role).length > 0;
  const templates = useTemplates(authenticated && canManageOffice);
  const templateTree = useTemplateTree(openTemplateId);
  const openTemplate = templates.items.find(t => t.id === openTemplateId) ?? null;

  // Restriction de la cible ouverte. Sans cible, `dataroomId` vaut null : le hook
  // ne déclenche aucune requête (voir sa clé interne).
  const access = useAccessRestriction(
    accessTarget ? openDataroomId : null,
    accessTarget?.kind ?? 'dataroom',
    accessTarget && accessTarget.kind !== 'dataroom' ? Number(accessTarget.id) : null,
  );

  // Le thème de l'office est rechargé à la connexion : au montage l'utilisateur
  // est encore anonyme et /api/tenant-theme/ répond 403 (le cache local, lui,
  // est déjà appliqué depuis main.tsx).
  const { syncFromServer } = useTenantTheme();
  useEffect(() => {
    if (authenticated) void syncFromServer();
  }, [authenticated, syncFromServer]);

  const openDataroom = datarooms.items.find(d => d.id === openDataroomId) ?? null;

  // Les modules réellement activés viennent de /api/tenant-config/ ; le
  // catalogue (libellés, icônes, « à venir ») reste côté front faute de
  // description exposée par l'API.
  //
  // L'état affiché est CELUI DU SERVEUR, sans repli sur la valeur du catalogue :
  // afficher un module comme activé alors que l'office n'y a pas droit ferait
  // mentir l'écran qui sert justement à prouver l'activation par office.
  const modulesWithServerState = useMemo(() => {
    const enabled = new Set(session.tenant?.enabled_modules ?? []);
    return MODULE_CATALOG.map(m => (m.comingSoon ? m : { ...m, enabled: enabled.has(m.slug) }));
  }, [session.tenant]);

  /**
   * Section « Modules » du menu, construite à partir des modules réellement
   * activés pour l'office. C'est l'étape 3 du scénario de démo : désactiver le
   * Coffre-fort dans l'admin Django et rafraîchir fait disparaître l'entrée,
   * sans redéploiement.
   */
  const navSections = useMemo(() => {
    // La pastille de « Dossiers » vient du jeu de démonstration (245) : à côté
    // d'une liste qui, elle, dit la vérité du serveur, ce chiffre faisait mentir
    // le menu — un office vide s'annonçait avec 245 dossiers. Elle est remplacée
    // par le décompte réel, et retirée tant que la liste n'est pas chargée
    // plutôt que remplacée par un zéro qui ressemblerait à une réponse.
    const withRealCounts = NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.map(item =>
        item.key === 'datarooms'
          ? { ...item, count: datarooms.loading || datarooms.error ? undefined : datarooms.items.length }
          : item,
      ),
    }));

    /* Section Notantis : contrairement aux entrées d'office, celle-ci
       DISPARAÎT pour qui n'est pas hyperadmin, au lieu de rester visible et de
       mener à un 403 expliqué à l'écran (le parti pris de « Annuaire de
       l'étude »). La différence est voulue : un administrateur d'étude a de
       bonnes raisons d'apprendre que l'annuaire existe et lui échappe, alors
       que la console transverse à toutes les études n'a rien à faire dans le
       menu d'un client. Le rang vient de /api/whoami/, pas d'une déduction. */
    const notantisSection = {
      label: 'Notantis',
      items: [{ key: 'hyperadmin', icon: 'shield', label: 'Console Notantis' }],
    };
    // Hyperadmin sans appartenance : le menu se réduit à la console. Les
    // rubriques d'office ne sont pas masquées par prudence mais parce qu'elles
    // sont TOUTES inaccessibles pour lui (403 sur tenant-config, datarooms,
    // annuaire, thème) — les laisser serait un menu de portes fermées.
    if (consoleOnly) return [notantisSection];
    const withNotantis = isHyperadmin ? [...withRealCounts, notantisSection] : withRealCounts;

    const active = modulesWithServerState.filter(m => m.enabled && !m.comingSoon);
    if (!active.length) return withNotantis;
    return [
      ...withNotantis,
      {
        label: 'Modules',
        items: active.map(m => ({
          key: `${MODULE_PREFIX}${m.slug}`,
          icon: m.icon,
          label: m.name,
        })),
      },
    ];
  }, [modulesWithServerState, isHyperadmin, consoleOnly, datarooms.items.length, datarooms.loading, datarooms.error]);

  const openModuleEntry = modulesWithServerState.find(m => m.slug === moduleSlug) ?? null;

  /**
   * Ce que la palette ⌘K trouve en plus des résultats du serveur.
   *
   * Construit ici et pas dans AppShell parce que chaque entrée porte SON action
   * d'ouverture, et que naviguer est le métier de ce composant — la palette ne
   * fait que présenter et déclencher.
   *
   * `simulated: true` sur tout ce qui vient de data/demo.tsx : ces lignes
   * n'existent en base nulle part. Les taire aurait été plus simple, mais une
   * recherche qui renvoie de l'inventé sans le dire est un piège — c'est le
   * même avertissement que la pastille « Données partiellement simulées » de la
   * topbar, appliqué résultat par résultat.
   *
   * Q&R, membres et historique vivent dans les ONGLETS d'un dossier, sans être
   * rattachés à un dossier réel : leur entrée ouvre donc la liste des dossiers,
   * faute de destination honnête. C'est la limite connue de ce lot.
   */
  const searchLocalEntries = useMemo<LocalEntry[]>(() => {
    const entries: LocalEntry[] = [];

    // Écrans et modules : lus dans navSections plutôt que réécrits, pour que la
    // palette ne puisse pas proposer un écran que le menu n'a pas (un module
    // désactivé côté serveur disparaît des deux d'un coup).
    for (const section of navSections) {
      for (const item of section.items) {
        const slug = moduleSlugOf(item.key);
        entries.push({
          key: `nav-${item.key}`,
          icon: `i-${item.icon}`,
          name: item.label,
          path: slug ? `Modules / ${item.label}` : `${section.label} / ${item.label}`,
          kindLabel: slug ? 'Module' : 'Écran',
          open: () => navigate(item.key),
        });
      }
    }

    const demo = (
      key: string,
      icon: string,
      name: string,
      path: string,
      kindLabel: string,
      open: () => void,
    ): LocalEntry => ({ key, icon, name, path, kindLabel, simulated: true, open });

    for (const p of PORTFOLIOS) {
      entries.push(demo(`pf-${p.id}`, 'i-layers', p.name, `Portefeuilles / ${p.name}`,
        'Portefeuille', () => navigate('portfolios')));
    }
    for (const c of CLIENT_USAGE) {
      entries.push(demo(`cu-${c.id}`, 'i-building', c.name,
        `Statistiques & facturation / ${c.name}`, 'Client', () => navigate('stats')));
    }
    for (const i of INVOICES) {
      entries.push(demo(`inv-${i.id}`, 'i-file', i.period,
        `Statistiques & facturation / ${i.period}`, 'Facture', () => navigate('stats')));
    }
    for (const u of CONNECTED_USERS) {
      entries.push(demo(`cx-${u.id}`, 'i-users', u.name,
        `Statistiques & facturation / ${u.name}`, 'Connecté', () => navigate('stats')));
    }
    /* Les modèles de dossier existent maintenant côté serveur (/api/templates/) :
       ils entrent dans la palette comme vrais résultats, sans la mention
       « simulé », et mènent à leur éditeur plutôt qu'à la création d'un dossier. */
    for (const t of templates.items) {
      entries.push({
        key: `tpl-${t.id}`,
        icon: 'i-seal',
        name: t.name,
        path: `Personnalisation / Modèles / ${t.name}`,
        kindLabel: 'Modèle',
        open: () => {
          navigate('settings');
          setOpenTemplateId(t.id);
        },
      });
    }
    for (const q of QA_ENTRIES) {
      entries.push(demo(`qa-${q.id}`, 'i-msg', q.object, `Questions / Réponses`,
        'Q&R', () => navigate('datarooms')));
    }
    for (const m of MEMBERS) {
      entries.push(demo(`mb-${m.id}`, 'i-users', m.name, `Membres d’un dossier / ${m.group}`,
        'Membre', () => navigate('datarooms')));
    }
    for (const h of HISTORY) {
      entries.push(demo(`hi-${h.id}`, 'i-clock', h.target, `Historique / ${h.timestamp}`,
        'Historique', () => navigate('datarooms')));
    }

    return entries;
    // `navigate` est stable (déclarée dans le corps du composant, sans état
    // capturé qui changerait son comportement) ; la lister forcerait un recalcul
    // à chaque rendu sans rien apporter.
    // oxlint-disable-next-line exhaustive-deps
  }, [navSections, templates.items]);

  // Filtrage local de la liste Dossiers — même sémantique que la recherche
  // globale : correspondance en DÉBUT DE MOT, pas sous-chaîne quelconque (voir
  // _name_starts_with côté Django). Sans cet accord, un même mot tapé dans la
  // barre de la liste et dans la palette ⌘K donnerait deux réponses différentes.
  const visibleDatarooms = useMemo(
    () =>
      datarooms.items.filter(
        // Les TAGS du dossier sont cherchés au même titre que son nom : taper
        // « vente » dans la barre doit ramener les dossiers tagués Vente, pas
        // seulement ceux qui portent le mot dans leur intitulé. Le menu de
        // filtre reste le chemin exact ; la barre, elle, est le chemin rapide.
        d =>
          matchesWordStart(d.name, dataroomFilter) ||
          d.tags.some(tag => matchesWordStart(tag.name, dataroomFilter)),
      ),
    [datarooms.items, dataroomFilter],
  );

  const dataroomRows: DataroomRow[] = visibleDatarooms.map(d => ({
    id: String(d.id),
    icon: 'folder',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: d.name,
    tags: d.tags,
    members: [],
    storage: '—',
    activity: formatDate(d.created_at),
    status: { kind: 'success', label: 'Actif' },
  }));

  /**
   * Création de tag partagée par tous les sélecteurs de l'application. Rend le
   * tag (existant ou nouveau — le serveur déduplique sur le nom replié) pour
   * que l'appelant puisse l'ajouter immédiatement à sa sélection.
   */
  const createTag = async (name: string, color: TagColor) => toTagRef(await tags.create(name, color));

  /**
   * Ligne de décompte sous le tableau des dossiers.
   *
   * Trois cas distincts, et pas un seul « x sur y » : sous filtre par tag, la
   * liste reçue du serveur est DÉJÀ réduite — le total de l'office n'est plus
   * connu du client, et l'annoncer quand même serait inventer un chiffre. On
   * dit alors ce qu'on sait : combien de dossiers portent ces tags.
   */
  const dataroomRange = datarooms.loading
    ? 'Chargement…'
    : datarooms.error
      ? datarooms.error
      : dataroomTagFilter.length
        ? `${plural(visibleDatarooms.length, 'dossier')} pour ${plural(dataroomTagFilter.length, 'tag')} sélectionné${dataroomTagFilter.length > 1 ? 's' : ''}`
        : // Sous recherche, dire « x sur y » : un décompte nu laisserait croire
          // que l'office ne contient que les lignes affichées.
          dataroomFilter.trim()
          ? `${visibleDatarooms.length} sur ${plural(datarooms.items.length, 'dossier')}`
          : plural(datarooms.items.length, 'dossier');

  // La racine (documents sans dossier) est un nœud synthétique — ROOT_NODE_ID —
  // dont les enfants sont les vrais dossiers de premier niveau ; voir
  // toTreeNodes/ROOT_NODE_ID. La visibilité de chemin est déjà tranchée côté
  // serveur à chaque niveau (folders_view) : cet arbre ne montre jamais plus
  // qu'un utilisateur ne verrait en cliquant de niveau en niveau.
  const tree: TreeNodeData[] = [
    {
      id: ROOT_NODE_ID,
      label: 'Documents',
      count: dataroomTree.rootDocuments.length,
      children: toTreeNodes(dataroomTree.tree),
    },
  ];

  const documentsByFolder: Record<string, DataroomDocument[]> = {
    [ROOT_NODE_ID]: dataroomTree.rootDocuments.map(doc => toDataroomDocument(doc, username)),
  };
  for (const [folderId, docs] of Object.entries(dataroomTree.documentsByFolderId)) {
    documentsByFolder[folderId] = docs.map(doc => toDataroomDocument(doc, username));
  }

  const totalDocumentCount = dataroomTree.rootDocuments.length + countAllDocuments(dataroomTree.tree);

  async function switchOffice(subdomain: string) {
    const { ticket } = await api.issueSsoTicket(subdomain);
    window.location.href = `https://${subdomain}.localhost:8000/api/sso/consume/?ticket=${encodeURIComponent(ticket)}`;
  }

  function navigate(key: string) {
    const slug = moduleSlugOf(key);
    setModuleSlug(slug);
    // Un écran de module n'est pas un ScreenKey : `screen` reste sur sa dernière
    // valeur pendant qu'un module est ouvert, et c'est `moduleSlug` qui décide
    // de ce qui s'affiche (voir le rendu plus bas).
    if (!slug) setScreen(key as ScreenKey);
    setOpenDataroomId(null);
    setFocusFolder(null);
  }

  if (session.status === 'loading') {
    return <CenteredMessage>Chargement de votre espace…</CenteredMessage>;
  }

  if (session.status === 'error') {
    return (
      <CenteredMessage>
        Backend injoignable — {session.error}
        <div className="tiny dim" style={{ marginTop: 8 }}>
          Vérifiez que le serveur Django tourne (voir SETUP.md).
        </div>
      </CenteredMessage>
    );
  }

  if (session.status === 'mfa-enroll' || session.status === 'mfa-verify') {
    return (
      <MfaScreen
        mode={session.status === 'mfa-enroll' ? 'enroll' : 'verify'}
        qrCode={session.mfaQrCode}
        secret={session.mfaSecret}
        error={mfaError}
        onSubmit={token => {
          setMfaError(undefined);
          session.submitMfa(token).catch((err: Error) => setMfaError(err.message));
        }}
      />
    );
  }

  if (!authenticated) {
    return (
      <LoginScreen
        officeName={session.tenant?.name ?? 'Espace Notarial'}
        officeDomain={window.location.host}
        error={loginError}
        onSubmit={(identifier, password) => {
          setLoginError(undefined);
          session.login(identifier, password).catch((err: Error) => setLoginError(err.message));
        }}
      />
    );
  }

  /* `screen` reste l'état de navigation ; `activeScreenKey` est ce qui s'affiche.
     Passer par une valeur dérivée plutôt que par un setState au montage évite un
     premier rendu sur l'accueil — accueil qui, pour un hyperadmin sans office,
     tenterait aussitôt d'enregistrer une disposition que le serveur refuse. */
  const activeScreenKey: ScreenKey = consoleOnly ? 'hyperadmin' : screen;

  return (
    <AppShell
      officeName={session.tenant?.name ?? (isHyperadmin ? 'Notantis' : 'Office')}
      officeRole={currentOffice?.role ?? (isHyperadmin ? 'Hyperadmin' : '—')}
      logoUrl={session.tenant?.logo_url || undefined}
      navSections={navSections}
      activeScreen={moduleSlug ? `${MODULE_PREFIX}${moduleSlug}` : activeScreenKey}
      onNavigate={navigate}
      offices={session.offices}
      officeSubdomain={currentOffice?.subdomain}
      onSelectOffice={subdomain => void switchOffice(subdomain)}
      onLogout={() => setLogoutConfirm(true)}
      userInitials={initialsOf(username)}
      userName={username}
      userRole={currentOffice?.role ?? (isHyperadmin ? 'Hyperadmin' : 'Membre')}
      breadcrumbRoot={session.tenant?.name}
      breadcrumbCurrent={
        openModuleEntry?.name ?? (openDataroom ? openDataroom.name : CRUMB_LABELS[screen])
      }
      noticeLabel="Données partiellement simulées"
      searchLocalEntries={searchLocalEntries}
      onSearchSelect={hit => {
        setModuleSlug(null);

        // Une personne n'est pas dans un dossier : elle vit dans l'annuaire.
        if (hit.kind === 'person' || hit.dataroom_id == null) {
          setFocusFolder(null);
          setOpenDataroomId(null);
          setScreen('users');
          return;
        }

        // Les trois autres types mènent au même écran — le détail du dossier —
        // et ne diffèrent que par le niveau à y ouvrir. Pour une pièce, c'est
        // son dossier CONTENANT (`folder_id`), pas la pièce : l'explorateur
        // sélectionne des dossiers, et `folder_id` vaut null quand elle est à la
        // racine, d'où le nœud synthétique ROOT_NODE_ID.
        setOpenDataroomId(hit.dataroom_id);
        setScreen('dataroom');
        if (hit.kind === 'dataroom') {
          setFocusFolder(null);
        } else {
          const folderId = hit.kind === 'folder' ? String(hit.id) : hit.folder_id;
          setFocusFolder(prev => ({
            id: folderId != null ? String(folderId) : ROOT_NODE_ID,
            nonce: (prev?.nonce ?? 0) + 1,
          }));
        }
      }}
    >
      {/* Monté en dehors des écrans : la déconnexion se déclenche depuis la
          sidebar et la topbar, présentes quel que soit l'écran affiché. */}
      <ConfirmModal
        open={logoutConfirm}
        title="Se déconnecter"
        confirmLabel="Se déconnecter"
        onCancel={() => setLogoutConfirm(false)}
        onConfirm={() => {
          setLogoutConfirm(false);
          void session.logout();
        }}
      >
        Vous quittez <strong>{session.tenant?.name ?? 'cet office'}</strong> en tant que{' '}
        <strong>{username}</strong>. Il faudra saisir à nouveau votre mot de passe et un
        code d'authentification pour revenir.
        {session.offices.length > 1 && (
          <div style={{ marginTop: 8 }}>
            Vos autres études restent ouvertes : chaque office a sa propre session, celle-ci
            ne ferme que {window.location.host}.
          </div>
        )}
      </ConfirmModal>

      {openModuleEntry && (
        <ModuleScreen
          name={openModuleEntry.name}
          desc={openModuleEntry.desc}
          icon={openModuleEntry.icon}
          iconBg={openModuleEntry.iconBg}
          iconColor={openModuleEntry.iconColor}
          status={openModule.status}
          message={openModule.message}
          error={openModule.error}
          onRetry={() => void openModule.refresh()}
        />
      )}

      {!openModuleEntry && activeScreenKey === 'dashboard' && (
        <DashboardScreen
          role={currentOffice?.role}
          // Un non-membre ne peut ni lire ni enregistrer sa disposition
          // (/api/dashboard/ répond 403) : ne pas essayer, plutôt que d'afficher
          // « Disposition non enregistrée : accès non autorisé à cet office ».
          ready={authenticated && isOfficeMember}
          // Seul le nombre de dossiers et la liste des dossiers sont réels ; les
          // autres compteurs n'ont pas encore de source côté backend. Chaque
          // widget reçoit ses données ici plutôt que d'aller les chercher :
          // quinze widgets à l'écran feraient sinon quinze chargements au
          // montage de l'accueil (voir src/dashboard/types.ts).
          stats={{ ...DEMO_HOME_STATS, activeDatarooms: datarooms.items.length }}
          portfolios={PORTFOLIOS.map(p => ({
            id: p.id,
            icon: p.icon,
            iconBg: p.iconBg,
            iconColor: p.iconColor,
            name: p.name,
            desc: p.desc,
            status: p.status,
          }))}
          activity={RECENT_ACTIVITY}
          questions={QA_ENTRIES.map(q => ({
            id: q.id,
            status: q.status,
            object: q.object,
            meta: q.meta,
          }))}
          members={MEMBERS.map(m => ({
            id: m.id,
            initials: m.initials,
            name: m.name,
            detail: `${m.group} · ${m.lastLogin}`,
            status: m.access,
          }))}
          connected={CONNECTED_USERS.map(c => ({
            id: c.id,
            initials: c.initials,
            name: c.name,
            detail: `${c.role} · connecté depuis ${c.connectedFor}`,
          }))}
          datarooms={datarooms.items.map(d => ({
            id: String(d.id),
            name: d.name,
            meta: `Créé le ${new Date(d.created_at).toLocaleDateString('fr-FR')}`,
          }))}
          usage={CLIENT_USAGE.map(u => ({
            id: u.id,
            name: u.name,
            detail: `${u.dataroomCount} dossiers · ${u.storage}`,
            percent: u.sharePercent,
            warning: u.shareWarning,
          }))}
          invoices={INVOICES.map(i => ({
            id: i.id,
            period: i.period,
            detail: `Stockage moyen ${i.averageStorage}`,
            amount: i.amountExclTax,
          }))}
          modules={modulesWithServerState.map(m => ({
            slug: m.slug,
            name: m.name,
            enabled: !!m.enabled,
          }))}
          navigate={navigate}
        />
      )}

      {!openModuleEntry && activeScreenKey === 'portfolios' && (
        <PortfoliosScreen
          portfolios={PORTFOLIOS}
          onCreate={() => {}}
          onFilter={() => {}}
          onOpen={() => setScreen('datarooms')}
        />
      )}

      {!openModuleEntry && activeScreenKey === 'datarooms' && (
        <>
          <DataroomsListScreen
            totalCount={datarooms.items.length}
            rows={dataroomRows}
            onOpen={id => {
              // Ouverture « normale » : on efface une éventuelle cible laissée
              // par une recherche précédente, sinon l'explorateur s'ouvrirait
              // sur un dossier d'une AUTRE dataroom.
              setFocusFolder(null);
              setOpenDataroomId(Number(id));
              setScreen('dataroom');
            }}
            onCreate={() => setModalOpen(true)}
            onSearch={setDataroomFilter}
            tagCatalog={tags.items}
            selectedTagIds={dataroomTagFilter}
            onTagFilterChange={setDataroomTagFilter}
            onRowTagsChange={(dataroomId, tagIds) =>
              // `setTags` recharge la liste : le catalogue, lui, ne bouge pas —
              // seuls ses compteurs d'usage vieillissent, et ils se rafraîchiront
              // à la prochaine création. Un rechargement du catalogue à chaque
              // case cochée coûterait un aller-retour pour un chiffre.
              datarooms.setTags(Number(dataroomId), tagIds)
            }
            onCreateTag={createTag}
            displayRange={dataroomRange}
          />
          <NewDataroomModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onCreate={({ name, templateId }) => {
              // Le modèle est appliqué PAR LE SERVEUR dans la même requête
              // (POST /api/datarooms/ avec template_id) : dossiers et
              // restrictions arrivent ensemble, ou pas du tout.
              void datarooms
                .create(name, [], templateId ? Number(templateId) : null)
                .then(() => setModalOpen(false));
            }}
            portfolioOptions={PORTFOLIO_OPTIONS}
            clientSpaceOptions={CLIENT_SPACE_OPTIONS}
            templates={templates.items.map(t => ({
              id: String(t.id),
              name: t.name,
              desc: t.description || 'Sans description',
            }))}
            templatesLoading={templates.loading}
          />
        </>
      )}

      {!openModuleEntry && activeScreenKey === 'dataroom' && openDataroom && (
        <>
          <DataroomDetailScreen
            // La clé remonte l'identité de la dataroom : l'écran garde en état
            // interne le dossier sélectionné, qui n'a aucun sens d'une dataroom
            // à l'autre — sans remontage, passer de l'une à l'autre laissait
            // l'explorateur pointer un dossier inexistant ici.
            key={openDataroom.id}
            dataroomName={openDataroom.name}
            tags={openDataroom.tags}
            tagCatalog={tags.items}
            onTagsChange={tagIds => datarooms.setTags(openDataroom.id, tagIds)}
            onDocumentTagsChange={async (documentId, tagIds) => {
              await api.setDocumentTags(openDataroom.id, Number(documentId), tagIds);
              // L'arborescence porte les tags de chaque pièce : sans ce
              // rechargement, la pastille posée disparaîtrait au prochain
              // changement de rubrique (l'état d'origine étant celui du dernier
              // parcours de l'arbre, pas celui de l'écran).
              await dataroomTree.refresh();
            }}
            onCreateTag={createTag}
            status={{ kind: 'success', label: 'Actif' }}
            meta={[
              { label: 'Créé le', value: formatDate(openDataroom.created_at) },
              { label: 'Documents', value: `${totalDocumentCount} fichier(s)` },
            ]}
            tree={tree}
            documentsByFolder={documentsByFolder}
            focusFolderId={focusFolder?.id}
            focusNonce={focusFolder?.nonce}
            // Non modélisés côté backend — jeux de démonstration assumés.
            qaEntries={QA_ENTRIES}
            members={MEMBERS}
            history={HISTORY}
            onBackToList={() => navigate('datarooms')}
            onAddDocuments={(activeFolderId, files) => {
              const parentId = toParentId(activeFolderId);
              if (files?.length) {
                void dataroomTree.upload(files[0], parentId);
              } else {
                pickFileAndUpload(file => dataroomTree.upload(file, parentId));
              }
            }}
            onCreateFolder={activeFolderId => setNewFolderModal({ parentId: activeFolderId })}
            onManageAccess={target => {
              setAccessError(null);
              setAccessTarget(toAccessTarget(target, openDataroom.name));
            }}
            onDownloadDocument={documentId => {
              void downloadDocument(openDataroom.id, Number(documentId), documentName(documentsByFolder, documentId));
            }}
            renderDocumentPreview={doc => (
              <ConnectedDocumentPreview
                // La clé remonte l'identité de la pièce : sans elle, passer d'un
                // document à l'autre réutiliserait le composant et l'aperçu
                // précédent resterait affiché le temps du chargement.
                key={doc.id}
                dataroomId={openDataroom.id}
                documentId={Number(doc.id)}
                fileName={doc.name}
                onDownload={() => {
                  void downloadDocument(openDataroom.id, Number(doc.id), doc.name);
                }}
              />
            )}
          />
          <NewFolderModal
            open={newFolderModal !== null}
            onClose={() => setNewFolderModal(null)}
            parentLabel={
              newFolderModal && newFolderModal.parentId && newFolderModal.parentId !== ROOT_NODE_ID
                ? findFolderLabel(tree, newFolderModal.parentId)
                : 'Racine de la dataroom'
            }
            onCreate={name => {
              const parentId = toParentId(newFolderModal?.parentId);
              void dataroomTree.createFolder(name, parentId).then(() => setNewFolderModal(null));
            }}
          />
          <AccessRestrictionModal
            open={accessTarget !== null}
            kind={accessTarget?.kind ?? 'dataroom'}
            targetLabel={accessTarget?.label ?? ''}
            targetKey={`${accessTarget?.kind ?? 'dataroom'}:${accessTarget?.id ?? openDataroomId}`}
            users={officeUsers.items.map(u => ({
              userId: u.user_id,
              username: u.username,
              role: u.role,
            }))}
            usersError={officeUsers.error}
            selectedUserIds={access.userIds}
            loading={access.loading || officeUsers.loading}
            error={accessError ?? access.error}
            onClose={() => {
              setAccessTarget(null);
              setAccessError(null);
            }}
            onSave={userIds => {
              setAccessError(null);
              access
                .save(userIds)
                .then(() => setAccessTarget(null))
                .catch((err: Error) => setAccessError(err.message));
            }}
          />
        </>
      )}

      {!openModuleEntry && activeScreenKey === 'users' && (
        <>
          <OfficeUsersScreen
            rows={officeUsers.items.map(u => ({
              membershipId: u.membership_id,
              userId: u.user_id,
              username: u.username,
              role: u.role,
            }))}
            loading={officeUsers.loading}
            error={officeUsers.error}
            assignableRoles={assignableRoles(currentOffice?.role)}
            onCreateUser={() => {
              setUserModalError(null);
              setUserModal('create');
            }}
            onAttachUser={() => {
              setUserModalError(null);
              setUserModal('attach');
            }}
            onChangeRole={(membershipId, role) => {
              void officeUsers.updateRole(membershipId, role);
            }}
            onRemoveUser={user => {
              setRemoveError(null);
              setUserToRemove(user);
            }}
            currentUsername={username}
          />
          <OfficeUserModal
            // Remonter le mode dans la clé remet les champs à zéro d'un mode à
            // l'autre : un mot de passe saisi puis abandonné ne doit pas
            // ressurgir dans le formulaire de rattachement.
            key={userModal ?? 'closed'}
            open={userModal !== null}
            mode={userModal ?? 'create'}
            roles={assignableRoles(currentOffice?.role)}
            error={userModalError}
            onClose={() => {
              setUserModal(null);
              setUserModalError(null);
            }}
            onSubmit={({ username: name, password, role }) => {
              setUserModalError(null);
              const done =
                userModal === 'attach'
                  ? officeUsers.attachUser(name, role)
                  : officeUsers.createUser(name, password, role);
              done
                .then(() => setUserModal(null))
                .catch((err: Error) => setUserModalError(err.message));
            }}
          />
          <ConfirmModal
            open={userToRemove !== null}
            title="Retirer de l'étude"
            confirmLabel="Retirer"
            destructive
            error={removeError}
            onCancel={() => {
              setUserToRemove(null);
              setRemoveError(null);
            }}
            onConfirm={() => {
              if (!userToRemove) return;
              setRemoveError(null);
              officeUsers
                .removeUser(userToRemove.membershipId)
                .then(() => setUserToRemove(null))
                .catch((err: Error) => setRemoveError(err.message));
            }}
          >
            {userToRemove && (
              <>
                <strong>{userToRemove.username}</strong> perdra l'accès à cette étude et à
                tous ses dossiers. Son id est retiré des restrictions d'accès qui le
                nommaient ; celles qui n'ont plus personne sont levées, donc leur contenu
                redevient visible par toute l'étude.
                <div style={{ marginTop: 8 }}>
                  Le compte lui-même n'est pas supprimé : il reste membre de ses autres
                  études, et peut être rattaché à nouveau ici.
                </div>
              </>
            )}
          </ConfirmModal>
        </>
      )}

      {!openModuleEntry && activeScreenKey === 'stats' && (
        <StatsScreen usage={CLIENT_USAGE} invoices={INVOICES} connected={CONNECTED_USERS} />
      )}

      {!openModuleEntry && activeScreenKey === 'settings' && (
        <SettingsScreen
          identity={{
            identity: {
              displayName: session.tenant?.name ?? '',
              subdomain: window.location.host,
              logoUrl: session.tenant?.logo_url || undefined,
            },
            saving: identitySaving,
            error: identityError,
            // Le serveur refuse déjà l'écriture à un non-administrateur : l'écran
            // évite seulement de proposer un formulaire qui finirait en 403, et dit
            // pourquoi plutôt que de masquer l'onglet.
            readOnly: !canManageOffice,
            readOnlyNote: canManageOffice
              ? undefined
              : "L'identité de l'étude est modifiable par ses administrateurs.",
            onSave: async ({ displayName, logoFile, removeLogo }) => {
              setIdentityError(null);
              setIdentitySaving(true);
              try {
                await api.saveTenantIdentity({
                  name: displayName,
                  logoFile,
                  removeLogo,
                });
                // Le nom et le logo sont lus depuis `session.tenant` par toute
                // l'application (bandeau, fil d'Ariane, écran de connexion) :
                // recharger la session est ce qui les fait suivre partout, sans
                // état parallèle à tenir à jour ici.
                await session.refresh();
              } catch (err) {
                setIdentityError(err instanceof Error ? err.message : 'Enregistrement impossible');
              } finally {
                setIdentitySaving(false);
              }
            },
          }}
          modules={{
            modules: modulesWithServerState,
            // Aucun endpoint d'activation À L'ÉCHELLE DE L'OFFICE : les
            // interrupteurs montrent l'état réel et ne prétendent pas agir. Un
            // interrupteur qui bascule sans rien changer côté serveur est pire
            // que pas d'interrupteur du tout — il fait croire la démo faite.
            // (L'activation existe désormais, mais côté Notantis : console
            // hyperadmin, PATCH /api/hyperadmin/offices/<id>/.)
            readOnly: true,
            readOnlyNote:
              "L'activation d'un module relève de Notantis, pas de l'étude : cet écran montre ce dont l'office dispose réellement, sans le modifier.",
            templates: templates.items.map(t => ({
              id: String(t.id),
              name: t.name,
              desc: t.description || 'Sans description',
            })),
            templatesLoading: templates.loading,
            templatesError: templates.error,
            onCreateTemplate: () => {
              setTemplateError(null);
              setNewTemplateOpen(true);
            },
            onOpenTemplate: id => {
              setTemplateError(null);
              setOpenTemplateId(Number(id));
            },
          }}
        />
      )}

      {!openModuleEntry && activeScreenKey === 'settings' && (
        <>
          <NewTemplateModal
            open={newTemplateOpen}
            error={templateError}
            onClose={() => {
              setNewTemplateOpen(false);
              setTemplateError(null);
            }}
            onCreate={({ name, description }) => {
              setTemplateError(null);
              templates
                .createTemplate(name, description)
                .then(created => {
                  setNewTemplateOpen(false);
                  // On enchaîne sur l'éditeur : un modèle sans arborescence ne
                  // sert à rien, et l'avoir créé sans rien à y mettre laisserait
                  // l'utilisateur devant une liste où il faut recliquer.
                  setOpenTemplateId(created.id);
                })
                .catch((err: Error) => setTemplateError(err.message));
            }}
          />
          <TemplateEditorModal
            // L'éditeur garde des brouillons de saisie : les remonter dans la
            // clé évite qu'un nom tapé pour un modèle réapparaisse dans un autre.
            key={openTemplateId ?? 'closed'}
            open={openTemplate !== null}
            name={openTemplate?.name ?? ''}
            description={openTemplate?.description ?? ''}
            tree={templateTree.tree}
            loading={templateTree.loading}
            error={templateError ?? templateTree.error}
            onClose={() => {
              setOpenTemplateId(null);
              setTemplateError(null);
            }}
            onRename={patch => {
              if (openTemplateId === null) return;
              setTemplateError(null);
              templates
                .renameTemplate(openTemplateId, patch)
                .catch((err: Error) => setTemplateError(err.message));
            }}
            onAddFolder={(name, parentId, roles) => {
              setTemplateError(null);
              templateTree
                .addFolder(name, parentId, roles)
                .catch((err: Error) => setTemplateError(err.message));
            }}
            onUpdateFolder={(folderId, patch) => {
              setTemplateError(null);
              templateTree
                .updateFolder(folderId, patch)
                .catch((err: Error) => setTemplateError(err.message));
            }}
            onRemoveFolder={folderId => {
              setTemplateError(null);
              templateTree
                .removeFolder(folderId)
                .catch((err: Error) => setTemplateError(err.message));
            }}
            onDeleteTemplate={() => {
              if (openTemplateId === null) return;
              setTemplateError(null);
              templates
                .deleteTemplate(openTemplateId)
                .then(() => setOpenTemplateId(null))
                .catch((err: Error) => setTemplateError(err.message));
            }}
          />
        </>
      )}

      {!openModuleEntry && activeScreenKey === 'hyperadmin' && (
        <>
          <HyperadminScreen
            rows={hyperadminOffices.items.map<HyperadminOfficeRow>(o => ({
              id: o.id,
              subdomain: o.subdomain,
              name: o.name,
              isActive: o.is_active,
              enabledModules: o.enabled_modules,
            }))}
            // Le catalogue des modules vit côté front (libellés, icônes) ; les
            // « à venir » n'ont pas de ligne Module en base, les proposer ici
            // ferait un interrupteur que le serveur ignore silencieusement.
            modules={MODULE_CATALOG.filter(m => !m.comingSoon).map(m => ({
              slug: m.slug,
              name: m.name,
            }))}
            loading={hyperadminOffices.loading}
            error={hyperadminOffices.error}
            notice={hyperadminNotice}
            currentSubdomain={currentOffice?.subdomain}
            onCreateOffice={() => {
              setNewOfficeError(null);
              setHyperadminNotice(null);
              setNewOfficeOpen(true);
            }}
            onToggleActive={(office, next) => {
              void hyperadminOffices.setOfficeActive(office.id, next);
            }}
            onToggleModule={(office, slug, next) => {
              const slugs = next
                ? [...office.enabledModules, slug]
                : office.enabledModules.filter(s => s !== slug);
              setHyperadminNotice(null);
              void hyperadminOffices.setOfficeModules(office.id, slugs).then(updated => {
                // Le serveur ignore SANS ERREUR un slug qui n'a pas de ligne
                // `Module` en base : l'interrupteur reviendrait alors à sa place
                // sans que rien n'explique pourquoi. Le catalogue de modules
                // vivant côté front, l'écart est possible et doit se dire.
                if (next && !updated.enabled_modules.includes(slug)) {
                  const label = MODULE_CATALOG.find(m => m.slug === slug)?.name ?? slug;
                  setHyperadminNotice(
                    `« ${label} » n'est pas installé sur la plateforme : le serveur ne connaît pas ce module, l'activation n'a rien changé.`,
                  );
                }
              });
            }}
          />
          <NewOfficeModal
            open={newOfficeOpen}
            busy={newOfficeBusy}
            error={newOfficeError}
            onClose={() => {
              if (newOfficeBusy) return;
              setNewOfficeOpen(false);
              setNewOfficeError(null);
            }}
            onCreate={payload => {
              setNewOfficeError(null);
              setNewOfficeBusy(true);
              hyperadminOffices
                .createOffice(payload)
                .then(() => setNewOfficeOpen(false))
                .catch((err: Error) => setNewOfficeError(err.message))
                .finally(() => setNewOfficeBusy(false));
            }}
          />
        </>
      )}
    </AppShell>
  );
}

/**
 * Aperçu branché sur l'API, monté dans le volet document.
 *
 * Séparé de `DocumentPreview` (qui reste pur) et défini ici plutôt que dans le
 * design system : c'est un composant de raccordement, il connaît l'endpoint. Il
 * est monté et démonté avec la pièce ouverte, ce qui suffit à libérer l'URL
 * objet du document précédent (voir le nettoyage de useDocumentPreview).
 */
function ConnectedDocumentPreview({
  dataroomId,
  documentId,
  fileName,
  onDownload,
}: {
  dataroomId: number;
  documentId: number;
  fileName: string;
  onDownload: () => void;
}) {
  const preview = useDocumentPreview(dataroomId, documentId, fileName);
  return (
    <DocumentPreview
      fileName={fileName}
      kind={preview.kind}
      loading={preview.loading}
      error={preview.error}
      url={preview.url}
      text={preview.text}
      onDownload={onDownload}
    />
  );
}

/**
 * Téléchargement d'une pièce. Passe par le même endpoint que l'aperçu, donc par
 * les mêmes contrôles d'accès, plutôt que par un lien direct vers le stockage :
 * l'URL MinIO est en http quand l'application est en https, et le navigateur
 * refuserait de la suivre.
 */
async function downloadDocument(dataroomId: number, documentId: number, fileName: string) {
  const blob = await api.documentContent(dataroomId, documentId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function pickFileAndUpload(upload: (file: File) => Promise<void>) {
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) void upload(file);
  };
  input.click();
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <Card padded style={{ maxWidth: 420, textAlign: 'center' }}>
        {children}
      </Card>
    </div>
  );
}
