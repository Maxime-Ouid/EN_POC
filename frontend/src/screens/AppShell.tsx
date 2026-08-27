import type { ReactNode } from 'react';
import { Decor } from '../components/Decor';
import {
  Sidebar,
  SidebarBrand,
  TenantSwitcher,
  Nav,
  NavGroup,
  NavItem,
  SidebarFoot,
} from '../components/Sidebar';
import { Topbar, Breadcrumb, TopbarSearch, TopbarRight, ProtoPill, IconButton } from '../components/Topbar';

export interface NavEntry {
  key: string;
  icon: string;
  label: string;
  count?: number;
}

export interface NavSection {
  label: string;
  items: NavEntry[];
}

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
}: AppShellProps) {
  return (
    <div className="app is-active" id="app-main">
      <Sidebar>
        <SidebarBrand logoUrl={logoUrl} name="Espace Notarial" sub="Next" />
        <TenantSwitcher name={officeName} role={officeRole} onClick={onSwitchOffice} />
        <Nav>
          {navSections.map(section => (
            <NavGroup key={section.label} label={section.label}>
              {section.items.map(item => (
                <NavItem
                  key={item.key}
                  icon={item.icon}
                  active={item.key === activeScreen}
                  count={item.count}
                  onClick={() => onNavigate(item.key)}
                >
                  {item.label}
                </NavItem>
              ))}
            </NavGroup>
          ))}
        </Nav>
        <SidebarFoot initials={userInitials} name={userName} role={userRole} onLogout={onLogout} />
      </Sidebar>

      <div className="main" style={{ position: 'relative' }}>
        <Decor preset="app" />
        <Topbar>
          <Breadcrumb
            items={breadcrumbRoot ? [{ label: breadcrumbRoot }] : []}
            current={breadcrumbCurrent}
          />
          <TopbarSearch placeholder="Rechercher un dossier, un document, un contact…" shortcut="⌘K" />
          <TopbarRight>
            <ProtoPill label="Aperçu — maquette visuelle" />
            <IconButton icon="bell" hasDot={hasUnreadNotifications} />
            <div className="avatar sm" style={{ width: 32, height: 32, fontSize: 12 }}>
              {userInitials}
            </div>
          </TopbarRight>
        </Topbar>

        <div className="content">
          <div className="content-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
