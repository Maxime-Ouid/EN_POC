import { useMemo, useState } from 'react';
import {
  AppShell, Button, DataroomDetailScreen, DataroomsListScreen, HomeScreen,
  LoginScreen, ModuleScreen, PortfoliosScreen, SettingsScreen, StatsScreen,
} from '../components';
import { useTenantTheme } from '../theme/useTenantTheme';
import * as demo from '../data/demo';
import { Specimen, ScreenPreview } from './Specimen';
import { FilterContext } from './filter';
import { AtomSpecimens } from './atoms';
import { MoleculeSpecimens } from './molecules';
import { OrganismSpecimens } from './organisms';
import { allExportedComponents } from './introspect';
import './uikit.css';

/* ===========================================================================
   Bibliothèque de composants — page de référence.

   Tout ce qui est affiché ici est le composant réel, monté et interactif, avec
   le thème courant : ce n'est pas une capture. Modifier une couleur dans le
   spécimen TokenEditor repeint donc la page entière, ce qui est exactement le
   test qu'on veut pouvoir faire.

   Les écrans (pages et template) sont rendus à leur taille réelle puis réduits
   à l'échelle : ils restent vivants, seul le facteur d'échelle change.

   Accessible en dev sur https://<host>:5173/?view=ui-kit (voir main.tsx).
   =========================================================================== */

const SECTIONS = [
  { id: 'atoms', title: 'Atoms', desc: "Un élément d'interface qui ne contient aucun autre composant du design system." },
  { id: 'molecules', title: 'Molecules', desc: 'Des atomes assemblés pour rendre un service précis.' },
  { id: 'organisms', title: 'Organisms', desc: "Un bloc autonome et signifiant pour l'utilisateur, avec son propre état si besoin." },
  { id: 'templates', title: 'Templates', desc: 'La coquille de page, sans contenu métier.' },
  { id: 'pages', title: 'Pages', desc: 'Un écran complet, alimenté par des props ou des hooks.' },
];

const noop = () => {};

function ThemeSwitch() {
  const { editMode, setEditMode } = useTenantTheme();
  return (
    <div className="theme-edit-toggle" role="tablist" aria-label="Thème d'aperçu">
      <button type="button" role="tab" aria-selected={editMode === 'light'}
        className={editMode === 'light' ? 'theme-edit-btn active' : 'theme-edit-btn'}
        onClick={() => setEditMode('light')}>Clair</button>
      <button type="button" role="tab" aria-selected={editMode === 'dark'}
        className={editMode === 'dark' ? 'theme-edit-btn active' : 'theme-edit-btn'}
        onClick={() => setEditMode('dark')}>Sombre</button>
    </div>
  );
}

// Le Coffre-fort est le module réellement servi par le backend du POC — c'est
// donc lui qui sert d'exemple ici, pas un module inventé.
const DEMO_MODULE = {
  name: 'Coffre-fort électronique',
  desc: 'Archivage à valeur probante — module Notantis',
  icon: 'lock',
  iconBg: 'var(--info-bg)',
  iconColor: 'var(--info)',
};

