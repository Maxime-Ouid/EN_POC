export interface MetaBannerProps {
  items: Array<{ label: string; value: React.ReactNode }>;
  style?: React.CSSProperties;
}

// Bandeau de métadonnées clé/valeur en tête de fiche dataroom — §6.13.
export function MetaBanner({ items, style }: MetaBannerProps) {
  return (
    <div className="meta-banner" style={style}>
      {items.map((item, i) => (
        <div className="meta-item" key={i}>
          <div className="k">{item.label}</div>
          <div className="v">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
