import type { ButtonHTMLAttributes } from 'react';

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
