import type { ReactNode } from 'react';
import type { PillKind } from '../atoms/Pill';

export interface QACardProps {
  status: { kind: PillKind; label: string };
  object: string;
  meta: string;
  body: string;
  // Question sans réponse : passer `onReply`. Question déjà répondue : passer `answer`.
  onReply?: (text: string) => void;
  replyPlaceholder?: string;
  answer?: { author: string; text: string; time: string };
  /**
   * Pièce sur laquelle la question porte (§4.3 : « poser une question dans une
   * dataroom OU sur un document en particulier »). Affichée sous l'objet parce
   * que c'est le contexte de lecture, pas une métadonnée de plus.
   */
  document?: string;
  /**
   * Commandes de modération, rendues en tête de carte. Composées par
   * l'appelant (QAPanel) : la carte affiche, elle ne décide pas de qui a le
   * droit de valider quoi.
   */
  actions?: ReactNode;
  /**
   * Question désactivée : le fil reste lisible — c'est le point d'une
   * désactivation par opposition à une suppression — mais on n'y répond plus.
   */
  disabled?: boolean;
}

// Carte question/réponse — §6.10.
export function QACard({
  status,
  object,
  meta,
  body,
  onReply,
  replyPlaceholder,
  answer,
  document,
  actions,
  disabled,
}: QACardProps) {
  return (
    <div className="qa-card" style={disabled ? { opacity: 0.6 } : undefined}>
      <div className="qa-head">
        <span className={`pill ${status.kind}`}>{status.label}</span>
        <span className="qa-obj">{object}</span>
        <span className="qa-meta">{meta}</span>
        {actions && <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>{actions}</span>}
      </div>
      {document && (
        <div className="qa-meta" style={{ marginBottom: 6 }}>
          Sur la pièce&nbsp;: {document}
        </div>
      )}
      <div className="qa-body">{body}</div>
      {answer ? (
        <div className="qa-answer">
          <b>{answer.author}</b> — « {answer.text} » <span className="dim tiny">· {answer.time}</span>
        </div>
      ) : disabled ? null : (
        <QAReplyForm placeholder={replyPlaceholder} onSubmit={onReply} />
      )}
    </div>
  );
}

function QAReplyForm({
  placeholder,
  onSubmit,
}: {
  placeholder?: string;
  onSubmit?: (text: string) => void;
}) {
  return (
    <form
      className="qa-reply"
      onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget;
        const textarea = form.elements.namedItem('reply') as HTMLTextAreaElement;
        if (textarea.value.trim()) {
          onSubmit?.(textarea.value.trim());
          textarea.value = '';
        }
      }}
    >
      <textarea name="reply" placeholder={placeholder ?? 'Répondre…'} />
      <button className="btn btn-accent btn-sm" type="submit">
        <svg className="icon">
          <use href="#i-send" />
        </svg>
        Répondre
      </button>
    </form>
  );
}
