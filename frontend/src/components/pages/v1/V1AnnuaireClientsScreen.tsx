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

export interface V1ClientRow {
  id: string;
  nom: string;
  email: string;
  fonction: string;
  derniereConnexion: string;
}

export interface V1AnnuaireClientsScreenProps {
  rows: V1ClientRow[];
  onNouveauContact?: () => void;
  onEdit?: (id: string) => void;
}

const COLUMNS = ['Nom / Prénom', 'Email', 'Fonction', 'Dernière connexion', ''];

/* Annuaires > Annuaire des clients.

   Établi : l'annuaire existe et regroupe les contacts extérieurs à l'étude,
   ajoutables comme membres d'un dossier — il apparaît comme onglet dans
   l'écran « Membres du dossier » (capture 114216), à côté de « Annuaire de
   l'étude ».

   Les colonnes sont celles de cet onglet frère, seul affiché sur la capture :
   Nom / Prénom, Email, Fonction, Dernière connexion. Aucune colonne n'a été
   ajoutée par déduction (une « Société » serait vraisemblable pour des
   contacts extérieurs — elle n'a pas été relevée, elle n'est donc pas là).

   Non relevé : l'écran autonome de la rubrique, et la volumétrie de
   production — le « sur 42 » de la capture compte l'annuaire de l'étude, pas
   celui des clients, et n'est donc pas repris ici. */
export function V1AnnuaireClientsScreen({
  rows,
  onNouveauContact,
  onEdit,
}: V1AnnuaireClientsScreenProps) {
  const match = useCallback(
    (row: V1ClientRow, q: string) =>
      `${row.nom} ${row.email} ${row.fonction}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  return (
    <Screen>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={onNouveauContact}>
          <Icon id="plus" />
          Nouveau contact
        </Button>
      </Toolbar>

      <div className="v1-info-block">
        <Icon id="shield" />
        <div>
          <p>
            Colonnes reprises de l'onglet « Annuaire de l'étude » de l'écran « Membres du
            dossier » (capture 114216), le seul affiché : l'onglet « Annuaire des clients » y est
            visible mais son contenu ne l'est pas.
          </p>
          <p>À confirmer en recette : les colonnes propres aux contacts extérieurs.</p>
        </div>
      </div>

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
            <td className="dim">{row.email}</td>
            <td>{row.fonction}</td>
            <td className="tiny dim mono">{row.derniereConnexion}</td>
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
    </Screen>
  );
}
