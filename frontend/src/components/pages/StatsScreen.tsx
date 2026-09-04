import { useState } from 'react';
import { Avatar } from '../atoms/Avatar';
import { BarTrack } from '../atoms/BarTrack';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Grid } from '../atoms/Grid';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { RowIcon } from '../atoms/RowIcon';
import { Screen } from '../atoms/Screen';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { ButtonRow } from '../molecules/ButtonRow';
import { StatCard } from '../molecules/StatCard';
import { TabStrip } from '../molecules/TabStrip';
import { GreyLabelStatementModal } from '../organisms/GreyLabelStatementModal';
import { Slideover } from '../organisms/Slideover';
import { TableCard } from '../organisms/TableCard';
import type { TabDef } from '../molecules/TabStrip';
import type { GreyLabelStatementValue } from '../organisms/GreyLabelStatementModal';

/** Une dataroom du client, dans le détail ouvert depuis la ligne de synthèse. */
export interface ClientDataroomUsage {
  id: string;
  name: string;
  documents: number;
  storage: string;
  /** Part de cette dataroom dans le stockage DU CLIENT (pas de l'office). */
  sharePercent: number;
  lastActivity: string;
}

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
  /**
   * Détail dataroom par dataroom, ouvert dans un volet latéral. La
   * refacturation en marque grise se justifie ligne à ligne devant le client
   * de l'office (§4.6) : un total sans détail n'est pas opposable.
   */
  datarooms?: ClientDataroomUsage[];
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

/** Une ligne du tableau d'activité par membre de l'office. */
export interface MemberActivityRow {
  id: string;
  initials: string;
  gray?: boolean;
  name: string;
  role: string;
  documentsAdded: number;
  documentsViewed: number;
  questionsAnswered: number;
  lastSeen: string;
}

/**
 * Indicateurs du reporting « côté EN d'un office » (§3.2) : volumétrie, usage,
 * activité des membres, stockage consommé, questions/réponses. Ils étaient la
 * moitié manquante de cet écran, qui ne montrait que la facturation.
 */
export interface OfficeActivityStats {
  activeDatarooms: number;
  activeDatatoomsDelta?: string;
  documentsAdded30d: number;
  documentsAdded30dDelta?: string;
  activeUsers30d: number;
  openQuestions: number;
  storageTotal: string;
  storageGrowth30d: string;
  /** Répartition du stockage par dossier, les plus gros d'abord. */
  topDatarooms: Array<{ id: string; name: string; storage: string; sharePercent: number }>;
  members: MemberActivityRow[];
}

export interface StatsScreenProps {
  usage: ClientUsageRow[];
  invoices: InvoiceRow[];
  connected: ConnectedUserRow[];
  /** Absent = l'onglet Activité affiche son message d'indisponibilité. */
  activity?: OfficeActivityStats;
  /** Nom de l'office, porté par le relevé en marque grise. */
  officeName?: string;
  /** Périodes proposées au relevé (« Août 2026 », « 3e trimestre 2026 »…). */
  statementPeriods?: string[];
  onGenerateStatement?: (value: GreyLabelStatementValue) => void;
  /** Onglet ouvert au montage — utile pour un lien profond. */
  defaultTab?: StatsTabKey;
}

export type StatsTabKey = 'sub-usage' | 'sub-activity' | 'sub-billing' | 'sub-connect';

const TABS: TabDef[] = [
  { key: 'sub-usage', label: 'Consommation par client' },
  { key: 'sub-activity', label: 'Activité & volumétrie' },
  { key: 'sub-billing', label: 'Facturation' },
  { key: 'sub-connect', label: 'Qui est connecté' },
];

