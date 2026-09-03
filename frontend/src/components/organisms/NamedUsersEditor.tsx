import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Tag } from '../atoms/Tag';
import { Modal } from './Modal';

export interface AccessEditorUser {
  userId: number;
  username: string;
  role: string;
}

export interface NamedUsersEditorProps {
  userIds: number[];
  officeUsers: AccessEditorUser[];
  onAdd: (userId: number) => void;
  onRemove: (userId: number) => void;
  /** Nom de l'élément édité — sert aux aria-label et au titre de la popup "+N autres…". */
  targetLabel: string;
}

const GAP = 6;

/**
 * Puces d'utilisateurs nommés, avec un champ d'ajout TOUJOURS visible en
 * dessous. Si la largeur réelle du conteneur ne permet pas d'afficher
 * toutes les puces sur une ligne, tronque et affiche "+N autres…" à la
 * place des puces en trop — le nombre affiché dépend de la largeur mesurée,
 * pas d'un seuil fixe. Cliquer "+N autres…" ouvre une popup listant TOUT le
 * monde (puces retirables + son propre champ d'ajout, redondant avec celui
 * du panneau principal) ; les deux partagent le même état (`userIds`/
 * `onAdd`/`onRemove`), donc un changement dans la popup se reflète
 * immédiatement dans la ligne tronquée une fois la popup fermée.
 *
 * Utilisé identiquement dans `AccessRightsTable` pour les vraies datarooms
 * ET pour les Templates — c'est ce composant qui garantit le même visuel
 * entre les deux (voir CLAUDE.md, "État réel du code").
 */
export function NamedUsersEditor({ userIds, officeUsers, onAdd, onRemove, targetLabel }: NamedUsersEditorProps) {
  const usersById = new Map(officeUsers.map(u => [u.userId, u]));
  const availableUsers = officeUsers.filter(u => !userIds.includes(u.userId));

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRowRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(userIds.length);
  const [popupOpen, setPopupOpen] = useState(false);

  // Recalcule combien de puces tiennent dans la largeur RÉELLE du
  // conteneur (qui dépend du repli du rail de navigation, de la largeur de
  // fenêtre — voir CLAUDE.md, `.explorer` en grid flexible). La ligne de
  // mesure (position fixed, hors flux) donne la largeur vraie de chaque
  // puce sans jamais être visible ni créer de scroll parasite.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureRow = measureRowRef.current;
    if (!container || !measureRow) return;

    function recompute() {
      const available = container!.clientWidth;
      const pillEls = Array.from(measureRow!.querySelectorAll<HTMLElement>('[data-measure-pill]'));
      const chipEl = measureRow!.querySelector<HTMLElement>('[data-measure-chip]');
      if (!pillEls.length) {
        setVisibleCount(0);
        return;
      }
      const totalWidth = pillEls.reduce((sum, el, i) => sum + el.offsetWidth + (i > 0 ? GAP : 0), 0);
      if (totalWidth <= available) {
        setVisibleCount(pillEls.length);
        return;
      }
      // Ne tient pas en entier : refaire la somme en réservant la place du
      // bouton d'overflow (mesuré avec le compte TOTAL comme espace réservé
      // — le nombre réel de restants n'a jamais plus de chiffres que lui).
      const chipWidth = chipEl ? chipEl.offsetWidth : 0;
      const budget = available - chipWidth - GAP;
      let used = 0;
      let count = 0;
      for (const el of pillEls) {
        const w = el.offsetWidth;
        const next = used + (count > 0 ? GAP : 0) + w;
        if (next <= budget) {
          used = next;
          count++;
        } else {
          break;
        }
      }
      setVisibleCount(count);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
    // oxlint-disable-next-line exhaustive-deps
  }, [userIds, officeUsers]);

  const visibleIds = userIds.slice(0, visibleCount);
  const overflowCount = userIds.length - visibleIds.length;

  function renderPill(id: number) {
    const label = usersById.get(id)?.username ?? `#${id}`;
    return (
      <Tag key={id} plain onRemove={() => onRemove(id)} removeLabel={`Retirer ${label} de ${targetLabel}`}>
        {label}
      </Tag>
    );
  }

  function addSelect(idPrefix: string) {
    if (!availableUsers.length) return null;
    return (
      <Select
        small
        auto
        value=""
        aria-label={`Ajouter un utilisateur nommé à ${targetLabel}`}
        onChange={e => {
          if (e.target.value) onAdd(Number(e.target.value));
        }}
        key={idPrefix}
      >
        <option value="">+ Ajouter…</option>
        {availableUsers.map(u => (
          <option key={u.userId} value={u.userId}>
            {u.username}
          </option>
        ))}
      </Select>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex', flexWrap: 'nowrap', gap: GAP, alignItems: 'center',
          marginBottom: userIds.length ? 6 : 0,
        }}
      >
        {visibleIds.map(renderPill)}
        {overflowCount > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setPopupOpen(true)}>
            +{overflowCount} autres…
          </Button>
        )}
      </div>

      {/* Ligne de mesure : jamais visible, sert uniquement à connaître la
          largeur RÉELLE de chaque puce avant de décider combien en montrer. */}
      <div
        ref={measureRowRef}
        aria-hidden="true"
        style={{ position: 'fixed', top: -10000, left: -10000, display: 'flex', gap: GAP }}
      >
        {userIds.map(id => (
          <span key={id} data-measure-pill>
            {renderPill(id)}
          </span>
        ))}
        <span data-measure-chip>
          <Button size="sm" variant="ghost">
            +{userIds.length} autres…
          </Button>
        </span>
      </div>

      {addSelect('main')}

      <Modal open={popupOpen} onClose={() => setPopupOpen(false)} title={`Utilisateurs nommés — ${targetLabel}`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: GAP, marginBottom: userIds.length ? 10 : 0 }}>
          {userIds.map(renderPill)}
        </div>
        {!userIds.length && <div className="tiny dim">Aucun utilisateur nommé pour le moment.</div>}
        {addSelect('popup')}
      </Modal>
    </div>
  );
}
