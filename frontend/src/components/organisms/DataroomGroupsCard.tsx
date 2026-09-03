import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { Pill } from '../atoms/Pill';
import { RowIcon } from '../atoms/RowIcon';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { AvatarStack } from '../molecules/AvatarStack';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';

/* ===========================================================================
   Groupes d'utilisateurs d'une dataroom — §4.4.

   « Gestion des droits de lecture/écriture sur les dossiers et fichiers, par
   utilisateur OU PAR GROUPE d'utilisateurs. Les groupes sont définis dans le
   PARAMÉTRAGE DE LA DATAROOM. » Deux conséquences suivies à la lettre :

   1. les groupes ne sont pas des groupes d'office. Deux dossiers peuvent avoir
      chacun leur « Acquéreur » sans aucun rapport — c'est pour cela que ce
      bloc vit dans l'onglet Droits d'accès d'un dossier et non dans l'annuaire
      de l'étude ;
   2. un groupe est une CIBLE de droits, pas un rôle. Le rôle (superadmin,
      admin, membre, client) reste porté par le membership d'office et décide
      de ce qu'on peut faire ; le groupe décide d'où on peut le faire.

   La V1 s'appuie en plus sur des groupes métier PRÉDÉFINIS (Étude, Vendeur,
   Acquéreur, Conjoints, Magistrats, externe) et sur des matrices de droits par
   défaut selon le type de dossier — écart signalé au §11.1, non tranché. Ils
   sont ici proposés comme modèles de départ, pas imposés : c'est un point à
   faire arbitrer.
   =========================================================================== */

export interface DataroomGroup {
  id: string;
  name: string;
  /** Droit posé par défaut pour les membres de ce groupe. */
  access: 'lecture' | 'ecriture' | 'aucun';
  members: Array<{ label: string; gray?: boolean }>;
  memberCount: number;
  /** Groupe issu d'un modèle V1 plutôt que créé à la main. */
  predefined?: boolean;
}

export interface DataroomGroupsCardProps {
  groups: DataroomGroup[];
  readOnly?: boolean;
  onCreate?: (name: string, access: DataroomGroup['access']) => void;
  onAccessChange?: (groupId: string, access: DataroomGroup['access']) => void;
  onEditMembers?: (groupId: string) => void;
  onRemove?: (groupId: string) => void;
}

const ACCESS_LABEL: Record<DataroomGroup['access'], { label: string; kind: 'success' | 'info' | 'neutral' }> = {
  ecriture: { label: 'Lecture et écriture', kind: 'success' },
  lecture: { label: 'Lecture seule', kind: 'info' },
  aucun: { label: 'Aucun accès par défaut', kind: 'neutral' },
};

export function DataroomGroupsCard({
  groups,
  readOnly,
  onCreate,
  onAccessChange,
  onEditMembers,
  onRemove,
}: DataroomGroupsCardProps) {
  const [name, setName] = useState('');
  const [access, setAccess] = useState<DataroomGroup['access']>('lecture');

  return (
    <Card padded style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div className="section-title">Groupes du dossier</div>
        <div className="tiny dim">
          Un groupe rassemble des intervenants pour leur poser des droits d'un seul geste.
          Il n'existe que dans ce dossier.
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Groupe</th>
              <th>Droit par défaut</th>
              <th>Membres</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.id}>
                <td className="row-name">
                  <RowIcon icon="users" bg="var(--surface-alt)" color="var(--ink-500)" />
                  {g.name}
                  {g.predefined && (
                    <Pill kind="neutral" style={{ marginLeft: 8 }}>
                      Modèle V1
                    </Pill>
                  )}
                </td>
                <td>
                  {readOnly ? (
                    <Pill kind={ACCESS_LABEL[g.access].kind}>{ACCESS_LABEL[g.access].label}</Pill>
                  ) : (
                    <Select
                      small
                      value={g.access}
                      onChange={e =>
                        onAccessChange?.(g.id, e.target.value as DataroomGroup['access'])
                      }
                    >
                      <option value="ecriture">Lecture et écriture</option>
                      <option value="lecture">Lecture seule</option>
                      <option value="aucun">Aucun accès par défaut</option>
                    </Select>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AvatarStack avatars={g.members} />
                    <span className="tiny dim">{g.memberCount}</span>
                  </div>
                </td>
                <td>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="sm" onClick={() => onEditMembers?.(g.id)}>
                        Membres
                      </Button>
                      <IconButton
                        icon="x"
                        title={`Supprimer le groupe ${g.name}`}
                        onClick={() => onRemove?.(g.id)}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={4} className="tiny dim" style={{ textAlign: 'center', padding: 20 }}>
                  Aucun groupe — les droits se posent alors utilisateur par utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
          <FieldRow>
            <Field label="Nouveau groupe">
              <TextInput
                value={name}
                placeholder="Ex. Acquéreur — conseils"
                onChange={e => setName(e.target.value)}
              />
            </Field>
            <Field label="Droit par défaut">
              <Select
                value={access}
                onChange={e => setAccess(e.target.value as DataroomGroup['access'])}
              >
                <option value="lecture">Lecture seule</option>
                <option value="ecriture">Lecture et écriture</option>
                <option value="aucun">Aucun accès par défaut</option>
              </Select>
            </Field>
          </FieldRow>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              onCreate?.(name.trim(), access);
              setName('');
            }}
          >
            <Icon id="plus" />
            Créer le groupe
          </Button>
        </div>
      )}
    </Card>
  );
}
