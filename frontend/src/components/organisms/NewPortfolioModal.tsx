import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { Modal } from './Modal';

/* ===========================================================================
   Création d'un portefeuille — §2.1.

   Le portefeuille regroupe des datarooms « liées à un même client ou à une
   même opération » : le formulaire demande donc laquelle des deux, parce que
   c'est ce qui décide de la vue consolidée que l'on obtient ensuite. Le cas
   APUI est une case à cocher et non un troisième type : la vision le décrit
   comme un portefeuille ordinaire dont chaque participant administre sa
   propre dataroom, pas comme un objet distinct.
   =========================================================================== */

export interface NewPortfolioValue {
  name: string;
  kind: 'client' | 'operation';
  clientSpaceId: string;
  apui: boolean;
  dataroomIds: string[];
}

export interface NewPortfolioModalProps {
  open: boolean;
  onClose: () => void;
  clientSpaceOptions: Array<{ id: string; label: string }>;
  /** Datarooms de l'office pouvant rejoindre le portefeuille à sa création. */
  dataroomOptions: Array<{ id: string; label: string }>;
  onCreate?: (value: NewPortfolioValue) => void;
}

export function NewPortfolioModal({
  open,
  onClose,
  clientSpaceOptions,
  dataroomOptions,
  onCreate,
}: NewPortfolioModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'client' | 'operation'>('operation');
  const [clientSpaceId, setClientSpaceId] = useState(clientSpaceOptions[0]?.id ?? '');
  const [apui, setApui] = useState(false);
  const [dataroomIds, setDataroomIds] = useState<string[]>([]);

  function toggleDataroom(id: string) {
    setDataroomIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau portefeuille"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={() => onCreate?.({ name, kind, clientSpaceId, apui, dataroomIds })}
          >
            Créer le portefeuille
          </Button>
        </>
      }
    >
      <Field label="Nom du portefeuille">
        <input
          type="text"
          placeholder="Ex. Opération Ivry — Le Monde Commerce"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </Field>

      <FieldRow>
        <Field label="Regroupe">
          <Select value={kind} onChange={e => setKind(e.target.value as 'client' | 'operation')}>
            <option value="operation">Les datarooms d'une même opération</option>
            <option value="client">Toutes les datarooms d'un client</option>
          </Select>
        </Field>
        <Field label="Espace client">
          <Select value={clientSpaceId} onChange={e => setClientSpaceId(e.target.value)}>
            {clientSpaceOptions.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </FieldRow>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0',
          borderBottom: '1px solid var(--line)',
          marginBottom: 14,
        }}
      >
        <Toggle checked={apui} onChange={setApui} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Projet APUI</div>
          <div className="tiny dim">
            Chaque participant administre sa propre dataroom ; votre office pilote l'ensemble
            depuis le portefeuille.
          </div>
        </div>
      </div>

      <Field label="Datarooms à rattacher">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          {dataroomOptions.map(d => (
            <label
              key={d.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: 0 }}
            >
              <input
                type="checkbox"
                checked={dataroomIds.includes(d.id)}
                onChange={() => toggleDataroom(d.id)}
              />
              {d.label}
            </label>
          ))}
          {dataroomOptions.length === 0 && (
            <span className="tiny dim">Aucune dataroom disponible.</span>
          )}
        </div>
      </Field>
    </Modal>
  );
}