function ScreenSpecimens() {
  return (
    <>
      <Specimen
        name="LoginScreen"
        variants={[{ label: 'Écran de connexion', node: (
          <ScreenPreview>
            <LoginScreen officeName={demo.DEMO_OFFICE.fullName} officeDomain={demo.DEMO_OFFICE.subdomain}
              defaultIdentifier={demo.DEMO_OFFICE.identifier} onSubmit={noop} />
          </ScreenPreview>
        )}]}
      />

      <Specimen
        name="HomeScreen"
        variants={[{ label: 'Tableau de bord', node: (
          <ScreenPreview>
            <HomeScreen
              stats={demo.DEMO_HOME_STATS} recentPortfolios={demo.PORTFOLIOS} recentActivity={demo.RECENT_ACTIVITY}
              onOpenPortfolio={noop} onSeeAllPortfolios={noop} onSeeFullHistory={noop} />
          </ScreenPreview>
        )}]}
      />

      <Specimen
        name="PortfoliosScreen"
        variants={[{ label: 'Portefeuilles', node: (
          <ScreenPreview>
            <PortfoliosScreen portfolios={demo.PORTFOLIOS} onCreate={noop} onFilter={noop} onOpen={noop} />
          </ScreenPreview>
        )}]}
      />

      <Specimen
        name="DataroomsListScreen"
        variants={[{ label: 'Liste des dossiers', node: (
          <ScreenPreview>
            <DataroomsListScreen totalCount={245} rows={demo.DATAROOM_ROWS} onOpen={noop} onCreate={noop}
              displayRange="1–6 sur 245 dossiers" />
          </ScreenPreview>
        )}]}
      />

      <Specimen
        name="DataroomDetailScreen"
        variants={[{ label: 'Détail d\'un dossier', node: (
          <ScreenPreview>
            <DataroomDetailScreen portfolioName={demo.DEMO_DATAROOM_DETAIL.portfolioName}
              dataroomName={demo.DEMO_DATAROOM_DETAIL.name} tags={demo.DEMO_DATAROOM_DETAIL.tags}
              status={demo.DEMO_DATAROOM_DETAIL.status} meta={demo.DEMO_DATAROOM_DETAIL.meta}
              tree={demo.TREE} documentsByFolder={demo.DOCS_BY_FOLDER} qaEntries={demo.QA_ENTRIES}
              members={demo.MEMBERS} history={demo.HISTORY} onBackToList={noop} />
          </ScreenPreview>
        )}]}
      />

      <Specimen
        name="StatsScreen"
        variants={[{ label: 'Statistiques & facturation', node: (
          <ScreenPreview>
            <StatsScreen usage={demo.CLIENT_USAGE} invoices={demo.INVOICES} connected={demo.CONNECTED_USERS} />
          </ScreenPreview>
        )}]}
      />

      <Specimen
        name="SettingsScreen"
        variants={[
          { label: 'Personnalisation — Identité', node: (
            <ScreenPreview>
              <SettingsScreen identity={{ identity: { displayName: demo.DEMO_OFFICE.fullName, subdomain: demo.DEMO_OFFICE.subdomain } }}
                modules={{ modules: demo.MODULE_CATALOG, templates: demo.DATAROOM_TEMPLATES }} />
            </ScreenPreview>
          )},
          { label: 'Personnalisation — Apparence', node: (
            <ScreenPreview>
              <SettingsScreen defaultTab="sub3-apparence"
                identity={{ identity: { displayName: demo.DEMO_OFFICE.fullName, subdomain: demo.DEMO_OFFICE.subdomain } }}
                modules={{ modules: demo.MODULE_CATALOG, templates: demo.DATAROOM_TEMPLATES }} />
            </ScreenPreview>
          )},
        ]}
      />

      {/* Les quatre états d'un module sont montrés côte à côte : c'est le seul
          endroit où on peut les comparer sans manipuler la base. */}
      <Specimen
        name="ModuleScreen"
        variants={[
          { label: 'Activé', node: (
            <ScreenPreview>
              <ModuleScreen {...DEMO_MODULE} status="ready"
                message="Contenu du module Coffre-fort (démo)" />
            </ScreenPreview>
          )},
          { label: 'Chargement', node: (
            <ScreenPreview><ModuleScreen {...DEMO_MODULE} status="loading" /></ScreenPreview>
          )},
          { label: 'Non activé pour cet office', node: (
            <ScreenPreview><ModuleScreen {...DEMO_MODULE} status="disabled" /></ScreenPreview>
          )},
          { label: 'Activé, écran pas encore livré', node: (
            <ScreenPreview><ModuleScreen {...DEMO_MODULE} status="no-screen" /></ScreenPreview>
          )},
          { label: 'Injoignable', node: (
            <ScreenPreview>
              <ModuleScreen {...DEMO_MODULE} status="error" error="Backend injoignable" onRetry={noop} />
            </ScreenPreview>
          )},
        ]}
      />
    </>
  );
}

