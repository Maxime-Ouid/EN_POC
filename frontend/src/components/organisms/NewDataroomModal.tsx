import { useEffect, useState } from 'react';
import { Select } from '../atoms/Select';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { TemplateOption } from '../molecules/TemplateOption';
import { Modal } from './Modal';

/** Un Template réel de l'office (GET /api/templates/), réduit à ce que le sélecteur affiche. */
export interface NewDataroomTemplateOption {
  id: number;
  name: string;
  description: string;
}

export interface NewDataroomModalProps {
  open: boolean;
  /** Erreur renvoyée par l'API à la dernière tentative (droit insuffisant, nom vide…). */
  error?: string | null;
  onClose: () => void;
  /** `templateId` null = « Dataroom vide », toujours proposée en tête de liste. */
  onCreate: (data: { name: string; portfolioId: string; clientSpaceId: string; templateId: number | null }) => void;
  portfolioOptions: Array<{ id: string; label: string }>;
  clientSpaceOptions: Array<{ id: string; label: string }>;
  /** Modèles RÉELS de l'office (backend/datarooms/models.py::Template) — voir App.tsx/useTemplates. */
  templates: NewDataroomTemplateOption[];
}

// Modale "Nouveau dossier" — index_16.html #modal-new. Le sélecteur de modèle
// pointait jusqu'au 02/09/2026 vers NEW_DATAROOM_TEMPLATES (data/demo.tsx,
// trois entrées factices sans équivalent en base) et le templateId choisi
// n'était jamais transmis à onCreate — câblé sur les vrais Template de
// l'office (GET /api/templates/), voir CLAUDE.md.
export function NewDataroomModal({
  open,
  error,
  onClose,
  onCreate,
  portfolioOptions,
  clientSpaceOptions,
  templates,
}: NewDataroomModalProps) {
  const [name, setName] = useState('');
  const [portfolioId, setPortfolioId] = useState(portfolioOptions[0]?.id ?? '');
  const [clientSpaceId, setClientSpaceId] = useState(clientSpaceOptions[0]?.id ?? '');
  const [templateId, setTemplateId] = useState<number | null>(null);

  // `Modal` ne démonte jamais ses enfants (elle bascule juste une classe CSS,
  // voir Modal.tsx) — sans ce reset, rouvrir la modale (après annulation OU
  // après une création réussie) réaffichait le nom et le modèle de la
  // tentative précédente, ce qui pouvait laisser croire qu'un nouveau clic
  // sur "Créer" n'avait rien fait.
  useEffect(() => {
    if (open) {
      setName('');
      setPortfolioId(portfolioOptions[0]?.id ?? '');
      setClientSpaceId(clientSpaceOptions[0]?.id ?? '');
      setTemplateId(null);
    }
    // oxlint-disable-next-line exhaustive-deps
  }, [open]);

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
          <Select value={portfolioId} onChange={e => setPortfolioId(e.target.value)}>
            <option value="">Aucun</option>
            {portfolioOptions.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
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
      <Field label="Partir d'un modèle">
        <TemplateOption
          icon="file"
          name="Dataroom vide"
          desc="Sans arborescence pré-remplie"
          selected={templateId === null}
          onClick={() => setTemplateId(null)}
        />
        {templates.map(t => (
          <TemplateOption
            key={t.id}
            icon="folder"
            name={t.name}
            desc={t.description || 'Aucune description'}
            selected={t.id === templateId}
            onClick={() => setTemplateId(t.id)}
          />
        ))}
        {templates.length === 0 && (
          <div className="tiny dim" style={{ marginTop: 6 }}>
            Aucun autre modèle — un admin peut en créer depuis « Modèles » dans le menu Office.
          </div>
        )}
      </Field>
      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
