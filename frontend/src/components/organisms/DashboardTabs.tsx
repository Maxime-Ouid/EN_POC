import { useEffect, useRef, useState } from 'react';

export interface DashboardTabDef {
  id: string;
  name: string;
  /** Nombre de widgets — affiché pour repérer un onglet vide sans y aller. */
  count: number;
}

export interface DashboardTabsProps {
  tabs: DashboardTabDef[];
  activeId: string;
  /** En édition seulement : renommage, retrait et ajout apparaissent. */
  editing: boolean;
  /** Faux quand la limite d'onglets est atteinte : le « + » disparaît. */
  canAdd: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Barre d'onglets des écrans personnalisés.
 *
 * Le renommage se fait SUR PLACE, par double-clic sur l'onglet actif : une
 * modale pour changer deux mots casse le rythme du rangement, et un champ
 * toujours visible transformerait la barre en formulaire. Entrée valide, Échap
 * annule, la perte de focus valide aussi — c'est ce qu'on attend d'un libellé
 * éditable, et ça évite qu'un nom se perde parce qu'on a cliqué à côté.
 *
 * Le retrait n'apparaît que sur l'onglet actif et seulement en édition : une
 * croix sur chaque onglet en lecture invite à l'accident, et on ne supprime pas
 * un écran qu'on n'est pas en train de regarder.
 */
export function DashboardTabs({
  tabs,
  activeId,
  editing,
  canAdd,
  onSelect,
  onAdd,
  onRename,
  onRemove,
}: DashboardTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) inputRef.current?.select();
  }, [renamingId]);

  // Sortir du mode édition ne doit pas laisser un champ de renommage ouvert.
  useEffect(() => {
    if (!editing) setRenamingId(null);
  }, [editing]);

  const startRename = (tab: DashboardTabDef) => {
    if (!editing) return;
    setDraft(tab.name);
    setRenamingId(tab.id);
  };

  const commit = () => {
    if (renamingId) onRename(renamingId, draft);
    setRenamingId(null);
  };

  return (
    <div className="dash-tabs">
      {tabs.map(tab => {
        const active = tab.id === activeId;
        if (active && renamingId === tab.id) {
          return (
            <input
              key={tab.id}
              ref={inputRef}
              className="dash-tab-input"
              value={draft}
              maxLength={32}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              aria-label="Nom de l'écran"
            />
          );
        }
        return (
          <div key={tab.id} className={active ? 'dash-tab is-active' : 'dash-tab'}>
            <button
              type="button"
              className="dash-tab-label"
              onClick={() => onSelect(tab.id)}
              onDoubleClick={() => active && startRename(tab)}
              title={editing && active ? 'Double-cliquez pour renommer' : undefined}
            >
              {tab.name}
              {tab.count === 0 && <span className="dash-tab-empty">vide</span>}
            </button>
            {editing && active && tabs.length > 1 && (
              <button
                type="button"
                className="dash-tab-remove"
                onClick={() => onRemove(tab.id)}
                aria-label={`Supprimer l'écran ${tab.name}`}
              >
                <svg className="icon">
                  <use href="#i-x" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      {editing && canAdd && (
        <button type="button" className="dash-tab-add" onClick={onAdd} aria-label="Ajouter un écran">
          <svg className="icon">
            <use href="#i-plus" />
          </svg>
        </button>
      )}
    </div>
  );
}
