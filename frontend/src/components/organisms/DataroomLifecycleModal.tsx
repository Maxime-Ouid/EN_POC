import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Pill } from '../atoms/Pill';
import { Select } from '../atoms/Select';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

/* ===========================================================================
   Cycle de vie d'une dataroom — §4.1 : « création / clôture / archivage /
   suppression / durée de conservation ».

   À ne PAS confondre avec la « gestion des états » du §8.2, explicitement hors
   MVP : celle-ci décrit une machine à états complète (en préparation, active,
   en attente, clôturée, archivée) avec transitions conditionnées. Ici, on s'en
   tient aux quatre gestes que le §4.1 place dans le périmètre, plus la durée
   de conservation — d'où l'absence d'écran de configuration des transitions.

   Chaque geste dit sa conséquence AVANT d'être déclenché, parce qu'ils ne sont
   pas réversibles de la même façon : une clôture se rouvre, un archivage se
   restaure, une suppression ne revient pas. Les afficher en trois boutons
   identiques laisserait croire le contraire.
   =========================================================================== */

export type DataroomLifecycleState = 'active' | 'cloturee' | 'archivee';

export interface DataroomLifecycleModalProps {
  open: boolean;
  onClose: () => void;
  dataroomName: string;
  state: DataroomLifecycleState;
  /** Durée de conservation en vigueur pour ce dossier, en années. */
  retentionYears: number;
  /** Échéance calculée, déjà formatée — le calcul dépend de la date de clôture. */
  retentionUntil?: string;
  onCloture?: () => void;
  onReopen?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onRetentionChange?: (years: number) => void;
}

const STATE_LABEL: Record<DataroomLifecycleState, { kind: 'success' | 'warning' | 'neutral'; label: string }> = {
  active: { kind: 'success', label: 'Actif' },
  cloturee: { kind: 'warning', label: 'Clôturé' },
  archivee: { kind: 'neutral', label: 'Archivé' },
};

/** Durées proposées. Le notariat impose des conservations longues qui peuvent
    primer sur l'effacement RGPD (§7.8) : « conservation notariale » est donc
    une valeur à part, pas un grand nombre d'années. */
const RETENTIONS = [
  { years: 1, label: '1 an après clôture' },
  { years: 5, label: '5 ans après clôture' },
  { years: 10, label: '10 ans après clôture' },
  { years: 30, label: '30 ans après clôture' },
  { years: 75, label: 'Conservation notariale (75 ans)' },
];

export function DataroomLifecycleModal({
  open,
  onClose,
  dataroomName,
  state,
  retentionYears,
  retentionUntil,
  onCloture,
  onReopen,
  onArchive,
  onDelete,
  onRetentionChange,
}: DataroomLifecycleModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirmDelete(false);
        onClose();
      }}
      title="Cycle de vie du dossier"
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <b>{dataroomName}</b>
        <Pill kind={STATE_LABEL[state].kind}>{STATE_LABEL[state].label}</Pill>
      </div>

      <Field label="Durée de conservation">
        <Select
          value={retentionYears}
          onChange={e => onRetentionChange?.(Number(e.target.value))}
        >
          {RETENTIONS.map(r => (
            <option key={r.years} value={r.years}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="tiny dim" style={{ marginTop: -6, marginBottom: 18 }}>
        {retentionUntil
          ? `Purge automatique prévue le ${retentionUntil}.`
          : "Le décompte démarre à la clôture du dossier — rien n'est purgé tant qu'il est actif."}
      </div>

      {state === 'active' && (
        <Card padded style={{ marginBottom: 12 }}>
          <div className="section-title">Clôturer le dossier</div>
          <div className="tiny dim" style={{ margin: '4px 0 10px' }}>
            Les dépôts et les questions sont gelés, le contenu reste consultable par ses
            membres. Le décompte de conservation démarre. Réversible.
          </div>
          <Button size="sm" onClick={onCloture}>
            Clôturer
          </Button>
        </Card>
      )}

      {state === 'cloturee' && (
        <Card padded style={{ marginBottom: 12 }}>
          <div className="section-title">Rouvrir le dossier</div>
          <div className="tiny dim" style={{ margin: '4px 0 10px' }}>
            Les dépôts et les questions redeviennent possibles, le décompte de conservation
            est suspendu.
          </div>
          <Button size="sm" onClick={onReopen}>
            Rouvrir
          </Button>
        </Card>
      )}

      {state !== 'archivee' && (
        <Card padded style={{ marginBottom: 12 }}>
          <div className="section-title">Archiver</div>
          <div className="tiny dim" style={{ margin: '4px 0 10px' }}>
            Le dossier sort des listes courantes et passe en stockage d'archive. Il reste
            restaurable et compte toujours dans le stockage facturé.
          </div>
          <Button size="sm" onClick={onArchive}>
            Archiver
          </Button>
        </Card>
      )}

      <Card padded>
        <div className="section-title">Supprimer définitivement</div>
        <div className="tiny dim" style={{ margin: '4px 0 10px' }}>
          Documents, arborescence, questions et droits sont effacés. L'entrée correspondante
          reste dans le journal des accès, qui n'est jamais purgé par cette action.
        </div>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tiny" style={{ color: 'var(--critical)' }}>
              Cette action est irréversible.
            </span>
            <Button size="sm" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button size="sm" variant="primary" onClick={onDelete}>
              Confirmer la suppression
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setConfirmDelete(true)}>
            Supprimer le dossier
          </Button>
        )}
      </Card>
    </Modal>
  );
}
