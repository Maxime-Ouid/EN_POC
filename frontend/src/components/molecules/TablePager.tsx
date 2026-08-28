import { Button } from '../atoms/Button';

export interface TablePagerProps {
  /** Phrase de gauche, telle qu'affichée en V1 : « dossiers 1 à 25 sur 245 ». */
  info: string;
  pages: number;
  current: number;
  onChange?: (page: number) => void;
  /** Lien « Exporter les données » affiché entre l'info et la pagination. */
  onExport?: () => void;
}

/** Fenêtre de numéros affichée autour de la page courante (5 max, comme en V1). */
function windowOf(pages: number, current: number): number[] {
  const start = Math.max(1, Math.min(current - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const out: number[] = [];
  for (let p = start; p <= end; p += 1) out.push(p);
  return out;
}

// Pied de tableau des listes V1 : compteur, export, puis « début / précédent /
// numéros / suivant / fin ».
export function TablePager({ info, pages, current, onChange, onExport }: TablePagerProps) {
  const numbers = windowOf(pages, current);
  const go = (p: number) => onChange?.(Math.min(Math.max(p, 1), pages));

  return (
    <div className="v1-pager">
      <span className="v1-pager-info">{info}</span>
      <div className="v1-pager-pages">
        {onExport && (
          <Button size="sm" variant="ghost" onClick={onExport}>
            Exporter les données
          </Button>
        )}
        <Button size="sm" onClick={() => go(1)} disabled={current === 1}>
          début
        </Button>
        <Button size="sm" onClick={() => go(current - 1)} disabled={current === 1}>
          précédent
        </Button>
        {numbers.map(p => (
          <Button
            key={p}
            size="sm"
            variant={p === current ? 'primary' : 'default'}
            onClick={() => go(p)}
          >
            {p}
          </Button>
        ))}
        {pages > numbers[numbers.length - 1] && <span className="tiny dim">…</span>}
        <Button size="sm" onClick={() => go(current + 1)} disabled={current === pages}>
          suivant
        </Button>
        <Button size="sm" onClick={() => go(pages)} disabled={current === pages}>
          fin
        </Button>
      </div>
    </div>
  );
}
