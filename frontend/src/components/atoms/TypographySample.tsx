export interface TypographySampleProps {
  fontFamily: string;
}

// Échantillon « Aa » rendu dans la police du preset.
export function TypographySample({ fontFamily }: TypographySampleProps) {
  return (
    <div className="pc-sample" style={{ fontFamily }}>
      Aa
    </div>
  );
}
