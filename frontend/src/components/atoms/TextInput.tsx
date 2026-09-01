import type { ComponentPropsWithRef } from 'react';

// `ComponentPropsWithRef` et pas `InputHTMLAttributes` : depuis React 19, `ref`
// est une prop ordinaire d'un composant fonction, et le sélecteur de tags a
// besoin de donner le focus à son champ à l'ouverture du menu. Sans ce type,
// TypeScript refuserait la prop alors que l'exécution la transmettrait.
export interface TextInputProps extends ComponentPropsWithRef<'input'> {
  /** Version compacte, pour une cellule de tableau ou une barre de filtres. */
  small?: boolean;
}

// Input texte du design system — §6.6. Le style est porté par le contrôle,
// il ne dépend plus d'un <Field> parent.
export function TextInput({ small, className, ...rest }: TextInputProps) {
  const cls = ['control', small && 'control-sm', className].filter(Boolean).join(' ');
  return <input type="text" className={cls} {...rest} />;
}
