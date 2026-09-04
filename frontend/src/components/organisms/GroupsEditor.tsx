import { Select } from '../atoms/Select';
import { Tag } from '../atoms/Tag';

export interface AccessEditorGroup {
  groupId: number;
  name: string;
}

export interface GroupsEditorProps {
  groupIds: number[];
  groups: AccessEditorGroup[];
  onAdd: (groupId: number) => void;
  onRemove: (groupId: number) => void;
  /** Nom de l'élément édité — sert aux aria-label de la croix de retrait. */
  targetLabel: string;
  /**
   * Groupes EFFECTIVEMENT accordés via un descendant (dossier ou pièce),
   * ajouté le 04/09/2026 (voir access/effectiveRoles.ts::dataroomEffectiveGroups/
   * templateEffectiveGroups) — affichés en puce grisée, sans croix de
   * retrait : pur affichage, jamais une écriture sur cette ligne. Un groupe
   * déjà direct sur cette ligne n'est jamais dupliqué ici.
   */
  inheritedGroupIds?: number[];
}

/**
 * Puces de groupes cochés, avec un champ d'ajout TOUJOURS visible en
 * dessous — même visuel que `NamedUsersEditor`, mais SANS sa logique de
 * troncature par largeur mesurée : un catalogue de groupes reste, par
 * construction, une poignée d'entrées curatées par un admin (contrairement
 * aux utilisateurs nommés, potentiellement nombreux) — pas besoin de "+N
 * autres…" pour ce premier jet. À ajouter si l'usage réel montre le
 * contraire (voir CLAUDE.md).
 */
export function GroupsEditor({
  groupIds, groups, onAdd, onRemove, targetLabel, inheritedGroupIds,
}: GroupsEditorProps) {
  const groupsById = new Map(groups.map(g => [g.groupId, g]));
  const availableGroups = groups.filter(g => !groupIds.includes(g.groupId));
  const inherited = (inheritedGroupIds ?? []).filter(id => !groupIds.includes(id));

  return (
    <div style={{ width: '100%' }}>
      {(groupIds.length > 0 || inherited.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {groupIds.map(id => {
            const label = groupsById.get(id)?.name ?? `#${id}`;
            return (
              <Tag key={id} plain onRemove={() => onRemove(id)} removeLabel={`Retirer ${label} de ${targetLabel}`}>
                {label}
              </Tag>
            );
          })}
          {inherited.map(id => {
            const label = groupsById.get(id)?.name ?? `#${id}`;
            return (
              <span
                key={`inherited-${id}`}
                className="tiny dim"
                title="Accordé par un sous-dossier ou une pièce — modifiable là où il est réellement accordé"
                style={{
                  padding: '2px 8px', borderRadius: 999, border: '1px dashed var(--border)',
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
      {availableGroups.length > 0 && (
        <Select
          small
          auto
          value=""
          aria-label={`Ajouter un groupe à ${targetLabel}`}
          onChange={e => {
            if (e.target.value) onAdd(Number(e.target.value));
          }}
        >
          <option value="">+ Ajouter…</option>
          {availableGroups.map(g => (
            <option key={g.groupId} value={g.groupId}>
              {g.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
