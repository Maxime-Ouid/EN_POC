import { useState } from 'react';
import { Select } from '../atoms/Select';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { TemplateOption } from '../molecules/TemplateOption';
import { Modal } from './Modal';
import type { DataroomTemplate } from '../molecules/TemplateOption';

export interface NewDataroomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; portfolioId: string; clientSpaceId: string; templateId: string | null }) => void;
  portfolioOptions: Array<{ id: string; label: string }>;
  clientSpaceOptions: Array<{ id: string; label: string }>;
  /**
   * Modèles de l'étude (GET /api/templates/). Liste vide = la section se réduit
   * à « Dossier vide » : proposer un choix qui n'existe pas serait pire que ne
   * rien proposer.
   */
  templates: DataroomTemplate[];
  templatesLoading?: boolean;
}

// Modale "Nouveau dossier" — index_16.html #modal-new.
export function NewDataroomModal({
  open,
  onClose,
  onCreate,
  portfolioOptions,
  clientSpaceOptions,
  templates,
  templatesLoading,
}: NewDataroomModalProps) {
  const [name, setName] = useState('');
  const [portfolioId, setPortfolioId] = useState(portfolioOptions[0]?.id ?? '');
  const [clientSpaceId, setClientSpaceId] = useState(clientSpaceOptions[0]?.id ?? '');
  /* Aucun modèle par défaut : appliquer une arborescence — et les restrictions
     d'accès qu'elle porte — parce que c'est la première ligne de la liste est
     un effet que personne n'a demandé. « Dossier vide » est donc l'état initial,
     et choisir un modèle est un geste explicite. */
  const [templateId, setTemplateId] = useState<string | null>(null);

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
          name="Dossier vide"
          desc="Sans arborescence pré-remplie"
          selected={templateId === null}
          onClick={() => setTemplateId(null)}
        />
        {templates.map(t => (
          <TemplateOption
            key={t.id}
            icon={t.icon}
            name={t.name}
            desc={t.desc}
            selected={t.id === templateId}
            onClick={() => setTemplateId(t.id)}
          />
        ))}
        {templatesLoading && <div className="tiny dim">Chargement des modèles…</div>}
        {!templatesLoading && templates.length === 0 && (
          <div className="tiny dim">
            Aucun modèle enregistré pour cette étude — Personnalisation → Modules &amp;
            modèles permet d'en créer.
          </div>
        )}
      </Field>
    </Modal>
  );
}
