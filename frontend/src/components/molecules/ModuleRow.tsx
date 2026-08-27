import { Pill } from '../atoms/Pill';
import { RowIcon } from '../atoms/RowIcon';
import { Toggle } from '../atoms/Toggle';

export interface ModuleRowProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  /** Icône « à venir » : cadre neutre au lieu d'un fond coloré. */
  muted?: boolean;
  name: string;
  desc: string;
  /** `undefined` = module non activable (affiche `pill` à la place). */
  enabled?: boolean;
  onToggle?: (next: boolean) => void;
  /** Interrupteur visible mais inactif (état serveur consultable, pas modifiable). */
  disabled?: boolean;
  /** Affiché quand le module n'est pas encore activable (« À venir »). */
  pill?: { kind: 'neutral' | 'info'; label: string };
  /** Dernière ligne d'une liste : pas de séparateur bas. */
  last?: boolean;
}

// Ligne « module activable » de Personnalisation → Modules. Un interrupteur
// quand le module existe, une pastille d'état quand il est annoncé mais pas
// encore livrable (Serveur MCP dans le prototype).
export function ModuleRow({
  icon,
  iconBg,
  iconColor,
  muted,
  name,
  desc,
  enabled,
  onToggle,
  disabled,
  pill,
  last,
}: ModuleRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: last ? undefined : '1px solid var(--border-soft)',
      }}
    >
      <RowIcon icon={icon} bg={iconBg} color={iconColor} muted={muted} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
        <div className="tiny dim">{desc}</div>
      </div>
      {typeof enabled === 'boolean' ? (
        <Toggle checked={enabled} onChange={onToggle} disabled={disabled} />
      ) : pill ? (
        <Pill kind={pill.kind}>{pill.label}</Pill>
      ) : null}
    </div>
  );
}
