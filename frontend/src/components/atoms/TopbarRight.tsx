import type { ReactNode } from 'react';

export interface TopbarRightProps {
  children?: ReactNode;
}

export function TopbarRight({ children }: TopbarRightProps) {
  return <div className="topbar-right">{children}</div>;
}
