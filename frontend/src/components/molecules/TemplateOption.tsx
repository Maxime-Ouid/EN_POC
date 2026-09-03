import { Icon } from '../atoms/Icon';
import { RowIcon } from '../atoms/RowIcon';

export interface TemplateOptionProps {
  icon?: string;
  name: string;
  desc: string;
  onClick?: () => void;
  onMenu?: () => void;
  /** Sélection visible (utilisée par la modale « nouveau dossier »). */
  selected?: boolean;
}

// Ligne « modèle de dataroom » (.tpl-option) — liste des modèles dans
// Personnalisation, et choix du modèle dans la modale de création.
export function TemplateOption({ icon = 'folder', name, desc, onClick, onMenu, selected }: TemplateOptionProps) {
  return (
    <div
      className="tpl-option"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        borderColor: selected ? 'var(--brass-500)' : undefined,
        background: selected ? 'var(--brass-100)' : undefined,
      }}
    >
      <RowIcon icon={icon} bg="var(--brass-100)" color="var(--brass-700)" />
      <div style={{ flex: 1 }}>
        <div className="tpl-name">{name}</div>
        <div className="tpl-desc">{desc}</div>
      </div>
      {onMenu && (
        <Icon
          id="dots"
          style={{ color: 'var(--ink-400)', cursor: 'pointer' }}
        />
      )}
    </div>
  );
}
