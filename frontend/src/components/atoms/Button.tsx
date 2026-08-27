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
