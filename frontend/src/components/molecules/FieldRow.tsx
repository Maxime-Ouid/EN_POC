import type { ReactNode } from 'react';

export interface FieldRowProps {
  children?: ReactNode;
}

// Deux (ou plus) `<Field>` côte à côte, répartis équitablement.
export function FieldRow({ children }: FieldRowProps) {
  return <div className="field-row">{children}</div>;
}
