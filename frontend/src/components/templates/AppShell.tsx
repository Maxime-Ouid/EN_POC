import { Decor } from '../atoms/Decor';
import { IconButton } from '../atoms/IconButton';
import { Nav } from '../atoms/Nav';
import { ProtoPill } from '../atoms/ProtoPill';
import { TopbarRight } from '../atoms/TopbarRight';
import { Breadcrumb } from '../molecules/Breadcrumb';
import { NavGroup } from '../molecules/NavGroup';
import { NavItem } from '../molecules/NavItem';
import { SidebarBrand } from '../molecules/SidebarBrand';
import { SidebarFoot } from '../molecules/SidebarFoot';
import { TenantSwitcher } from '../molecules/TenantSwitcher';
import { TopbarSearch } from '../molecules/TopbarSearch';
import { Sidebar } from '../organisms/Sidebar';
import { Topbar } from '../organisms/Topbar';
import type { ReactNode } from 'react';

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
  /**
   * Texte de la pastille d'avertissement de la topbar. `null` la retire.
   * Sert à distinguer la maquette pure des écrans partiellement branchés sur
   * le backend — le lecteur doit toujours savoir ce qui est réel.
   */
  noticeLabel?: string | null;
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
            {noticeLabel && <ProtoPill label={noticeLabel} />}
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
