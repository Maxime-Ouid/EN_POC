import { useCallback } from 'react';
import { pagerInfo, useListPaging } from '../../../hooks/useListPaging';
import { Screen } from '../../atoms/Screen';
import { ListControls } from '../../molecules/ListControls';
import { RowName } from '../../molecules/RowName';
import { TablePager } from '../../molecules/TablePager';
import { TableCard } from '../../organisms/TableCard';

export interface V1AdminDelegueRow {
  id: string;
  espaceClient: string;
  dossier: string;
  titulaire: string;
  administrateur: string;
}

export interface V1AdminsParDossierScreenProps {
  rows: V1AdminDelegueRow[];
  total: number;
}

const COLUMNS = ['Espace client', 'Dossier', 'Titulaire', 'Administrateur'];

// Annuaires > Administrateurs par dossier (capture 113854). L'écran V1 n'a
// aucune barre d'outils : la liste est en lecture seule, la délégation se règle
// depuis le dossier lui-même.
export function V1AdminsParDossierScreen({ rows, total }: V1AdminsParDossierScreenProps) {
  const match = useCallback(
    (row: V1AdminDelegueRow, q: string) =>
      `${row.espaceClient} ${row.dossier} ${row.titulaire} ${row.administrateur}`
        .toLowerCase()
        .includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  return (
    <Screen>
      <ListControls
        unit="administrateurs"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.id}>
            <td>{row.espaceClient}</td>
            <RowName icon="folder" iconBg="var(--info-bg)" iconColor="var(--info)">
              {row.dossier}
            </RowName>
            <td>{row.titulaire}</td>
            <td>{row.administrateur}</td>
          </tr>
        ))}
      </TableCard>

      <TablePager
        info={pagerInfo('administrateurs', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
        onExport={() => {}}
      />

      <div className="tiny dim" style={{ marginTop: 10 }}>
        Volumétrie de référence en production : {total} délégations.
      </div>
    </Screen>
  );
}
