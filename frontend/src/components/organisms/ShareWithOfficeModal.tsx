import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { Modal } from './Modal';

/* ===========================================================================
   Partage d'une dataroom entre deux offices — §4.1.

   « Partage d'une dataroom entre 2 offices (typiquement vendeur et acquéreur),
   avec possibilité d'activer ou non la synchronisation des fichiers en temps
   réel. » Le partage crée un accès pour un office TIERS : c'est le seul endroit
   du produit où des données sortent du tenant, d'où trois précautions rendues
   visibles.

   1. L'office destinataire se cherche, il ne se choisit pas dans une liste
      déroulante. Le §4.1 relève déjà comme un DÉFAUT à corriger le fait que la
      V1 expose l'annuaire complet des offices au moment du partage : afficher
      « 6 946 offices » à qui veut le lire est une fuite d'information en soi.
      Le champ ne renvoie donc de résultat qu'à partir d'une recherche exacte
      (CRPCEN ou raison sociale complète), et l'écran le dit.
   2. La synchronisation temps réel est un choix explicite, désactivé par
      défaut : elle fait circuler chaque dépôt en continu vers l'autre office.
   3. Un partage se révoque, et la liste des partages en cours est sous le
      formulaire — même raison que pour les liens temporaires.
   =========================================================================== */

export interface DataroomShare {
  id: string;
  officeName: string;
  /** Rôle de l'office tiers dans l'opération. */
  role: string;
  access: 'lecture' | 'ecriture';
  realtimeSync: boolean;
  since: string;
}

export interface ShareWithOfficeValue {
  query: string;
  role: string;
  access: 'lecture' | 'ecriture';
  realtimeSync: boolean;
  scope: 'complet' | 'partiel';
}

export interface ShareWithOfficeModalProps {
  open: boolean;
  onClose: () => void;
  dataroomName: string;
  shares: DataroomShare[];
  onShare?: (value: ShareWithOfficeValue) => void;
  onRevoke?: (id: string) => void;
}

const ROLES = ['Office du vendeur', "Office de l'acquéreur", 'Office co-instrumentaire', 'Office participant (APUI)'];

export function ShareWithOfficeModal({
  open,
  onClose,
  dataroomName,
  shares,
  onShare,
  onRevoke,
}: ShareWithOfficeModalProps) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [access, setAccess] = useState<'lecture' | 'ecriture'>('lecture');
  const [realtimeSync, setRealtimeSync] = useState(false);
  const [scope, setScope] = useState<'complet' | 'partiel'>('complet');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Partager avec un autre office"
      footer={
        <>
          <Button onClick={onClose}>Fermer</Button>
          <Button
            variant="primary"
            disabled={query.trim().length < 3}
            onClick={() => onShare?.({ query, role, access, realtimeSync, scope })}
          >
            Envoyer l'invitation
          </Button>
        </>
      }
    >
      <div className="tiny dim" style={{ marginBottom: 14 }}>
        Le dossier <b>{dataroomName}</b> deviendra accessible aux membres désignés de l'office
        invité, depuis leur propre Espace Notarial.
      </div>

      <Field label="Office destinataire">
        <TextInput
          value={query}
          placeholder="Numéro CRPCEN ou raison sociale exacte"
          onChange={e => setQuery(e.target.value)}
        />
      </Field>
      <div className="tiny dim" style={{ marginTop: -6, marginBottom: 16 }}>
        L'annuaire des offices n'est pas parcourable : il faut connaître l'office visé.
      </div>

      <FieldRow>
        <Field label="Rôle dans l'opération">
          <Select value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Droit accordé">
          <Select
            value={access}
            onChange={e => setAccess(e.target.value as 'lecture' | 'ecriture')}
          >
            <option value="lecture">Lecture seule</option>
            <option value="ecriture">Lecture et dépôt</option>
          </Select>
        </Field>
      </FieldRow>

      <Field label="Périmètre partagé">
        <Select value={scope} onChange={e => setScope(e.target.value as 'complet' | 'partiel')}>
          <option value="complet">Tout le dossier</option>
          <option value="partiel">Sélection de sous-dossiers (à définir après invitation)</option>
        </Select>
      </Field>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
          marginBottom: 14,
        }}
      >
        <Toggle checked={realtimeSync} onChange={setRealtimeSync} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Synchronisation en temps réel</div>
          <div className="tiny dim">
            Chaque dépôt est répercuté immédiatement chez l'office invité. Sans elle, il
            consulte le dossier sans que ses propres dépôts vous reviennent.
          </div>
        </div>
      </div>

      {shares.length > 0 ? (
        <>
          <div className="section-title" style={{ marginBottom: 8 }}>
            Partages en cours
          </div>
          {/* Même raison que pour les liens temporaires : une modale de 560 px
              ne tient pas cinq colonnes de tableau sans en couper une. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shares.map(sh => (
              <div
                key={sh.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon id="building" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{sh.officeName}</span>
                  <Pill kind={sh.access === 'ecriture' ? 'success' : 'info'}>
                    {sh.access === 'ecriture' ? 'Lecture et dépôt' : 'Lecture seule'}
                  </Pill>
                  {sh.realtimeSync && <Pill kind="neutral">Temps réel</Pill>}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                  }}
                >
                  <span className="tiny dim">
                    {sh.role} · partagé depuis le {sh.since}
                  </span>
                  <Button size="sm" onClick={() => onRevoke?.(sh.id)}>
                    Révoquer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Card padded>
          <div className="tiny dim">Ce dossier n'est partagé avec aucun autre office.</div>
        </Card>
      )}
    </Modal>
  );
}
