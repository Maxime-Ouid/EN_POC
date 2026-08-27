import { Button } from '../atoms/Button';
import { Grid } from '../atoms/Grid';
import { Pill } from '../atoms/Pill';
import { AvatarStack } from '../molecules/AvatarStack';
import { ButtonRow } from '../molecules/ButtonRow';
import type { PillKind } from '../atoms/Pill';

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
  return (
    <section className="screen is-active">
      <div className="eyebrow">Vue consolidée</div>
      <h1 className="page-title">Portefeuilles</h1>
      <div className="page-sub">
        Regroupez les datarooms d'un même client ou d'une même opération complexe.
      </div>
      <ButtonRow style={{ marginTop: 18, marginBottom: 20 }}>
        <Button variant="accent" onClick={onCreate}>
          <svg className="icon">
            <use href="#i-plus" />
          </svg>
          Nouveau portefeuille
        </Button>
        <Button onClick={onFilter}>
          <svg className="icon">
            <use href="#i-filter" />
          </svg>
          Filtrer
        </Button>
      </ButtonRow>

      <Grid columns={3}>
        {portfolios.map(p => (
          <div className="card card-pad" key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div
                className="row-icon"
                style={{
                  background: p.muted ? 'var(--surface-alt)' : p.iconBg,
                  color: p.muted ? 'var(--ink-500)' : p.iconColor,
                  width: 34,
                  height: 34,
                  border: p.muted ? '1px solid var(--border)' : undefined,
                }}
              >
                <svg className="icon" style={{ width: 16, height: 16 }}>
                  <use href={`#i-${p.icon}`} />
                </svg>
              </div>
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
