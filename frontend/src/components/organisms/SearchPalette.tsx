import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch, SEARCH_MIN_LENGTH } from '../../hooks/useSearch';
import { matchesWordStart } from '../../search/match';
import { Highlight } from '../atoms/Highlight';
import { Tag } from '../atoms/Tag';
import type { LocalEntry } from '../../search/localEntries';
import type { SearchHit, TagSummary } from '../../api/endpoints';

export interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Ouvre un résultat venant du serveur (dossier, sous-dossier, pièce, personne). */
  onSelect: (hit: SearchHit) => void;
  /** Écrans, modules et données de démonstration — voir search/localEntries.ts. */
  localEntries?: LocalEntry[];
}

const KIND_ICON: Record<SearchHit['kind'], string> = {
  dataroom: 'i-layers',
  folder: 'i-folder',
  document: 'i-file',
  person: 'i-users',
};

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  dataroom: 'Dossier',
  folder: 'Sous-dossier',
  document: 'Pièce',
  person: 'Personne',
};

/** Au-delà, la palette cesse d'être lisible — même raison que la limite par type
    côté serveur, appliquée ici aux entrées locales qui ne passent pas par lui. */
const LOCAL_LIMIT = 8;

/** Ce que la liste affiche, quelle que soit la provenance. `query` est porté par
    l'item et non par la palette : les entrées locales sont filtrées sur la frappe
    en cours (c'est instantané), les résultats serveur sur la frappe que le serveur
    a effectivement traitée — surligner un item avec une frappe qui ne l'a pas
    sélectionné donnerait une mise en évidence fausse pendant l'anti-rebond. */
interface PaletteItem {
  key: string;
  icon: string;
  name: string;
  path: string;
  kindLabel: string;
  simulated?: boolean;
  /** Tag ayant justifié la remontée, quand ce n'est pas le nom qui correspond. */
  matchedTag?: TagSummary | null;
  query: string;
  activate: () => void;
}

/**
 * Palette de recherche globale (⌘K / Ctrl+K), ouverte depuis la barre de la
 * topbar. Les résultats serveur arrivent déjà filtrés par les restrictions
 * d'accès — rien n'est refiltré ici, ce serait un second contrôle d'accès à
 * maintenir en parallèle du vrai.
 *
 * Le champ est monté/démonté avec la palette plutôt que caché : sans ça, la
 * frappe précédente resterait dans l'input à la réouverture, et le hook de
 * recherche relancerait un appel pour une question que l'utilisateur ne pose
 * plus.
 */
