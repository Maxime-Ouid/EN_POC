import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { TextInput } from '../atoms/TextInput';
import { Dropzone } from '../molecules/Dropzone';
import { Field } from '../molecules/Field';

export interface OfficeIdentity {
  /** Nom affiché de l'étude dans toute l'interface. */
  displayName: string;
  /** Sous-domaine dédié en marque grise. */
  subdomain: string;
  logoUrl?: string;
}

/** Signature de contenu, pour détecter une vraie mise à jour des données. */
function identityKey(i: OfficeIdentity): string {
  return JSON.stringify([i.displayName, i.subdomain, i.logoUrl ?? '']);
}

export interface IdentityTabProps {
  identity: OfficeIdentity;
  onSave?: (next: OfficeIdentity) => void | Promise<void>;
  onLogoSelected?: (file: File) => void;
  /** Le sous-domaine est attribué par Notantis : lecture seule par défaut. */
  subdomainEditable?: boolean;
  saving?: boolean;
  error?: string | null;
}

// Personnalisation → Identité (index_16.html #sub3-identite). Formulaire
// contrôlé : le prototype affichait des `value` figés, ici l'état est réel et
// `onSave` reçoit la version modifiée.
export function IdentityTab({
  identity,
  onSave,
  onLogoSelected,
  subdomainEditable = false,
  saving,
  error,
}: IdentityTabProps) {
  const [draft, setDraft] = useState<OfficeIdentity>(identity);
  const [syncedFrom, setSyncedFrom] = useState<string>(() => identityKey(identity));

  // Les valeurs peuvent arriver après le montage (chargement de
  // /api/tenant-config/). On resynchronise le brouillon pendant le rendu plutôt
  // que dans un effet : pas de rendu intermédiaire avec les anciennes valeurs.
  // La comparaison porte sur le CONTENU, pas sur la référence — l'appelant
  // reconstruit souvent l'objet à chaque rendu, ce qui bouclerait à l'infini.
  const incomingKey = identityKey(identity);
  if (syncedFrom !== incomingKey) {
    setSyncedFrom(incomingKey);
    setDraft(identity);
  }

  return (
    <Card padded style={{ maxWidth: 560 }}>
      <div className="section-title" style={{ marginBottom: 14 }}>
        Identité de l'étude
      </div>

      <Field label="Nom affiché">
        <TextInput
          value={draft.displayName}
          onChange={e => setDraft({ ...draft, displayName: e.target.value })}
        />
      </Field>

      <Field label="Sous-domaine dédié">
        <TextInput
          value={draft.subdomain}
          readOnly={!subdomainEditable}
          onChange={e => setDraft({ ...draft, subdomain: e.target.value })}
        />
        <div className="help">Marque grise — l'adresse reste rattachée à Notantis.</div>
      </Field>

      <Field label="Logo de l'étude">
        <Dropzone
          accept="image/*"
          onFiles={files => onLogoSelected?.(files[0])}
        />
      </Field>

      {error && (
        <div className="help" style={{ color: 'var(--critical)' }}>
          {error}
        </div>
      )}

      <Button
        variant="primary"
        style={{ marginTop: 6 }}
        disabled={saving}
        onClick={() => onSave?.(draft)}
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </Card>
  );
}
