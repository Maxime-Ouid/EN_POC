import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'default' | 'primary' | 'accent' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  children?: ReactNode;
}

// Bouton capsule — voir DESIGN_SYSTEM.md §6.1 (.btn).
export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'default'
      ? ''
      : variant === 'primary'
        ? ' btn-primary'
        : variant === 'accent'
          ? ' btn-accent'
          : ' btn-ghost';
  const sizeClass = size === 'sm' ? ' btn-sm' : '';
  return (
    <button
      className={`btn${variantClass}${sizeClass}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface ButtonRowProps {
  children?: ReactNode;
  style?: React.CSSProperties;
}

// Regroupe des boutons/filtres sur une ligne avec un espacement cohérent (.btn-row).
export function ButtonRow({ children, style }: ButtonRowProps) {
  return <div className="btn-row" style={style}>{children}</div>;
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  hasDot?: boolean;
}

// Bouton icône seul, rond (cloche, notifications…) — voir .icon-btn dans la topbar.
export function IconButton({ icon, hasDot, className, ...rest }: IconButtonProps) {
  return (
    <button className={`icon-btn${className ? ` ${className}` : ''}`} type="button" {...rest}>
      <svg className="icon">
        <use href={`#i-${icon}`} />
      </svg>
      {hasDot && <span className="dot-flag" />}
    </button>
  );
}
