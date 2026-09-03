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
  RenameFolderModal,
  AccessRightsTable,
  type AccessRightsRow,
  UserRestrictionsModal,
  ConfirmModal,
  DocumentPreview,
  OfficeUsersScreen,
  type OfficeUserRowData,
  OfficeUserModal,
  type OfficeUserModalMode,
  assignableRoles,
  StatsScreen,
  SettingsScreen,
  type SettingsTabKey,
  ModuleScreen,
  Card,
  Button,
  type TreeNodeData,
  TemplatesListScreen,
  type TemplateRowData,
  TemplateDetailScreen,
  NewTemplateModal,
  NewTemplateFolderModal,
} from './components';
import { DashboardScreen, allowedActionKeys } from './dashboard';
import { useSession } from './hooks/useSession';
import { useTenantTheme } from './theme/useTenantTheme';
import { useDatarooms, useDataroomTree, type FolderTreeNode } from './hooks/useDatarooms';
import { useTags } from './hooks/useTags';
import { useAccessRestrictionsList } from './hooks/useAccessRestrictions';
import { useAccessRightsDraft, type AccessRightsEntry } from './hooks/useAccessRightsDraft';
import { useOfficeUsers } from './hooks/useOfficeUsers';
import { useDocumentPreview } from './hooks/useDocumentPreview';
import { useModule } from './hooks/useModule';
import { useTemplates } from './hooks/useTemplates';
import { useTemplateTree, type TemplateFolderTreeNode } from './hooks/useTemplateTree';
import { templateEffectiveRoles, dataroomEffectiveRoles as computeDataroomEffectiveRoles } from './access/effectiveRoles';
import {
  api, type AccessRestrictionSummary, type DocumentSummary, type TagColor, type TagSummary,
} from './api/endpoints';
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
  | 'settings';

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

/** Cible d'un renommage de dossier — les deux mondes (vraie dataroom, Template)
    partagent le même popup (RenameFolderModal), mais pas le même endpoint. */
type RenameTarget =
  | { kind: 'dataroom-folder'; dataroomId: number; folderId: number; currentName: string }
  | { kind: 'template-folder'; templateId: number; folderId: number; currentName: string };

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

/** Rangée plate (une entrée par TemplateFolder) pour le tableau de droits — id
    de ligne "folder:<id>", même convention qu'une vraie dataroom (voir
    flattenDataroomAccessRows). Un Template n'a que des dossiers, pas de
    document ni de ligne "dataroom" (rien n'y correspond). */
function flattenTemplateAccessRows(
  nodes: TemplateFolderTreeNode[],
  depth = 0,
): { id: string; label: string; depth: number; kind: 'folder' }[] {
  const rows: { id: string; label: string; depth: number; kind: 'folder' }[] = [];
  for (const node of nodes) {
    rows.push({ id: `folder:${node.id}`, label: node.name, depth, kind: 'folder' });
    rows.push(...flattenTemplateAccessRows(node.children, depth + 1));
  }
  return rows;
}

/** État enregistré (allowed_roles/user_ids) de chaque TemplateFolder, indexé
    par id de ligne — sert d'`original` à useAccessRightsDraft. */
function buildTemplateAccessOriginal(nodes: TemplateFolderTreeNode[]): Record<string, AccessRightsEntry> {
  const map: Record<string, AccessRightsEntry> = {};
  function walk(list: TemplateFolderTreeNode[]) {
    for (const node of list) {
      map[`folder:${node.id}`] = { allowedRoles: node.allowed_roles, userIds: node.user_ids };
      walk(node.children);
    }
  }
  walk(nodes);
  return map;
}

/** Rangée plate d'une vraie dataroom : la dataroom elle-même, puis chaque
    dossier et document de son arborescence — même convention d'id que le
    Template ("dataroom", "folder:<id>", "document:<id>"). */
