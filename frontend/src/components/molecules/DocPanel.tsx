import type { ReactNode } from 'react';

export interface DocPanelProps {
  title: string;
  actions?: ReactNode;
  children?: ReactNode; // le contenu (typiquement un .table-wrap > <table>)
}

// Panneau de droite de l'explorer — §6.8.
export function DocPanel({ title, actions, children }: DocPanelProps) {
  return (
    <div className="doc-panel">
      <div className="doc-panel-head">
        <h3>{title}</h3>
        {actions && <div className="btn-row">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
