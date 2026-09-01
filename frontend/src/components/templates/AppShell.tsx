import { IconButton } from '../atoms/IconButton';
import { Nav } from '../atoms/Nav';
import { TopbarRight } from '../atoms/TopbarRight';
import { NavGroup } from '../molecules/NavGroup';
import { NavItem } from '../molecules/NavItem';
import { NavSubItem } from '../molecules/NavSubItem';
import { SidebarBrand } from '../molecules/SidebarBrand';
import { SidebarFoot } from '../molecules/SidebarFoot';
import { TenantSwitcher, type TenantOption } from '../molecules/TenantSwitcher';
import { TopbarSearch } from '../molecules/TopbarSearch';
import { NavBar } from '../organisms/NavBar';
import { SearchPalette } from '../organisms/SearchPalette';
import { Sidebar } from '../organisms/Sidebar';
import { Topbar } from '../organisms/Topbar';
import { positionNavTooltip } from '../atoms/navTooltip';
import { TopbarSlotsContext } from './topbarSlots';
import { isHorizontalNav } from '../../theme/schema';
import { useTenantTheme } from '../../theme/useTenantTheme';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SearchHit } from '../../api/endpoints';
import type { LocalEntry } from '../../search/localEntries';

export type { NavEntry, NavSection, NavSubEntry } from '../organisms/navModel';
import type { NavSection } from '../organisms/navModel';

