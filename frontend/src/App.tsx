import { useMemo, useState } from 'react';
import {
  AppShell,
  LoginScreen,
  HomeScreen,
  PortfoliosScreen,
  DataroomsListScreen,
  type DataroomRow,
  DataroomDetailScreen,
  type DataroomDocument,
  NewDataroomModal,
  StatsScreen,
  SettingsScreen,
  Card,
  type TreeNodeData,
} from './components';
import { useSession } from './hooks/useSession';
import { useDatarooms, useDocuments } from './hooks/useDatarooms';
import { api } from './api/endpoints';
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

   Tout le reste (portefeuilles, arborescence de rubriques, Q&R, membres,
   historique d'audit, statistiques, facturation, sessions ouvertes, modèles)
   n'est pas encore modélisé côté serveur et s'affiche à partir des jeux de
   démonstration de src/data/demo.tsx. La pastille de la topbar le dit à
   l'écran : on ne laisse pas croire que ces chiffres sont réels.
   =========================================================================== */

type ScreenKey = 'dashboard' | 'portfolios' | 'datarooms' | 'dataroom' | 'stats' | 'settings';

const CRUMB_LABELS: Record<ScreenKey, string> = {
  dashboard: 'Accueil',
  portfolios: 'Portefeuilles',
  datarooms: 'Dossiers',
  dataroom: 'Dossiers',
  stats: 'Statistiques & facturation',
  settings: 'Personnalisation',
};

/** Rubrique unique servie tant que le backend n'a pas d'arborescence. */
const FLAT_FOLDER_ID = 'all';

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

  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [openDataroomId, setOpenDataroomId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [modules, setModules] = useState(MODULE_CATALOG);

  const datarooms = useDatarooms(authenticated);
  const documents = useDocuments(screen === 'dataroom' ? openDataroomId : null);

  const openDataroom = datarooms.items.find(d => d.id === openDataroomId) ?? null;

  // Les modules réellement activés viennent de /api/tenant-config/ ; le
  // catalogue (libellés, icônes, « à venir ») reste côté front faute de
  // description exposée par l'API.
  const modulesWithServerState = useMemo(() => {
    const enabled = new Set(session.tenant?.enabled_modules ?? []);
    return modules.map(m => (m.comingSoon ? m : { ...m, enabled: enabled.has(m.slug) || m.enabled }));
  }, [modules, session.tenant]);

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

  const documentRows: DataroomDocument[] = documents.items.map(doc => ({
    id: String(doc.id),
    name: doc.name,
    status: { kind: 'neutral', label: 'Déposé' },
    addedBy: session.user?.username ?? '—',
    date: formatDate(doc.uploaded_at),
    // Le backend ne renvoie pas encore la taille du fichier (Document n'expose
    // que name/file/uploaded_at) — pas de valeur inventée.
    size: '—',
  }));

  const tree: TreeNodeData[] = [
    { id: FLAT_FOLDER_ID, label: 'Documents', count: documents.items.length },
  ];

  async function switchOffice(subdomain: string) {
    const { ticket } = await api.issueSsoTicket(subdomain);
    window.location.href = `https://${subdomain}.localhost:8000/api/sso/consume/?ticket=${encodeURIComponent(ticket)}`;
  }

  function navigate(key: string) {
    setScreen(key as ScreenKey);
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

  const username = session.user?.username ?? '';
  const currentOffice = session.offices.find(o => o.name === session.tenant?.name);

  return (
    <AppShell
      officeName={session.tenant?.name ?? 'Office'}
      officeRole={currentOffice?.role ?? '—'}
      logoUrl={session.tenant?.logo_url || undefined}
      navSections={NAV_SECTIONS}
      activeScreen={screen}
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
      breadcrumbCurrent={openDataroom ? openDataroom.name : CRUMB_LABELS[screen]}
      noticeLabel="Données partiellement simulées"
    >
      {screen === 'dashboard' && (
        <HomeScreen
          officeName={session.tenant?.name ?? 'votre office'}
          userFirstName={username.split(/[.@]/)[0]}
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

      {screen === 'portfolios' && (
        <PortfoliosScreen
          portfolios={PORTFOLIOS}
          onCreate={() => {}}
          onFilter={() => {}}
          onOpen={() => setScreen('datarooms')}
        />
      )}

      {screen === 'datarooms' && (
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

      {screen === 'dataroom' && openDataroom && (
        <DataroomDetailScreen
          dataroomName={openDataroom.name}
          tags={[]}
          status={{ kind: 'success', label: 'Actif' }}
          meta={[
            { label: 'Créé le', value: formatDate(openDataroom.created_at) },
            { label: 'Documents', value: `${documents.items.length} fichier(s)` },
          ]}
          tree={tree}
          documentsByFolder={{ [FLAT_FOLDER_ID]: documentRows }}
          // Non modélisés côté backend — jeux de démonstration assumés.
          qaEntries={QA_ENTRIES}
          members={MEMBERS}
          history={HISTORY}
          onBackToList={() => navigate('datarooms')}
          onAddDocuments={() => pickFileAndUpload(documents.upload)}
        />
      )}

      {screen === 'stats' && (
        <StatsScreen usage={CLIENT_USAGE} invoices={INVOICES} connected={CONNECTED_USERS} />
      )}

      {screen === 'settings' && (
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
            onToggleModule: (slug, next) =>
              setModules(prev => prev.map(m => (m.slug === slug ? { ...m, enabled: next } : m))),
          }}
        />
      )}
    </AppShell>
  );
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
