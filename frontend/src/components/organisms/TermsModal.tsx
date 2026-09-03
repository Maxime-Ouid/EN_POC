import { useRef, useState } from 'react';
import { Button } from '../atoms/Button';
import { Modal } from './Modal';

/* ===========================================================================
   Conditions générales d'utilisation — §11.1 (« acceptation / consultation
   des CGU », fonctionnalité unitaire à confirmer).

   Deux usages, un seul composant, distingués par `mode` :
   - « acceptation » : premier accès, l'utilisateur ne peut pas passer outre.
     Le bouton ne s'active qu'après avoir réellement fait défiler le texte
     jusqu'au bout — une case cochée sans lecture possible n'a pas la même
     valeur probante, et l'écart de coût est nul ;
   - « consultation » : relecture depuis l'aide, sans rien à valider.

   La date de version est affichée en tête : c'est elle qui décide s'il faut
   redemander une acceptation, pas l'existence d'un enregistrement.
   =========================================================================== */

export interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'acceptation' | 'consultation';
  version: string;
  updatedAt: string;
  /** Corps des CGU, une entrée par article. */
  articles: Array<{ title: string; body: string }>;
  onAccept?: () => void;
}

export function TermsModal({
  open,
  onClose,
  mode,
  version,
  updatedAt,
  articles,
  onAccept,
}: TermsModalProps) {
  const [readToEnd, setReadToEnd] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = bodyRef.current;
    if (!el) return;
    // Marge de 8 px : sur certains zooms le défilement s'arrête un pixel avant
    // le bas et le bouton ne s'activait jamais.
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true);
  }

  const acceptance = mode === 'acceptation';

  return (
    <Modal
      open={open}
      /* En acceptation, la croix ne referme pas : le seul moyen d'avancer est
         d'accepter, le seul moyen de renoncer est de se déconnecter. */
      onClose={acceptance ? () => {} : onClose}
      title={`Conditions générales d'utilisation — ${version}`}
      footer={
        acceptance ? (
          <>
            <Button onClick={onClose}>Se déconnecter</Button>
            <Button variant="primary" disabled={!readToEnd} onClick={onAccept}>
              {readToEnd ? "J'accepte les conditions" : 'Faites défiler pour accepter'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Fermer</Button>
        )
      }
    >
      <div className="tiny dim" style={{ marginBottom: 12 }}>
        Version en vigueur depuis le {updatedAt}.
        {acceptance && " Votre acceptation est horodatée et conservée avec votre compte."}
      </div>
      <div
        ref={bodyRef}
        onScroll={onScroll}
        style={{
          maxHeight: 340,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '14px 16px',
        }}
      >
        {articles.map(a => (
          <div key={a.title} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
            <div className="tiny dim" style={{ lineHeight: 1.6 }}>
              {a.body}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
