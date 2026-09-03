import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { RowIcon } from '../atoms/RowIcon';
import { Select } from '../atoms/Select';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { Modal } from './Modal';

/* ===========================================================================
   Synthèse d'activité PDF par dossier — §11.1.

   C'est le document qu'un notaire joint au dossier ou envoie à son client pour
   rendre compte : qui a consulté quoi, ce qui a été déposé, où en sont les
   questions. Il se distingue du journal des accès (§4.6), qui est un outil
   d'investigation : ici, on produit une pièce datée et lisible par un tiers,
   là, on interroge un flux.

   Les sections sont cochables parce qu'elles ne s'adressent pas au même
   destinataire : la liste nominative des consultations se joint volontiers à
   un compte rendu interne, beaucoup moins à un envoi au vendeur.
   =========================================================================== */

export interface ActivityReportValue {
  period: string;
  sections: {
    documents: boolean;
    consultations: boolean;
    questions: boolean;
    members: boolean;
  };
  anonymised: boolean;
}

export interface ActivityReportModalProps {
  open: boolean;
  onClose: () => void;
  dataroomName: string;
  onGenerate?: (value: ActivityReportValue) => void;
}

const PERIODS = ['7 derniers jours', '30 derniers jours', 'Depuis la création du dossier'];

export function ActivityReportModal({
  open,
  onClose,
  dataroomName,
  onGenerate,
}: ActivityReportModalProps) {
  const [period, setPeriod] = useState(PERIODS[1]);
  const [documents, setDocuments] = useState(true);
  const [consultations, setConsultations] = useState(true);
  const [questions, setQuestions] = useState(true);
  const [members, setMembers] = useState(false);
  const [anonymised, setAnonymised] = useState(false);

  const rows: Array<[string, boolean, (v: boolean) => void, string]> = [
    ['Documents déposés et modifiés', documents, setDocuments, 'Dépôts, renommages, changements d’état.'],
    ['Consultations et téléchargements', consultations, setConsultations, 'Qui a ouvert quoi, et quand.'],
    ['Questions et réponses', questions, setQuestions, 'Fil complet, questions sans réponse en tête.'],
    ['Mouvements de membres', members, setMembers, 'Arrivées, départs, changements de droits.'],
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Synthèse d'activité"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={() =>
              onGenerate?.({
                period,
                sections: { documents, consultations, questions, members },
                anonymised,
              })
            }
          >
            Générer le PDF
          </Button>
        </>
      }
    >
      <div className="tiny dim" style={{ marginBottom: 14 }}>
        Pour le dossier <b>{dataroomName}</b>.
      </div>

      <FieldRow>
        <Field label="Période couverte">
          <Select value={period} onChange={e => setPeriod(e.target.value)}>
            {PERIODS.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </FieldRow>

      <div className="section-title" style={{ margin: '6px 0 8px' }}>
        Contenu du document
      </div>
      {rows.map(([label, value, setter, help]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0' }}>
          <Toggle checked={value} onChange={setter} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
            <div className="tiny dim">{help}</div>
          </div>
        </div>
      ))}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          margin: '8px 0 14px',
        }}
      >
        <Toggle checked={anonymised} onChange={setAnonymised} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Version anonymisée</div>
          <div className="tiny dim">
            Les personnes sont remplacées par leur groupe — pour un envoi hors de l'étude.
          </div>
        </div>
      </div>

      <Card padded style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <RowIcon icon="file" bg="var(--critical-bg)" color="var(--critical)" size={34} />
        <div className="tiny dim">
          Le PDF porte l'entête de l'étude et la date d'édition. Sa génération est elle-même
          inscrite au journal des accès.
        </div>
      </Card>
    </Modal>
  );
}
