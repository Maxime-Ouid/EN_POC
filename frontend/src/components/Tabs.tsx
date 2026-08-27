import type { ReactNode } from 'react';

export interface TabDef {
  key: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface TabStripProps {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}

// Bandeau d'onglets — §6.7. `active` désigne la clé active ; le panneau
// correspondant est à afficher par l'appelant (voir Subscreen ci-dessous).
export function TabStrip({ tabs, active, onChange }: TabStripProps) {
  return (
    <div className="tabstrip">
      {tabs.map(t => (
        <div
          key={t.key}
          className={t.key === active ? 'tab active' : 'tab'}
          onClick={() => onChange(t.key)}
        >
          {t.icon && (
            <svg className="icon">
              <use href={`#i-${t.icon}`} />
            </svg>
          )}
          {t.label}
          {typeof t.count === 'number' && <span className="badge">{t.count}</span>}
        </div>
      ))}
    </div>
  );
}

export interface SubscreenProps {
  active: boolean;
  children?: ReactNode;
}

// Panneau associé à un onglet — n'affiche ses enfants que si `active` (évite de
// monter le contenu des onglets inactifs, contrairement au prototype qui se
// contentait de masquer en CSS).
export function Subscreen({ active, children }: SubscreenProps) {
  if (!active) return null;
  return <div className="subscreen is-active">{children}</div>;
}
