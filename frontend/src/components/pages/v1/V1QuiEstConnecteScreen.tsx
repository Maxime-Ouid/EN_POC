import { useCallback } from 'react';
import { pagerInfo, useListPaging } from '../../../hooks/useListPaging';
import { Card } from '../../atoms/Card';
import { Screen } from '../../atoms/Screen';
import { ListControls } from '../../molecules/ListControls';
import { StatCard } from '../../molecules/StatCard';
import { TablePager } from '../../molecules/TablePager';
import { TableCard } from '../../organisms/TableCard';

export interface V1ConnecteRow {
  id: string;
  nom: string;
  prenom: string;
  societe: string;
  fonction: string;
}

export interface V1QuiEstConnecteScreenProps {
  rows: V1ConnecteRow[];
}

const COLUMNS = ['Nom', 'Prénom', 'Société', 'Fonction'];

// Activités > Qui est connecté ? (capture 113518) : un compteur de sessions
// ouvertes, puis la liste des utilisateurs présents.
export function V1QuiEstConnecteScreen({ rows }: V1QuiEstConnecteScreenProps) {
  const match = useCallback(
    (row: V1ConnecteRow, q: string) =>
      `${row.nom} ${row.prenom} ${row.societe} ${row.fonction}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  return (
    <Screen>
      <Card padded style={{ marginTop: 16, marginBottom: 16, maxWidth: 280 }}>
        <StatCard
          label="Sessions ouvertes"
          value={rows.length}
          icon="users"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
        />
      </Card>

      <ListControls
        unit="enregistrements"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.id}>
            <td>{row.nom}</td>
            <td>{row.prenom}</td>
            <td>{row.societe}</td>
            <td>{row.fonction}</td>
          </tr>
        ))}
      </TableCard>

      <TablePager
        info={pagerInfo('enregistrements', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
        onExport={() => {}}
      />
    </Screen>
  );
}
