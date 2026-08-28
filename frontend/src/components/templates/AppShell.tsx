import { Decor } from '../atoms/Decor';
import { IconButton } from '../atoms/IconButton';
import { Nav } from '../atoms/Nav';
import { ProtoPill } from '../atoms/ProtoPill';
import { TopbarRight } from '../atoms/TopbarRight';
import { Breadcrumb } from '../molecules/Breadcrumb';
import { NavGroup } from '../molecules/NavGroup';
import { NavItem } from '../molecules/NavItem';
import { NavSubItem } from '../molecules/NavSubItem';
import { SidebarBrand } from '../molecules/SidebarBrand';
import { SidebarFoot } from '../molecules/SidebarFoot';
import { TenantSwitcher } from '../molecules/TenantSwitcher';
import { TopbarSearch } from '../molecules/TopbarSearch';
import { NavBar } from '../organisms/NavBar';
import { Sidebar } from '../organisms/Sidebar';
import { Topbar } from '../organisms/Topbar';
import { positionNavTooltip } from '../atoms/navTooltip';
import { isHorizontalNav } from '../../theme/schema';
import { useTenantTheme } from '../../theme/useTenantTheme';
import { useState } from 'react';
import type { ReactNode } from 'react';

export type { NavEntry, NavSection, NavSubEntry } from '../organisms/navModel';
import type { NavSection } from '../organisms/navModel';

export interface AppShellProps {
  officeName: string;
  officeRole: string;
  navSections: NavSection[];
  activeScreen: string;
  onNavigate: (screenKey: string) => void;
  onSwitchOffice?: () => void;
  userInitials: string;
  userName: string;
  userRole: string;
  onLogout?: () => void;
  breadcrumbCurrent: string;
  breadcrumbRoot?: string;
  hasUnreadNotifications?: boolean;
  children?: ReactNode;
  logoUrl?: string;
  /**
   * Texte de la pastille d'avertissement de la topbar. `null` la retire.
   * Sert à distinguer la maquette pure des écrans partiellement branchés sur
   * le backend — le lecteur doit toujours savoir ce qui est réel.
   */
  noticeLabel?: string | null;
  /**
   * Force le masquage des intitulés de section, quel que soit le réglage de
   * l'office. L'interface actuelle (V1) n'en affiche aucun : ses sections ne
   * servent qu'à regrouper le code, les nommer à l'écran n'aurait pas de sens.
   * Laissé à `undefined`, c'est la personnalisation de l'office qui décide.
   */
  hideSectionLabels?: boolean;
}

