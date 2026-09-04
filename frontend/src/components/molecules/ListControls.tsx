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
          {/* type="search", pas juste autoComplete="off" : Chrome ignore délibérément
              autoComplete sur un input[type=text] qu'il classe "champ d'identifiant"
              (heuristique interne à son gestionnaire de mots de passe, pas contournable
              par cet attribut seul — constaté : un identifiant enregistré sur ce
              sous-domaine se retrouvait injecté ici, filtrant le tableau à zéro
              résultat). type="search" a un rôle sémantique distinct que Chrome exclut
              entièrement de cette logique d'autofill. */}
          <TextInput
            type="search"
            value={search}
            placeholder="Rechercher..."
            aria-label={`Rechercher parmi les ${unit}`}
            autoComplete="off"
            onChange={e => onSearchChange?.(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
