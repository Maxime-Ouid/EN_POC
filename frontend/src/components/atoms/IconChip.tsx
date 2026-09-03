import { Icon3d, has3d } from './Icon3d';

export interface IconChipProps {
  icon: string;
  bg: string;
  color: string;
  /** Classe de la pastille selon le contexte — les quatre tailles du prototype. */
  chip?: 'row-icon' | 'stat-icon' | 'feed-icon' | 'w-row-icon';
  size?: number;
  iconSize?: number;
  muted?: boolean;
}

// Pastille d'icône : carré arrondi teinté portant un glyphe du sprite, OU
// l'illustration 3D quand l'objet en a une (dossier, calques, question,
// membres, document, archive, suppression). Dans ce second cas le fond teinté
// et le cadre disparaissent : deux aplats derrière un rendu volumétrique se
// battent, et `bg`/`color` sont alors ignorés — les appelants les passent quand
// même, l'icône pouvant redevenir un glyphe.
export function IconChip({ icon, bg, color, chip = 'row-icon', size, iconSize, muted }: IconChipProps) {
  const is3d = has3d(icon);
  const style: React.CSSProperties = is3d ? {} : { background: bg, color };
  if (size) {
    style.width = size;
    style.height = size;
  }
  if (muted && !is3d) {
    style.border = '1px solid var(--border)';
  }
  const glyphSize = iconSize ?? (size ? Math.round(size * 0.47) : undefined);
  return (
    <div className={is3d ? `${chip} icon-chip-3d` : chip} style={style}>
      {is3d ? (
        <Icon3d icon={icon} />
      ) : (
        <svg className="icon" style={glyphSize ? { width: glyphSize, height: glyphSize } : undefined}>
          <use href={`#i-${icon}`} />
        </svg>
      )}
    </div>
  );
}
