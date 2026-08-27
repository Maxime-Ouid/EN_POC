import { useState } from 'react';
import { Modal, TplOption } from '../components/Modal';
import { Field, FieldRow } from '../components/Form';

export interface DataroomTemplate {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export interface NewDataroomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; portfolioId: string; clientSpaceId: string; templateId: string | null }) => void;
  portfolioOptions: Array<{ id: string; label: string }>;
  clientSpaceOptions: Array<{ id: string; label: string }>;
  templates: DataroomTemplate[];
}

// Modale "Nouveau dossier" — index_16.html #modal-new.
export function NewDataroomModal({
  open,
  onClose,
  onCreate,
  portfolioOptions,
  clientSpaceOptions,
  templates,
}: NewDataroomModalProps) {
  const [name, setName] = useState('');
  const [portfolioId, setPortfolioId] = useState(portfolioOptions[0]?.id ?? '');
  const [clientSpaceId, setClientSpaceId] = useState(clientSpaceOptions[0]?.id ?? '');
  const [templateId, setTemplateId] = useState<string | null>(templates[0]?.id ?? null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau dossier"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onCreate({ name, portfolioId, clientSpaceId, templateId })}
          >
            Créer le dossier
          </button>
        </>
      }
    >
      <Field label="Nom du dossier">
        <input
          type="text"
          placeholder="Ex. Dossier de vente — 12 rue des Lilas"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </Field>
      <FieldRow>
        <Field label="Portefeuille">
          <select value={portfolioId} onChange={e => setPortfolioId(e.target.value)}>
            <option value="">Aucun</option>
            {portfolioOptions.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Espace client">
          <select value={clientSpaceId} onChange={e => setClientSpaceId(e.target.value)}>
            {clientSpaceOptions.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </FieldRow>
      <Field label="Partir d'un modèle">
        {templates.map(t => (
          <TplOption
            key={t.id}
            icon={t.icon}
            name={t.name}
            desc={t.desc}
            onClick={() => setTemplateId(t.id)}
          />
        ))}
      </Field>
    </Modal>
  );
}
