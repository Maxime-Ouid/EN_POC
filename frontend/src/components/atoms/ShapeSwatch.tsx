export interface ShapeSwatchProps {
  radius: string;
}

// Carré d'aperçu du rayon de bordure.
export function ShapeSwatch({ radius }: ShapeSwatchProps) {
  return <div className="shape-swatch" style={{ borderRadius: radius }} />;
}
