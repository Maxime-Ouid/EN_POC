import type { ReactNode } from 'react';

export interface TableCardProps {
  headers: string[];
  children?: ReactNode;
}

// Enveloppe une <table> dans .card > .table-wrap — §6.5. Passer les <tr> déjà
// composés en children (typiquement via <RowName>/<Pill>/<Tag> pour les cellules).
export function TableCard({ headers, children }: TableCardProps) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
