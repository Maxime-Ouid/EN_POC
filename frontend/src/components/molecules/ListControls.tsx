import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';

export interface ListControlsProps {
  /** Nom de l'entité au pluriel : « dossiers », « utilisateurs », « membres »… */
  unit: string;
  perPage: number;
  onPerPageChange?: (value: number) => void;
  search: string;
  onSearchChange?: (value: string) => void;
  perPageOptions?: number[];
  /**
   * `false` retire le champ de recherche et ne laisse que « afficher N » —
   * pour les écrans dont le filtre est remonté dans la topbar (console
   * hyperadmin). Deux champs de recherche visibles à la fois sur le même écran
   * poseraient la question de savoir lequel filtre quoi.
   */
  showSearch?: boolean;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100];

// Ligne de contrôles des listes V1 : « afficher [25] dossiers » à gauche,
// « Rechercher… » à droite. Reproduit le comportement de l'interface actuelle,
// où les deux contrôles encadrent systématiquement le tableau.
export function ListControls({
  unit,
  perPage,
  onPerPageChange,
  search,
  onSearchChange,
  perPageOptions = DEFAULT_OPTIONS,
  showSearch = true,
}: ListControlsProps) {
  return (
    <div className="v1-list-controls">
      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor="list-per-page" style={{ margin: 0 }}>
          afficher
        </label>
        <Select
          id="list-per-page"
          value={perPage}
          onChange={e => onPerPageChange?.(Number(e.target.value))}
          style={{ width: 80 }}
        >
          {perPageOptions.map(n => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <span className="tiny dim">{unit}</span>
      </div>
      {showSearch && (
        <div className="field" style={{ minWidth: 240 }}>
          <TextInput
            value={search}
            placeholder="Rechercher..."
            aria-label={`Rechercher parmi les ${unit}`}
            onChange={e => onSearchChange?.(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