export interface AppShellProps {
  officeName: string;
  officeRole: string;
  navSections: NavSection[];
  activeScreen: string;
  onNavigate: (screenKey: string) => void;
  /**
   * Offices auxquels l'utilisateur appartient : le sélecteur les liste tous.
   * En dessous de deux, il n'y a rien à choisir et il redevient une étiquette.
   */
  offices?: TenantOption[];
  /** Sous-domaine de l'office courant — celui coché dans la liste. */
  officeSubdomain?: string;
  /** Reçoit le sous-domaine choisi dans la liste. */
  onSelectOffice?: (subdomain: string) => void;
  userInitials: string;
  userName: string;
  userRole: string;
  onLogout?: () => void;
  /**
   * PLUS AFFICHÉS depuis la refonte de la topbar (01/09/2026) : la barre porte
   * la recherche, la cloche et les commandes de l'écran courant — le fil
   * d'Ariane a cédé sa place aux onglets de l'accueil. Les props restent
   * acceptées pour ne pas casser les six appelants, et parce que le fil est une
   * décision d'affichage, pas une information à jeter du modèle.
   */
  breadcrumbCurrent: string;
  breadcrumbRoot?: string;
  hasUnreadNotifications?: boolean;
  children?: ReactNode;
  logoUrl?: string;
  /**
   * Texte de la pastille d'avertissement de la topbar. PLUS AFFICHÉ depuis la
   * refonte du 01/09/2026 — la place revient aux commandes de l'écran. Prop
   * conservée pour les appelants (V1Preview, V1AppView, App).
   */
  noticeLabel?: string | null;
  /**
   * Force le masquage des intitulés de section, quel que soit le réglage de
   * l'office. L'interface actuelle (V1) n'en affiche aucun : ses sections ne
   * servent qu'à regrouper le code, les nommer à l'écran n'aurait pas de sens.
   * Laissé à `undefined`, c'est la personnalisation de l'office qui décide.
   */
  hideSectionLabels?: boolean;
  /**
   * Ouvre un résultat de la recherche globale. C'est cette prop qui ACTIVE la
   * barre de recherche de la topbar et le raccourci ⌘K : sans elle, le champ
   * reste décoratif — la palette interroge `/api/search/`, qui exige une
   * session ouverte sur un office, ce dont la démonstration du design system
   * ne dispose pas.
   */
  onSearchSelect?: (hit: SearchHit) => void;
  /**
   * Ce que la palette doit trouver en plus des résultats du serveur : écrans de
   * l'application, modules activés, données de démonstration. Construit par
   * l'appelant, qui est le seul à savoir naviguer — voir search/localEntries.ts.
   */
  searchLocalEntries?: LocalEntry[];
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
  offices,
  officeSubdomain,
  onSelectOffice,
  userInitials,
  userName,
  userRole,
  onLogout,
  hasUnreadNotifications,
  children,
  logoUrl,
  hideSectionLabels,
  onSearchSelect,
  searchLocalEntries,
}: AppShellProps) {
  const searchEnabled = onSearchSelect != null;
  const [searchOpen, setSearchOpen] = useState(false);

  /* Les deux conteneurs que les écrans peuvent remplir par portail (voir
     topbarSlots.ts). En état plutôt qu'en `ref` : c'est leur apparition qui
     doit déclencher le rendu des écrans, sinon ceux-ci projetteraient dans le
     vide au premier passage. */
  const [slotStart, setSlotStart] = useState<HTMLDivElement | null>(null);
  const [slotEnd, setSlotEnd] = useState<HTMLDivElement | null>(null);
  const slots = useMemo(() => ({ start: slotStart, end: slotEnd }), [slotStart, slotEnd]);

  // ⌘K (macOS) / Ctrl+K (Windows, Linux) — écouté sur le document parce que le
  // raccourci doit marcher où que soit le focus, y compris dans un écran qui
  // n'a rien à voir avec la recherche. `capture` : certains champs de saisie
  // arrêtent la propagation des touches, le raccourci serait alors muet là où
  // l'utilisateur en a justement le plus besoin.
  useEffect(() => {
    if (!searchEnabled) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [searchEnabled]);

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
  const { state, navCollapsed, navCollapsible, toggleNavCollapsed } = useTenantTheme();
  const layout = state.layout;
  const horizontal = isHorizontalNav(layout.navPlacement);
  // `hideSectionLabels` reste un veto de l'écran (V1 n'a pas d'intitulés à
  // montrer) ; sans veto, l'office décide.
  const showSectionLabels = hideSectionLabels ? false : layout.showSectionLabels;
  const countOf = (n?: number) => (layout.showBadges ? n : undefined);

  /* Le fil d'Ariane occupait le début de la topbar. Il en a été retiré le
     01/09/2026 au profit des commandes de l'écran courant (les onglets de
     l'accueil), et le calcul de la rubrique parente qu'il affichait est parti
     avec lui. Il vivait ici, déduit de `navSections` plutôt que passé en prop —
     à reprendre dans l'historique Git si le repère revient. */

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
          {/* Le repli est une préférence de la personne, gardée dans son
              navigateur ; la taille de rail choisie dans Personnalisation reste
              celle de l'office. `navCollapsible` retire le bouton quand il n'y
              a rien à replier — voir theme/engine.ts. */}
          <SidebarBrand
            logoUrl={logoUrl}
            name="Espace Notarial"
            sub="Next"
            collapsed={navCollapsed}
            onToggleCollapse={navCollapsible ? toggleNavCollapsed : undefined}
            navId="app-nav"
          />
          <TenantSwitcher
            name={officeName}
            role={officeRole}
            offices={offices}
            currentSubdomain={officeSubdomain}
            onSelect={onSelectOffice}
          />
          <Nav id="app-nav">
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
        {/* Barre unique de l'application (01/09/2026) : la barre d'outils de
            l'accueil a été supprimée, ses commandes se projettent ici — onglets
            d'écrans au début, boutons avant la cloche. */}
        <Topbar>
          <div className="topbar-slot topbar-slot-start" ref={setSlotStart} />
          <TopbarRight>
            {/* La recherche a rejoint le groupe de droite : au milieu de la
                barre, elle coupait les onglets de l'accueil de leurs propres
                commandes. Toutes les actions de la barre sont désormais du
                même côté, la gauche étant réservée au repère d'écran. */}
            <TopbarSearch
              placeholder="Rechercher un dossier, une pièce, un tag, une personne, un écran…"
              shortcut="⌘K"
              onActivate={searchEnabled ? () => setSearchOpen(true) : undefined}
            />
            <div className="topbar-slot topbar-slot-end" ref={setSlotEnd} />
            {/* En barre d'onglets, le rail n'existe plus : le sélecteur d'office
                et la déconnexion n'ont plus de pied de sidebar où vivre. Ils
                remontent ici plutôt que de disparaître. */}
            {horizontal && (
              <TenantSwitcher
                name={officeName}
                role={officeRole}
                offices={offices}
                currentSubdomain={officeSubdomain}
                onSelect={onSelectOffice}
              />
            )}
            <IconButton icon="bell" hasDot={hasUnreadNotifications} />
            {/* L'avatar a quitté la barre le 01/09/2026 : l'identité de
                l'utilisateur reste lisible au pied de la sidebar. En barre
                d'onglets ce pied n'existe pas — la déconnexion reste donc ici,
                sans quoi cette disposition n'aurait plus aucune sortie. */}
            {horizontal && <IconButton icon="logout" onClick={onLogout} />}
          </TopbarRight>
        </Topbar>

        <div className="content">
          {/* Le fournisseur n'enveloppe que les écrans : eux seuls projettent
              dans la topbar, et la limiter ici évite de rerendre la coquille
              entière quand les conteneurs apparaissent. */}
          <div className="content-inner">
            <TopbarSlotsContext.Provider value={slots}>{children}</TopbarSlotsContext.Provider>
          </div>
        </div>
      </div>

      {onSearchSelect && (
        <SearchPalette
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={onSearchSelect}
          localEntries={searchLocalEntries}
        />
      )}
    </div>
  );
}
