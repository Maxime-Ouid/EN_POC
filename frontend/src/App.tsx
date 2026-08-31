import { useEffect, useMemo, useState } from 'react';
import {
  AppShell,
  LoginScreen,
  MfaScreen,
  HomeScreen,
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
import { useSession } from './hooks/useSession';
import { useTenantTheme } from './theme/useTenantTheme';
import { useDatarooms, useDataroomTree, type FolderTreeNode } from './hooks/useDatarooms';
import { useAccessRestriction, type AccessTargetKind } from './hooks/useAccessRestrictions';
import { useOfficeUsers } from './hooks/useOfficeUsers';
import { useDocumentPreview } from './hooks/useDocumentPreview';
import { useModule } from './hooks/useModule';
import { api, type DocumentSummary } from './api/endpoints';
import {
  CLIENT_SPACE_OPTIONS,
  CLIENT_USAGE,
  CONNECTED_USERS,
  DATAROOM_TEMPLATES,
  DEMO_HOME_STATS,
  HISTORY,
  INVOICES,
  MEMBERS,
  MODULE_CATALOG,
  NAV_SECTIONS,
  NEW_DATAROOM_TEMPLATES,
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
  };
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

  const datarooms = useDatarooms(authenticated);
  const dataroomTree = useDataroomTree(screen === 'dataroom' ? openDataroomId : null);
  const openModule = useModule(moduleSlug);

  // L'annuaire alimente deux écrans : la page Annuaire et la liste à cocher de la
  // modale d'accès. Il n'est chargé que quand l'un des deux est à l'écran — un
  // membre simple n'y a de toute façon pas droit (403).
  const officeUsers = useOfficeUsers(authenticated && (screen === 'users' || accessTarget !== null));

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

  const dataroomRows: DataroomRow[] = datarooms.items.map(d => ({
    id: String(d.id),
    icon: 'folder',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: d.name,
    tags: [],
    members: [],
    storage: '—',
    activity: formatDate(d.created_at),
    status: { kind: 'success', label: 'Actif' },
  }));

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

  return (
    <AppShell
      officeName={session.tenant?.name ?? 'Office'}
      officeRole={currentOffice?.role ?? '—'}
      logoUrl={session.tenant?.logo_url || undefined}
      navSections={navSections}
      activeScreen={moduleSlug ? `${MODULE_PREFIX}${moduleSlug}` : screen}
      onNavigate={navigate}
      onSwitchOffice={
        session.offices.length > 1
          ? () => {
              const next = session.offices.find(o => o.subdomain !== currentOffice?.subdomain);
              if (next) void switchOffice(next.subdomain);
            }
          : undefined
      }
      userInitials={initialsOf(username)}
      userName={username}
      userRole={currentOffice?.role ?? 'Membre'}
      breadcrumbRoot={session.tenant?.name}
      breadcrumbCurrent={
        openModuleEntry?.name ?? (openDataroom ? openDataroom.name : CRUMB_LABELS[screen])
      }
      noticeLabel="Données partiellement simulées"
    >
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
        <HomeScreen
          // Seul le nombre de dossiers est réel ; les autres compteurs n'ont pas
          // encore de source côté backend.
          stats={{ ...DEMO_HOME_STATS, activeDatarooms: datarooms.items.length }}
          recentPortfolios={PORTFOLIOS.map(p => ({
            id: p.id,
            icon: p.icon,
            iconBg: p.iconBg,
            iconColor: p.iconColor,
            name: p.name,
            desc: p.desc,
            status: p.status,
          }))}
          recentActivity={RECENT_ACTIVITY}
          onOpenPortfolio={() => setScreen('datarooms')}
          onSeeAllPortfolios={() => setScreen('portfolios')}
          onSeeFullHistory={() => setScreen('stats')}
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
              setOpenDataroomId(Number(id));
              setScreen('dataroom');
            }}
            onCreate={() => setModalOpen(true)}
            displayRange={
              datarooms.loading
                ? 'Chargement…'
                : datarooms.error
                  ? datarooms.error
                  : `${datarooms.items.length} dossier${datarooms.items.length > 1 ? 's' : ''}`
            }
          />
          <NewDataroomModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onCreate={({ name }) => {
              void datarooms.create(name).then(() => setModalOpen(false));
            }}
            portfolioOptions={PORTFOLIO_OPTIONS}
            clientSpaceOptions={CLIENT_SPACE_OPTIONS}
            templates={NEW_DATAROOM_TEMPLATES}
          />
        </>
      )}

      {!openModuleEntry && screen === 'dataroom' && openDataroom && (
        <>
          <DataroomDetailScreen
            dataroomName={openDataroom.name}
            tags={[]}
            status={{ kind: 'success', label: 'Actif' }}
            meta={[
              { label: 'Créé le', value: formatDate(openDataroom.created_at) },
              { label: 'Documents', value: `${totalDocumentCount} fichier(s)` },
            ]}
            tree={tree}
            documentsByFolder={documentsByFolder}
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

      {!openModuleEntry && screen === 'stats' && (
        <StatsScreen usage={CLIENT_USAGE} invoices={INVOICES} connected={CONNECTED_USERS} />
      )}

      {!openModuleEntry && screen === 'settings' && (
        <SettingsScreen
          identity={{
            identity: {
              displayName: session.tenant?.name ?? '',
              subdomain: window.location.host,
              logoUrl: session.tenant?.logo_url,
            },
            // Aucun endpoint d'écriture sur Office pour l'instant : l'onglet
            // édite localement et le dit, plutôt que de simuler un succès.
            error: "L'enregistrement de l'identité n'est pas encore exposé par l'API.",
          }}
          modules={{
            modules: modulesWithServerState,
            templates: DATAROOM_TEMPLATES,
            // Aucun endpoint d'activation : les interrupteurs montrent l'état
            // réel de l'office et ne prétendent pas agir. Un interrupteur qui
            // bascule sans rien changer côté serveur est pire que pas
            // d'interrupteur du tout — il fait croire la démo faite.
            readOnly: true,
            readOnlyNote:
              "L'activation d'un module se fait aujourd'hui côté Notantis (admin Django) : cet écran montre ce dont l'office dispose réellement, sans le modifier.",
          }}
        />
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
