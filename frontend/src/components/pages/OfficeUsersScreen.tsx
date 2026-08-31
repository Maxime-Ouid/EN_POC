import { useCallback } from 'react';
import { pagerInfo, useListPaging } from '../../hooks/useListPaging';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { Screen } from '../atoms/Screen';
import { Select } from '../atoms/Select';
import { ListControls } from '../molecules/ListControls';
import { RowName } from '../molecules/RowName';
import { TablePager } from '../molecules/TablePager';
import { Toolbar } from '../molecules/Toolbar';
import { TableCard } from '../organisms/TableCard';
import { roleLabel } from '../organisms/officeRoles';

export interface OfficeUserRowData {
  /** Id du membership (pas de l'utilisateur) — c'est lui que PATCH /api/office-users/<id>/ attend. */
  membershipId: number;
  /** Id du compte, réutilisé par les restrictions d'accès (qui raisonnent en user_id). */
  userId: number;
  username: string;
  role: string;
}

export interface OfficeUsersScreenProps {
  rows: OfficeUserRowData[];
  loading?: boolean;
  /**
   * Message d'erreur de l'API, affiché tel quel : le backend répond « réservé aux
   * administrateurs de cet office » sur un 403, ce qui est déjà la bonne phrase
   * pour l'utilisateur — inutile de la deviner ici à partir d'un statut.
   */
  error?: string | null;
  /**
   * Rôles attribuables par l'appelant (voir officeRoles.assignableRoles). Vide =
   * l'appelant n'est pas gestionnaire : l'écran devient une liste en lecture
   * seule, sans barre d'outils ni liste déroulante de rôle.
   */
  assignableRoles: string[];
  onCreateUser?: () => void;
  onAttachUser?: () => void;
  onChangeRole?: (membershipId: number, role: string) => void;
  /** Retire l'appartenance à cet office. L'appelant confirme avant d'agir. */
  onRemoveUser?: (user: OfficeUserRowData) => void;
  /**
   * Utilisateur connecté : sa propre ligne n'offre pas le retrait (le serveur le
   * refuse aussi — un gestionnaire seul se mettrait dehors sans recours).
   */
  currentUsername?: string;
}

const COLUMNS = ['Utilisateur', 'Identifiant', 'Rôle', ''];

/**
 * Annuaire de l'étude — utilisateurs de l'office courant (GET /api/office-users/).
 *
 * Reprend la forme des annuaires V1 (barre d'outils, « afficher N utilisateurs »,
 * tableau, pagination) parce que c'est l'écran que les études connaissent déjà.
 * Deux différences assumées avec la V1 : le rôle se change sur place plutôt que
 * dans un écran d'édition séparé, et la liste ne montre que ce que le serveur
 * laisse voir (un admin ne voit jamais les superadmin de son office).
 *
 * Composant pur : la recherche et la pagination sont locales, tout le reste
 * remonte par callbacks — voir App.tsx pour le branchement sur useOfficeUsers.
 */
export function OfficeUsersScreen({
  rows,
  loading,
  error,
  assignableRoles,
  onCreateUser,
  onAttachUser,
  onChangeRole,
  onRemoveUser,
  currentUsername,
}: OfficeUsersScreenProps) {
  const match = useCallback(
    (row: OfficeUserRowData, q: string) =>
      `${row.username} ${roleLabel(row.role)}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);
  const canManage = assignableRoles.length > 0;

  if (error) {
    return (
      <Screen>
        <Card padded>
          <div style={{ fontWeight: 600 }}>Annuaire indisponible</div>
          <div className="tiny dim" style={{ marginTop: 6 }}>
            {error}
          </div>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {canManage && (
        <Toolbar>
          <Button size="sm" variant="primary" onClick={onCreateUser}>
            <Icon id="plus" />
            Nouvel utilisateur
          </Button>
          <Button size="sm" onClick={onAttachUser}>
            <Icon id="link" />
            Rattacher un compte existant
          </Button>
        </Toolbar>
      )}

      <ListControls
        unit="utilisateurs"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.membershipId}>
            <RowName icon="users" iconBg="var(--info-bg)" iconColor="var(--info)">
              {row.username}
            </RowName>
            <td className="mono dim">#{row.userId}</td>
            <td>
              {canManage && onChangeRole ? (
                <Select
                  value={row.role}
                  aria-label={`Rôle de ${row.username}`}
                  onChange={e => onChangeRole(row.membershipId, e.target.value)}
                  style={{ width: 160 }}
                >
                  {/* Le rôle courant est toujours proposé, même hors de portée de
                      l'appelant : sans lui, la liste s'afficherait sur une autre
                      valeur que celle réellement enregistrée. */}
                  {(assignableRoles.includes(row.role)
                    ? assignableRoles
                    : [row.role, ...assignableRoles]
                  ).map(role => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </Select>
              ) : (
                <Pill kind="neutral">{roleLabel(row.role)}</Pill>
              )}
            </td>
            <td>
              {/* Pas de bouton sur sa propre ligne : le serveur refuse ce retrait,
                  autant ne pas le proposer. */}
              {canManage && onRemoveUser && row.username !== currentUsername && (
                <Button size="sm" variant="ghost" onClick={() => onRemoveUser(row)}>
                  Retirer
                </Button>
              )}
            </td>
          </tr>
        ))}
        {!list.rows.length && (
          <tr>
            <td colSpan={COLUMNS.length} className="dim">
              {loading ? 'Chargement…' : 'Aucun utilisateur à afficher.'}
            </td>
          </tr>
        )}
      </TableCard>

      <TablePager
        info={pagerInfo('utilisateurs', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
      />

      {canManage && (
        <div className="tiny dim" style={{ marginTop: 10 }}>
          Un administrateur ne voit ni ne gère les superadmins de son étude ; les rôles
          proposés ici s'arrêtent au sien.
        </div>
      )}
    </Screen>
  );
}
