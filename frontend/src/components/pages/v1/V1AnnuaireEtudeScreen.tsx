import { useCallback } from 'react';
import { pagerInfo, useListPaging } from '../../../hooks/useListPaging';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { ListControls } from '../../molecules/ListControls';
import { RowName } from '../../molecules/RowName';
import { TablePager } from '../../molecules/TablePager';
import { Toolbar } from '../../molecules/Toolbar';
import { TableCard } from '../../organisms/TableCard';

export interface V1MembreRow {
  id: string;
  nom: string;
  fonction: string;
  email: string;
}

export interface V1AnnuaireEtudeScreenProps {
  rows: V1MembreRow[];
  total: number;
  onNouveauMembre?: () => void;
  onImportMembres?: () => void;
  onEdit?: (id: string) => void;
}

const COLUMNS = ['Nom / Prénom', 'Fonction', 'Email', ''];

// Annuaires > Annuaire de l'étude (captures 113833 et 113907).
export function V1AnnuaireEtudeScreen({
  rows,
  total,
  onNouveauMembre,
  onImportMembres,
  onEdit,
}: V1AnnuaireEtudeScreenProps) {
  const match = useCallback(
    (row: V1MembreRow, q: string) =>
      `${row.nom} ${row.fonction} ${row.email}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  return (
    <Screen>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={onNouveauMembre}>
          <Icon id="plus" />
          Nouveau membre
        </Button>
        <Button size="sm" onClick={onImportMembres}>
          <Icon id="up" />
          Import membres
        </Button>
      </Toolbar>

      <ListControls
        unit="utilisateurs"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.id}>
            <RowName icon="users" iconBg="var(--info-bg)" iconColor="var(--info)">
              {row.nom}
            </RowName>
            <td>{row.fonction}</td>
            <td className="dim">{row.email}</td>
            <td>
              <Button size="sm" variant="ghost" onClick={() => onEdit?.(row.id)}>
                Modifier
              </Button>
            </td>
          </tr>
        ))}
      </TableCard>

      <TablePager
        info={pagerInfo('utilisateurs', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
        onExport={() => {}}
      />

      <div className="tiny dim" style={{ marginTop: 10 }}>
        Volumétrie de référence en production : {total} utilisateurs.
      </div>
    </Screen>
  );
}