export function SearchPalette({ open, onClose, onSelect, localEntries = [] }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // `resultQuery` est la frappe que les résultats serveur reflètent VRAIMENT,
  // telle que renvoyée par le serveur — pas `query`, qui a pu avancer d'une
  // lettre pendant l'anti-rebond.
  const { loading, error, results, truncated, query: resultQuery } = useSearch(query, open);

  const typed = query.trim();

  const items = useMemo<PaletteItem[]>(() => {
    if (typed.length < SEARCH_MIN_LENGTH) return [];

    const matched = localEntries.filter(entry => matchesWordStart(entry.name, typed));
    const toItem = (entry: LocalEntry): PaletteItem => ({
      key: entry.key,
      icon: entry.icon,
      name: entry.name,
      path: entry.path,
      kindLabel: entry.kindLabel,
      simulated: entry.simulated,
      query: typed,
      activate: entry.open,
    });

    // Ordre voulu : d'abord ce qui fait gagner du temps (aller à un écran, ouvrir
    // un module), puis le contenu réel de l'étude, et en dernier les données
    // simulées — elles ne doivent jamais coiffer un vrai dossier.
    const navigation = matched.filter(e => !e.simulated).slice(0, LOCAL_LIMIT).map(toItem);
    const simulated = matched.filter(e => e.simulated).slice(0, LOCAL_LIMIT).map(toItem);

    const server: PaletteItem[] = results.map(hit => ({
      key: `${hit.kind}-${hit.id}`,
      icon: KIND_ICON[hit.kind],
      name: hit.name,
      path: hit.path,
      kindLabel: KIND_LABEL[hit.kind],
      matchedTag: hit.matched_tag,
      query: resultQuery,
      activate: () => onSelect(hit),
    }));

    return [...navigation, ...server, ...simulated];
  }, [typed, localEntries, results, resultQuery, onSelect]);

  // Remise à zéro à la fermeture, et focus à l'ouverture. Le focus doit passer
  // par un effet : au premier rendu où `open` devient vrai, l'input vient tout
  // juste d'entrer dans le DOM.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setCursor(0);
    }
  }, [open]);

  // Une nouvelle liste replace la sélection en tête : garder l'ancien index
  // ferait pointer la touche Entrée vers un résultat qui n'est plus celui qu'on
  // regarde.
  useEffect(() => {
    setCursor(0);
  }, [items]);

  // Maintient le résultat sélectionné visible quand on descend au clavier.
  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const choose = (item: PaletteItem) => {
    item.activate();
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor(c => (items.length ? (c + 1) % items.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(c => (items.length ? (c - 1 + items.length) % items.length : 0));
      return;
    }
    if (event.key === 'Enter' && items[cursor]) {
      event.preventDefault();
      choose(items[cursor]);
    }
  };

  const tooShort = typed.length > 0 && typed.length < SEARCH_MIN_LENGTH;
  const searching = typed.length >= SEARCH_MIN_LENGTH;
  // « Aucun résultat » n'est vrai qu'une fois le serveur revenu : l'annoncer
  // pendant que la requête est en vol contredirait la liste une demi-seconde
  // plus tard. Les entrées locales, elles, sont immédiates et s'affichent déjà.
  const nothingFound = searching && !loading && !error && items.length === 0;

  return (
    <div className="overlay is-active search-palette-overlay" onClick={onClose}>
      <div
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        onClick={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="search-palette-field">
          <svg className="icon">
            <use href="#i-search" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un dossier, une pièce, un tag, une personne, un écran…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Rechercher"
            aria-controls="search-palette-results"
          />
          <kbd>Échap</kbd>
        </div>

        <div className="search-palette-results" id="search-palette-results" ref={listRef} role="listbox">
          {typed.length === 0 && (
            <div className="search-palette-empty dim tiny">
              Cherchez un dossier, une pièce, un tag, une personne de l’étude — ou un
              écran de l’application.
            </div>
          )}

          {/* Ne s'affiche que si SEARCH_MIN_LENGTH repasse au-dessus de 1 ; le seuil
              est à 1 aujourd'hui, donc ce cas ne survient pas. Conservé pour que le
              composant reste juste quel que soit le seuil, plutôt que de devoir se
              souvenir de le remettre. */}
          {tooShort && <div className="search-palette-empty dim tiny">Encore un caractère…</div>}

          {error && (
            <div className="search-palette-empty tiny" style={{ color: 'var(--critical)' }}>
              {error}
            </div>
          )}

          {nothingFound && (
            <div className="search-palette-empty dim tiny">Aucun résultat pour « {typed} ».</div>
          )}

          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              data-index={index}
              role="option"
              aria-selected={index === cursor}
              className={index === cursor ? 'search-hit is-active' : 'search-hit'}
              // Suit la souris : sans ça, survoler un résultat puis appuyer sur
              // Entrée ouvrirait celui que la souris ne montre pas.
              onMouseEnter={() => setCursor(index)}
              onClick={() => choose(item)}
            >
              <svg className="icon">
                <use href={`#${item.icon}`} />
              </svg>
              <span className="search-hit-text">
                <span className="search-hit-name">
                  <Highlight text={item.name} query={item.query} />
                  {/* Le tag est affiché À CÔTÉ du nom, et c'est LUI qui porte le
                      surlignage : sur une correspondance par tag, la frappe est
                      absente du nom, et une ligne sans rien de surligné donnerait
                      l'impression d'un résultat hors sujet. */}
                  {item.matchedTag && (
                    <Tag icon="tag" color={item.matchedTag.color}>
                      <Highlight text={item.matchedTag.name} query={item.query} />
                    </Tag>
                  )}
                  {item.simulated && <span className="search-hit-sim">simulé</span>}
                </span>
                <span className="search-hit-path dim tiny">
                  <Highlight text={item.path} query={item.query} />
                </span>
              </span>
              <span className="search-hit-kind tiny dim">{item.kindLabel}</span>
            </button>
          ))}

          {searching && loading && (
            <div className="search-palette-empty dim tiny">Recherche…</div>
          )}

          {truncated && !loading && (
            <div className="search-palette-empty dim tiny">
              Résultats les plus proches seulement — précisez la recherche pour en voir
              d’autres.
            </div>
          )}
        </div>

        <div className="search-palette-foot tiny dim">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> naviguer
          </span>
          <span>
            <kbd>↵</kbd> ouvrir
          </span>
          <span>
            <kbd>Échap</kbd> fermer
          </span>
        </div>
      </div>
    </div>
  );
}
