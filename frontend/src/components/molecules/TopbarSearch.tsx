export interface TopbarSearchProps {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  shortcut?: string;
  /**
   * Surcharge de mise en page. Le champ est dimensionné pour la topbar
   * (flex:1, max-width 380px) ; réutilisé dans une barre de filtres il faut le
   * contraindre — c'est ce que fait le prototype (max-width:260px;margin:0).
   */
  style?: React.CSSProperties;
}

export function TopbarSearch({ placeholder, value, onChange, shortcut, style }: TopbarSearchProps) {
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