// Assemble la coquille de l'app (sidebar + topbar + zone de contenu) — §6.14 +
// topbar. Chaque écran (`HomeScreen`, `DataroomsListScreen`…) se monte comme
// `children` ; c'est ce composant qui porte la navigation et l'identité de
// l'utilisateur/office connectés.
export function AppShell({
  officeName,
  officeRole,
  navSections,
  activeScreen,
  onNavigate,
  onSwitchOffice,
  userInitials,
  userName,
  userRole,
  onLogout,
  breadcrumbCurrent,
  breadcrumbRoot,
  hasUnreadNotifications,
  children,
  logoUrl,
  noticeLabel = 'Aperçu — maquette visuelle',
  hideSectionLabels,
}: AppShellProps) {
  // Rubriques dépliées manuellement. Celle qui contient l'écran courant est
  // toujours ouverte, qu'elle soit dans cet ensemble ou non : l'utilisateur ne
  // doit jamais voir un item actif dans un menu replié.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // La disposition de la navigation est une personnalisation d'office, au même
  // titre que les couleurs : elle vient du thème, pas des props. Le CSS pose
  // déjà les décalages via [data-nav-placement] ; ce qui suit ne décide que de
  // CE QU'ON MONTE — un rail ne devient pas une barre d'onglets par CSS.
  const { state } = useTenantTheme();
  const layout = state.layout;
  const horizontal = isHorizontalNav(layout.navPlacement);
  // `hideSectionLabels` reste un veto de l'écran (V1 n'a pas d'intitulés à
  // montrer) ; sans veto, l'office décide.
  const showSectionLabels = hideSectionLabels ? false : layout.showSectionLabels;
  const countOf = (n?: number) => (layout.showBadges ? n : undefined);

  return (
    <div className="app is-active" id="app-main">
      {horizontal ? (
        <NavBar
          sections={navSections}
          activeScreen={activeScreen}
          onNavigate={onNavigate}
          brandName="Espace Notarial"
          logoUrl={logoUrl}
          showBadges={layout.showBadges}
          showSectionLabels={showSectionLabels}
        />
      ) : (
        <Sidebar>
          <SidebarBrand logoUrl={logoUrl} name="Espace Notarial" sub="Next" />
          <TenantSwitcher name={officeName} role={officeRole} onClick={onSwitchOffice} />
          <Nav>
            {navSections.map(section => (
              <NavGroup key={section.label} label={showSectionLabels ? section.label : undefined}>
                {section.items.map(item => {
                  const childKeys = item.items?.map(sub => sub.key) ?? [];
                  const hasActiveChild = childKeys.includes(activeScreen);
                  const open = expanded.has(item.key) || hasActiveChild;
                  return (
                    // Le conteneur porte le survol ET sa géométrie : en mode
                    // « icônes seules », le sous-menu devient un panneau volant
                    // ancré sur cette entrée (voir atoms/navTooltip.ts).
                    <div
                      key={item.key}
                      className={childKeys.length ? 'nav-entry has-sub' : 'nav-entry'}
                      onMouseEnter={e => positionNavTooltip(e.currentTarget)}
                    >
                      <NavItem
                        icon={item.icon}
                        active={item.key === activeScreen || hasActiveChild}
                        count={countOf(item.count)}
                        expandable={childKeys.length > 0}
                        expanded={open}
                        onClick={() => {
                          if (childKeys.length) {
                            toggle(item.key);
                            // Une rubrique à sous-menu n'a pas d'écran propre dans
                            // l'interface actuelle : cliquer dessus ouvre sa
                            // première sous-entrée.
                            onNavigate(childKeys[0]);
                          } else {
                            onNavigate(item.key);
                          }
                        }}
                      >
                        {item.label}
                      </NavItem>
                      {/* Rendu dès qu'il y a des sous-entrées, et non plus
                          seulement quand la rubrique est dépliée : en mode
                          « icônes seules », rien n'est déplié et le panneau
                          volant est le SEUL accès à ces écrans. C'est le CSS
                          qui décide de le montrer — repli en mode large,
                          survol en mode réduit. */}
                      {childKeys.length > 0 && (
                        <div className={open ? 'nav-sub is-open' : 'nav-sub'}>
                          <div className="nav-sub-title">{item.label}</div>
                          {item.items?.map(sub => (
                            <NavSubItem
                              key={sub.key}
                              active={sub.key === activeScreen}
                              count={countOf(sub.count)}
                              onClick={() => onNavigate(sub.key)}
                            >
                              {sub.label}
                            </NavSubItem>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </NavGroup>
            ))}
          </Nav>
          <SidebarFoot
            initials={userInitials}
            name={userName}
            role={userRole}
            onLogout={onLogout}
            showPoweredBy={layout.showPoweredBy}
          />
        </Sidebar>
      )}

      <div className="main" style={{ position: 'relative' }}>
        <Decor preset="app" />
        <Topbar>
          <Breadcrumb
            items={breadcrumbRoot ? [{ label: breadcrumbRoot }] : []}
            current={breadcrumbCurrent}
          />
          <TopbarSearch placeholder="Rechercher un dossier, un document, un contact…" shortcut="⌘K" />
          <TopbarRight>
            {noticeLabel && <ProtoPill label={noticeLabel} />}
            {/* En barre d'onglets, le rail n'existe plus : le sélecteur d'office
                et la déconnexion n'ont plus de pied de sidebar où vivre. Ils
                remontent ici plutôt que de disparaître. */}
            {horizontal && (
              <TenantSwitcher name={officeName} role={officeRole} onClick={onSwitchOffice} />
            )}
            <IconButton icon="bell" hasDot={hasUnreadNotifications} />
            {horizontal ? (
              <IconButton icon="logout" onClick={onLogout} />
            ) : (
              <div className="avatar sm" style={{ width: 32, height: 32, fontSize: 12 }}>
                {userInitials}
              </div>
            )}
          </TopbarRight>
        </Topbar>

        <div className="content">
          <div className="content-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