// Écran Statistiques & facturation — index_16.html #screen-stats. Quatre onglets :
// consommation par espace client (base de la refacturation en marque grise, avec
// le détail dataroom par dataroom en volet latéral), activité et volumétrie de
// l'office (le reporting du §3.2), historique de facturation au stockage, et
// sessions ouvertes en temps réel.
export function StatsScreen({
  usage,
  invoices,
  connected,
  activity,
  officeName = 'votre office',
  statementPeriods = [],
  onGenerateStatement,
  defaultTab = 'sub-usage',
}: StatsScreenProps) {
  const [activeTab, setActiveTab] = useState<StatsTabKey>(defaultTab);
  const [openClientId, setOpenClientId] = useState<string | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);

  const openClient = usage.find(u => u.id === openClientId) ?? null;

  return (
    <Screen>
      {/* Titre de page retiré le 28/08/2026 : le fil d'Ariane de la topbar
          nomme l'écran. La barre d'onglets ouvre donc la page. */}
      <TabStrip tabs={TABS} active={activeTab} onChange={k => setActiveTab(k as StatsTabKey)} />

      <SubscreenPanel level={2} active={activeTab === 'sub-usage'}>
        <Card
          padded
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
        >
          <RowIcon icon="scales" bg="var(--info-bg)" color="var(--info)" size={34} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="section-title">Consommation par espace client</div>
            <div className="tiny dim">
              Base de la refacturation en marque grise. Ouvrez une ligne pour le détail dataroom
              par dataroom.
            </div>
          </div>
          <Button variant="accent" size="sm" onClick={() => setStatementOpen(true)}>
            <Icon id="file" />
            Relevé en marque grise
          </Button>
        </Card>

        <TableCard
          headers={['Espace client', 'Dossiers', 'Stockage', 'Part du total', 'Dernière activité', '']}
        >
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
              <td>
                <Button size="sm" onClick={() => setOpenClientId(row.id)}>
                  Détail
                </Button>
              </td>
            </tr>
          ))}
        </TableCard>
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-activity'}>
        {activity ? (
          <>
            <Grid columns={4}>
              <StatCard
                label="Dossiers actifs"
                value={activity.activeDatarooms}
                icon="folder"
                iconBg="var(--info-bg)"
                iconColor="var(--info)"
                delta={
                  activity.activeDatatoomsDelta
                    ? { text: activity.activeDatatoomsDelta, tone: 'up' }
                    : undefined
                }
              />
              <StatCard
                label="Documents déposés (30 j)"
                value={activity.documentsAdded30d.toLocaleString('fr-FR')}
                icon="file"
                iconBg="var(--brass-100)"
                iconColor="var(--brass-700)"
                delta={
                  activity.documentsAdded30dDelta
                    ? { text: activity.documentsAdded30dDelta, tone: 'up' }
                    : undefined
                }
              />
              <StatCard
                label="Utilisateurs actifs (30 j)"
                value={activity.activeUsers30d}
                icon="users"
                iconBg="var(--success-bg)"
                iconColor="var(--success)"
              />
              <StatCard
                label="Questions en attente"
                value={activity.openQuestions}
                icon="msg"
                iconBg="var(--warning-bg)"
                iconColor="var(--warning)"
              />
            </Grid>

            <Card
              padded
              style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
            >
              <RowIcon icon="layers" bg="var(--brass-100)" color="var(--brass-700)" size={34} />
              <div>
                <div className="section-title">
                  Stockage total de l'office&nbsp;: {activity.storageTotal}
                </div>
                <div className="tiny dim">
                  {activity.storageGrowth30d} sur les 30 derniers jours. Cette mesure fonde la
                  refacturation, elle n'est pas qu'un indicateur d'exploitation.
                </div>
              </div>
            </Card>

            <div className="section-title" style={{ marginTop: 22, marginBottom: 10 }}>
              Dossiers les plus volumineux
            </div>
            <TableCard headers={['Dossier', 'Stockage', 'Part du total']}>
              {activity.topDatarooms.map(d => (
                <tr key={d.id}>
                  <td className="row-name">
                    <RowIcon icon="folder" bg="var(--info-bg)" color="var(--info)" />
                    {d.name}
                  </td>
                  <td className="mono">{d.storage}</td>
                  <td style={{ width: 220 }}>
                    <BarTrack
                      percent={d.sharePercent}
                      label={`${d.name} — ${Math.round(d.sharePercent)} % du stockage de l'office`}
                    />
                  </td>
                </tr>
              ))}
            </TableCard>

            <div className="section-title" style={{ marginTop: 22, marginBottom: 10 }}>
              Activité des membres de l'étude
            </div>
            <TableCard
              headers={[
                'Membre',
                'Rôle',
                'Documents déposés',
                'Documents consultés',
                'Réponses apportées',
                'Dernière activité',
              ]}
            >
              {activity.members.map(m => (
                <tr key={m.id}>
                  <td className="row-name">
                    <Avatar size="sm" gray={m.gray}>
                      {m.initials}
                    </Avatar>
                    {m.name}
                  </td>
                  <td className="dim">{m.role}</td>
                  <td className="mono">{m.documentsAdded}</td>
                  <td className="mono">{m.documentsViewed}</td>
                  <td className="mono">{m.questionsAnswered}</td>
                  <td className="dim">{m.lastSeen}</td>
                </tr>
              ))}
            </TableCard>
          </>
        ) : (
          <Card padded style={{ maxWidth: 640 }}>
            <div className="tiny dim">
              Le reporting d'activité a besoin de l'audit trail côté serveur — pas disponible dans
              cette maquette.
            </div>
          </Card>
        )}
      </SubscreenPanel>

      <SubscreenPanel level={2} active={activeTab === 'sub-billing'}>
        <Card
          padded
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
        >
          <RowIcon icon="clock" bg="var(--brass-100)" color="var(--brass-700)" size={34} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="section-title">Facturation au stockage consommé</div>
            <div className="tiny dim">
              Basée sur la consommation réelle de chaque dataroom — export comptable disponible.
            </div>
          </div>
          <ButtonRow>
            <Button size="sm" onClick={() => setStatementOpen(true)}>
              <Icon id="file" />
              Relevé client
            </Button>
          </ButtonRow>
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

      <Slideover
        open={openClient !== null}
        onClose={() => setOpenClientId(null)}
        title={openClient ? `Détail — ${openClient.name}` : ''}
        wide
      >
        {openClient && (
          <>
            <div style={{ display: 'flex', gap: 18, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="tiny dim">Stockage</div>
                <div className="mono" style={{ fontSize: 18 }}>
                  {openClient.storage}
                </div>
              </div>
              <div>
                <div className="tiny dim">Datarooms</div>
                <div className="mono" style={{ fontSize: 18 }}>
                  {openClient.dataroomCount}
                </div>
              </div>
              <div>
                <div className="tiny dim">Part de l'office</div>
                <div className="mono" style={{ fontSize: 18 }}>
                  {Math.round(openClient.sharePercent)} %
                </div>
              </div>
            </div>

            {openClient.shareWarning && (
              <Pill kind="warning" style={{ marginBottom: 12 }}>
                Seuil de consommation dépassé
              </Pill>
            )}

            {openClient.datarooms?.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Dataroom</th>
                      <th>Documents</th>
                      <th>Stockage</th>
                      <th>Part du client</th>
                      <th>Activité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openClient.datarooms.map(d => (
                      <tr key={d.id}>
                        <td className="row-name">{d.name}</td>
                        <td className="mono">{d.documents}</td>
                        <td className="mono">{d.storage}</td>
                        <td style={{ width: 120 }}>
                          <BarTrack
                            percent={d.sharePercent}
                            label={`${d.name} — ${Math.round(d.sharePercent)} % du stockage de ${openClient.name}`}
                          />
                        </td>
                        <td className="dim">{d.lastActivity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="tiny dim">Aucun détail disponible pour ce client.</div>
            )}

            <Button
              variant="accent"
              size="sm"
              style={{ marginTop: 16 }}
              onClick={() => {
                setOpenClientId(null);
                setStatementOpen(true);
              }}
            >
              <Icon id="file" />
              Éditer le relevé de ce client
            </Button>
          </>
        )}
      </Slideover>

      <GreyLabelStatementModal
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        clients={usage.map(u => ({ id: u.id, label: u.name }))}
        periods={statementPeriods}
        officeName={officeName}
        onGenerate={value => {
          onGenerateStatement?.(value);
          setStatementOpen(false);
        }}
      />
    </Screen>
  );
}
