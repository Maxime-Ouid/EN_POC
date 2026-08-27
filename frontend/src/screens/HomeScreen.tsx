import { Grid, StatCard } from '../components/Card';
import { Pill } from '../components/Badge';
import { FeedItem } from '../components/Feed';

export interface PortfolioSummary {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  name: string;
  desc: string;
  status: { kind: 'success' | 'neutral'; label: string };
}

export interface FeedEntry {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  text: React.ReactNode;
  time: string;
}

export interface HomeScreenProps {
  officeName: string;
  userFirstName: string;
  stats: {
    activeDatarooms: number;
    activeDeltaText: string;
    storageUsedGo: number;
    storageQuotaGo: number;
    pendingQuestions: number;
    pendingWarnText: string;
    connectedMembers: number;
    totalMembers: number;
  };
  recentPortfolios: PortfolioSummary[];
  recentActivity: FeedEntry[];
  onOpenPortfolio: (id: string) => void;
  onSeeAllPortfolios: () => void;
  onSeeFullHistory: () => void;
}

// Écran d'accueil / dashboard — voir index_16.html #screen-dashboard.
export function HomeScreen({
  officeName,
  userFirstName,
  stats,
  recentPortfolios,
  recentActivity,
  onOpenPortfolio,
  onSeeAllPortfolios,
  onSeeFullHistory,
}: HomeScreenProps) {
  const storagePct = Math.round((stats.storageUsedGo / stats.storageQuotaGo) * 100);

  return (
    <section className="screen is-active">
      <div className="eyebrow">{officeName}</div>
      <h1 className="page-title">Bonjour, {userFirstName}</h1>
      <div className="page-sub">Voici l'activité de votre Espace Notarial cette semaine.</div>

      <Grid columns={4} style={{ marginTop: 22 }}>
        <StatCard
          label="Dossiers actifs"
          value={stats.activeDatarooms}
          icon="folder"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          delta={{ text: stats.activeDeltaText, tone: 'up' }}
        />
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label" style={{ margin: 0 }}>
              Stockage utilisé
            </span>
            <div className="stat-icon" style={{ background: 'var(--brass-100)', color: 'var(--brass-700)' }}>
              <svg className="icon">
                <use href="#i-layers" />
              </svg>
            </div>
          </div>
          <div className="stat-value mono">
            {stats.storageUsedGo}
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-500)' }}> Go</span>
          </div>
          <div className="bar-track" style={{ marginTop: 9 }}>
            <div className="bar-fill" style={{ width: `${storagePct}%` }} />
          </div>
          <div className="tiny dim" style={{ marginTop: 5 }}>
            {storagePct} % de l'offre {stats.storageQuotaGo} Go
          </div>
        </div>
        <StatCard
          label="Questions en attente"
          value={stats.pendingQuestions}
          icon="msg"
          iconBg="var(--warning-bg)"
          iconColor="var(--warning)"
          sub={stats.pendingWarnText}
        />
        <StatCard
          label="Membres connectés"
          value={stats.connectedMembers}
          icon="users"
          iconBg="var(--success-bg)"
          iconColor="var(--success)"
          sub={`sur ${stats.totalMembers} comptes de l'étude`}
        />
      </Grid>

      <Grid columns={2} style={{ marginTop: 22, alignItems: 'start' }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-title">Portefeuilles récents</div>
            <a
              className="tiny"
              href="#"
              onClick={e => { e.preventDefault(); onSeeAllPortfolios(); }}
              style={{ color: 'var(--brass-600)', fontWeight: 600 }}
            >
              Tout voir →
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPortfolios.map(p => (
              <div
                key={p.id}
                className="tpl-option"
                style={{ margin: 0, cursor: 'pointer' }}
                onClick={() => onOpenPortfolio(p.id)}
              >
                <div className="row-icon" style={{ background: p.iconBg, color: p.iconColor }}>
                  <svg className="icon">
                    <use href={`#i-${p.icon}`} />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tpl-name">{p.name}</div>
                  <div className="tpl-desc">{p.desc}</div>
                </div>
                <Pill kind={p.status.kind}>{p.status.label}</Pill>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 14 }}>
            Activité récente
          </div>
          {recentActivity.map(item => (
            <FeedItem key={item.id} icon={item.icon} iconBg={item.iconBg} iconColor={item.iconColor} text={item.text} time={item.time} />
          ))}
          <a
            href="#"
            className="tiny"
            style={{ color: 'var(--brass-600)', fontWeight: 600, display: 'inline-block', marginTop: 10 }}
            onClick={e => { e.preventDefault(); onSeeFullHistory(); }}
          >
            Voir l'historique complet →
          </a>
        </div>
      </Grid>
    </section>
  );
}
