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
  /** URL affichable du logo enregistré — vide si l'étude n'en a pas encore. */
  logoUrl?: string;
}

/** Ce que l'écran demande d'enregistrer. `logoFile` et `removeLogo` s'excluent. */
export interface OfficeIdentityChange {
  displayName: string;
  /** Nouveau fichier choisi, `null` si l'utilisateur n'a rien déposé cette fois. */
  logoFile: File | null;
  /** Retour à la marque Notantis. */
  removeLogo: boolean;
}

/** Signature de contenu, pour détecter une vraie mise à jour des données. */
function identityKey(i: OfficeIdentity): string {
  return JSON.stringify([i.displayName, i.subdomain, i.logoUrl ?? '']);
}

export interface IdentityTabProps {
  identity: OfficeIdentity;
  onSave?: (next: OfficeIdentityChange) => void | Promise<void>;
  /** Le sous-domaine est attribué par Notantis : lecture seule par défaut. */
  subdomainEditable?: boolean;
  saving?: boolean;
  error?: string | null;
  /** Pourquoi les champs sont inertes — un non-administrateur, typiquement. */
  readOnly?: boolean;
  readOnlyNote?: string;
}

// Personnalisation → Identité (index_16.html #sub3-identite). Formulaire
// contrôlé : le prototype affichait des `value` figés, ici l'état est réel et
// `onSave` reçoit la version modifiée.
//
// Le logo est le dernier morceau de la « marque grise » : la couleur suit le thème
// de l'office depuis le 28/08, le logo depuis le 02/09. Rien n'est envoyé au dépôt
// du fichier — le choix rejoint le nom dans le même enregistrement, pour qu'un
// abandon de formulaire ne laisse pas l'étude avec un logo qu'elle n'a pas validé.
export function IdentityTab({
  identity,
  onSave,
  subdomainEditable = false,
  saving,
  error,
  readOnly,
  readOnlyNote,
}: IdentityTabProps) {
  const [draft, setDraft] = useState<OfficeIdentity>(identity);
  const [syncedFrom, setSyncedFrom] = useState<string>(() => identityKey(identity));
  /** Fichier choisi, pas encore enregistré. */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  // Les valeurs peuvent arriver après le montage (chargement de
  // /api/tenant-config/). On resynchronise le brouillon pendant le rendu plutôt
  // que dans un effet : pas de rendu intermédiaire avec les anciennes valeurs.
  // La comparaison porte sur le CONTENU, pas sur la référence — l'appelant
  // reconstruit souvent l'objet à chaque rendu, ce qui bouclerait à l'infini.
  const incomingKey = identityKey(identity);
  if (syncedFrom !== incomingKey) {
    setSyncedFrom(incomingKey);
    setDraft(identity);
    setLogoFile(null);
    setRemoveLogo(false);
  }

  const currentLogo = removeLogo ? undefined : identity.logoUrl;
  const disabled = readOnly || saving;

  return (
    <Card padded style={{ maxWidth: 560 }}>
      <div className="section-title" style={{ marginBottom: readOnlyNote ? 6 : 14 }}>
        Identité de l'étude
      </div>
      {readOnlyNote && (
        <div className="tiny dim" style={{ marginBottom: 14 }}>
          {readOnlyNote}
        </div>
      )}

      <Field label="Nom affiché">
        <TextInput
          value={draft.displayName}
          readOnly={readOnly}
          onChange={e => setDraft({ ...draft, displayName: e.target.value })}
        />
      </Field>

      <Field label="Sous-domaine dédié">
        <TextInput
          value={draft.subdomain}
          readOnly={!subdomainEditable || readOnly}
          onChange={e => setDraft({ ...draft, subdomain: e.target.value })}
        />
        <div className="help">Marque grise — l'adresse reste rattachée à Notantis.</div>
      </Field>

      <Field label="Logo de l'étude">
        {/* L'aperçu montre ce qui est ENREGISTRÉ tant que rien n'a été déposé, puis le
            fichier choisi : sans lui, on ne sait pas si l'étude a déjà un logo, ni
            lequel on s'apprête à remplacer. */}
        {(currentLogo || logoFile) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <img
              src={logoFile ? URL.createObjectURL(logoFile) : currentLogo}
              alt="Logo de l'étude"
              style={{
                width: 48,
                height: 48,
                objectFit: 'contain',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 4,
                background: 'var(--surface-alt)',
              }}
            />
            <div style={{ flex: 1 }}>
              <div className="tiny">
                {logoFile ? logoFile.name : 'Logo enregistré'}
              </div>
              <div className="tiny dim">
                {logoFile ? 'Sera enregistré avec le formulaire.' : 'Affiché dans le bandeau de navigation.'}
              </div>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (logoFile) {
                    setLogoFile(null);
                  } else {
                    setRemoveLogo(true);
                  }
                }}
              >
                Retirer
              </Button>
            )}
          </div>
        )}

        {removeLogo && !logoFile && (
          <div className="tiny dim" style={{ marginBottom: 10 }}>
            Le logo sera retiré à l'enregistrement — l'étude reprend la marque Notantis.
          </div>
        )}

        {!readOnly && (
          <Dropzone
            accept="image/*"
            onFiles={files => {
              if (!files.length) return;
              setLogoFile(files[0]);
              setRemoveLogo(false);
            }}
          />
        )}
        <div className="help">PNG, JPG, WebP ou SVG, 2 Mo maximum.</div>
      </Field>

      {error && (
        <div className="help" style={{ color: 'var(--critical)' }}>
          {error}
        </div>
      )}

      {!readOnly && (
        <Button
          variant="primary"
          style={{ marginTop: 6 }}
          disabled={disabled}
          onClick={() =>
            onSave?.({ displayName: draft.displayName, logoFile, removeLogo })
          }
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      )}
    </Card>
  );
}
