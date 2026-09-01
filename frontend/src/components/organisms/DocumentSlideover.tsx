import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { SoField } from '../atoms/SoField';
import { Tag } from '../atoms/Tag';
import { FeedItem } from '../molecules/FeedItem';
import { Slideover } from './Slideover';
import type { PillKind } from '../atoms/Pill';
import type { TagRef } from './TagPicker';

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
  /**
   * Tags posés sur la pièce, en LECTURE seule ici : l'édition se fait dans la
   * colonne « Tags » du tableau, un même réglage offert à deux endroits finit
   * par diverger. Le volet les rappelle parce qu'on l'ouvre justement pour
   * savoir ce qu'est cette pièce.
   */
  tags?: TagRef[];
  /** Métadonnées libres de l'office — la brique « champs personnalisés » de la V2. */
  customFields?: DocumentCustomField[];
  activity?: DocumentActivityEntry[];
}

export interface DocumentSlideoverProps {
  doc: DocumentSlideoverData | null;
  onClose: () => void;
  onDownload?: () => void;
  /**
   * Aperçu du contenu, monté par l'appelant (il seul connaît la dataroom et
   * l'endpoint). Sa présence élargit le volet et le coupe en deux colonnes ;
   * sans lui, la fiche garde exactement la forme qu'elle avait.
   */
  preview?: React.ReactNode;
}

// Volet latéral de fiche document — index_16.html #doc-slideover. Ouvert par un
// clic sur une ligne de l'explorateur ; se ferme aussi quand on change d'écran
// (c'est à l'appelant de remettre `doc` à null, comme le faisait showScreen()).
export function DocumentSlideover({ doc, onClose, onDownload, preview }: DocumentSlideoverProps) {
  return (
    <Slideover open={!!doc} onClose={onClose} title={doc?.name ?? 'Document'} wide={!!preview}>
      {doc && preview && <div className="slideover-preview">{preview}</div>}
      {doc && (
        <div className={preview ? 'slideover-meta' : undefined}>
          <SoField label="Emplacement" value={doc.location} />
          <SoField label="Statut" value={<Pill kind={doc.status.kind}>{doc.status.label}</Pill>} />
          <SoField label="Ajouté par" value={`${doc.addedBy} — ${doc.date}`} />
          <SoField label="Poids" value={<span className="mono">{doc.size}</span>} />
          {doc.tags && doc.tags.length > 0 && (
            <SoField
              label="Tags"
              value={
                <span className="tag-list">
                  {doc.tags.map(tag => (
                    <Tag key={tag.id} color={tag.color} icon="tag">
                      {tag.name}
                    </Tag>
                  ))}
                </span>
              }
            />
          )}

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
        </div>
      )}
    </Slideover>
  );
}
