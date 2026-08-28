import { useState } from 'react';
import { Avatar } from '../atoms/Avatar';
import { BarTrack } from '../atoms/BarTrack';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { RowIcon } from '../atoms/RowIcon';
import { Screen } from '../atoms/Screen';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { PageHeader } from '../molecules/PageHeader';
import { TabStrip } from '../molecules/TabStrip';
import { TableCard } from '../organisms/TableCard';
import type { TabDef } from '../molecules/TabStrip';

export interface ClientUsageRow {
  id: string;
  /** Nom de l'espace client (République, Arsenal…). */
  name: string;
  dataroomCount: number;
  /** Stockage déjà formaté (« 96,4 Go ») — le formatage reste côté appelant. */
  storage: string;
  /** Part du stockage total de l'office, en pourcentage. */
  sharePercent: number;
  /** `true` pour signaler un seuil dépassé (barre orange). */
  shareWarning?: boolean;
  lastActivity: string;
}

export interface InvoiceRow {
  id: string;
  period: string;
  averageStorage: string;
  amountExclTax: string;
  onDownload?: () => void;
}

export interface ConnectedUserRow {
  id: string;
  initials: string;
  gray?: boolean;
  name: string;
  company: string;
  role: string;
  /** Durée depuis la connexion (« 32 min »). */
  connectedFor: string;
}

export interface StatsScreenProps {
  usage: ClientUsageRow[];
  invoices: InvoiceRow[];
  connected: ConnectedUserRow[];
  /** Onglet ouvert au montage — utile pour un lien profond. */
  defaultTab?: StatsTabKey;
}

export type StatsTabKey = 'sub-usage' | 'sub-billing' | 'sub-connect';

const TABS: TabDef[] = [
  { key: 'sub-usage', label: 'Consommation par client' },
  { key: 'sub-billing', label: 'Facturation' },
  { key: 'sub-connect', label: 'Qui est connecté' },
];

// Écran Statistiques & facturation — index_16.html #screen-stats. Trois onglets :
// consommation par espace client (base de la refacturation en marque grise),
// historique de facturation au stockage, et sessions ouvertes en temps réel.
export function StatsScreen({ usage, invoices, connected, defaultTab = 'sub-usage' }: StatsScreenProps) {
  const [activeTab, setActiveTab] = useState<StatsTabKey>(defaultTab);

  return (
    <Screen>
      <PageHeader
        eyebrow="Pilotage"
        title="Statistiques & facturation"
        sub="Suivi d'usage par client, pour votre propre refacturation en marque grise."
      />

      <div style={{ marginTop: 20 }}>
        <TabStrip tabs={TABS} active={activeTab} onChange={k => setActiveTab(k as StatsTabKey)} />
      </div>

      <SubscreenPanel level={2} active={activeTab === 'sub-usage'}>
        <TableCard headers={['Espace client', 'Dossiers', 'Stockage', 'Part du total', 'Dernière activité']}>
          {usage.map(row => (
            <tr key={row.id}>
              <td className="row-name">{row.name}</td>
              <td>{row.dataroomCount}</td>
              <td className="mono">{row.storage}</td>
              <td style={{ width: 180 }}>
                <BarTrack
                  percent={row.sharePercent}
                  tone={row.shareWarning ? 'warn' : 'accent'}
                  label={`${row.name} — ${Math.round(row.sharePercent)} % du stockage total`}
                />
              </td>
              <td className="dim">{row.lastActivity}</td>
            </tr>
          ))}
        </TableCard>
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-billing'}>
        <Card
          padded
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <RowIcon icon="clock" bg="var(--brass-100)" color="var(--brass-700)" size={34} />
          <div>
            <div className="section-title">Facturation au stockage consommé</div>
            <div className="tiny dim">
              Basée sur la consommation réelle de chaque dataroom — export comptable disponible.
            </div>
          </div>
        </Card>
        <TableCard headers={['Période', 'Stockage moyen', 'Montant HT', '']}>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td>{inv.period}</td>
              <td className="mono">{inv.averageStorage}</td>
              <td className="mono">{inv.amountExclTax}</td>
              <td>
                <Button size="sm" onClick={inv.onDownload}>
                  <Icon id="down" />
                  PDF
                </Button>
              </td>
            </tr>
          ))}
        </TableCard>
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-connect'}>
        <TableCard headers={['Nom', 'Société', 'Fonction', 'Connecté depuis']}>
          {connected.map(u => (
            <tr key={u.id}>
              <td className="row-name">
                <Avatar size="sm" gray={u.gray}>
                  {u.initials}
                </Avatar>
                {u.name}
              </td>
              <td>{u.company}</td>
              <td>{u.role}</td>
              <td className="dim">{u.connectedFor}</td>
            </tr>
          ))}
        </TableCard>
      </SubscreenPanel>
    </Screen>
  );
}
