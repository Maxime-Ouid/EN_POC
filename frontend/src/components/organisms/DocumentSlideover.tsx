import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { SoField } from '../atoms/SoField';
import { FeedItem } from '../molecules/FeedItem';
import { Slideover } from './Slideover';
import type { PillKind } from '../atoms/Pill';

/** Ton sémantique d'une action, mappé sur les paires de tokens de statut. */
export type ActivityTone = 'info' | 'success' | 'warning' | 'critical' | 'accent';

const TONE_COLORS: Record<ActivityTone, { bg: string; color: string }> = {
  info: { bg: 'var(--info-bg)', color: 'var(--info)' },
  success: { bg: 'var(--success-bg)', color: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  critical: { bg: 'var(--critical-bg)', color: 'var(--critical)' },
  accent: { bg: 'var(--brass-100)', color: 'var(--brass-700)' },
};

export interface DocumentCustomField {
  label: string;
  value: string;
  /** Valeur technique (référence cadastrale, identifiant) — police à chasse fixe. */
  mono?: boolean;
}

export interface DocumentActivityEntry {
  id: string;
  icon: string;
  tone: ActivityTone;
  text: string;
  time: string;
}

export interface DocumentSlideoverData {
  name: string;
  /** Rubrique de l'arborescence où se trouve la pièce. */
  location: string;
  status: { kind: PillKind; label: string };
  addedBy: string;
  date: string;
  size: string;
  /** Métadonnées libres de l'office — la brique « champs personnalisés » de la V2. */
  customFields?: DocumentCustomField[];
  activity?: DocumentActivityEntry[];
}

export interface DocumentSlideoverProps {
  doc: DocumentSlideoverData | null;
  onClose: () => void;
  onDownload?: () => void;
}

// Volet latéral de fiche document — index_16.html #doc-slideover. Ouvert par un
// clic sur une ligne de l'explorateur ; se ferme aussi quand on change d'écran
// (c'est à l'appelant de remettre `doc` à null, comme le faisait showScreen()).
export function DocumentSlideover({ doc, onClose, onDownload }: DocumentSlideoverProps) {
  return (
    <Slideover open={!!doc} onClose={onClose} title={doc?.name ?? 'Document'}>
      {doc && (
        <>
          <SoField label="Emplacement" value={doc.location} />
          <SoField label="Statut" value={<Pill kind={doc.status.kind}>{doc.status.label}</Pill>} />
          <SoField label="Ajouté par" value={`${doc.addedBy} — ${doc.date}`} />
          <SoField label="Poids" value={<span className="mono">{doc.size}</span>} />

          {doc.customFields && doc.customFields.length > 0 && (
            <>
              <hr className="sep" />
              <div className="section-title" style={{ fontSize: 13, marginBottom: 10 }}>
                Champs personnalisés
              </div>
              {doc.customFields.map(f => (
                <SoField
                  key={f.label}
                  label={f.label}
                  value={f.mono ? <span className="mono">{f.value}</span> : f.value}
                />
              ))}
            </>
          )}

          {doc.activity && doc.activity.length > 0 && (
            <>
              <hr className="sep" />
              <div className="section-title" style={{ fontSize: 13, marginBottom: 10 }}>
                Dernières actions
              </div>
              {doc.activity.map(a => (
                <FeedItem
                  key={a.id}
                  icon={a.icon}
                  iconBg={TONE_COLORS[a.tone].bg}
                  iconColor={TONE_COLORS[a.tone].color}
                  text={a.text}
                  time={a.time}
                  compact
                />
              ))}
            </>
          )}

          <button
            className="btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            onClick={onDownload}
          >
            <Icon id="down" />
            Télécharger
          </button>
        </>
      )}
    </Slideover>
  );
}