function flattenDataroomAccessRows(
  dataroomName: string,
  tree: FolderTreeNode[],
  rootDocuments: DocumentSummary[],
  documentsByFolderId: Record<number, DocumentSummary[]>,
): { id: string; label: string; depth: number; kind: 'dataroom' | 'folder' | 'document' }[] {
  const rows: { id: string; label: string; depth: number; kind: 'dataroom' | 'folder' | 'document' }[] = [
    { id: 'dataroom', label: dataroomName, depth: 0, kind: 'dataroom' },
  ];
  for (const doc of rootDocuments) {
    rows.push({ id: `document:${doc.id}`, label: doc.name, depth: 1, kind: 'document' });
  }
  function walk(nodes: FolderTreeNode[], depth: number) {
    for (const node of nodes) {
      rows.push({ id: `folder:${node.id}`, label: node.name, depth, kind: 'folder' });
      for (const doc of documentsByFolderId[node.id] ?? []) {
        rows.push({ id: `document:${doc.id}`, label: doc.name, depth: depth + 1, kind: 'document' });
      }
      walk(node.children, depth + 1);
    }
  }
  walk(tree, 1);
  return rows;
}

/** État enregistré de chaque restriction de CETTE dataroom, indexé par id de
    ligne — filtre `items` (toutes les restrictions de l'office) au
    `dataroomId` courant. */
