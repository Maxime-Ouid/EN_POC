import type { ReactNode } from 'react';

export interface SoFieldProps {
  label: string;
  value: ReactNode;
}

// Motif clé/valeur vertical utilisé dans le corps du slideover.
export function SoField({ label, value }: SoFieldProps) {
  return (
    <div className="so-field">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
