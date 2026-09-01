export interface TopbarSearchProps {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  shortcut?: string;
  /**
   * Transforme le champ en simple point d'entrée : au lieu de saisir ici, un
   * clic (ou le focus au clavier) ouvre la palette de recherche, qui a son
   * propre champ. L'input passe alors en lecture seule — deux champs de saisie
   * superposés, l'un derrière la palette, rendraient la frappe imprévisible.
   * Sans cette prop, le champ reste un champ de saisie ordinaire.
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
  return (
    <div
      className="topbar-search"
      style={{ ...style, cursor: onActivate ? 'text' : undefined }}
      onClick={onActivate}
    >
      <svg className="icon">
        <use href="#i-search" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        readOnly={onActivate != null}
        onChange={e => onChange?.(e.target.value)}
        // Le focus clavier (Tab) doit ouvrir la palette comme le clic, sinon le
        // champ est atteignable au clavier sans jamais rien pouvoir y faire.
        onFocus={onActivate}
      />
      {shortcut && <kbd>{shortcut}</kbd>}
    </div>
  );
}
