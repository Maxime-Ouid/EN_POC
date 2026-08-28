import type { ReactNode } from 'react';

export interface TagProps {
  icon?: string;
  plain?: boolean;
  children?: ReactNode;
}

// Classification libre (fond accent violet par défaut, ou .plain neutre).
export function Tag({ icon, plain, children }: TagProps) {
  return (
    <span className={plain ? 'tag plain' : 'tag'}>
      {icon && (
        <svg>
          <use href={`#i-${icon}`} />
        </svg>
      )}
      {children}
    </span>
  );
}
