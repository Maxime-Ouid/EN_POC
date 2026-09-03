import { createPortal } from 'react-dom';
import { Button } from '../atoms/Button';
import { Grid } from '../atoms/Grid';
import { IconChip } from '../atoms/IconChip';
import { Pill } from '../atoms/Pill';
import { AvatarStack } from '../molecules/AvatarStack';
import { ButtonRow } from '../molecules/ButtonRow';
import type { PillKind } from '../atoms/Pill';
import { useTopbarSlots } from '../templates/topbarSlots';

export interface Portfolio {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  muted?: boolean;
  name: string;
  desc: string;
  status: { kind: PillKind; label: string };
  storage: string;
  lastActivity: string;
  members: Array<{ label: string; gray?: boolean }>;
}

export interface PortfoliosScreenProps {
  portfolios: Portfolio[];
  onCreate: () => void;
  onFilter: () => void;
  onOpen: (id: string) => void;
}

// Écran "Portefeuilles" — index_16.html #screen-portfolios.
export function PortfoliosScreen({ portfolios, onCreate, onFilter, onOpen }: PortfoliosScreenProps) {
  const slots = useTopbarSlots();

  /* Création et filtre remontent dans la topbar (01/09/2026), comme le décompte
     et la création de la liste des dossiers : à eux deux ils tenaient une ligne
     entière au-dessus de la grille, alors que le début de barre reste vide sur
     cet écran. L'action primaire se lit donc au même endroit que sur les autres
     écrans, et ne glisse plus hors de vue au défilement.

     Portail plutôt que props : la topbar est montée par AppShell, très au-dessus
     de cet écran, et `onCreate` / `onFilter` appartiennent à son appelant (voir
     templates/topbarSlots.ts). */
  const topbarCommands = (
    <>
      <Button variant="accent" size="sm" onClick={onCreate}>
        <svg className="icon">
          <use href="#i-plus" />
        </svg>
        Nouveau portefeuille
      </Button>
      <Button size="sm" onClick={onFilter}>
        <svg className="icon">
          <use href="#i-filter" />
        </svg>
        Filtrer
      </Button>
    </>
  );

  return (
    <section className="screen is-active">
      {/* Titre retiré le 28/08/2026 — le fil d'Ariane dit « Portefeuilles ». */}
      {/* Hors AppShell (UiKit, démos isolées) le conteneur vaut `null` : les
          commandes restent alors en tête d'écran plutôt que de disparaître. */}
      {slots.start ? (
        createPortal(topbarCommands, slots.start)
      ) : (
        <ButtonRow style={{ marginBottom: 20 }}>{topbarCommands}</ButtonRow>
      )}

      <Grid columns={3}>
        {portfolios.map(p => (
          <div className="card card-pad" key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <IconChip
                icon={p.icon}
                bg={p.muted ? 'var(--surface-alt)' : p.iconBg}
                color={p.muted ? 'var(--ink-500)' : p.iconColor}
                size={34}
                iconSize={16}
                muted={p.muted}
              />
              <Pill kind={p.status.kind}>{p.status.label}</Pill>
            </div>
            <div className="section-title" style={{ marginTop: 12 }}>
              {p.name}
            </div>
            <div className="tiny dim" style={{ marginTop: 3 }}>
              {p.desc}
            </div>
            <hr className="sep" style={{ margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span className="dim">Stockage cumulé</span>
              <span className="mono" style={{ fontWeight: 600 }}>{p.storage}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 6 }}>
              <span className="dim">Dernière activité</span>
              <span>{p.lastActivity}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <AvatarStack avatars={p.members} />
              <Button size="sm" onClick={() => onOpen(p.id)}>
                Ouvrir →
              </Button>
            </div>
          </div>
        ))}
      </Grid>
    </section>
  );
}
