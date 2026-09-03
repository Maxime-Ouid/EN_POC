import { useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Select } from '../atoms/Select';
import { TextInput } from '../atoms/TextInput';
import { ButtonRow } from '../molecules/ButtonRow';
import { QACard } from './QACard';
import type { PillKind } from '../atoms/Pill';

/* ===========================================================================
   Onglet Questions / Réponses d'une dataroom — §4.3 du document de vision.

   L'onglet ne savait jusqu'ici qu'AFFICHER des questions et y répondre. Le §4.3
   en demande cinq de plus, toutes présentes ici :
     - poser une question, dans la dataroom ou sur un document en particulier ;
     - filtrer avec / sans réponse ;
     - modérer les questions (valider, refuser, supprimer) et les réponses ;
     - désactiver une question sans la supprimer ;
     - télécharger la liste.

   Modération et désactivation ne se confondent pas, et l'écran le montre :
   refuser une question, c'est dire à son auteur qu'elle ne sera pas publiée ;
   la désactiver, c'est clore un fil déjà publié en le laissant lisible. Une
   suppression, elle, efface — d'où la confirmation demandée à l'appelant plutôt
   qu'un bouton nu.

   Les commandes de modération ne sont rendues que si `canModerate` : côté
   client on ne montre pas des boutons dont le serveur refusera l'usage.
   =========================================================================== */

export type QAModerationState = 'publiee' | 'a_moderer' | 'refusee' | 'desactivee';

export interface QAPanelEntry {
  id: string;
  status: { kind: PillKind; label: string };
  object: string;
  meta: string;
  body: string;
  answer?: { author: string; text: string; time: string };
  /** Pièce concernée, quand la question porte sur un document précis. */
  document?: string;
  moderation: QAModerationState;
}

export interface QAPanelProps {
  entries: QAPanelEntry[];
  canModerate?: boolean;
  onReply?: (id: string, text: string) => void;
  onAsk?: () => void;
  onModerate?: (id: string, decision: 'valider' | 'refuser') => void;
  onDisable?: (id: string) => void;
  onDelete?: (id: string) => void;
  onExport?: () => void;
}

type FilterKey = 'all' | 'sans-reponse' | 'avec-reponse' | 'a-moderer' | 'desactivees';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Toutes les questions' },
  { key: 'sans-reponse', label: 'Sans réponse' },
  { key: 'avec-reponse', label: 'Avec réponse' },
  { key: 'a-moderer', label: 'En attente de modération' },
  { key: 'desactivees', label: 'Désactivées' },
];

export function QAPanel({
  entries,
  canModerate,
  onReply,
  onAsk,
  onModerate,
  onDisable,
  onDelete,
  onExport,
}: QAPanelProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter(e => {
      if (filter === 'sans-reponse' && e.answer) return false;
      if (filter === 'avec-reponse' && !e.answer) return false;
      if (filter === 'a-moderer' && e.moderation !== 'a_moderer') return false;
      if (filter === 'desactivees' && e.moderation !== 'desactivee') return false;
      // Une question refusée n'apparaît que si on la cherche explicitement :
      // elle n'a jamais été publiée, la laisser dans le fil général ferait
      // croire aux autres membres qu'elle circule.
      if (filter === 'all' && e.moderation === 'refusee') return false;
      if (!needle) return true;
      return `${e.object} ${e.body} ${e.meta} ${e.document ?? ''}`.toLowerCase().includes(needle);
    });
  }, [entries, filter, search]);

  const pendingCount = entries.filter(e => e.moderation === 'a_moderer').length;

  return (
    <>
      <Card
        padded
        style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <div style={{ minWidth: 220 }}>
          <Select value={filter} onChange={e => setFilter(e.target.value as FilterKey)}>
            {FILTERS.map(f => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <TextInput
            value={search}
            placeholder="Rechercher dans les questions…"
            aria-label="Rechercher dans les questions"
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {canModerate && pendingCount > 0 && (
          <Button size="sm" onClick={() => setFilter('a-moderer')}>
            {pendingCount} à modérer
          </Button>
        )}
        <ButtonRow>
          <Button size="sm" onClick={onExport}>
            <Icon id="down" />
            Télécharger la liste
          </Button>
          <Button variant="accent" size="sm" onClick={onAsk}>
            <Icon id="plus" />
            Poser une question
          </Button>
        </ButtonRow>
      </Card>

      {visible.map(e => (
        <QACard
          key={e.id}
          status={e.status}
          object={e.object}
          meta={e.meta}
          body={e.body}
          document={e.document}
          answer={e.answer}
          disabled={e.moderation === 'desactivee'}
          replyPlaceholder="Répondre à cette question…"
          onReply={text => onReply?.(e.id, text)}
          actions={
            canModerate ? (
              <>
                {e.moderation === 'a_moderer' && (
                  <>
                    <Button size="sm" variant="accent" onClick={() => onModerate?.(e.id, 'valider')}>
                      Valider
                    </Button>
                    <Button size="sm" onClick={() => onModerate?.(e.id, 'refuser')}>
                      Refuser
                    </Button>
                  </>
                )}
                {e.moderation === 'publiee' && (
                  <Button size="sm" onClick={() => onDisable?.(e.id)}>
                    Désactiver
                  </Button>
                )}
                <Button size="sm" onClick={() => onDelete?.(e.id)}>
                  Supprimer
                </Button>
              </>
            ) : undefined
          }
        />
      ))}

      {visible.length === 0 && (
        <Card padded>
          <div className="tiny dim" style={{ textAlign: 'center', padding: 18 }}>
            Aucune question ne correspond à ce filtre.
          </div>
        </Card>
      )}
    </>
  );
}
