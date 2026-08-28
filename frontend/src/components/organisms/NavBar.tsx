/* ===========================================================================
   Barre d'onglets horizontale — dispositions « en haut » et « en bas ».

   Ce n'est PAS le rail couché sur le côté : le modèle est celui d'une barre
   d'onglets (icône + libellé court, une seule profondeur visible). Trois
   conséquences assumées :

   1. Le nombre d'onglets est borné. Au-delà, le reste part dans un menu
      « Plus » plutôt que de déborder ou de rétrécir jusqu'à l'illisible : une
      rubrique invisible est un écran inaccessible, pas un écran discret.
   2. Les sous-entrées ne sont pas dépliées dans la barre — il n'y a pas de
      hauteur pour ça. Elles s'ouvrent en menu sous leur onglet.
   3. Le sélecteur d'office et l'utilisateur ne tiennent pas ici ; AppShell les
      remonte dans la topbar quand la navigation est horizontale.
   =========================================================================== */

import { useEffect, useRef, useState } from 'react';
import notantisLogo from '../../assets/notantis-logo.png';
import { Badge } from '../atoms/Badge';
import { Icon } from '../atoms/Icon';
import type { NavEntry, NavSection } from './navModel';

/** Onglets affichés en clair ; au-delà, menu « Plus ». */
const MAX_VISIBLE_TABS = 6;

export interface NavBarProps {
  sections: NavSection[];
  activeScreen: string;
  onNavigate: (screenKey: string) => void;
  brandName: string;
  logoUrl?: string;
  /** Affiche les compteurs sur les onglets (réglage de personnalisation). */
  showBadges?: boolean;
  /** Affiche les intitulés de section comme séparateurs dans le menu « Plus ». */
  showSectionLabels?: boolean;
}

/** Rubriques de toutes les sections, dans l'ordre, avec leur section d'origine. */
function flatten(sections: NavSection[]): Array<{ section: string; entry: NavEntry }> {
  return sections.flatMap(section =>
    section.items.map(entry => ({ section: section.label, entry })),
  );
}

/** Écran atteint quand on active une rubrique : elle-même, ou sa 1re sous-entrée. */
function targetOf(entry: NavEntry): string {
  return entry.items?.length ? entry.items[0].key : entry.key;
}

function containsActive(entry: NavEntry, activeScreen: string): boolean {
  return entry.key === activeScreen || (entry.items?.some(s => s.key === activeScreen) ?? false);
}

// Barre d'onglets horizontale — navigation « en haut » ou « en bas ». Modèle
// d'onglets, pas rail couché : profondeur unique, nombre borné, débordement
// dans un menu « Plus ».
export function NavBar({
  sections,
  activeScreen,
  onNavigate,
  brandName,
  logoUrl = notantisLogo,
  showBadges = true,
  showSectionLabels = false,
}: NavBarProps) {
  // Menu ouvert : clé de la rubrique dont on montre les sous-entrées, ou
  // '__more__' pour le menu de débordement. Un seul à la fois.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLElement>(null);

  // Un clic ailleurs referme. Sans ça, le menu reste ouvert derrière l'écran
  // sur lequel on vient de naviguer.
  useEffect(() => {
    if (!openMenu) return;
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenu]);

  const all = flatten(sections);
  // L'entrée active est toujours visible, même si son rang la reléguait au
  // menu : sinon la barre n'indique plus où l'on est.
  const activeIndex = all.findIndex(({ entry }) => containsActive(entry, activeScreen));
  const visible = all.slice(0, MAX_VISIBLE_TABS);
  if (activeIndex >= MAX_VISIBLE_TABS) {
    visible[MAX_VISIBLE_TABS - 1] = all[activeIndex];
  }
  const visibleKeys = new Set(visible.map(({ entry }) => entry.key));
  const overflow = all.filter(({ entry }) => !visibleKeys.has(entry.key));

  const go = (screenKey: string) => {
    onNavigate(screenKey);
    setOpenMenu(null);
  };

  const activate = (entry: NavEntry) => {
    // Une rubrique à sous-entrées ouvre son menu ET navigue vers la première,
    // exactement comme le rail vertical : le clic n'est jamais sans effet.
    if (entry.items?.length) {
      setOpenMenu(prev => (prev === entry.key ? null : entry.key));
    } else {
      setOpenMenu(null);
    }
    onNavigate(targetOf(entry));
  };

  return (
    <nav className="navbar" ref={barRef} aria-label="Navigation principale">
      <div className="navbar-brand">
        <img src={logoUrl} alt="" />
        <span className="navbar-brand-name">{brandName}</span>
      </div>

      <div className="navbar-tabs">
        {visible.map(({ entry }) => {
          const active = containsActive(entry, activeScreen);
          return (
            <div className="navbar-overflow" key={entry.key}>
              <button
                type="button"
                className={active ? 'navbar-tab active' : 'navbar-tab'}
                aria-current={active ? 'page' : undefined}
                aria-expanded={entry.items?.length ? openMenu === entry.key : undefined}
                onClick={() => activate(entry)}
              >
                <Icon id={entry.icon} />
                <span className="navbar-tab-label">{entry.label}</span>
                {showBadges && typeof entry.count === 'number' && <Badge>{entry.count}</Badge>}
              </button>
              {openMenu === entry.key && !!entry.items?.length && (
                <div className="navbar-menu" role="menu">
                  {entry.items.map(sub => (
                    <button
                      key={sub.key}
                      type="button"
                      role="menuitem"
                      className={
                        sub.key === activeScreen ? 'navbar-menu-item active' : 'navbar-menu-item'
                      }
                      onClick={() => go(sub.key)}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {overflow.length > 0 && (
        <div className="navbar-overflow">
          <button
            type="button"
            className="navbar-tab"
            aria-expanded={openMenu === '__more__'}
            onClick={() => setOpenMenu(prev => (prev === '__more__' ? null : '__more__'))}
          >
            <Icon id="dots" />
            <span className="navbar-tab-label">Plus</span>
          </button>
          {openMenu === '__more__' && (
            <div className="navbar-menu" role="menu">
              {overflow.map(({ section, entry }, i) => {
                const first = i === 0 || overflow[i - 1].section !== section;
                return (
                  <div key={entry.key}>
                    {showSectionLabels && first && <div className="navbar-menu-label">{section}</div>}
                    <button
                      type="button"
                      role="menuitem"
                      className={
                        containsActive(entry, activeScreen)
                          ? 'navbar-menu-item active'
                          : 'navbar-menu-item'
                      }
                      onClick={() => go(targetOf(entry))}
                    >
                      <Icon id={entry.icon} />
                      <span className="navbar-menu-text">{entry.label}</span>
                      {showBadges && typeof entry.count === 'number' && <Badge>{entry.count}</Badge>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
