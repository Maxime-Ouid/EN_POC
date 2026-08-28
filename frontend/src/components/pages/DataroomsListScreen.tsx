import { Button } from '../atoms/Button';
import { Pill } from '../atoms/Pill';
import { RowMenu } from '../atoms/RowMenu';
import { Tag } from '../atoms/Tag';
import { AvatarStack } from '../molecules/AvatarStack';
import { ButtonRow } from '../molecules/ButtonRow';
import { RowName } from '../molecules/RowName';
import { TopbarSearch } from '../molecules/TopbarSearch';
import { TableCard } from '../organisms/TableCard';
import type { PillKind } from '../atoms/Pill';

export interface DataroomRow {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  muted?: boolean;
  name: string;
  portfolio?: string;
  tags: Array<{ label: string; plain?: boolean }>;
  members: Array<{ label: string; gray?: boolean }>;
  storage: string;
  activity: string;
  status: { kind: PillKind; label: string };
}

export interface DataroomsListScreenProps {
  totalCount: number;
  rows: DataroomRow[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onSearch?: (value: string) => void;
  displayRange: string; // ex. "1–6 sur 245 dossiers"
}

// Écran "Dossiers" (liste) — index_16.html #screen-datarooms.
export function DataroomsListScreen({
  totalCount,
  rows,
  onOpen,
  onCreate,
  onSearch,
  displayRange,
}: DataroomsListScreenProps) {
  return (
    <section className="screen is-active">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">{totalCount} dossiers</div>
          <h1 className="page-title">Dossiers</h1>
          <div className="page-sub">
            Chaque dossier est une dataroom : arborescence, droits et échanges dédiés à une opération.
          </div>
        </div>
        <Button variant="accent" onClick={onCreate}>
          <svg className="icon">
            <use href="#i-plus" />
          </svg>
          Nouveau dossier
        </Button>
      </div>

      <ButtonRow style={{ margin: '18px 0' }}>
        <TopbarSearch
          placeholder="Rechercher…"
          onChange={onSearch}
          style={{ maxWidth: 260, margin: 0 }}
        />
        <Button size="sm">
          <svg className="icon">
            <use href="#i-filter" />
          </svg>
          Portefeuille
        </Button>
        <Button size="sm">Statut</Button>
        <Button size="sm">
          <svg className="icon">
            <use href="#i-tag" />
          </svg>
          Tags
        </Button>
        <div style={{ marginLeft: 'auto' }} className="dim tiny">
          Tri par activité récente
        </div>
      </ButtonRow>

      <TableCard headers={['Dossier', 'Portefeuille', 'Tags', 'Membres', 'Stockage', 'Activité', 'Statut', '']}>
        {rows.map(row => (
          <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(row.id)}>
            <RowName icon={row.icon} iconBg={row.iconBg} iconColor={row.iconColor} muted={row.muted}>
              {row.name}
            </RowName>
            <td className="dim">{row.portfolio ?? '—'}</td>
            <td>
              {row.tags.length
                ? row.tags.map((t, i) => (
                    <Tag key={i} icon={t.plain ? undefined : 'tag'} plain={t.plain}>
                      {t.label}
                    </Tag>
                  ))
                : '—'}
            </td>
            <td>{row.members.length ? <AvatarStack avatars={row.members} /> : <span className="dim">—</span>}</td>
            <td className="mono">{row.storage}</td>
            <td className="dim tiny">{row.activity}</td>
            <td>
              <Pill kind={row.status.kind}>{row.status.label}</Pill>
            </td>
            <RowMenu />
          </tr>
        ))}
      </TableCard>
      <div className="tiny dim" style={{ marginTop: 12 }}>
        Affichage {displayRange}
      </div>
    </section>
  );
}
