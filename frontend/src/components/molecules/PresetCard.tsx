import type { ReactNode } from 'react';

export interface PresetCardProps {
  active: boolean;
  onSelect: () => void;
  /** Vignette : échantillon « Aa » typographique ou pastille de rayon. */
  preview: ReactNode;
  name: string;
  desc?: string;
}

// Vignette sélectionnable (.preset-card). `preview` est libre pour couvrir les
// deux usages du prototype (échantillon de police / carré à rayon variable).
// Le style inline ne fait que neutraliser les défauts du <button> (police et
// alignement) : .preset-card a été écrit pour une <div>, on ne le modifie pas.
export function PresetCard({ active, onSelect, preview, name, desc }: PresetCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={active ? 'preset-card active' : 'preset-card'}
      style={{ font: 'inherit', textAlign: 'left' }}
      onClick={onSelect}
    >
      {preview}
      <div className="pc-name">{name}</div>
      {desc && <div className="pc-desc">{desc}</div>}
    </button>
  );
}
