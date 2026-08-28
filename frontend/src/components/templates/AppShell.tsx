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
import { Sidebar } from '../organisms/Sidebar';
import { Topbar } from '../organisms/Topbar';
import { useState } from 'react';
import type { ReactNode } from 'react';

export interface NavSubEntry {
  key: string;
  label: string;
  count?: number;
}

export interface NavEntry {
  key: string;
  icon: string;
  label: string;
  count?: number;
  /**
   * Sous-entrées de la rubrique (navigation V1 : « Dossiers » → « Exports
   * multiples », « Espaces clients »…). Une rubrique qui en porte affiche un
   * chevron ; cliquer dessus l'ouvre ET navigue vers sa première sous-entrée,
   * comme l'interface actuelle.
   */
  items?: NavSubEntry[];
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
  /**
   * Masque les intitulés de section de la sidebar. L'interface actuelle (V1)
   * n'en affiche aucun : ses sections ne servent qu'à regrouper le code.
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

  return (
    <div className="app is-active" id="app-main">
      <Sidebar>
        <SidebarBrand logoUrl={logoUrl} name="Espace Notarial" sub="Next" />
        <TenantSwitcher name={officeName} role={officeRole} onClick={onSwitchOffice} />
        <Nav>
          {navSections.map(section => (
            <NavGroup key={section.label} label={hideSectionLabels ? undefined : section.label}>
              {section.items.map(item => {
                const childKeys = item.items?.map(sub => sub.key) ?? [];
                const hasActiveChild = childKeys.includes(activeScreen);
                const open = expanded.has(item.key) || hasActiveChild;
                return (
                  <div key={item.key}>
                    <NavItem
                      icon={item.icon}
                      active={item.key === activeScreen || hasActiveChild}
                      count={item.count}
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
                    {open && childKeys.length > 0 && (
                      <div className="nav-sub">
                        {item.items?.map(sub => (
                          <NavSubItem
                            key={sub.key}
                            active={sub.key === activeScreen}
                            count={sub.count}
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
