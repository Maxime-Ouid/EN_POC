import { useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Pill } from '../atoms/Pill';
import { Screen } from '../atoms/Screen';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';
import { ButtonRow } from '../molecules/ButtonRow';
import { TablePager } from '../molecules/TablePager';
import { TableCard } from '../organisms/TableCard';
import type { PillKind } from '../atoms/Pill';

/* ===========================================================================
   Audit trail de l'office — §3.2 et §4.6 du document de vision, et pendant
   métier de l'objectif OS10 de la DSN 2026 (§7.7).

   Distinct de l'onglet « Historique » d'un dossier, qui ne montre que la vie
   d'UNE dataroom : cet écran est le journal de TOUT l'office, seul endroit où
   l'on peut répondre à « qu'a fait cet utilisateur cette semaine » ou
   « qui a touché à ce document ». Les deux vues liront le même flux
   d'événements le jour où il existera côté serveur ; c'est pour cela que
   `AuditEvent` reprend la forme de `HistoryRow` en y ajoutant seulement ce
   qu'un journal d'office impose : le dossier concerné et l'origine de l'accès.

   Le périmètre exact des événements tracés et leur durée de conservation ne
   sont pas arbitrés (§11) : l'écran affiche donc la durée en vigueur plutôt
   que de la laisser deviner, et la liste des catégories ci-dessous est une
   proposition à faire valider, pas une spécification.
   =========================================================================== */

/** Catégories d'événements. L'ensemble est fermé pour que le filtre et la
    pastille ne puissent pas diverger d'un écran à l'autre. */
export type AuditCategory = 'acces' | 'depot' | 'modification' | 'suppression' | 'droits' | 'partage' | 'securite';

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  acces: 'Consultation',
  depot: 'Dépôt',
  modification: 'Modification',
  suppression: 'Suppression',
  droits: 'Droits',
  partage: 'Partage',
  securite: 'Sécurité',
};

/** L'intention visuelle est portée par la CATÉGORIE, pas par le libellé de
    l'action : « Suppression » se lit en critique où qu'elle apparaisse. */
const CATEGORY_KIND: Record<AuditCategory, PillKind> = {
  acces: 'neutral',
  depot: 'success',
  modification: 'info',
  suppression: 'critical',
  droits: 'warning',
  partage: 'warning',
  securite: 'critical',
};

export interface AuditEvent {
  id: string;
  /** Horodatage déjà formaté par l'appelant — la base de temps fiable exigée
      par l'OS10 est une affaire de serveur, pas de rendu. */
  timestamp: string;
  /** Jour ISO (AAAA-MM-JJ), utilisé par le filtre de période sans reparser le
      libellé affiché. */
  day: string;
  actor: string;
  actorInitials: string;
  actorGray?: boolean;
  category: AuditCategory;
  /** Libellé précis de l'action (« Téléchargement du document », « Ajout d'un membre »). */
  action: string;
  /** Objet touché : nom du document, du dossier, du membre… */
  target: string;
  /** Dataroom concernée, absente pour un événement d'office (connexion, droits). */
  dataroom?: string;
  /** Origine de l'accès — attendue pour l'investigation post-incident (§7.7). */
  origin: string;
}

export interface AuditTrailScreenProps {
  events: AuditEvent[];
  /** Durée de conservation en vigueur, affichée telle quelle (« 3 ans »). */
  retention: string;
  /** Export du journal filtré. Absent = bouton inerte (maquette hors backend). */
  onExport?: (format: 'csv' | 'pdf') => void;
}

const PERIODS = [
  { key: 'all', label: 'Toute la période' },
  { key: '7', label: '7 derniers jours' },
  { key: '30', label: '30 derniers jours' },
  { key: '90', label: '90 derniers jours' },
];

/** Compare deux jours ISO sans passer par Date : la comparaison lexicographique
    d'AAAA-MM-JJ donne le même ordre, sans fuseau ni parsing à se tromper. */
