import { useCallback } from 'react';
import type { HyperadminOfficeRow, ModuleSummary } from '../../api/endpoints';
import { pagerInfo, useListPaging } from '../../hooks/useListPaging';
import { officeLoginUrl } from '../../hyperadmin/officeUrl';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { Screen } from '../atoms/Screen';
import { ListControls } from '../molecules/ListControls';
import { RowName } from '../molecules/RowName';
import { TablePager } from '../molecules/TablePager';
import { Toolbar } from '../molecules/Toolbar';
import { TableCard } from '../organisms/TableCard';

export interface HyperadminOfficesScreenProps {
  offices: HyperadminOfficeRow[];
  /** Catalogue COMPLET — sert à afficher un nom lisible plutôt qu'un slug brut. */
  modules: ModuleSummary[];
  loading?: boolean;
  error?: string | null;
  onCreateOffice: () => void;
  onToggleActive: (office: HyperadminOfficeRow) => void;
  onManageModules: (office: HyperadminOfficeRow) => void;
}

const COLUMNS = ['Étude', 'Sous-domaine', 'Statut', 'Modules', ''];

/**
 * Liste des offices — GET /api/hyperadmin/offices/. Même patron que
 * OfficeUsersScreen (barre d'outils, « afficher N », tableau, pagination) :
 * c'est le même genre d'annuaire, un cran au-dessus (les offices eux-mêmes,
 * pas les membres d'un seul d'entre eux).
 */
export function HyperadminOfficesScreen({
  offices,
  modules,
  loading,
  error,
  onCreateOffice,
  onToggleActive,
  onManageModules,
}: HyperadminOfficesScreenProps) {
  const moduleName = useCallback(
    (slug: string) => modules.find(m => m.slug === slug)?.name ?? slug,
    [modules],
  );
  const match = useCallback(
    (row: HyperadminOfficeRow, q: string) =>
      `${row.name} ${row.subdomain}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(offices, match);

  if (error) {
    return (
      <Screen>
        <Card padded>
          <div style={{ fontWeight: 600 }}>Liste des offices indisponible</div>
          <div className="tiny dim" style={{ marginTop: 6 }}>
            {error}
          </div>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={onCreateOffice}>
          <Icon id="plus" />
          Nouvel office
        </Button>
      </Toolbar>

      <ListControls
        unit="offices"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(office => (
          <tr key={office.id}>
            <RowName icon="building" iconBg="var(--info-bg)" iconColor="var(--info)">
              {office.name}
            </RowName>
            <td>
              <a
                className="mono tiny"
                href={officeLoginUrl(office.subdomain)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--info)' }}
                title="Ouvrir l'écran de connexion de cet office dans un nouvel onglet"
              >
                <Icon id="link" />
                {office.subdomain}
              </a>
            </td>
            <td>
              <Pill kind={office.is_active ? 'success' : 'critical'}>
                {office.is_active ? 'Actif' : 'Désactivé'}
              </Pill>
            </td>
            <td>
              {office.enabled_modules.length === 0 ? (
                <span className="tiny dim">Aucun</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {office.enabled_modules.map(slug => (
                    <Pill key={slug} kind="neutral">
                      {moduleName(slug)}
                    </Pill>
                  ))}
                </div>
              )}
            </td>
            <td>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" onClick={() => onManageModules(office)}>
                  Modules
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onToggleActive(office)}>
                  {office.is_active ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </td>
          </tr>
        ))}
        {!list.rows.length && (
          <tr>
            <td colSpan={COLUMNS.length} className="dim">
              {loading ? 'Chargement…' : 'Aucun office à afficher.'}
            </td>
          </tr>
        )}
      </TableCard>

      <TablePager
        info={pagerInfo('offices', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
      />
    </Screen>
  );
}
