import { useCallback } from 'react';
import { pagerInfo, useListPaging } from '../../../hooks/useListPaging';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Pill } from '../../atoms/Pill';
import { Screen } from '../../atoms/Screen';
import { ListControls } from '../../molecules/ListControls';
import { RowName } from '../../molecules/RowName';
import { TablePager } from '../../molecules/TablePager';
import { Toolbar } from '../../molecules/Toolbar';
import { TableCard } from '../../organisms/TableCard';

export interface V1DossierRow {
  id: string;
  name: string;
  numero: string;
  espaceClient: string;
  type: string;
  /** Dossier répliqué depuis/vers une autre étude (icône ⇄ en V1). */
  synchronise?: boolean;
  /** Dossier figé (« clôturé » côté fiche dossier). */
  verrouille?: boolean;
}

export interface V1DossiersScreenProps {
  rows: V1DossierRow[];
  /** Nombre total de dossiers de l'office, avant pagination. */
  total: number;
  onCreate?: () => void;
  onOpen?: (id: string) => void;
  /** Message d'état affiché à la place du tableau (chargement, erreur…). */
  notice?: string | null;
}

const COLUMNS = ['Dossier', 'N° dossier', 'Espace client', 'Type', 'État'];

// Dossiers > Dossiers (captures 113410 et 114013). La V1 affiche en plus quatre
// colonnes d'icônes sans libellé dont l'infobulle n'apparaît sur aucune capture :
// elles sont regroupées ici dans une colonne « État » explicite plutôt que
// reproduites à l'aveugle.
export function V1DossiersScreen({ rows, total, onCreate, onOpen, notice }: V1DossiersScreenProps) {
  const match = useCallback(
    (row: V1DossierRow, q: string) =>
      `${row.name} ${row.numero} ${row.espaceClient} ${row.type}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  return (
    <Screen>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={onCreate}>
          <Icon id="plus" />
          Nouveau dossier
        </Button>
      </Toolbar>

      <ListControls
        unit="dossiers"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      {notice ? (
        <div className="v1-empty">
          <div className="v1-empty-desc">{notice}</div>
        </div>
      ) : (
        <TableCard headers={COLUMNS}>
          {list.rows.map(row => (
            <tr key={row.id} className="clickable" onClick={() => onOpen?.(row.id)}>
              <RowName icon="folder" iconBg="var(--info-bg)" iconColor="var(--info)">
                {row.name}
              </RowName>
              <td className="mono">{row.numero || '—'}</td>
              <td>{row.espaceClient}</td>
              <td>{row.type}</td>
              <td>
                {row.verrouille ? (
                  <Pill kind="warning">Figé</Pill>
                ) : row.synchronise ? (
                  <Pill kind="info">Synchronisé</Pill>
                ) : (
                  <Pill kind="success">Actif</Pill>
                )}
              </td>
            </tr>
          ))}
        </TableCard>
      )}

      <TablePager
        info={pagerInfo('dossiers', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
        onExport={() => {}}
      />

      {/* La V1 annonce 245 dossiers sur cet office ; le POC n'en sert que ce que
          le backend contient. Le dire évite de faire passer une liste courte
          pour la liste complète. */}
      <div className="tiny dim" style={{ marginTop: 10 }}>
        Volumétrie de référence en production : {total} dossiers.
      </div>
    </Screen>
  );
}
