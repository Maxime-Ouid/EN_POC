import { useState } from 'react';
import {
  LoginScreen,
  AppShell,
  HomeScreen,
  PortfoliosScreen,
  DataroomsListScreen,
  DataroomDetailScreen,
  NewDataroomModal,
  StatsScreen,
  SettingsScreen,
} from './components';
import {
  CLIENT_SPACE_OPTIONS,
  CLIENT_USAGE,
  CONNECTED_USERS,
  DATAROOM_ROWS,
  DATAROOM_TEMPLATES,
  DEMO_DATAROOM_DETAIL,
  DEMO_HOME_STATS,
  DEMO_OFFICE,
  DOCS_BY_FOLDER,
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
  TREE,
} from './data/demo';

// Reconstitution complète du prototype « Espace Notarial Next » (index_16.html)
// à partir de src/components et src/screens, sur données de démonstration
// (aucun appel réseau) — sert de référence visuelle et de banc d'essai des
// composants. Accessible en dev sur
// https://<host>:5173/?view=prototype-preview (voir main.tsx).
//
// L'application réelle, elle, est App.tsx : mêmes écrans, mêmes composants,
// mais alimentés par le backend Django là où les endpoints existent.

type ScreenKey = 'dashboard' | 'portfolios' | 'datarooms' | 'dataroom' | 'stats' | 'settings';

const CRUMB_LABELS: Record<ScreenKey, string> = {
  dashboard: 'Accueil',
  portfolios: 'Portefeuilles',
  datarooms: 'Dossiers',
  dataroom: 'Dossiers',
  stats: 'Statistiques & facturation',
  settings: 'Personnalisation',
};

export function PrototypeDemo() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [modules, setModules] = useState(MODULE_CATALOG);

  if (!loggedIn) {
    return (
      <LoginScreen
        officeName={DEMO_OFFICE.fullName}
        officeDomain={DEMO_OFFICE.subdomain}
        defaultIdentifier={DEMO_OFFICE.identifier}
        onSubmit={() => setLoggedIn(true)}
        onSsoClick={() => setLoggedIn(true)}
      />
    );
  }

  return (
    <AppShell
      officeName={DEMO_OFFICE.name}
      officeRole={DEMO_OFFICE.role}
      navSections={NAV_SECTIONS}
      activeScreen={screen}
      onNavigate={key => setScreen(key as ScreenKey)}
      userInitials={DEMO_OFFICE.userInitials}
      userName={DEMO_OFFICE.userName}
      userRole={DEMO_OFFICE.userRole}
      onLogout={() => setLoggedIn(false)}
      breadcrumbRoot={DEMO_OFFICE.name}
      breadcrumbCurrent={CRUMB_LABELS[screen]}
      hasUnreadNotifications
    >
      {screen === 'dashboard' && (
        <HomeScreen
          stats={DEMO_HOME_STATS}
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
            totalCount={245}
            rows={DATAROOM_ROWS}
            onOpen={() => setScreen('dataroom')}
            onCreate={() => setModalOpen(true)}
            displayRange="1–6 sur 245 dossiers"
          />
          <NewDataroomModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onCreate={() => setModalOpen(false)}
            portfolioOptions={PORTFOLIO_OPTIONS}
            clientSpaceOptions={CLIENT_SPACE_OPTIONS}
            templates={NEW_DATAROOM_TEMPLATES}
          />
        </>
      )}

      {screen === 'dataroom' && (
        <DataroomDetailScreen
          portfolioName={DEMO_DATAROOM_DETAIL.portfolioName}
          dataroomName={DEMO_DATAROOM_DETAIL.name}
          tags={DEMO_DATAROOM_DETAIL.tags}
          status={DEMO_DATAROOM_DETAIL.status}
          meta={DEMO_DATAROOM_DETAIL.meta}
          tree={TREE}
          documentsByFolder={DOCS_BY_FOLDER}
          qaEntries={QA_ENTRIES}
          members={MEMBERS}
          history={HISTORY}
          onBackToList={() => setScreen('datarooms')}
        />
      )}

      {screen === 'stats' && (
        <StatsScreen usage={CLIENT_USAGE} invoices={INVOICES} connected={CONNECTED_USERS} />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          identity={{
            identity: {
              displayName: DEMO_OFFICE.fullName,
              subdomain: DEMO_OFFICE.subdomain,
            },
          }}
          modules={{
            modules,
            templates: DATAROOM_TEMPLATES,
            onToggleModule: (slug, next) =>
              setModules(prev => prev.map(m => (m.slug === slug ? { ...m, enabled: next } : m))),
          }}
        />
      )}
    </AppShell>
  );
}
