import { Slideover } from './Slideover';

export interface WidgetLibraryItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** Déjà posé sur l'accueil — la ligne bascule alors sur « Retirer ». */
  added: boolean;
}

export interface WidgetLibraryGroup {
  label: string;
  items: WidgetLibraryItem[];
}

export interface WidgetLibraryProps {
  open: boolean;
  onClose: () => void;
  groups: WidgetLibraryGroup[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Bibliothèque des widgets disponibles, en panneau latéral.
 *
 * Les widgets déjà posés restent VISIBLES, marqués « Ajouté », plutôt que
 * disparaître de la liste : sans cela, la bibliothèque change de contenu à
 * chaque ajout et on perd la place où l'on en était. Un second clic les retire,
 * ce qui fait de ce panneau le seul endroit où l'on voit d'un coup ce qui est
 * sur l'accueil et ce qui ne l'est pas.
 */
export function WidgetLibrary({ open, onClose, groups, onAdd, onRemove }: WidgetLibraryProps) {
  return (
    <Slideover open={open} onClose={onClose} title="Ajouter un widget">
      {groups.map(group => (
        <div className="wlib-group" key={group.label}>
          <div className="wlib-group-title">{group.label}</div>
          {group.items.map(item => (
            <button
              type="button"
              key={item.id}
              className={item.added ? 'wlib-item wlib-item-added' : 'wlib-item'}
              onClick={() => (item.added ? onRemove(item.id) : onAdd(item.id))}
              aria-pressed={item.added}
            >
              <div className="wlib-icon">
                <svg className="icon">
                  <use href={`#i-${item.icon}`} />
                </svg>
              </div>
              <div className="wlib-text">
                <div className="wlib-name">{item.name}</div>
                <div className="wlib-desc">{item.desc}</div>
              </div>
              <span className="wlib-action">
                <svg className="icon">
                  <use href={item.added ? '#i-check' : '#i-plus'} />
                </svg>
              </span>
            </button>
          ))}
        </div>
      ))}
    </Slideover>
  );
}
