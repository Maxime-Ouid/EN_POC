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
   Relevé d'usage en marque grise — §4.6 du document de vision.

   « Fournir à chaque office un détail précis de l'utilisation de l'EN pour
   chacun de ses clients, afin de lui permettre de refacturer le service à ses
   clients SOUS SA PROPRE MARQUE. » Deux conséquences que cette modale rend
   visibles plutôt que de les laisser dans le code :

   1. la mesure d'usage repose sur l'espace disque consommé par les datarooms,
      agrégé par client — le choix du mode de calcul (stockage moyen sur la
      période ou pic constaté) change le montant refacturé, il est donc exposé
      et non figé ;
   2. « sous sa propre marque » veut dire que le document sortant ne porte PAS
      la marque Notantis. L'aperçu le dit explicitement, parce que c'est le
      point que l'office vérifiera en premier.

   Le document produit n'est pas une facture — l'office établit la sienne. Le
   libellé parle donc de « relevé d'usage », et le rappel sous l'aperçu évite
   qu'on prenne l'un pour l'autre à la démonstration.
   =========================================================================== */

export interface GreyLabelStatementValue {
  clientId: string;
  period: string;
  basis: 'moyenne' | 'pic';
  detailByDataroom: boolean;
  officeBranding: boolean;
  format: 'pdf' | 'csv' | 'xlsx';
}

export interface GreyLabelStatementModalProps {
  open: boolean;
  onClose: () => void;
  clients: Array<{ id: string; label: string }>;
  periods: string[];
  /** Nom de l'office, montré dans l'aperçu comme émetteur du relevé. */
  officeName: string;
  onGenerate?: (value: GreyLabelStatementValue) => void;
}

export function GreyLabelStatementModal({
  open,
  onClose,
  clients,
  periods,
  officeName,
  onGenerate,
}: GreyLabelStatementModalProps) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [period, setPeriod] = useState(periods[0] ?? '');
  const [basis, setBasis] = useState<'moyenne' | 'pic'>('moyenne');
  const [detailByDataroom, setDetailByDataroom] = useState(true);
  const [officeBranding, setOfficeBranding] = useState(true);
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');

  const clientLabel = clients.find(c => c.id === clientId)?.label ?? '—';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Relevé d'usage en marque grise"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={() =>
              onGenerate?.({ clientId, period, basis, detailByDataroom, officeBranding, format })
            }
          >
            Générer le relevé
          </Button>
        </>
      }
    >
      <FieldRow>
        <Field label="Client">
          <Select value={clientId} onChange={e => setClientId(e.target.value)}>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Période">
          <Select value={period} onChange={e => setPeriod(e.target.value)}>
            {periods.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Base de calcul du stockage">
          <Select value={basis} onChange={e => setBasis(e.target.value as 'moyenne' | 'pic')}>
            <option value="moyenne">Stockage moyen sur la période</option>
            <option value="pic">Pic de stockage constaté</option>
          </Select>
        </Field>
        <Field label="Format">
          <Select value={format} onChange={e => setFormat(e.target.value as 'pdf' | 'csv' | 'xlsx')}>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
          </Select>
        </Field>
      </FieldRow>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
        <Toggle checked={detailByDataroom} onChange={setDetailByDataroom} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Détailler dataroom par dataroom</div>
          <div className="tiny dim">
            Sinon, le relevé ne porte que le total consommé par le client.
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 0',
          borderBottom: '1px solid var(--border)',
          marginBottom: 14,
        }}
      >
        <Toggle checked={officeBranding} onChange={setOfficeBranding} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>À la marque de l'office</div>
          <div className="tiny dim">
            Logo et coordonnées de {officeName}, sans mention de Notantis.
          </div>
        </div>
      </div>

      <Card padded style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <RowIcon icon="file" bg="var(--brass-100)" color="var(--brass-700)" size={34} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            Relevé d'usage — {clientLabel} — {period}
          </div>
          <div className="tiny dim" style={{ marginTop: 4 }}>
            Émis par {officeBranding ? officeName : 'Notantis'} ·{' '}
            {basis === 'moyenne' ? 'stockage moyen' : 'pic de stockage'}
            {detailByDataroom ? ' · détail par dataroom' : ' · total client uniquement'}
          </div>
          <div className="tiny dim" style={{ marginTop: 8 }}>
            Document de refacturation destiné au client de l'office. Ce n'est pas une facture
            Notantis&nbsp;: l'office établit la sienne à partir de ces éléments.
          </div>
        </div>
      </Card>
    </Modal>
  );
}
