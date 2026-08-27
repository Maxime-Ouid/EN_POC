import type { ReactNode } from 'react';

export interface FieldProps {
  label: string;
  children?: ReactNode;
  style?: React.CSSProperties;
}

// Label + contrôle, empilés — §6.6. Enrober un <input>/<select> pour hériter du
// style de focus/bordure défini sur `.field input, .field select`.
export function Field({ label, children, style }: FieldProps) {
  return (
    <div className="field" style={style}>
      <label>{label}</label>
      {children}
    </div>
  );
}
