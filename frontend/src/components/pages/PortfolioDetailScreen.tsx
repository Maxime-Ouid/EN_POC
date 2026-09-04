import { createPortal } from 'react-dom';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Grid } from '../atoms/Grid';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { RowIcon } from '../atoms/RowIcon';
import { BarTrack } from '../atoms/BarTrack';
import { AvatarStack } from '../molecules/AvatarStack';
import { Breadcrumb } from '../molecules/Breadcrumb';
import { ButtonRow } from '../molecules/ButtonRow';
import { FeedItem } from '../molecules/FeedItem';
import { MetaBanner } from '../molecules/MetaBanner';
import { StatCard } from '../molecules/StatCard';
import { TableCard } from '../organisms/TableCard';
import { useTopbarSlots } from '../templates/topbarSlots';
import type { PillKind } from '../atoms/Pill';

/* ===========================================================================
   Vue consolidée d'un portefeuille — §2.1 du document de vision.

   Le portefeuille regroupe plusieurs datarooms liées à un même client ou à une
   même opération, et sa raison d'être est la CONSOLIDATION : retrouver d'un
   coup toutes les datarooms d'une opération multi-actifs, ou, dans un projet
   APUI, voir depuis l'office pilote ce que chaque participant administre dans
   sa propre dataroom.

   La liste des portefeuilles existait déjà (PortfoliosScreen) mais ouvrait sur
   la liste générale des dossiers : on voyait le regroupement sans jamais voir
   l'ensemble. C'est cet écran-là qui manquait.

   Le cas APUI est signalé par `apui` plutôt que déduit du nombre de
   participants : la vision (§11) laisse sa conception ouverte, on ne va donc
   pas inventer une règle d'inférence qu'il faudra défaire.
   =========================================================================== */

export interface PortfolioDataroomRow {
  id: string;
  name: string;
  /** Office qui administre cette dataroom — le sien, ou un participant en APUI. */
  holder: string;
  status: { kind: PillKind; label: string };
  documents: number;
  storage: string;
  /** Part de cette dataroom dans le stockage du portefeuille, en pourcentage. */
  sharePercent: number;
  lastActivity: string;
  members: Array<{ label: string; gray?: boolean }>;
}

export interface PortfolioDetailScreenProps {
  name: string;
  desc: string;
  status: { kind: PillKind; label: string };
  /** `true` pour un projet APUI : chaque participant administre sa dataroom. */
  apui?: boolean;
  meta: Array<{ label: string; value: React.ReactNode }>;
  stats: {
    dataroomCount: number;
    documentCount: number;
    storage: string;
    memberCount: number;
    openQuestions: number;
  };
  datarooms: PortfolioDataroomRow[];
  activity: Array<{ id: string; icon: string; iconBg: string; iconColor: string; text: React.ReactNode; time: string }>;
  onBackToList: () => void;
  onOpenDataroom: (id: string) => void;
  /** Export consolidé du portefeuille. Absent = bouton inerte (maquette). */
  onExport?: () => void;
}

export function PortfolioDetailScreen({
  name,
  desc,
  status,
  apui,
  meta,
  stats,
  datarooms,
  activity,
  onBackToList,
  onOpenDataroom,
  onExport,
}: PortfolioDetailScreenProps) {
  const slots = useTopbarSlots();

  /* Même geste que la fiche dossier : le fil d'Ariane remonte dans la topbar,
     seul repère d'écran depuis le retrait des titres de page. Hors AppShell
     (UI kit) le conteneur vaut null et le fil reste en tête d'écran. */
  const crumb = (
    <Breadcrumb items={[{ label: 'Portefeuilles', onClick: onBackToList }]} current={name} />
  );

  return (
    <section className="screen is-active">
      {slots.start ? createPortal(crumb, slots.start) : crumb}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <ButtonRow>
          <Pill kind={status.kind}>{status.label}</Pill>
          {apui && (
            <Pill kind="info" icon="users">
              Projet APUI
            </Pill>
          )}
          <span className="tiny dim">{desc}</span>
        </ButtonRow>
        <ButtonRow>
          <Button size="sm" onClick={onExport}>
            <Icon id="down" />
            Export consolidé
          </Button>
        </ButtonRow>
      </div>

      <MetaBanner items={meta} style={{ marginTop: 18 }} />

      <Grid columns={4} style={{ marginTop: 18 }}>
        <StatCard
          label="Datarooms"
          value={stats.dataroomCount}
          icon="folder"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
        />
        <StatCard
          label="Documents"
          value={stats.documentCount.toLocaleString('fr-FR')}
          icon="file"
          iconBg="var(--brass-100)"
          iconColor="var(--brass-700)"
        />
        <StatCard
          label="Stockage cumulé"
          value={stats.storage}
          icon="layers"
          iconBg="var(--success-bg)"
          iconColor="var(--success)"
        />
        <StatCard
          label="Questions en attente"
          value={stats.openQuestions}
          icon="msg"
          iconBg="var(--warning-bg)"
          iconColor="var(--warning)"
          sub={<span className="tiny dim">{stats.memberCount} intervenants</span>}
        />
      </Grid>

      <div className="section-title" style={{ marginTop: 22, marginBottom: 10 }}>
        Datarooms du portefeuille
      </div>
      <TableCard
        headers={[
          'Dataroom',
          apui ? 'Administrée par' : 'Référent',
          'Statut',
          'Documents',
          'Stockage',
          'Part',
          'Intervenants',
          'Activité',
        ]}
      >
        {datarooms.map(d => (
          <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => onOpenDataroom(d.id)}>
            <td className="row-name">
              <RowIcon icon="folder" bg="var(--info-bg)" color="var(--info)" />
              {d.name}
            </td>
            <td className="dim">{d.holder}</td>
            <td>
              <Pill kind={d.status.kind}>{d.status.label}</Pill>
            </td>
            <td className="mono">{d.documents}</td>
            <td className="mono">{d.storage}</td>
            <td style={{ width: 150 }}>
              <BarTrack
                percent={d.sharePercent}
                label={`${d.name} — ${Math.round(d.sharePercent)} % du stockage du portefeuille`}
              />
            </td>
            <td>
              <AvatarStack avatars={d.members} />
            </td>
            <td className="dim">{d.lastActivity}</td>
          </tr>
        ))}
      </TableCard>

      <div className="section-title" style={{ marginTop: 22, marginBottom: 10 }}>
        Activité consolidée
      </div>
      <Card padded>
        {activity.map(a => (
          <FeedItem
            key={a.id}
            icon={a.icon}
            iconBg={a.iconBg}
            iconColor={a.iconColor}
            text={a.text}
            time={a.time}
          />
        ))}
      </Card>
    </section>
  );
}
