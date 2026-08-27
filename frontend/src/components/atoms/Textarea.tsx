import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// Attention : `textarea` n'a de style dédié que dans le contexte `.qa-reply`
// (voir QACard.tsx) — hors de ce contexte, prévoir un style au cas par cas.
export function Textarea(props: TextareaProps) {
  return <textarea {...props} />;
}
