/* ===========================================================================
   Corps des widgets — la « version widget » de chaque écran.

   Un widget n'est pas un écran rétréci : c'est la question à laquelle l'écran
   répond, posée en une hauteur de carte. L'écran « Statistiques & facturation »
   affiche quatre tableaux ; sa version widget en montre trois lignes et un lien
   « Tout voir ». Réduire un tableau de dix colonnes à un tableau de dix
   colonnes plus petit ne rend service à personne.

   D'où trois règles suivies partout ici :
     1. jamais de tableau — des lignes `w-row`, lisibles à 3 colonnes de large ;
     2. une liste est TRONQUÉE (`take`) et le dit, avec un lien vers l'écran ;
     3. aucun appel réseau : tout vient du contexte (voir types.ts).
   =========================================================================== */

import type { ReactNode } from 'react';
import { Pill } from '../components/atoms/Pill';
import { Avatar } from '../components/atoms/Avatar';
import { IconChip } from '../components/atoms/IconChip';
import { StatCard } from '../components/molecules/StatCard';
import { FeedItem } from '../components/molecules/FeedItem';
import type { WidgetContext, WidgetRenderProps } from './types';
import { QUICK_ACTIONS_BY_KEY, readCardActions } from './actions';

/** Nombre de lignes affichées par défaut dans les widgets de liste. */
const DEFAULT_TAKE = 4;

/* --- Briques communes ----------------------------------------------------- */

function WidgetList({ children }: { children: ReactNode }) {
  return <div className="w-list">{children}</div>;
}

interface WidgetRowProps {
  name: ReactNode;
  meta?: ReactNode;
  lead?: ReactNode;
  side?: ReactNode;
  onClick?: () => void;
}

/** Ligne générique d'un widget : pastille optionnelle, nom, méta, statut. */
function WidgetRow({ name, meta, lead, side, onClick }: WidgetRowProps) {
  const content = (
    <>
      {lead}
      <div className="w-row-main">
        <div className="w-row-name">{name}</div>
        {meta && <div className="w-row-meta">{meta}</div>}
      </div>
      {side && <div className="w-row-side">{side}</div>}
    </>
  );
  if (!onClick) return <div className="w-row">{content}</div>;
  return (
    <button type="button" className="w-row w-row-clickable" onClick={onClick}>
      {content}
    </button>
  );
}

/** Pastille d'icône colorée en tête de ligne — même code couleur que les écrans. */
function WidgetLead({ icon, bg, color }: { icon: string; bg: string; color: string }) {
  return <IconChip icon={icon} bg={bg} color={color} chip="w-row-icon" />;
}

/** Message affiché quand la liste est vide — un widget vide ne doit pas être muet. */
function WidgetEmpty({ children }: { children: ReactNode }) {
  return <div className="w-empty">{children}</div>;
}

/* --- Chiffres ------------------------------------------------------------- */

export function DossiersActifsWidget({ stats }: WidgetContext) {
  return (
    <StatCard
      label="Dossiers actifs"
      value={stats.activeDatarooms}
      icon="folder"
      iconBg="var(--info-bg)"
      iconColor="var(--info)"
      delta={{ text: stats.activeDeltaText, tone: 'up' }}
    />
  );
}

export function StockageWidget({ stats }: WidgetContext) {
  const pct = Math.round((stats.storageUsedGo / stats.storageQuotaGo) * 100);
  return (
    <StatCard
      label="Stockage utilisé"
      value={
        <>
          {stats.storageUsedGo}
          <span className="w-unit"> Go</span>
        </>
      }
      icon="layers"
      iconBg="var(--brass-100)"
      iconColor="var(--brass-700)"
      sub={
        <>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="w-bar-legend">
            {pct} % de l'offre {stats.storageQuotaGo} Go
          </div>
        </>
      }
    />
  );
}

export function QuestionsEnAttenteWidget({ stats }: WidgetContext) {
  return (
    <StatCard
      label="Questions en attente"
      value={stats.pendingQuestions}
      icon="msg"
      iconBg="var(--warning-bg)"
      iconColor="var(--warning)"
      delta={{ text: stats.pendingWarnText, tone: 'warn' }}
    />
  );
}

export function MembresConnectesWidget({ stats }: WidgetContext) {
  return (
    <StatCard
      label="Membres connectés"
      value={stats.connectedMembers}
      icon="users"
      iconBg="var(--success-bg)"
      iconColor="var(--success)"
      sub={`sur ${stats.totalMembers} comptes de l'étude`}
    />
  );
}

