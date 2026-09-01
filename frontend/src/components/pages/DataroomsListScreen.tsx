import { createPortal } from 'react-dom';
import { Button } from '../atoms/Button';
import { Pill } from '../atoms/Pill';
import { RowMenu } from '../atoms/RowMenu';
import { AvatarStack } from '../molecules/AvatarStack';
import { ButtonRow } from '../molecules/ButtonRow';
import { RowName } from '../molecules/RowName';
import { TagFilter } from '../molecules/TagFilter';
import { TopbarSearch } from '../molecules/TopbarSearch';
import { TableCard } from '../organisms/TableCard';
import { TagPicker } from '../organisms/TagPicker';
import type { PillKind } from '../atoms/Pill';
import type { TagColor } from '../atoms/Tag';
import { useTopbarSlots } from '../templates/topbarSlots';
import type { TagRef } from '../organisms/TagPicker';

export interface DataroomRow {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  muted?: boolean;
  name: string;
  portfolio?: string;
  tags: TagRef[];
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
  /**
   * Catalogue de tags de l'office — alimente à la fois le menu de filtre et,
   * ligne par ligne, le sélecteur de la colonne « Tags ». Absent = l'écran se
   * comporte comme avant l'arrivée des tags (colonne en lecture seule, bouton
   * de filtre inerte), ce qui garde les aperçus du kit d'interface valides.
   */
  tagCatalog?: TagRef[];
  /** Ids cochés dans le menu de filtre — sémantique OU (au moins un). */
  selectedTagIds?: number[];
  onTagFilterChange?: (tagIds: number[]) => void;
  /**
   * Pose la sélection COMPLÈTE de tags sur un dossier. Absent = la colonne
   * « Tags » reste en lecture seule.
   */
  onRowTagsChange?: (dataroomId: string, tagIds: number[]) => void | Promise<void>;
  /** Création à la volée depuis la colonne « Tags ». Absent = catalogue figé. */
  onCreateTag?: (name: string, color: TagColor) => Promise<TagRef>;
}

// Écran "Dossiers" (liste) — index_16.html #screen-datarooms.
export function DataroomsListScreen({
  totalCount,
  rows,
  onOpen,
  onCreate,
  onSearch,
  displayRange,
  tagCatalog = [],
  selectedTagIds = [],
  onTagFilterChange,
  onRowTagsChange,
  onCreateTag,
}: DataroomsListScreenProps) {
  const slots = useTopbarSlots();

  /* Décompte et création remontent dans la topbar, au début de barre
     (01/09/2026) : ils tenaient à eux deux une ligne entière au-dessus de la
     liste, alors que la barre garde sa gauche vide sur cet écran. Le décompte
     nomme l'écran — c'est le repère qui remplace le titre retiré le 28/08/2026 —
     et l'action primaire se lit juste après lui, au même endroit que sur les
     autres écrans, plutôt qu'à l'opposé de la ligne.

     Portail plutôt que props : la topbar est montée par AppShell, très au-dessus
     de cet écran, et `onCreate` appartient à l'appelant de l'écran (voir
     templates/topbarSlots.ts). */
  const topbarCommands = (
    <>
      <div className="eyebrow">{totalCount} dossiers</div>
      <Button variant="accent" size="sm" onClick={onCreate}>
        <svg className="icon">
          <use href="#i-plus" />
        </svg>
        Nouveau dossier
      </Button>
    </>
  );

  return (
    <section className="screen is-active">
      {/* Hors AppShell (UiKit, démos isolées) le conteneur vaut `null` : les
          commandes restent alors en tête d'écran plutôt que de disparaître. */}
      {slots.start ? (
        createPortal(topbarCommands, slots.start)
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{topbarCommands}</div>
      )}

      <ButtonRow style={{ margin: '0 0 18px' }}>
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
        <TagFilter
          options={tagCatalog}
          selected={selectedTagIds}
          onChange={next => onTagFilterChange?.(next)}
        />
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
              {/* Le sélecteur est monté même sur une ligne sans tag : c'est le
                  bouton « + » qui rend le tagging découvrable, et une colonne
                  qui n'affiche « — » qu'en lecture ne dit jamais qu'on peut y
                  poser quelque chose. */}
              <TagPicker
                value={row.tags}
                catalog={tagCatalog}
                readOnly={!onRowTagsChange}
                onChange={tagIds => onRowTagsChange?.(row.id, tagIds)}
                onCreate={onCreateTag}
              />
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
