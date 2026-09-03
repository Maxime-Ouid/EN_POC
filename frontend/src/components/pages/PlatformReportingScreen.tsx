import { useState } from 'react';
import { BarTrack } from '../atoms/BarTrack';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Grid } from '../atoms/Grid';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { RowIcon } from '../atoms/RowIcon';
import { Screen } from '../atoms/Screen';
import { Select } from '../atoms/Select';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { ButtonRow } from '../molecules/ButtonRow';
import { StatCard } from '../molecules/StatCard';
import { TabStrip } from '../molecules/TabStrip';
import { TableCard } from '../organisms/TableCard';
import type { TabDef } from '../molecules/TabStrip';

/* ===========================================================================
   Reporting consolidé et transverse — §4.6 (second niveau) et §5.1.

   « Côté application d'administration (support) : reporting consolidé et
   transverse sur l'ensemble des EN (par office, par tenant), pour le pilotage
   global de la plateforme. » C'est la vue que l'écran Statistiques d'un office
   ne peut pas donner : elle traverse les tenants, ce qu'aucun utilisateur
   d'office ne doit pouvoir faire.

   Le second onglet expose l'INTÉGRATION COMPTABLE du §4.6 : l'API que
   l'application d'administration offre aux outils de comptabilité de NOTANTIS.
   Elle n'a pas d'écran à elle — c'est une API — mais elle a besoin d'un endroit
   où l'on voit ce qu'elle a exporté, et où l'on relance un export en échec.
   Sans cela, une intégration muette ne se surveille pas.

   Les chiffres de tête sont ceux dont le §9 dit qu'ils MANQUENT pour
   dimensionner (stockage total, documents, utilisateurs concurrents) : les
   afficher ici, c'est dire où ils seront lus une fois mesurés.
   =========================================================================== */

export interface OfficeReportRow {
  id: string;
  name: string;
  subdomain: string;
  active: boolean;
  datarooms: number;
  documents: number;
  storage: string;
  /** Part du stockage de la plateforme, en pourcentage. */
  sharePercent: number;
  activeUsers: number;
  lastActivity: string;
  /** Version d'EN servie à cet office — le versionnage différencié du §2. */
  version: string;
}

export interface AccountingExportRow {
  id: string;
  period: string;
  officeCount: number;
  amountExclTax: string;
  status: { label: string; kind: 'success' | 'warning' | 'critical' };
  exportedAt: string;
}

export interface PlatformReportingScreenProps {
  stats: {
    officeCount: number;
    activeOfficeCount: number;
    dataroomCount: number;
    documentCount: number;
    storageTotal: string;
    activeUsers30d: number;
    /** Pic d'utilisateurs simultanés — métrique manquante du §9. */
    peakConcurrent?: number;
  };
  offices: OfficeReportRow[];
  exports: AccountingExportRow[];
  onExportCsv?: () => void;
  onRetryExport?: (id: string) => void;
}

export type PlatformReportingTabKey = 'sub-parc' | 'sub-compta';

const TABS: TabDef[] = [
  { key: 'sub-parc', label: 'Parc des Espaces Notariaux' },
  { key: 'sub-compta', label: 'Intégration comptable' },
];