/* --- Suivi ---------------------------------------------------------------- */

export function ActiviteWidget({ activity }: WidgetContext) {
  if (activity.length === 0) return <WidgetEmpty>Aucune activité récente.</WidgetEmpty>;
  return (
    <div>
      {activity.slice(0, 5).map(item => (
        <FeedItem
          key={item.id}
          compact
          icon={item.icon}
          iconBg={item.iconBg}
          iconColor={item.iconColor}
          text={item.text}
          time={item.time}
        />
      ))}
    </div>
  );
}

export function QuestionsWidget({ questions }: WidgetContext) {
  if (questions.length === 0) return <WidgetEmpty>Aucune question ouverte.</WidgetEmpty>;
  return (
    <WidgetList>
      {questions.slice(0, DEFAULT_TAKE).map(q => (
        <WidgetRow
          key={q.id}
          name={q.object}
          meta={q.meta}
          side={<Pill kind={q.status.kind}>{q.status.label}</Pill>}
        />
      ))}
    </WidgetList>
  );
}

export function QuiEstConnecteWidget({ connected }: WidgetContext) {
  if (connected.length === 0) return <WidgetEmpty>Personne n'est connecté.</WidgetEmpty>;
  return (
    <WidgetList>
      {connected.slice(0, 5).map(p => (
        <WidgetRow
          key={p.id}
          lead={<Avatar size="sm">{p.initials}</Avatar>}
          name={p.name}
          meta={p.detail}
        />
      ))}
    </WidgetList>
  );
}

/* --- Listes --------------------------------------------------------------- */

export function PortefeuillesWidget({ portfolios, navigate }: WidgetContext) {
  if (portfolios.length === 0) return <WidgetEmpty>Aucun portefeuille.</WidgetEmpty>;
  return (
    <WidgetList>
      {portfolios.slice(0, DEFAULT_TAKE).map(p => (
        <WidgetRow
          key={p.id}
          onClick={() => navigate('datarooms')}
          lead={<WidgetLead icon={p.icon} bg={p.iconBg} color={p.iconColor} />}
          name={p.name}
          meta={p.desc}
          side={<Pill kind={p.status.kind}>{p.status.label}</Pill>}
        />
      ))}
    </WidgetList>
  );
}

export function DossiersRecentsWidget({ datarooms, navigate }: WidgetContext) {
  if (datarooms.length === 0) return <WidgetEmpty>Aucun dossier pour le moment.</WidgetEmpty>;
  return (
    <WidgetList>
      {datarooms.slice(0, 5).map(d => (
        <WidgetRow
          key={d.id}
          onClick={() => navigate('datarooms')}
          lead={<WidgetLead icon="folder" bg="var(--info-bg)" color="var(--info)" />}
          name={d.name}
          meta={d.meta}
        />
      ))}
    </WidgetList>
  );
}

