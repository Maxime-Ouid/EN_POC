import type { PillKind } from './Badge';

export interface QACardProps {
  status: { kind: PillKind; label: string };
  object: string;
  meta: string;
  body: string;
  // Question sans réponse : passer `onReply`. Question déjà répondue : passer `answer`.
  onReply?: (text: string) => void;
  replyPlaceholder?: string;
  answer?: { author: string; text: string; time: string };
}

// Carte question/réponse — §6.10.
export function QACard({ status, object, meta, body, onReply, replyPlaceholder, answer }: QACardProps) {
  return (
    <div className="qa-card">
      <div className="qa-head">
        <span className={`pill ${status.kind}`}>{status.label}</span>
        <span className="qa-obj">{object}</span>
        <span className="qa-meta">{meta}</span>
      </div>
      <div className="qa-body">{body}</div>
      {answer ? (
        <div className="qa-answer">
          <b>{answer.author}</b> — « {answer.text} » <span className="dim tiny">· {answer.time}</span>
        </div>
      ) : (
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