export function PlatformReportingScreen({
  stats,
  offices,
  exports,
  onExportCsv,
  onRetryExport,
}: PlatformReportingScreenProps) {
  const [activeTab, setActiveTab] = useState<PlatformReportingTabKey>('sub-parc');
  const [filter, setFilter] = useState<'all' | 'actifs' | 'inactifs'>('all');

  const visible = offices.filter(o =>
    filter === 'all' ? true : filter === 'actifs' ? o.active : !o.active,
  );

  return (
    <Screen>
      <TabStrip
        tabs={TABS}
        active={activeTab}
        onChange={k => setActiveTab(k as PlatformReportingTabKey)}
      />

      <SubscreenPanel level={2} active={activeTab === 'sub-parc'}>
        <Grid columns={4}>
          <StatCard
            label="Espaces Notariaux"
            value={stats.officeCount}
            icon="building"
            iconBg="var(--info-bg)"
            iconColor="var(--info)"
            sub={<span className="tiny dim">{stats.activeOfficeCount} actifs</span>}
          />
          <StatCard
            label="Datarooms"
            value={stats.dataroomCount.toLocaleString('fr-FR')}
            icon="folder"
            iconBg="var(--brass-100)"
            iconColor="var(--brass-700)"
          />
          <StatCard
            label="Stockage total"
            value={stats.storageTotal}
            icon="layers"
            iconBg="var(--success-bg)"
            iconColor="var(--success)"
            sub={
              <span className="tiny dim">
                {stats.documentCount.toLocaleString('fr-FR')} documents
              </span>
            }
          />
          <StatCard
            label="Utilisateurs actifs (30 j)"
            value={stats.activeUsers30d.toLocaleString('fr-FR')}
            icon="users"
            iconBg="var(--warning-bg)"
            iconColor="var(--warning)"
            sub={
              <span className="tiny dim">
                {stats.peakConcurrent
                  ? `pic de ${stats.peakConcurrent} simultanés`
                  : 'pic simultané non mesuré'}
              </span>
            }
          />
        </Grid>

        <Card
          padded
          style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          <div style={{ minWidth: 200 }}>
            <Select
              value={filter}
              onChange={e => setFilter(e.target.value as 'all' | 'actifs' | 'inactifs')}
            >
              <option value="all">Tous les offices</option>
              <option value="actifs">Offices actifs</option>
              <option value="inactifs">Offices désactivés</option>
            </Select>
          </div>
          <div style={{ flex: 1 }} />
          <ButtonRow>
            <Button size="sm" onClick={onExportCsv}>
              <Icon id="down" />
              Export CSV
            </Button>
          </ButtonRow>
        </Card>

        <TableCard
          headers={[
            'Office',
            'Version',
            'Datarooms',
            'Documents',
            'Stockage',
            'Part',
            'Utilisateurs actifs',
            'Dernière activité',
          ]}
        >
          {visible.map(o => (
            <tr key={o.id}>
              <td className="row-name">
                <RowIcon
                  icon="building"
                  bg={o.active ? 'var(--info-bg)' : 'var(--surface-alt)'}
                  color={o.active ? 'var(--info)' : 'var(--ink-400)'}
                  muted={!o.active}
                />
                <span>
                  {o.name}
                  <span className="tiny dim" style={{ display: 'block' }}>
                    {o.subdomain}
                  </span>
                </span>
              </td>
              <td className="mono dim">{o.version}</td>
              <td className="mono">{o.datarooms}</td>
              <td className="mono">{o.documents.toLocaleString('fr-FR')}</td>
              <td className="mono">{o.storage}</td>
              <td style={{ width: 150 }}>
                <BarTrack
                  percent={o.sharePercent}
                  label={`${o.name} — ${Math.round(o.sharePercent)} % du stockage de la plateforme`}
                />
              </td>
              <td className="mono">{o.activeUsers}</td>
              <td className="dim">{o.lastActivity}</td>
            </tr>
          ))}
        </TableCard>
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-compta'}>
        <Card padded style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <RowIcon icon="scales" bg="var(--brass-100)" color="var(--brass-700)" size={34} />
          <div>
            <div className="section-title">API de facturation des offices</div>
            <div className="tiny dim" style={{ marginTop: 4 }}>
              L'application d'administration expose la consommation de chaque office aux outils
              de comptabilité de Notantis (§4.6). Cette page suit ce qui a été transmis — elle
              ne remplace pas la comptabilité, elle dit si elle a bien reçu.
            </div>
          </div>
        </Card>

        <TableCard headers={['Période', 'Offices facturés', 'Montant HT', 'Statut', 'Transmis le', '']}>
          {exports.map(x => (
            <tr key={x.id}>
              <td className="row-name">{x.period}</td>
              <td className="mono">{x.officeCount}</td>
              <td className="mono">{x.amountExclTax}</td>
              <td>
                <Pill kind={x.status.kind}>{x.status.label}</Pill>
              </td>
              <td className="dim">{x.exportedAt}</td>
              <td>
                {x.status.kind !== 'success' && (
                  <Button size="sm" onClick={() => onRetryExport?.(x.id)}>
                    Relancer
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </TableCard>
      </SubscreenPanel>
    </Screen>
  );
}
