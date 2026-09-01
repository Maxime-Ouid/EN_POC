import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// Zone de texte du design system — §6.6. Elle porte son style elle-même ; la
// zone de réponse Q&R (`.qa-reply textarea`) garde sa règle dédiée, plus
// compacte et non redimensionnable.
export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={className ? `control ${className}` : 'control'} {...rest} />;
}
