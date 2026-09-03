import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { RowIcon } from '../atoms/RowIcon';
import { Slideover } from './Slideover';

/* ===========================================================================
   Aide et documentation — §11.1 (« téléchargement du manuel / aide en ligne »).

   La V1 distribue trois documents depuis une carte « Aide » de son accueil :
   manuel utilisateur, support d'utilisation, formulaire de création d'un accès
   administrateur. On reprend cette distribution, en volet plutôt qu'en carte
   d'accueil : l'aide se cherche au moment où l'on bloque, pas au moment où
   l'on arrive.

   Le lien vers les CGU est ici plutôt que dans « Mon compte » parce que c'est
   là qu'on vient chercher un document de référence, pas dans ses préférences.
   =========================================================================== */

export interface HelpResource {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Poids du document, quand c'en est un (« PDF · 2,4 Mo »). */
  meta?: string;
  onOpen?: () => void;
}

export interface HelpSlideoverProps {
  open: boolean;
  onClose: () => void;
  officeName: string;
  resources: HelpResource[];
  supportEmail: string;
  onOpenTerms?: () => void;
}

export function HelpSlideover({
  open,
  onClose,
  officeName,
  resources,
  supportEmail,
  onOpenTerms,
}: HelpSlideoverProps) {
  return (
    <Slideover open={open} onClose={onClose} title="Aide et documentation">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {resources.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={r.onOpen}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '11px 12px',
              background: 'transparent',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <RowIcon icon={r.icon} bg="var(--info-bg)" color="var(--info)" size={32} />
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{r.title}</span>
              <span className="tiny dim" style={{ display: 'block', marginTop: 2 }}>
                {r.description}
              </span>
              {r.meta && (
                <span className="tiny dim" style={{ display: 'block', marginTop: 4 }}>
                  {r.meta}
                </span>
              )}
            </span>
            <Icon id="down" />
          </button>
        ))}
      </div>

      <Card padded style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Besoin d'aide ?</div>
        <div className="tiny dim" style={{ marginBottom: 10 }}>
          Le support de {officeName} répond aux questions d'usage. Les incidents techniques sont
          relayés à Notantis.
        </div>
        <a href={`mailto:${supportEmail}`} className="tiny">
          {supportEmail}
        </a>
      </Card>

      <Button size="sm" onClick={onOpenTerms}>
        <Icon id="scroll" />
        Conditions générales d'utilisation
      </Button>
    </Slideover>
  );
}
