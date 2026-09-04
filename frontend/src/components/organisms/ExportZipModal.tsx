import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Select } from '../atoms/Select';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';

/* ===========================================================================
   Téléchargement groupé ZIP — §4.1.

   Deux choses que la maquette rend explicites parce qu'elles décident du
   chiffrage (§7.9, « génération de téléchargements ZIP volumineux ») :

   1. la PORTÉE — tout le dossier, le sous-dossier ouvert, ou les seules pièces
      filtrées à l'écran. Sans ce choix, l'utilisateur télécharge 18 Go pour
      trois pièces ;
   2. le fait que l'archive se PRÉPARE. Au-delà de quelques centaines de méga,
      la génération n'est pas synchrone : l'écran annonce donc un envoi par
      courriel plutôt qu'un téléchargement immédiat qui semblerait bloqué.

   L'arborescence est conservée par défaut : un ZIP à plat de 400 pièces au nom
   proche est inexploitable, et c'est justement l'arborescence qui fait la
   valeur d'une dataroom notariale.
   =========================================================================== */

export type ExportZipScope = 'dossier' | 'sous-dossier' | 'selection';

export interface ExportZipValue {
  scope: ExportZipScope;
  keepTree: boolean;
  includeUnread: boolean;
  notifyByEmail: boolean;
}

export interface ExportZipModalProps {
  open: boolean;
  onClose: () => void;
  dataroomName: string;
  /** Sous-dossier ouvert au moment du clic, proposé comme portée. */
  currentFolderLabel?: string;
  /** Nombre de pièces retenues par le filtre courant, s'il y en a un. */
  filteredCount?: number;
  /** Volume estimé de l'export complet, déjà formaté (« 18,2 Go »). */
  estimatedSize?: string;
  onExport?: (value: ExportZipValue) => void;
}

export function ExportZipModal({
  open,
  onClose,
  dataroomName,
  currentFolderLabel,
  filteredCount,
  estimatedSize,
  onExport,
}: ExportZipModalProps) {
  const [scope, setScope] = useState<ExportZipScope>('dossier');
  const [keepTree, setKeepTree] = useState(true);
  const [includeUnread, setIncludeUnread] = useState(true);
  const [notifyByEmail, setNotifyByEmail] = useState(true);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Téléchargement groupé"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={() => onExport?.({ scope, keepTree, includeUnread, notifyByEmail })}
          >
            Préparer l'archive
          </Button>
        </>
      }
    >
      <Field label="Portée de l'export">
        <Select value={scope} onChange={e => setScope(e.target.value as ExportZipScope)}>
          <option value="dossier">
            Tout le dossier — {dataroomName}
            {estimatedSize ? ` (${estimatedSize})` : ''}
          </option>
          {currentFolderLabel && (
            <option value="sous-dossier">Sous-dossier ouvert — {currentFolderLabel}</option>
          )}
          {typeof filteredCount === 'number' && filteredCount > 0 && (
            <option value="selection">Pièces filtrées à l'écran ({filteredCount})</option>
          )}
        </Select>
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
        <Toggle checked={keepTree} onChange={setKeepTree} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Conserver l'arborescence</div>
          <div className="tiny dim">
            Les sous-dossiers deviennent des répertoires dans l'archive.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
        <Toggle checked={includeUnread} onChange={setIncludeUnread} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Inclure les pièces non consultées</div>
          <div className="tiny dim">
            Décocher pour n'emporter que ce que vous avez déjà ouvert.
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
        <Toggle checked={notifyByEmail} onChange={setNotifyByEmail} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Me prévenir par courriel</div>
          <div className="tiny dim">
            Un lien de téléchargement est envoyé dès que l'archive est prête.
          </div>
        </div>
      </div>

      <Card padded>
        <div className="tiny dim">
          Une archive volumineuse se prépare en arrière-plan : vous pouvez quitter cet écran.
          Le téléchargement figure au journal des accès, comme toute sortie de document.
        </div>
      </Card>
    </Modal>
  );
}