function daysAgoIso(days: number, from: string): string {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function AuditTrailScreen({ events, retention, onExport }: AuditTrailScreenProps) {
  const [period, setPeriod] = useState('30');
  const [category, setCategory] = useState<'all' | AuditCategory>('all');
  const [actor, setActor] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 12;

  /* Le « aujourd'hui » du filtre est le jour de l'événement le plus récent, pas
     la date système : sur un jeu de démonstration figé, prendre l'horloge
     réelle vidait l'écran au bout d'un mois — le filtre par défaut ne trouvait
     plus rien et l'écran passait pour cassé. */
  const latestDay = useMemo(
    () => events.reduce((max, e) => (e.day > max ? e.day : max), '0000-00-00'),
    [events],
  );

  const actors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of events) seen.set(e.actor, e.actor);
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [events]);

  const filtered = useMemo(() => {
    const floor = period === 'all' ? null : daysAgoIso(Number(period), latestDay);
    const needle = search.trim().toLowerCase();
    return events.filter(e => {
      if (floor && e.day < floor) return false;
      if (category !== 'all' && e.category !== category) return false;
      if (actor !== 'all' && e.actor !== actor) return false;
      if (!needle) return true;
      // Recherche sur ce qui est affiché : l'utilisateur cherche ce qu'il voit.
      return `${e.action} ${e.target} ${e.dataroom ?? ''} ${e.actor}`.toLowerCase().includes(needle);
    });
  }, [events, period, category, actor, search, latestDay]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);

  /** Remet la pagination à la première page : rester page 4 d'une liste qui
      vient d'en perdre trois affiche un tableau vide qu'on croit cassé. */
  function change<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <Screen>
      <Card padded style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="section-title">Journal des accès et modifications</div>
          <div className="tiny dim">
            Tout accès et toute modification portant sur le contenu d'une dataroom.
            Conservation&nbsp;: {retention}.
          </div>
        </div>
        <ButtonRow>
          <Button size="sm" onClick={() => onExport?.('csv')}>
            <Icon id="down" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => onExport?.('pdf')}>
            <Icon id="file" />
            Synthèse PDF
          </Button>
        </ButtonRow>
      </Card>

      <div className="field-row" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="audit-period">Période</label>
          <Select id="audit-period" value={period} onChange={e => change(setPeriod)(e.target.value)}>
            {PERIODS.map(p => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="audit-cat">Type d'événement</label>
          <Select
            id="audit-cat"
            value={category}
            onChange={e => change(setCategory)(e.target.value as 'all' | AuditCategory)}
          >
            <option value="all">Tous les types</option>
            {(Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[]).map(c => (
              <option key={c} value={c}>
                {AUDIT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="audit-actor">Utilisateur</label>
          <Select id="audit-actor" value={actor} onChange={e => change(setActor)(e.target.value)}>
            <option value="all">Tous les utilisateurs</option>
            {actors.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label htmlFor="audit-q">Rechercher</label>
          <TextInput
            id="audit-q"
            value={search}
            placeholder="Document, dossier, action…"
            onChange={e => change(setSearch)(e.target.value)}
          />
        </div>
      </div>

      <TableCard headers={['Horodatage', 'Utilisateur', 'Action', 'Objet', 'Dossier', 'Origine']}>
        {rows.map(e => (
          <tr key={e.id}>
            <td className="mono dim" style={{ whiteSpace: 'nowrap' }}>
              {e.timestamp}
            </td>
            <td className="row-name">
              <Avatar size="sm" gray={e.actorGray}>
                {e.actorInitials}
              </Avatar>
              {e.actor}
            </td>
            <td>
              <Pill kind={CATEGORY_KIND[e.category]}>{AUDIT_CATEGORY_LABELS[e.category]}</Pill>
              <div className="tiny dim" style={{ marginTop: 4 }}>
                {e.action}
              </div>
            </td>
            <td>{e.target}</td>
            <td className="dim">{e.dataroom ?? '—'}</td>
            <td className="mono dim">{e.origin}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="tiny dim" style={{ textAlign: 'center', padding: 28 }}>
              Aucun événement ne correspond à ces filtres.
            </td>
          </tr>
        )}
      </TableCard>

      <TablePager
        info={
          filtered.length
            ? `événements ${(current - 1) * perPage + 1} à ${Math.min(current * perPage, filtered.length)} sur ${filtered.length}`
            : 'aucun événement'
        }
        pages={pageCount}
        current={current}
        onChange={setPage}
        onExport={onExport ? () => onExport('csv') : undefined}
      />
    </Screen>
  );
}
