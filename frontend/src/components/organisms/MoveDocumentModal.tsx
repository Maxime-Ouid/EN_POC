import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Modal } from './Modal';
import type { TreeNodeData } from './Explorer';

/* ===========================================================================
   Déplacer un document — §4.2.

   Le choix de la destination passe par l'arborescence réelle du dossier plutôt
   que par une liste déroulante de noms : dans une dataroom notariale, deux
   sous-dossiers portent couramment le même intitulé à deux endroits différents
   (« 1. Actes », sous Société A comme sous Société B), et une liste à plat les
   rend indiscernables.

   Le dossier d'origine est désactivé dans la liste : proposer « déplacer là où
   la pièce est déjà » n'a pas de sens et invite à un aller-retour inutile.
   =========================================================================== */

export interface MoveDocumentModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  tree: TreeNodeData[];
  /** Dossier où la pièce se trouve actuellement. */
  currentFolderId?: string;
  onMove?: (targetFolderId: string) => void;
}

/** Aplatit l'arbre en gardant la profondeur, pour une liste indentée. */
function flatten(nodes: TreeNodeData[], depth = 0): Array<{ node: TreeNodeData; depth: number }> {
  return nodes.flatMap(node => [
    { node, depth },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}

export function MoveDocumentModal({
  open,
  onClose,
  documentName,
  tree,
  currentFolderId,
  onMove,
}: MoveDocumentModalProps) {
  const [target, setTarget] = useState<string | undefined>(undefined);
  const rows = flatten(tree);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Déplacer le document"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!target}
            onClick={() => target && onMove?.(target)}
          >
            Déplacer ici
          </Button>
        </>
      }
    >
      <div className="tiny dim" style={{ marginBottom: 14 }}>
        <b>{documentName}</b> — choisissez le dossier de destination.
      </div>

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}
      >
        {rows.map(({ node, depth }) => {
          const isCurrent = node.id === currentFolderId;
          const isTarget = node.id === target;
          return (
            <button
              key={node.id}
              type="button"
              disabled={isCurrent}
              onClick={() => setTarget(node.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: isTarget ? 'var(--info-bg)' : 'transparent',
                color: isCurrent ? 'var(--ink-400)' : 'var(--ink-800)',
                padding: `8px 12px 8px ${12 + depth * 18}px`,
                cursor: isCurrent ? 'not-allowed' : 'pointer',
                font: 'inherit',
                fontSize: 13,
              }}
            >
              <Icon id="folder" />
              {node.label}
              {isCurrent && <span className="tiny dim">— emplacement actuel</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
