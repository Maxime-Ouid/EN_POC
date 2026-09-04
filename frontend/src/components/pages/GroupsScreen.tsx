import { useCallback } from 'react';
import type { GroupCategory } from '../../api/endpoints';
import { pagerInfo, useListPaging } from '../../hooks/useListPaging';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { ListControls } from '../molecules/ListControls';
import { RowName } from '../molecules/RowName';
import { TablePager } from '../molecules/TablePager';
import { Toolbar } from '../molecules/Toolbar';
import { TableCard } from '../organisms/TableCard';

export interface GroupRowData {
  id: number;
  name: string;
  category: GroupCategory;
  memberCount: number;
}

export interface GroupsScreenProps {
  rows: GroupRowData[];
  loading?: boolean;
  error?: string | null;
  /** Vide = l'appelant n'est pas gestionnaire : liste en lecture seule, sans barre d'outils ni actions. */
  canManage: boolean;
  onCreate?: () => void;
  onEdit?: (group: GroupRowData) => void;
  onDelete?: (group: GroupRowData) => void;
}

const CATEGORY_LABELS: Record<GroupCategory, string> = {
  admin: 'Admin',
  membre: 'Membre',
  client: 'Client',
};

const COLUMNS = ['Groupe', 'Catégorie', 'Membres', ''];

/**
 * Liste des groupes de droits de l'office — GET /api/groups/. Même patron
 * que TemplatesListScreen (barre d'outils, « afficher N », tableau,
 * pagination) : c'est le même genre de catalogue, réservé admin/superadmin
 * pour les actions (la lecture, elle, est ouverte à tout membre — voir
 * views.groups_view).
 */
export function GroupsScreen({ rows, loading, error, canManage, onCreate, onEdit, onDelete }: GroupsScreenProps) {
  const match = useCallback(
    (row: GroupRowData, q: string) => `${row.name} ${CATEGORY_LABELS[row.category]}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  if (error) {
    return (
      <Card padded>
        <div style={{ fontWeight: 600 }}>Liste des groupes indisponible</div>
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
            Nouveau groupe
          </Button>
        </Toolbar>
      )}

      <ListControls
        unit="groupes"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.id}>
            <RowName icon="users" iconBg="var(--brass-100)" iconColor="var(--brass-700)">
              {row.name}
            </RowName>
            <td className="dim">{CATEGORY_LABELS[row.category]}</td>
            <td className="dim">{row.memberCount}</td>
            <td>
              {canManage && (
                <div style={{ display: 'flex', gap: 6 }}>
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
              {loading ? 'Chargement…' : 'Aucun groupe à afficher.'}
            </td>
          </tr>
        )}
      </TableCard>

      <TablePager
        info={pagerInfo('groupes', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
      />
    </>
  );
}