export function StockageParEspaceWidget({ usage }: WidgetContext) {
  if (usage.length === 0) return <WidgetEmpty>Aucun espace client.</WidgetEmpty>;
  return (
    <div className="w-list">
      {usage.slice(0, DEFAULT_TAKE).map(row => (
        <div className="w-usage" key={row.id}>
          <div className="w-usage-head">
            <span className="w-row-name">{row.name}</span>
            <span className={row.warning ? 'w-usage-pct w-usage-warn' : 'w-usage-pct'}>
              {row.percent} %
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${row.percent}%` }} />
          </div>
          <div className="w-row-meta">{row.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function FacturationWidget({ invoices }: WidgetContext) {
  if (invoices.length === 0) return <WidgetEmpty>Aucune facture émise.</WidgetEmpty>;
  return (
    <WidgetList>
      {invoices.slice(0, DEFAULT_TAKE).map(inv => (
        <WidgetRow
          key={inv.id}
          name={inv.period}
          meta={inv.detail}
          side={<span className="w-amount mono">{inv.amount}</span>}
        />
      ))}
    </WidgetList>
  );
}

/* --- Office --------------------------------------------------------------- */

export function AnnuaireWidget({ members }: WidgetContext) {
  if (members.length === 0) return <WidgetEmpty>Aucun membre.</WidgetEmpty>;
  return (
    <WidgetList>
      {members.slice(0, 5).map(m => (
        <WidgetRow
          key={m.id}
          lead={<Avatar size="sm">{m.initials}</Avatar>}
          name={m.name}
          meta={m.detail}
          side={m.status && <Pill kind={m.status.kind}>{m.status.label}</Pill>}
        />
      ))}
    </WidgetList>
  );
}

export function ModulesWidget({ modules }: WidgetContext) {
  if (modules.length === 0) return <WidgetEmpty>Aucun module au catalogue.</WidgetEmpty>;
  return (
    <WidgetList>
      {modules.map(m => (
        <WidgetRow
          key={m.slug}
          name={m.name}
          side={
            <Pill kind={m.enabled ? 'success' : 'neutral'}>{m.enabled ? 'Actif' : 'Inactif'}</Pill>
          }
        />
      ))}
    </WidgetList>
  );
}

/* --- Actions -------------------------------------------------------------
   Les seuls widgets qui n'abrègent aucun écran : ils en DÉCLENCHENT le geste.
   Ils ne savent pas le faire eux-mêmes — ils nomment une action du catalogue
   (actions.ts) et laissent l'application l'exécuter, ce qui est la même règle
   que pour les données : un widget ne va rien chercher, ne fait rien tout seul.
   ---------------------------------------------------------------------- */

/**
 * Carte « Actions rapides » — la suite du widget « Raccourcis », qui n'ouvrait
 * que des écrans et dont le contenu était figé dans le code.
 *
 * Son contenu se choisit (bouton de configuration du cadre, en mode édition)
 * et se range dans les réglages du placement. Sans réglage, elle affiche la
 * sélection par défaut : utile dès l'ajout, personne n'a à la configurer pour
 * qu'elle serve.
 */
export function ActionsRapidesWidget({
  options,
  ...ctx
}: WidgetContext & Pick<WidgetRenderProps, 'options'>) {
  const keys = readCardActions(options, ctx.allowedActions);
  if (keys.length === 0) {
    return <WidgetEmpty>Aucune action à afficher — choisissez-en dans la configuration.</WidgetEmpty>;
  }
  return (
    <div className="w-shortcuts">
      {keys.map(key => {
        const action = QUICK_ACTIONS_BY_KEY[key];
        return (
          <button
            type="button"
            key={key}
            className="w-shortcut"
            onClick={() => ctx.runAction(key)}
          >
            <svg className="icon">
              <use href={`#i-${action.icon}`} />
            </svg>
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tuile d'une seule action, au gabarit d'un chiffre-clé.
 *
 * La carte ENTIÈRE est le bouton (d'où `bare` dans le registre) : une tuile de
 * 3 × 3 qui contiendrait un cadre, un titre et un bouton ferait trois surfaces
 * cliquables apparentes pour un seul geste.
 *
 * Une action retirée du catalogue ou refusée à ce membre ne laisse pas un
 * bouton mort : la tuile dit ce qui manque. Ce cas est rare — la bibliothèque
 * n'offre pas ces widgets à qui n'a pas le droit — mais il survient pour un
 * accueil rangé avant un changement de rôle.
 */
export function ActionTileWidget({
  actionKey,
  ...ctx
}: WidgetContext & { actionKey: string }) {
  const action = QUICK_ACTIONS_BY_KEY[actionKey];
  if (!action || !ctx.allowedActions.includes(actionKey)) {
    return (
      <div className="w-tile w-tile-off">
        <span className="w-tile-label">Action indisponible</span>
        <span className="w-tile-desc">
          Elle n’est pas ouverte à votre rôle dans l’étude. Retirez cette tuile en mode
          Personnaliser.
        </span>
      </div>
    );
  }
  return (
    <button type="button" className="w-tile" onClick={() => ctx.runAction(actionKey)}>
      {/* Glyphe du sprite et non <IconChip> : les illustrations 3D de
          l'application désignent des TYPES D'OBJET (un dossier, un message).
          Une action est un verbe — « déposer », « inviter » — et la moitié du
          catalogue n'a de toute façon pas d'illustration, ce qui donnerait une
          rangée de tuiles à deux registres. */}
      <span className="w-tile-icon">
        <svg className="icon">
          <use href={`#i-${action.icon}`} />
        </svg>
      </span>
      <span className="w-tile-label">{action.label}</span>
      <span className="w-tile-desc">{action.desc}</span>
    </button>
  );
}
