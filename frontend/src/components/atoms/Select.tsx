import type { SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Version compacte, pour une cellule de tableau ou une barre de filtres. */
  small?: boolean;
  /** Largeur au contenu au lieu de 100 % du parent. */
  auto?: boolean;
}

// Select du design system — §6.6. Le style est porté par le contrôle lui-même,
// il ne dépend plus d'un <Field> parent.
export function Select({ small, auto, className, style, ...rest }: SelectProps) {
  const cls = ['control', small && 'control-sm', className].filter(Boolean).join(' ');
  // `style` va sur l'enveloppe, pas sur le <select> : les appelants s'en servent
  // pour fixer une largeur, et le chevron doit se caler sur cette largeur-là.
  return (
    <span className={auto ? 'select-wrap control-auto' : 'select-wrap'} style={style}>
      <select className={cls} {...rest} />
      <Icon id="chevd" />
    </span>
  );
}