function buildDataroomAccessOriginal(
  items: AccessRestrictionSummary[],
  dataroomId: number,
): Record<string, AccessRightsEntry> {
  const map: Record<string, AccessRightsEntry> = {};
  for (const item of items) {
    if (item.dataroom_id !== dataroomId) continue;
    const rowId = item.kind === 'dataroom' ? 'dataroom' : `${item.kind}:${item.target_id}`;
    map[rowId] = { allowedRoles: item.allowed_roles, userIds: item.user_ids };
  }
  return map;
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

/** Libellé d'un TemplateFolder à partir de son id brut (sans préfixe) — lu
    directement dans la rangée plate du tableau de droits, plus besoin de
    parcourir un arbre (l'écran Template n'en manipule plus, voir CLAUDE.md). */
function templateFolderLabel(rows: { id: string; label: string }[], folderId: string | undefined): string | undefined {
  if (!folderId) return undefined;
  return rows.find(r => r.id === `folder:${folderId}`)?.label;
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

  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [moduleSlug, setModuleSlug] = useState<string | null>(null);
  /* Onglet d'atterrissage de Personnalisation. Un seul usage : l'action rapide
     « Créer un modèle » doit ouvrir l'écran SUR l'onglet Modèles, sinon elle
     déposerait l'utilisateur devant Identité avec une fenêtre de création
     par-dessus. Renseigné par `navigate`, donc remis à zéro par toute autre
     navigation — un clic dans le menu rouvre bien Identité. */
  const [settingsTab, setSettingsTab] = useState<SettingsTabKey | undefined>(undefined);
  const [openDataroomId, setOpenDataroomId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newFolderModal, setNewFolderModal] = useState<{ parentId: string | undefined } | null>(null);
  const [openTemplateId, setOpenTemplateId] = useState<number | null>(null);
  const [templateModal, setTemplateModal] = useState<{ mode: 'create' | 'edit'; target?: TemplateRowData } | null>(null);
  const [templateModalError, setTemplateModalError] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateRowData | null>(null);
  const [deleteTemplateError, setDeleteTemplateError] = useState<string | null>(null);
  const [newTemplateFolderModal, setNewTemplateFolderModal] = useState<{ parentId: string | undefined } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteFolderError, setDeleteFolderError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [mfaError, setMfaError] = useState<string | undefined>();
  const [userModal, setUserModal] = useState<OfficeUserModalMode | null>(null);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<OfficeUserRowData | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [restrictionsUser, setRestrictionsUser] = useState<OfficeUserRowData | null>(null);
  const [savingDataroomAccess, setSavingDataroomAccess] = useState(false);
  const [dataroomAccessSaveError, setDataroomAccessSaveError] = useState<string | null>(null);
  const [savingTemplateAccess, setSavingTemplateAccess] = useState(false);
  const [templateAccessSaveError, setTemplateAccessSaveError] = useState<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
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

  // L'annuaire alimente trois écrans : la page Annuaire, le tableau de droits
  // d'une dataroom et celui d'un Template (sélecteur d'utilisateurs nommés).
  // Un membre simple n'y a de toute façon pas droit (403).
  const officeUsers = useOfficeUsers(
    authenticated && (screen === 'users' || screen === 'dataroom' || screen === 'settings'),
  );

  // Toutes les restrictions actives de l'office — alimente le tableau de
  // droits d'une vraie dataroom (préremplissage) ET la modale "Restrictions"
  // de la page Utilisateurs. Un Template, lui, porte déjà allowed_roles/
  // user_ids directement sur ses TemplateFolder (voir templateTree) : pas
  // besoin de cette liste pour son propre tableau de droits.
  const accessRestrictionsList = useAccessRestrictionsList(
    authenticated && (screen === 'dataroom' || screen === 'users'),
  );

  // Le catalogue de modèles alimente deux endroits : l'onglet « Template » de
  // Personnalisation ET le sélecteur de la modale « Nouveau dossier »
  // (modalOpen) — un membre simple n'a de toute façon pas droit d'y accéder
  // (403). Câblé sur screen === 'settings' au sens large (pas un sous-onglet
  // précis, que ce composant ne connaît pas — même granularité que modules/
  // identity, déjà toujours calculés pour tout l'écran Personnalisation quel
  // que soit l'onglet affiché).
  const templates = useTemplates(authenticated && (screen === 'settings' || modalOpen));
  const templateTree = useTemplateTree(screen === 'settings' && openTemplateId !== null ? openTemplateId : null);

  // Le thème de l'office est rechargé à la connexion : au montage l'utilisateur
  // est encore anonyme et /api/tenant-theme/ répond 403 (le cache local, lui,
  // est déjà appliqué depuis main.tsx).
  const { syncFromServer } = useTenantTheme();
  useEffect(() => {
    if (authenticated) void syncFromServer();
  }, [authenticated, syncFromServer]);

  const openDataroom = datarooms.items.find(d => d.id === openDataroomId) ?? null;
  const openTemplate = templates.items.find(t => t.id === openTemplateId) ?? null;

  // Tableau de droits d'une vraie dataroom : rangée plate (dataroom + chaque
  // dossier/document de son arbre) + état enregistré filtré à cette dataroom,
  // via useAccessRightsDraft pour l'édition locale groupée (voir CLAUDE.md,
  // 02/09/2026). `useMemo` : ces objets ne doivent changer que si les données
  // SOURCE changent, pas à chaque rendu — sinon le brouillon en cours
  // d'édition serait écrasé en permanence (voir useAccessRightsDraft).
  const dataroomAccessRows = useMemo(
    () =>
      openDataroom
        ? flattenDataroomAccessRows(
            openDataroom.name, dataroomTree.tree, dataroomTree.rootDocuments, dataroomTree.documentsByFolderId,
          )
        : [],
    [openDataroom, dataroomTree.tree, dataroomTree.rootDocuments, dataroomTree.documentsByFolderId],
  );
  const dataroomAccessOriginal = useMemo(
    () => (openDataroom ? buildDataroomAccessOriginal(accessRestrictionsList.items, openDataroom.id) : {}),
    [accessRestrictionsList.items, openDataroom],
  );
  const dataroomAccessDraft = useAccessRightsDraft(dataroomAccessOriginal);
  const dataroomAccessTableRows: AccessRightsRow[] = dataroomAccessRows.map(row => ({
    ...row,
    allowedRoles: dataroomAccessDraft.draft[row.id]?.allowedRoles ?? [],
    userIds: dataroomAccessDraft.draft[row.id]?.userIds ?? [],
  }));

  // Même patron pour un Template — mais l'état enregistré vit directement sur
  // chaque TemplateFolder (allowed_roles/user_ids), pas dans une liste séparée
  // à filtrer : pas besoin de accessRestrictionsList ici.
  const templateAccessRows = useMemo(() => flattenTemplateAccessRows(templateTree.tree), [templateTree.tree]);
  const templateAccessOriginal = useMemo(
    () => buildTemplateAccessOriginal(templateTree.tree),
    [templateTree.tree],
  );
  const templateAccessDraft = useAccessRightsDraft(templateAccessOriginal);
  const templateAccessTableRows: AccessRightsRow[] = templateAccessRows.map(row => ({
    ...row,
    allowedRoles: templateAccessDraft.draft[row.id]?.allowedRoles ?? [],
    userIds: templateAccessDraft.draft[row.id]?.userIds ?? [],
  }));
  // Rôles effectivement accordés à chaque ligne (directement, ou via un
  // sous-dossier qui les coche déjà) — calculés en direct depuis le
  // brouillon courant, indexés par id de LIGNE du tableau ("folder:<id>"),
  // comme `templateAccessTableRows` (voir access/effectiveRoles.ts). Pur
  // affichage (grise la case), aucune écriture n'en découle.
  const templateEffectiveRolesByRowId = useMemo(
    () =>
      templateEffectiveRoles(
        templateTree.tree,
        folderId => templateAccessDraft.draft[`folder:${folderId}`]?.allowedRoles ?? [],
      ),
    [templateTree.tree, templateAccessDraft.draft],
  );
  // Même calcul pour une vraie dataroom — la racine ("dataroom") et chaque
  // dossier/pièce du brouillon courant, même sémantique "explicite quelque
  // part dans le sous-arbre" qu'un Template.
  const dataroomEffectiveRolesByRowId = useMemo(
    () =>
      computeDataroomEffectiveRoles(
        dataroomTree.tree,
        dataroomTree.rootDocuments,
        dataroomTree.documentsByFolderId,
        rowId => dataroomAccessDraft.draft[rowId]?.allowedRoles ?? [],
      ),
    [dataroomTree.tree, dataroomTree.rootDocuments, dataroomTree.documentsByFolderId, dataroomAccessDraft.draft],
  );

  const officeUsersForAccess = officeUsers.items.map(u => ({ userId: u.user_id, username: u.username, role: u.role }));

  async function saveDataroomAccess() {
    if (!openDataroom) return;
    await Promise.all(
      dataroomAccessDraft.dirtyRowIds.map(rowId => {
        const entry = dataroomAccessDraft.draft[rowId] ?? { allowedRoles: [], userIds: [] };
        const state = { userIds: entry.userIds, allowedRoles: entry.allowedRoles };
        if (rowId === 'dataroom') return api.setDataroomAccess(openDataroom.id, state);
        if (rowId.startsWith('folder:')) {
          return api.setFolderAccess(openDataroom.id, Number(rowId.slice('folder:'.length)), state);
        }
        return api.setDocumentAccess(openDataroom.id, Number(rowId.slice('document:'.length)), state);
      }),
    );
    await accessRestrictionsList.refresh();
  }

  async function saveTemplateAccess() {
    if (openTemplateId === null) return;
    await Promise.all(
      templateAccessDraft.dirtyRowIds.map(rowId => {
        const entry = templateAccessDraft.draft[rowId] ?? { allowedRoles: [], userIds: [] };
        const folderId = Number(rowId.slice('folder:'.length));
        return api.updateTemplateFolder(openTemplateId, folderId, {
          allowed_roles: entry.allowedRoles, user_ids: entry.userIds,
        });
      }),
    );
    await templateTree.refresh();
  }

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

    const active = modulesWithServerState.filter(m => m.enabled && !m.comingSoon);
    if (!active.length) return withRealCounts;
    return [
      ...withRealCounts,
      {
        label: 'Modules',
        items: active.map(m => ({
          key: `${MODULE_PREFIX}${m.slug}`,
          icon: m.icon,
          label: m.name,
        })),
      },
    ];
  }, [modulesWithServerState, datarooms.items.length, datarooms.loading, datarooms.error]);

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
  }, [navSections]);

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

  function navigate(key: string, settingsLanding?: SettingsTabKey) {
    const slug = moduleSlugOf(key);
    setModuleSlug(slug);
    // Un écran de module n'est pas un ScreenKey : `screen` reste sur sa dernière
    // valeur pendant qu'un module est ouvert, et c'est `moduleSlug` qui décide
    // de ce qui s'affiche (voir le rendu plus bas).
    if (!slug) setScreen(key as ScreenKey);
    setOpenDataroomId(null);
    setFocusFolder(null);
    setSettingsTab(settingsLanding);
  }

  /* ===========================================================================
     Actions rapides de l'accueil (catalogue : src/dashboard/actions.ts).

     Elles vivent ICI parce qu'une action rapide n'est pas une navigation : elle
     ouvre une fenêtre de création, dont l'état appartient à ce composant. Un
     widget qui voudrait le faire lui-même devrait connaître `modalOpen`,
     `userModal`, `templateModal`… c'est-à-dire tout App.tsx.

     CE QUI REND LE GESTE POSSIBLE SANS PLOMBERIE NOUVELLE : ces fenêtres sont
     montées DANS le bloc de leur écran, et leur état est déjà ici. Naviguer et
     ouvrir dans le même geste suffit donc — le temps que React applique les
     deux, l'écran d'arrivée est monté avec sa fenêtre ouverte. L'action part
     toujours de l'accueil, donc l'écran d'arrivée n'est jamais déjà monté :
     c'est ce qui rend `defaultTab` fiable pour « Créer un modèle ».
     ======================================================================== */
  function runQuickAction(key: string) {
    switch (key) {
      case 'dossier':
        navigate('datarooms');
        setModalOpen(true);
        break;
      case 'depot': {
        // Le dépôt exige un dossier OUVERT : il n'y a pas de zone de dépôt sur
        // l'accueil, et en inventer une voudrait dire demander « où ? » juste
        // après. On ouvre donc le dossier le plus récent (la liste du serveur
        // est triée par date de création décroissante), où la commande de dépôt
        // est à portée ; sans aucun dossier, la liste et son bouton de création.
        const latest = datarooms.items[0];
        if (!latest) {
          navigate('datarooms');
          break;
        }
        navigate('dataroom');
        setOpenDataroomId(latest.id);
        break;
      }
      case 'invite':
        navigate('users');
        setUserModalError(null);
        setUserModal('create');
        break;
      case 'modele':
        navigate('settings', 'sub3-template');
        setTemplateModalError(null);
        setTemplateModal({ mode: 'create' });
        break;
      case 'portefeuilles':
        navigate('portfolios');
        break;
      case 'annuaire':
        navigate('users');
        break;
      case 'stats':
        navigate('stats');
        break;
      case 'apparence':
        navigate('settings');
        break;
      // 'recherche' n'arrive jamais ici : la palette appartient à la coquille,
      // et l'accueil l'ouvre par le contexte de commandes (voir
      // components/templates/shellCommands.ts).
      default:
        break;
    }
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

  const currentOffice = session.offices.find(o => o.name === session.tenant?.name);
  /* Un seul prédicat : « l'appelant administre cette étude » (admin ou
     superadmin — assignableRoles ne rend une liste non vide qu'à eux). Il gate
     les modèles de dossier ET l'identité de l'étude, qui sont réservés aux
     mêmes rôles côté serveur ; deux noms pour la même condition finiraient par
     diverger. */
  const canManageOffice = assignableRoles(currentOffice?.role).length > 0;

  // Contenu de l'onglet « Template » de Personnalisation (02/09/2026 — déplacé
  // depuis l'ancienne entrée de navigation top-level « Modèles de dossier »,
  // voir CLAUDE.md). Calculé ici plutôt que gaté par `screen`, exactement
  // comme `modules`/`identity` plus bas : SettingsScreen décide seul, via son
  // propre état d'onglet interne, quand l'afficher — openTemplateId reste,
  // lui, la seule source de vérité pour savoir si c'est la liste ou le détail
  // d'un modèle qui doit s'afficher à l'intérieur de cet onglet.
  const templatesTabContent =
    openTemplateId === null ? (
      <>
        <TemplatesListScreen
          rows={templates.items}
          loading={templates.loading}
          error={templates.error}
          canManage={canManageOffice}
          onOpen={id => setOpenTemplateId(id)}
          onCreate={() => {
            setTemplateModalError(null);
            setTemplateModal({ mode: 'create' });
          }}
          onEdit={template => {
            setTemplateModalError(null);
            setTemplateModal({ mode: 'edit', target: template });
          }}
          onDelete={template => {
            setDeleteTemplateError(null);
            setTemplateToDelete(template);
          }}
        />
        <NewTemplateModal
          // Remonter le mode ET la cible dans la clé remet les champs à zéro
          // en passant d'un modèle à l'autre — même convention que
          // OfficeUserModal (create/attach) plus haut.
          key={templateModal ? `${templateModal.mode}-${templateModal.target?.id ?? 'new'}` : 'closed'}
          open={templateModal !== null}
          mode={templateModal?.mode ?? 'create'}
          initial={
            templateModal?.target
              ? { name: templateModal.target.name, description: templateModal.target.description }
              : undefined
          }
          error={templateModalError}
          onClose={() => {
            setTemplateModal(null);
            setTemplateModalError(null);
          }}
          onSubmit={({ name, description }) => {
            setTemplateModalError(null);
            const done =
              templateModal?.mode === 'edit' && templateModal.target
                ? templates.update(templateModal.target.id, { name, description })
                : templates.create(name, description);
            done.then(() => setTemplateModal(null)).catch((err: Error) => setTemplateModalError(err.message));
          }}
        />
        <ConfirmModal
          open={templateToDelete !== null}
          title="Supprimer le modèle"
          confirmLabel="Supprimer"
          destructive
          error={deleteTemplateError}
          onCancel={() => {
            setTemplateToDelete(null);
            setDeleteTemplateError(null);
          }}
          onConfirm={() => {
            if (!templateToDelete) return;
            setDeleteTemplateError(null);
            templates
              .remove(templateToDelete.id)
              .then(() => setTemplateToDelete(null))
              .catch((err: Error) => setDeleteTemplateError(err.message));
          }}
        >
          {templateToDelete && (
            <>
              <strong>{templateToDelete.name}</strong> et son arborescence de dossiers seront
              supprimés.
              <div style={{ marginTop: 8 }}>
                Les datarooms déjà créées à partir de ce modèle ne sont pas affectées : la
                copie qu'elles portent leur est propre, sans lien vivant vers ce modèle.
              </div>
            </>
          )}
        </ConfirmModal>
      </>
    ) : (
      openTemplate && (
        <>
          <TemplateDetailScreen
            // Remonté par l'identité du modèle : plus de sélection interne à
            // réinitialiser (l'écran est un pur tableau maintenant), mais
            // garde le remontage pour repartir d'un brouillon propre d'un
            // modèle à l'autre (voir useAccessRightsDraft — le brouillon,
            // lui, vit dans App.tsx et suit `openTemplateId`).
            key={openTemplate.id}
            templateName={openTemplate.name}
            templateDescription={openTemplate.description}
            rows={templateAccessTableRows}
            officeUsers={officeUsersForAccess}
            onChangeRow={(rowId, next) => templateAccessDraft.setRow(rowId, next)}
            effectiveRoles={templateEffectiveRolesByRowId}
            loading={templateTree.loading || officeUsers.loading}
            error={templateAccessSaveError ?? officeUsers.error ?? templateTree.error}
            canManage={canManageOffice}
            onBackToList={() => setOpenTemplateId(null)}
            onCreateRootFolder={() => setNewTemplateFolderModal({ parentId: undefined })}
            onCreateFolder={rowId => setNewTemplateFolderModal({ parentId: rowId.slice('folder:'.length) })}
            onRenameFolder={rowId => {
              const folderId = rowId.slice('folder:'.length);
              setRenameError(null);
              setRenameTarget({
                kind: 'template-folder',
                templateId: openTemplate.id,
                folderId: Number(folderId),
                currentName: templateFolderLabel(templateAccessRows, folderId) ?? '',
              });
            }}
            onDeleteFolder={rowId => {
              const folderId = rowId.slice('folder:'.length);
              setDeleteFolderError(null);
              setFolderToDelete({ id: folderId, name: templateFolderLabel(templateAccessRows, folderId) ?? '' });
            }}
            accessSaveBar={
              <AccessRightsPanel
                dirtyCount={templateAccessDraft.dirtyRowIds.length}
                saving={savingTemplateAccess}
                onReset={templateAccessDraft.reset}
                onSave={() => {
                  setTemplateAccessSaveError(null);
                  setSavingTemplateAccess(true);
                  saveTemplateAccess()
                    .catch((err: Error) => setTemplateAccessSaveError(err.message))
                    .finally(() => setSavingTemplateAccess(false));
                }}
              />
            }
          />
          <NewTemplateFolderModal
            open={newTemplateFolderModal !== null}
            onClose={() => setNewTemplateFolderModal(null)}
            parentLabel={
              newTemplateFolderModal?.parentId
                ? templateFolderLabel(templateAccessRows, newTemplateFolderModal.parentId)
                : 'Racine du modèle'
            }
            onCreate={name => {
              const parentId = newTemplateFolderModal?.parentId ? Number(newTemplateFolderModal.parentId) : undefined;
              void templateTree.createFolder(name, parentId).then(() => setNewTemplateFolderModal(null));
            }}
          />
          <ConfirmModal
            open={folderToDelete !== null}
            title="Supprimer ce dossier"
            confirmLabel="Supprimer"
            destructive
            error={deleteFolderError}
            onCancel={() => {
              setFolderToDelete(null);
              setDeleteFolderError(null);
            }}
            onConfirm={() => {
              if (!folderToDelete) return;
              setDeleteFolderError(null);
              templateTree
                .removeFolder(Number(folderToDelete.id))
                .then(() => setFolderToDelete(null))
                .catch((err: Error) => setDeleteFolderError(err.message));
            }}
          >
            {folderToDelete && (
              <>
                <strong>{folderToDelete.name}</strong> et tous ses sous-dossiers seront
                supprimés du modèle.
              </>
            )}
          </ConfirmModal>
        </>
      )
    );

  return (
    <AppShell
      officeName={session.tenant?.name ?? 'Office'}
      officeRole={currentOffice?.role ?? '—'}
      logoUrl={session.tenant?.logo_url || undefined}
      navSections={navSections}
      activeScreen={moduleSlug ? `${MODULE_PREFIX}${moduleSlug}` : screen}
      onNavigate={navigate}
      offices={session.offices}
      officeSubdomain={currentOffice?.subdomain}
      onSelectOffice={subdomain => void switchOffice(subdomain)}
      onLogout={() => setLogoutConfirm(true)}
      userInitials={initialsOf(username)}
      userName={username}
      userRole={currentOffice?.role ?? 'Membre'}
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
        Vous quittez <strong>{username}</strong>. Il faudra saisir à nouveau votre mot de
        passe et un code d'authentification pour revenir.
        <div style={{ marginTop: 8 }}>
          <strong>Cette déconnexion ferme TOUTES vos études ouvertes</strong>, pas
          seulement {session.tenant?.name ?? 'celle-ci'}
          {session.offices.length > 1 && (
            <>
              {' '}— un onglet resté ouvert sur un autre office vous renverra à l'écran de
              connexion dès son prochain appel au serveur
            </>
          )}
          .
        </div>
      </ConfirmModal>

      {/* Le renommage se déclenche depuis le menu "⋮" de l'arbre, aussi bien
          dans une vraie dataroom que dans un Template — un seul popup, monté
          hors des écrans plutôt que dupliqué dans les deux blocs. */}
      <RenameFolderModal
        open={renameTarget !== null}
        currentName={renameTarget?.currentName ?? ''}
        error={renameError}
        onClose={() => {
          setRenameTarget(null);
          setRenameError(null);
        }}
        onSubmit={name => {
          if (!renameTarget) return;
          setRenameError(null);
          const done =
            renameTarget.kind === 'dataroom-folder'
              ? api
                  .renameFolder(renameTarget.dataroomId, renameTarget.folderId, name)
                  .then(() => dataroomTree.refresh())
              : api
                  .updateTemplateFolder(renameTarget.templateId, renameTarget.folderId, { name })
                  .then(() => templateTree.refresh());
          done.then(() => setRenameTarget(null)).catch((err: Error) => setRenameError(err.message));
        }}
      />

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

      {!openModuleEntry && screen === 'dashboard' && (
        <DashboardScreen
          role={currentOffice?.role}
          ready={authenticated}
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
          runAction={runQuickAction}
          allowedActions={allowedActionKeys(canManageOffice)}
        />
      )}

      {!openModuleEntry && screen === 'portfolios' && (
        <PortfoliosScreen
          portfolios={PORTFOLIOS}
          onCreate={() => {}}
          onFilter={() => {}}
          onOpen={() => setScreen('datarooms')}
        />
      )}

      {!openModuleEntry && screen === 'datarooms' && (
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
              void datarooms.create(name, undefined, templateId).then(() => setModalOpen(false));
            }}
            portfolioOptions={PORTFOLIO_OPTIONS}
            clientSpaceOptions={CLIENT_SPACE_OPTIONS}
            templates={templates.items}
          />
        </>
      )}

      {!openModuleEntry && screen === 'dataroom' && openDataroom && (
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
            onRenameFolder={folderId => {
              // Le nœud racine synthétique (ROOT_NODE_ID) n'est pas un vrai
              // Folder côté serveur — rien à renommer là.
              if (folderId === ROOT_NODE_ID) return;
              setRenameError(null);
              setRenameTarget({
                kind: 'dataroom-folder',
                dataroomId: openDataroom.id,
                folderId: Number(folderId),
                currentName: findFolderLabel(tree, folderId) ?? '',
              });
            }}
            accessRightsTab={
              <div>
                <AccessRightsPanel
                  dirtyCount={dataroomAccessDraft.dirtyRowIds.length}
                  saving={savingDataroomAccess}
                  onReset={dataroomAccessDraft.reset}
                  onSave={() => {
                    setDataroomAccessSaveError(null);
                    setSavingDataroomAccess(true);
                    saveDataroomAccess()
                      .catch((err: Error) => setDataroomAccessSaveError(err.message))
                      .finally(() => setSavingDataroomAccess(false));
                  }}
                />
                <AccessRightsTable
                  rows={dataroomAccessTableRows}
                  officeUsers={officeUsersForAccess}
                  onChangeRow={(rowId, next) => dataroomAccessDraft.setRow(rowId, next)}
                  loading={accessRestrictionsList.loading || officeUsers.loading}
                  error={dataroomAccessSaveError ?? accessRestrictionsList.error ?? officeUsers.error}
                  effectiveRoles={row => dataroomEffectiveRolesByRowId[row.id] ?? []}
                />
              </div>
            }
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
        </>
      )}

      {!openModuleEntry && screen === 'users' && (
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
            onShowRestrictions={user => setRestrictionsUser(user)}
            currentUsername={username}
          />
          <UserRestrictionsModal
            open={restrictionsUser !== null}
            username={restrictionsUser?.username ?? ''}
            userId={restrictionsUser?.userId ?? 0}
            userRole={restrictionsUser?.role ?? ''}
            items={accessRestrictionsList.items}
            loading={accessRestrictionsList.loading}
            error={accessRestrictionsList.error}
            onClose={() => setRestrictionsUser(null)}
            onToggle={(item, checked) => {
              if (!restrictionsUser) return;
              const nextUserIds = checked
                ? [...item.user_ids, restrictionsUser.userId]
                : item.user_ids.filter(id => id !== restrictionsUser.userId);
              const state = { userIds: nextUserIds, allowedRoles: item.allowed_roles };
              const save =
                item.kind === 'dataroom'
                  ? api.setDataroomAccess(item.dataroom_id, state)
                  : item.kind === 'folder'
                    ? api.setFolderAccess(item.dataroom_id, item.target_id, state)
                    : api.setDocumentAccess(item.dataroom_id, item.target_id, state);
              void save.then(() => accessRestrictionsList.refresh());
            }}
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

      {!openModuleEntry && screen === 'stats' && (
        <StatsScreen usage={CLIENT_USAGE} invoices={INVOICES} connected={CONNECTED_USERS} />
      )}

      {!openModuleEntry && screen === 'settings' && (
        <SettingsScreen
          defaultTab={settingsTab}
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
            // Aucun endpoint d'activation : les interrupteurs montrent l'état
            // réel de l'office et ne prétendent pas agir. Un interrupteur qui
            // bascule sans rien changer côté serveur est pire que pas
            // d'interrupteur du tout — il fait croire la démo faite.
            readOnly: true,
            readOnlyNote:
              "L'activation d'un module se fait aujourd'hui côté Notantis (admin Django) : cet écran montre ce dont l'office dispose réellement, sans le modifier.",
          }}
          templatesTab={templatesTabContent}
        />
      )}
    </AppShell>
  );
}

/**
 * Barre au-dessus d'un `AccessRightsTable` — décompte des lignes modifiées,
 * Annuler/Enregistrer. Les modifications restent locales jusqu'à ce bouton
 * (voir CLAUDE.md, "État réel du code", 02/09/2026) : aucune requête n'est
 * déclenchée par une case cochée dans le tableau lui-même.
 */
function AccessRightsPanel({
  dirtyCount,
  saving,
  onReset,
  onSave,
}: {
  dirtyCount: number;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12, marginBottom: 12,
      }}
    >
      <div className="tiny dim" style={{ maxWidth: 520 }}>
        Superadmin garde toujours accès, quelle que soit la configuration ci-dessous. Sur une
        ligne sans case cochée ni utilisateur nommé, l'accès reste ouvert à tous les rôles sauf
        Client.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="sm" onClick={onReset} disabled={!dirtyCount || saving}>
          Annuler
        </Button>
        <Button size="sm" variant="primary" onClick={onSave} disabled={!dirtyCount || saving}>
          {dirtyCount ? `Enregistrer (${dirtyCount})` : 'Enregistrer'}
        </Button>
      </div>
    </div>
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
