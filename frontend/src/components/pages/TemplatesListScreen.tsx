import { useCallback } from 'react';
import { pagerInfo, useListPaging } from '../../hooks/useListPaging';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { ListControls } from '../molecules/ListControls';
import { RowName } from '../molecules/RowName';
import { TablePager } from '../molecules/TablePager';
import { Toolbar } from '../molecules/Toolbar';
import { TableCard } from '../organisms/TableCard';

export interface TemplateRowData {
  id: number;
  name: string;
  description: string;
}

export interface TemplatesListScreenProps {
  rows: TemplateRowData[];
  loading?: boolean;
  error?: string | null;
  /** Vide = l'appelant n'est pas gestionnaire : liste en lecture seule, sans barre d'outils ni actions. */
  canManage: boolean;
  onOpen: (id: number) => void;
  onCreate?: () => void;
  onEdit?: (template: TemplateRowData) => void;
  onDelete?: (template: TemplateRowData) => void;
}

const COLUMNS = ['Modèle', 'Description', ''];

/**
 * Liste des modèles de dataroom de l'office — GET /api/templates/. Même
 * patron que OfficeUsersScreen (barre d'outils, « afficher N », tableau,
 * pagination) : c'est le même genre d'annuaire, réservé admin/superadmin.
 * Ouvrir un modèle (clic sur la ligne ou bouton « Dossiers ») mène à
 * TemplateDetailScreen, qui gère son arborescence de TemplateFolder.
 */
export function TemplatesListScreen({
  rows,
  loading,
  error,
  canManage,
  onOpen,
  onCreate,
  onEdit,
  onDelete,
}: TemplatesListScreenProps) {
  const match = useCallback(
    (row: TemplateRowData, q: string) => `${row.name} ${row.description}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  if (error) {
    return (
      <Card padded>
        <div style={{ fontWeight: 600 }}>Liste des modèles indisponible</div>
        <div className="tiny dim" style={{ marginTop: 6 }}>
          {error}
        </div>
      </Card>
    );
  }

  return (
    <>
      {canManage && (
        <Toolbar>
          <Button size="sm" variant="primary" onClick={onCreate}>
            <Icon id="plus" />
            Nouveau modèle
          </Button>
        </Toolbar>
      )}

      <ListControls
        unit="modèles"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.id} className="clickable" onClick={() => onOpen(row.id)}>
            <RowName icon="clip" iconBg="var(--brass-100)" iconColor="var(--brass-700)">
              {row.name}
            </RowName>
            <td className="dim">{row.description || '—'}</td>
            <td onClick={e => e.stopPropagation()}>
              {canManage && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" onClick={() => onOpen(row.id)}>
                    Dossiers
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onEdit?.(row)}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete?.(row)}>
                    Supprimer
                  </Button>
                </div>
              )}
            </td>
          </tr>
        ))}
        {!list.rows.length && (
          <tr>
            <td colSpan={COLUMNS.length} className="dim">
              {loading ? 'Chargement…' : 'Aucun modèle à afficher.'}
            </td>
          </tr>
        )}
      </TableCard>

      <TablePager
        info={pagerInfo('modèles', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
      />
    </>
  );
}
