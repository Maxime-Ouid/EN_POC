import { SEARCH_SHORTCUT_ARIA } from '../../search/shortcut';

export interface TopbarSearchProps {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  shortcut?: string;
  /**
   * Transforme le champ en point d'entrée de la palette de recherche, qui a son
   * propre champ. Le composant rend alors un BOUTON et non plus un champ :
   * jusqu'au 02/09/2026 c'était un `<input readOnly>` qui ouvrait la palette sur
   * son `focus`, ce qui avait trois défauts — l'élément s'annonçait « champ de
   * saisie » aux lecteurs d'écran alors qu'on ne peut rien y saisir, le curseur
   * de texte promettait une frappe qui n'arrivait jamais, et l'ouverture au
   * focus déclenchait la palette au simple passage du Tab, y compris en
   * revenant en arrière. Un bouton dit ce qu'il fait et n'a besoin d'aucune de
   * ces ruses.
   *
   * Sans cette prop, le champ reste un champ de saisie ordinaire (barre de
   * filtre de la liste des dossiers, par exemple).
   */
  onActivate?: () => void;
  /**
   * Surcharge de mise en page. Le champ est dimensionné pour la topbar
   * (flex:1, max-width 380px) ; réutilisé dans une barre de filtres il faut le
   * contraindre — c'est ce que fait le prototype (max-width:260px;margin:0).
   */
  style?: React.CSSProperties;
}

export function TopbarSearch({
  placeholder,
  value,
  onChange,
  shortcut,
  onActivate,
  style,
}: TopbarSearchProps) {
  if (onActivate) {
    return (
      <button
        type="button"
        className="topbar-search topbar-search-trigger"
        style={style}
        onClick={onActivate}
        // `dialog` et non `menu` : ce qui s'ouvre est bien une boîte modale avec
        // son propre champ, pas une liste d'options attachée à ce bouton.
        aria-haspopup="dialog"
        // Le raccourci est déjà écrit dans le `<kbd>` ; il doit l'être aussi
        // pour qui ne voit pas ce `<kbd>`.
        aria-keyshortcuts={SEARCH_SHORTCUT_ARIA}
      >
        <svg className="icon">
          <use href="#i-search" />
        </svg>
        <span className="topbar-search-label">{placeholder}</span>
        {shortcut && <kbd>{shortcut}</kbd>}
      </button>
    );
  }

  return (
    <div className="topbar-search" style={style}>
      <svg className="icon">
        <use href="#i-search" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
      />
      {shortcut && <kbd>{shortcut}</kbd>}
    </div>
  );
}
