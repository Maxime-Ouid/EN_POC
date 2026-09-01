import { useEffect, useRef, useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import type { TagColor } from '../atoms/Tag';

export interface TagFilterOption {
  id: number;
  name: string;
  color: TagColor;
  /** Nombre d'éléments portant ce tag — affiché à droite de la ligne. */
  usage?: number;
}

export interface TagFilterProps {
  options: TagFilterOption[];
  /** Ids cochés. Le composant ne garde aucune sélection en propre. */
  selected: number[];
  onChange: (selected: number[]) => void;
  /** Texte du bouton quand rien n'est coché. */
  label?: string;
  /** Affiché à la place de la liste quand le catalogue est vide. */
  emptyHint?: string;
}

// Menu de filtre par tags — multi-sélection en OU (un élément remonte s'il porte
// AU MOINS UN des tags cochés). Le OU est le comportement attendu par défaut sur
// ce type de liste : cocher un deuxième tag doit élargir la vue, pas la vider.
export function TagFilter({
  options,
  selected,
  onChange,
  label = 'Tags',
  emptyHint = 'Aucun tag dans cet office pour le moment.',
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Un clic ailleurs ou Échap referment — même règle que TenantSwitcher et les
  // menus de la barre d'onglets : un panneau laissé ouvert derrière l'écran
  // suivant est un panneau oublié.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id]);
  }

  return (
    <div className="tag-menu-root" ref={rootRef}>
      <Button
        size="sm"
        className={selected.length ? 'is-filtering' : undefined}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(v => !v)}
      >
        <svg className="icon">
          <use href="#i-tag" />
        </svg>
        {label}
        {/* Le décompte reste visible menu fermé : un filtre actif qu'on ne voit
            pas est la première cause de « la liste est vide, c'est cassé ». */}
        {selected.length > 0 && <span className="tag-menu-count">{selected.length}</span>}
      </Button>

      {open && (
        <div className="tag-menu" role="group" aria-label="Filtrer par tag">
          {options.length === 0 ? (
            <div className="tag-menu-empty tiny dim">{emptyHint}</div>
          ) : (
            <>
              <div className="tag-menu-list">
                {options.map(option => {
                  const checked = selected.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={checked ? 'tag-menu-item active' : 'tag-menu-item'}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(option.id)}
                      />
                      <span className={`tag-dot tag-${option.color}`} aria-hidden="true" />
                      <span className="tag-menu-label">{option.name}</span>
                      {typeof option.usage === 'number' && (
                        <span className="tag-menu-usage tiny dim">{option.usage}</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {selected.length > 0 && (
                <button type="button" className="tag-menu-clear" onClick={() => onChange([])}>
                  <Icon id="x" />
                  Tout effacer
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
