import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { HyperadminOfficeRow, ModuleSummary } from '../../api/endpoints';
import { pagerInfo, useListPaging } from '../../hooks/useListPaging';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Grid } from '../atoms/Grid';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { Screen } from '../atoms/Screen';
import { ListControls } from '../molecules/ListControls';
import { RowName } from '../molecules/RowName';
import { StatCard } from '../molecules/StatCard';
import { TablePager } from '../molecules/TablePager';
import { Toolbar } from '../molecules/Toolbar';
import { TopbarSearch } from '../molecules/TopbarSearch';
import { TableCard } from '../organisms/TableCard';
import { useTopbarSlots } from '../templates/topbarSlots';

export interface HyperadminOfficesScreenProps {
  offices: HyperadminOfficeRow[];
  /** Catalogue COMPLET — sert à afficher un nom lisible plutôt qu'un slug brut. */
  modules: ModuleSummary[];
  loading?: boolean;
  error?: string | null;
  /**
   * Échec d'une action de ligne (activation, modules). Affiché sous le tableau,
   * là où l'action a été demandée — la console le rendait auparavant sous
   * l'écran entier, hors du champ de vision au bas d'une longue liste.
   */
  actionError?: string | null;
  onCreateOffice: () => void;
  onToggleActive: (office: HyperadminOfficeRow) => void;
  onManageModules: (office: HyperadminOfficeRow) => void;
  /**
   * Ouvre la prise d'identité d'un utilisateur de cet office — la fonction que
   * le schéma d'architecture du §5 place sur l'application d'administration
   * (« peut se connecter et prendre l'identité d'un utilisateur de l'EN »).
   * Absente = le bouton n'apparaît pas : mieux vaut pas d'accès qu'un accès
   * qui échoue en silence sur un office désactivé ou hors périmètre support.
   */
  onImpersonate?: (office: HyperadminOfficeRow) => void;
}

const COLUMNS = ['Étude', 'Sous-domaine', 'Statut', 'Modules', ''];

/**
 * Liste des offices — GET /api/hyperadmin/offices/. Même patron que
 * OfficeUsersScreen (barre d'outils, « afficher N », tableau, pagination) :
 * c'est le même genre d'annuaire, un cran au-dessus (les offices eux-mêmes,
 * pas les membres d'un seul d'entre eux).
 *
 * L'écran s'ouvre sur une rangée de chiffres, comme l'accueil d'une étude : la
 * console répond d'abord à « combien d'offices, combien d'actifs, combien de
 * modules ouverts » — trois questions qu'on posait jusqu'ici en comptant les
 * lignes du tableau à l'œil.
 */
export function HyperadminOfficesScreen({
  offices,
  modules,
  loading,
  error,
  actionError,
  onCreateOffice,
  onToggleActive,
  onManageModules,
  onImpersonate,
}: HyperadminOfficesScreenProps) {
  const slots = useTopbarSlots();
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

  const activeCount = offices.filter(office => office.is_active).length;
  const disabledCount = offices.length - activeCount;
  const activations = offices.reduce((total, office) => total + office.enabled_modules.length, 0);

  /* Décompte et création remontent au début de la topbar, comme la liste des
     dossiers d'une étude (01/09/2026) : le décompte nomme l'écran — il remplace
     le titre que ces écrans n'ont plus — et l'action primaire se lit juste
     après lui, au même endroit partout dans le produit. */
  const topbarCommands = (
    <>
      <div className="eyebrow">{offices.length} offices</div>
      <Button variant="accent" size="sm" onClick={onCreateOffice}>
        <Icon id="plus" />
        Nouvel office
      </Button>
    </>
  );

  /* La console masque la recherche globale (voir HyperadminApp) : le filtre de
     la liste prend sa place en fin de barre, plutôt que de vivre au-dessus du
     tableau à côté d'un emplacement laissé vide. */
  const topbarFilter = (
    <TopbarSearch
      placeholder="Rechercher un office…"
      value={list.search}
      onChange={list.setSearch}
      style={{ maxWidth: 280, margin: 0 }}
    />
  );

  return (
    <Screen>
      {/* Hors AppShell (UiKit, démos isolées) les conteneurs valent `null` : les
          commandes restent alors en tête d'écran, et le filtre dans la ligne de
          contrôles, plutôt que de disparaître. */}
      {slots.start ? createPortal(topbarCommands, slots.start) : <Toolbar>{topbarCommands}</Toolbar>}
      {slots.end && createPortal(topbarFilter, slots.end)}

      {/* Même respiration qu'entre les deux grilles de l'accueil d'une étude :
          la ligne de contrôles ne porte qu'une marge basse. */}
      <Grid columns={3} style={{ marginBottom: 22 }}>
        <StatCard
          label="Offices"
          value={offices.length}
          icon="building"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          sub="sous-domaines déclarés"
        />
        <StatCard
          label="Offices actifs"
          value={activeCount}
          icon="check"
          iconBg="var(--success-bg)"
          iconColor="var(--success)"
          sub={
            disabledCount === 0
              ? 'aucun office désactivé'
              : `${disabledCount} désactivé${disabledCount > 1 ? 's' : ''}`
          }
        />
        <StatCard
          label="Modules activés"
          value={activations}
          icon="layers"
          iconBg="var(--brass-100)"
          iconColor="var(--brass-700)"
          sub={`sur ${modules.length} au catalogue, tous offices confondus`}
        />
      </Grid>

      <ListControls
        unit="offices"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
        showSearch={!slots.end}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(office => (
          <tr key={office.id}>
            <RowName icon="building" iconBg="var(--info-bg)" iconColor="var(--info)">
              {office.name}
            </RowName>
            <td className="mono dim">{office.subdomain}</td>
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
                {onImpersonate && office.is_active && (
                  <Button size="sm" onClick={() => onImpersonate(office)}>
                    Prendre l'identité
                  </Button>
                )}
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

      {actionError && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {actionError}
        </div>
      )}

      <TablePager
        info={pagerInfo('offices', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
      />
    </Screen>
  );
}
