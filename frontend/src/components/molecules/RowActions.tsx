import { useEffect, useRef, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';

/* ===========================================================================
   Menu d'actions d'une ligne de tableau.

   `atoms/RowMenu` dessine le « ⋮ » et ne sait rien faire d'autre : son
   commentaire d'origine disait déjà « ouvre un menu contextuel (à implémenter
   côté appli) ». C'est ce menu-là. Il reste une molécule et non un atome parce
   qu'il porte un état d'ouverture et une liste d'actions.

   Le menu se ferme sur clic extérieur ET sur Échap — sans le second, un menu
   ouvert au clavier ne se referme pas.
   =========================================================================== */

export interface RowAction {
  key: string;
  label: string;
  icon?: string;
  /** Action destructrice : libellé en rouge, toujours placée en dernier. */
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface RowActionsProps {
  actions: RowAction[];
  /** Libellé accessible du déclencheur (« Actions sur DPE.pdf »). */
  label: string;
}

export function RowActions({ actions, label }: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ordered = [...actions.filter(a => !a.danger), ...actions.filter(a => a.danger)];
  const firstDangerIndex = ordered.findIndex(a => a.danger);

  return (
    <td onClick={e => e.stopPropagation()}>
      <div className="row-actions" ref={ref}>
        <IconButton
          icon="dots"
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        />
        {open && (
          <div className="row-actions-menu" role="menu">
            {ordered.map((a, i) => (
              <div key={a.key}>
                {i === firstDangerIndex && i > 0 && <div className="row-actions-sep" />}
                <button
                  type="button"
                  role="menuitem"
                  className={a.danger ? 'row-actions-item is-danger' : 'row-actions-item'}
                  disabled={a.disabled}
                  onClick={() => {
                    setOpen(false);
                    a.onSelect();
                  }}
                >
                  {a.icon && <Icon id={a.icon} />}
                  {a.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}
