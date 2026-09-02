import { useCallback } from 'react';
import { pagerInfo, useListPaging } from '../../hooks/useListPaging';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { Screen } from '../atoms/Screen';
import { Toggle } from '../atoms/Toggle';
import { ListControls } from '../molecules/ListControls';
import { RowName } from '../molecules/RowName';
import { TablePager } from '../molecules/TablePager';
import { Toolbar } from '../molecules/Toolbar';
import { TableCard } from '../organisms/TableCard';

export interface HyperadminOfficeRow {
  id: number;
  subdomain: string;
  name: string;
  isActive: boolean;
  enabledModules: string[];
}

export interface HyperadminModuleOption {
  slug: string;
  name: string;
}

export interface HyperadminScreenProps {
  rows: HyperadminOfficeRow[];
  /** Modules réellement activables — le catalogue front, sans les « à venir ». */
  modules: HyperadminModuleOption[];
  loading?: boolean;
  /** Message de l'API affiché tel quel (« réservé aux hyperadmins Notantis »…). */
  error?: string | null;
  /**
   * Avertissement non bloquant, affiché au-dessus du tableau : la liste reste
   * lisible. Sert au cas où le serveur n'a pas fait ce que le clic demandait
   * sans pour autant renvoyer d'erreur.
   */
  notice?: string | null;
  /** Sous-domaine de l'étude depuis laquelle la console est ouverte, repéré dans la liste. */
  currentSubdomain?: string;
  onCreateOffice?: () => void;
  onToggleActive?: (office: HyperadminOfficeRow, next: boolean) => void;
  onToggleModule?: (office: HyperadminOfficeRow, slug: string, next: boolean) => void;
}

const COLUMNS = ['Étude', 'Sous-domaine', 'État', 'Modules activés'];

/**
 * Console Notantis — la vue transverse à toutes les études.
 *
 * Ce n'est pas un écran d'étude : le rang hyperadmin ne dépend d'aucun office
 * (HyperadminAccess côté Django), et la console reste la même quel que soit le
 * sous-domaine depuis lequel elle est ouverte. La ligne de l'étude courante est
 * simplement repérée, pour qu'on sache d'où l'on parle.
 *
 * C'est aussi l'écran qui démontre le premier pari du POC : activer un module
 * pour une étude et pas pour une autre, sans redéploiement — l'interrupteur
 * écrit dans `Office.enabled_modules`, et le menu de l'étude concernée change
 * au rechargement suivant.
 *
 * Désactiver une étude la rend inaccessible comme un sous-domaine inconnu : ses
 * données restent, ses membres n'entrent plus. L'écran le dit, parce qu'un
 * interrupteur seul laisserait croire à une simple mise en sommeil visuelle.
 *
 * Composant pur : recherche et pagination locales, tout le reste en callbacks.
 */
export function HyperadminScreen({
  rows,
  modules,
  loading,
  error,
  notice,
  currentSubdomain,
  onCreateOffice,
  onToggleActive,
  onToggleModule,
}: HyperadminScreenProps) {
  const match = useCallback(
    (row: HyperadminOfficeRow, q: string) =>
      `${row.name} ${row.subdomain}`.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);

  if (error) {
    return (
      <Screen>
        <Card padded>
          <div style={{ fontWeight: 600 }}>Console indisponible</div>
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
          Ouvrir une étude
        </Button>
      </Toolbar>

      {notice && (
        <div className="tiny" style={{ margin: '4px 2px 10px', color: 'var(--critical)' }}>
          {notice}
        </div>
      )}

      <ListControls
        unit="études"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.id}>
            <RowName icon="building" iconBg="var(--brass-100)" iconColor="var(--brass-700)">
              {row.name}
              {row.subdomain === currentSubdomain && (
                <Pill kind="neutral" style={{ marginLeft: 8 }}>
                  Étude courante
                </Pill>
              )}
            </RowName>
            <td className="mono dim">{row.subdomain}</td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Toggle
                  checked={row.isActive}
                  onChange={next => onToggleActive?.(row, next)}
                />
                <span className="tiny dim">{row.isActive ? 'Ouverte' : 'Fermée'}</span>
              </div>
            </td>
            <td>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {modules.map(module => {
                  const on = row.enabledModules.includes(module.slug);
                  return (
                    <Button
                      key={module.slug}
                      size="sm"
                      variant={on ? 'primary' : 'default'}
                      aria-pressed={on}
                      onClick={() => onToggleModule?.(row, module.slug, !on)}
                    >
                      {module.name}
                    </Button>
                  );
                })}
              </div>
            </td>
          </tr>
        ))}
        {!list.rows.length && (
          <tr>
            <td colSpan={COLUMNS.length} className="dim">
              {loading ? 'Chargement…' : 'Aucune étude à afficher.'}
            </td>
          </tr>
        )}
      </TableCard>

      <TablePager
        info={pagerInfo('études', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
      />

      <div className="tiny dim" style={{ marginTop: 10 }}>
        Fermer une étude la rend inaccessible comme un sous-domaine inconnu : ses
        données restent en place, mais plus personne n'y entre, ses propres membres
        compris. Un module activé ici apparaît dans le menu de l'étude concernée au
        rechargement suivant, sans redéploiement.
      </div>
    </Screen>
  );
}
