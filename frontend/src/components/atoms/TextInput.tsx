import type { InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Version compacte, pour une cellule de tableau ou une barre de filtres. */
  small?: boolean;
}

// Input texte du design system — §6.6. Le style est porté par le contrôle,
// il ne dépend plus d'un <Field> parent.
export function TextInput({ small, className, ...rest }: TextInputProps) {
  const cls = ['control', small && 'control-sm', className].filter(Boolean).join(' ');
  return <input type="text" className={cls} {...rest} />;
}