function TemplateSpecimens() {
  return (
    <Specimen
      name="AppShell"
      note="La coquille : sidebar, barre du haut et zone de contenu. Elle ne connaît rien du métier — l'écran courant lui est passé en enfant."
      variants={[{ label: 'Coquille avec le tableau de bord en contenu', node: (
        <ScreenPreview>
          <AppShell officeName={demo.DEMO_OFFICE.name} officeRole={demo.DEMO_OFFICE.role}
            navSections={demo.NAV_SECTIONS} activeScreen="dashboard" onNavigate={noop}
            userInitials={demo.DEMO_OFFICE.userInitials} userName={demo.DEMO_OFFICE.userName}
            userRole={demo.DEMO_OFFICE.userRole} breadcrumbRoot={demo.DEMO_OFFICE.name}
            breadcrumbCurrent="Accueil" hasUnreadNotifications>
            <HomeScreen
              stats={demo.DEMO_HOME_STATS} recentPortfolios={demo.PORTFOLIOS} recentActivity={demo.RECENT_ACTIVITY}
              onOpenPortfolio={noop} onSeeAllPortfolios={noop} onSeeFullHistory={noop} />
          </AppShell>
        </ScreenPreview>
      )}]}
    />
  );
}

export function UiKit() {
  const [query, setQuery] = useState('');
  const inventory = useMemo(() => allExportedComponents(), []);
  const total = useMemo(
    () => Object.values(inventory).reduce((n, list) => n + list.length, 0),
    [inventory],
  );

  // Le filtre est diffusé par contexte : chaque <Specimen> décide lui-même de
  // se rendre ou non, ce qui évite de tenir un second catalogue en parallèle
  // de celui des fiches.
  const filter = query.trim().toLowerCase();
  const matches = (name: string) => !filter || name.toLowerCase().includes(filter);
  const hasMatch = (level: string) => (inventory[level] ?? []).some(matches);

  return (
    <div className="uikit" data-filter={filter || undefined}>
      <nav className="uikit-nav">
        <div className="uikit-nav-title">Bibliothèque</div>
        <div className="uikit-nav-sub">{total} composants · Espace Notarial</div>
        {SECTIONS.map(s => (
          <div key={s.id}>
            <div className="uikit-nav-group">
              {s.title} <span>{(inventory[s.id] ?? []).length}</span>
            </div>
            {(inventory[s.id] ?? []).filter(matches).map(name => (
              <a key={name} href={`#c-${name}`}>{name}</a>
            ))}
          </div>
        ))}
      </nav>

      <main className="uikit-main">
        <div className="uikit-head">
          <div>
            <div className="eyebrow">Design system</div>
            <h1 className="page-title">Bibliothèque de composants</h1>
            <div className="page-sub">
              Chaque composant est monté pour de vrai, avec le thème courant et ses props réelles.
              La table des props est lue dans le code source, elle ne peut pas dériver.
            </div>
          </div>
          <div className="uikit-tools">
            <input className="uikit-search" placeholder="Filtrer…" value={query}
              onChange={e => setQuery(e.target.value)} aria-label="Filtrer les composants" />
            <ThemeSwitch />
            <Button size="sm" onClick={() => { window.location.search = '?view=prototype-preview'; }}>
              Voir la maquette
            </Button>
          </div>
        </div>

        <FilterContext.Provider value={filter}>
          <Section id="atoms" hidden={!hasMatch('atoms')}><AtomSpecimens /></Section>
          <Section id="molecules" hidden={!hasMatch('molecules')}><MoleculeSpecimens /></Section>
          <Section id="organisms" hidden={!hasMatch('organisms')}><OrganismSpecimens /></Section>
          <Section id="templates" hidden={!hasMatch('templates')}><TemplateSpecimens /></Section>
          <Section id="pages" hidden={!hasMatch('pages')}><ScreenSpecimens /></Section>
        </FilterContext.Provider>

        {total > 0 && !SECTIONS.some(s => hasMatch(s.id)) && (
          <p className="uikit-section-desc" style={{ marginTop: 40 }}>
            Aucun composant ne correspond à « {query} ».
          </p>
        )}
      </main>
    </div>
  );
}

function Section({ id, hidden, children }: { id: string; hidden: boolean; children: React.ReactNode }) {
  const section = SECTIONS.find(s => s.id === id)!;
  if (hidden) return null;
  return (
    <section id={id}>
      <h2 className="uikit-section-title">{section.title}</h2>
      <p className="uikit-section-desc">{section.desc}</p>
      {children}
    </section>
  );
}
