export interface BreadcrumbProps {
  items: Array<{ label: string; onClick?: () => void }>;
  current: string;
}

// Fil d'ariane — utilisé à la fois dans la topbar (office > écran) et en tête
// d'écran détail dataroom (dossiers > portefeuille > dossier).
export function Breadcrumb({ items, current }: BreadcrumbProps) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {item.onClick ? (
            <a href="#" className="dim" onClick={e => { e.preventDefault(); item.onClick?.(); }}>
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
          <svg className="icon">
            <use href="#i-chevr" />
          </svg>
        </span>
      ))}
      <b>{current}</b>
    </div>
  );
}
