import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearch, SEARCH_MIN_LENGTH } from '../../hooks/useSearch';
import { matchesWordStart } from '../../search/match';
import { hitFacts, metaTags, META_TAG_LIMIT } from '../../search/facts';
import { clearRecentSearches, pushRecentSearch, readRecentSearches } from '../../search/recent';
import { Highlight } from '../atoms/Highlight';
import { Tag } from '../atoms/Tag';
import type { ReactNode } from 'react';
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

/* --- Regroupement ----------------------------------------------------------
   La liste était plate : un écran de l'application, un vrai dossier et une
   ligne inventée se suivaient sans rien qui les sépare, le seul indice de
   nature étant un libellé gris à droite — c'est-à-dire à l'endroit le moins lu
   de la ligne. Les résultats sont désormais rangés en blocs titrés : la
   proximité et le titre commun font le travail que la couleur ne faisait pas,
   et l'ordre des blocs reste celui d'avant (ce qui fait gagner du temps, puis
   le contenu réel de l'étude, et le simulé en dernier).
   ------------------------------------------------------------------------ */
type GroupKey =
  | 'recent'
  | 'quick'
  | 'nav'
  | 'dataroom'
  | 'document'
  | 'person'
  | 'other'
  | 'simulated';

const GROUP_LABEL: Record<GroupKey, string> = {
  recent: 'Recherches récentes',
  quick: 'Accès rapide',
  nav: 'Aller à',
  dataroom: 'Dossiers',
  document: 'Pièces',
  person: 'Personnes',
  other: 'Autres résultats',
  simulated: 'Données simulées',
};

/** Ordre d'affichage des blocs de résultats. */
const RESULT_GROUPS: GroupKey[] = ['nav', 'dataroom', 'document', 'person', 'other', 'simulated'];

/* --- Filtres de portée -----------------------------------------------------
   Cinq pastilles, pas huit : au-delà, choisir la pastille coûte plus cher que
   lire la liste entière (loi de Hick). « Autres » et « Données simulées »
   restent donc des blocs sans pastille — ce sont des fins de liste, pas des
   intentions de recherche.
   ------------------------------------------------------------------------ */
interface Scope {
  key: string;
  label: string;
  groups: GroupKey[];
  /** Ce que le champ vide propose de chercher quand cette portée est active. */
  hint: string;
}

const SCOPES: Scope[] = [
  { key: 'all', label: 'Tout', groups: RESULT_GROUPS, hint: '' },
  {
    key: 'nav',
    label: 'Écrans',
    groups: ['nav'],
    hint: 'Tapez le nom d’un écran ou d’un module pour vous y rendre.',
  },
  {
    key: 'dataroom',
    label: 'Dossiers',
    groups: ['dataroom'],
    hint: 'Tapez le nom d’un dossier, d’un sous-dossier ou l’un de leurs tags.',
  },
  {
    key: 'document',
    label: 'Pièces',
    groups: ['document'],
    hint: 'Tapez le nom d’une pièce ou l’un de ses tags.',
  },
  {
    key: 'person',
    label: 'Personnes',
    groups: ['person'],
    hint: 'Tapez le nom d’une personne rattachée à un dossier.',
  },
];

/** Au-delà, la palette cesse d'être lisible — même raison que la limite par type
    côté serveur, appliquée ici aux entrées locales qui ne passent pas par lui. */
const LOCAL_LIMIT = 8;
/** L'accès rapide est un raccourci, pas le menu : il en montre le début. */
const QUICK_LIMIT = 6;

/** Ce que la liste affiche, quelle que soit la provenance. `query` est porté par
    l'item et non par la palette : les entrées locales sont filtrées sur la frappe
    en cours (c'est instantané), les résultats serveur sur la frappe que le serveur
    a effectivement traitée — surligner un item avec une frappe qui ne l'a pas
    sélectionné donnerait une mise en évidence fausse pendant l'anti-rebond. */
interface PaletteItem {
  key: string;
  group: GroupKey;
  icon: string;
  name: string;
  /** Où se trouve l'élément (`location` côté serveur). Vide = rien à situer : un
      dossier est à la racine de l'étude, une personne n'appartient à aucun dossier. */
  path: string;
  /** Faits courts déjà mis en forme, affichés à la suite du chemin — voir search/facts.ts.
      Vide pour les entrées locales, qui n'ont pas de fiche côté serveur. */
  facts: string[];
  /** Tags à énumérer sur la ligne de méta, hors `matchedTag` (déjà montré près du nom). */
  tags: TagSummary[];
  kindLabel: string;
  simulated?: boolean;
  /** Tag ayant justifié la remontée, quand ce n'est pas le nom qui correspond. */
  matchedTag?: TagSummary | null;
  query: string;
  /** Une recherche récente REMPLIT le champ au lieu de fermer la palette : la
      reprendre est le début d'une recherche, pas son aboutissement. */
  keepOpen?: boolean;
  activate: () => void;
}

interface PaletteSection {
  key: GroupKey;
  items: PaletteItem[];
}

/**
 * Deuxième ligne d'un résultat : où il se trouve, ce qu'il contient, ses tags.
 *
 * Un seul point médian sépare les morceaux, et il est masqué aux lecteurs
 * d'écran : il sépare à l'œil, il n'a rien à faire dans le nom accessible de
 * l'option. Rien du tout à dire = pas de ligne, plutôt qu'une ligne vide qui
 * ferait croire à une fiche non chargée.
 */
function HitMeta({ item }: { item: PaletteItem }) {
  const shownTags = item.tags.slice(0, META_TAG_LIMIT);
  const hiddenTags = item.tags.length - shownTags.length;

  const parts: ReactNode[] = [];
  if (item.path) {
    parts.push(
      <span className="search-hit-path" key="path">
        <Highlight text={item.path} query={item.query} />
      </span>,
    );
  }
  for (const fact of item.facts) {
    parts.push(
      <span className="search-hit-fact" key={`fact-${fact}`}>
        {fact}
      </span>,
    );
  }

  if (parts.length === 0 && shownTags.length === 0) return null;

  return (
    <span className="search-hit-meta dim tiny">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className="search-hit-sep" aria-hidden="true">
              ·
            </span>
          )}
          {part}
        </Fragment>
      ))}
      {shownTags.map(tag => (
        <Tag key={tag.id} color={tag.color}>
          {tag.name}
        </Tag>
      ))}
      {hiddenTags > 0 && <span className="search-hit-fact">+{hiddenTags}</span>}
    </span>
  );
}

function localGroup(entry: LocalEntry): GroupKey {
  if (entry.simulated) return 'simulated';
  if (entry.kindLabel === 'Écran' || entry.kindLabel === 'Module') return 'nav';
  return 'other';
}

function serverGroup(kind: SearchHit['kind']): GroupKey {
  if (kind === 'document') return 'document';
  if (kind === 'person') return 'person';
  return 'dataroom';
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
 *
 * Chaque ligne porte une FICHE et non plus un simple chemin (02/09/2026) : ce
 * qu'un dossier contient et quand il a bougé, le type et la date d'une pièce, le
 * rôle et l'adresse d'une personne, plus les tags. Le déclencheur était un
 * doublon : la deuxième ligne d'un dossier affichait son `path`, qui pour un
 * dossier EST son nom — la seule ligne disponible pour renseigner répétait donc
 * celle du dessus.
 *
 * Champ vide, la palette n'est plus une page blanche (02/09/2026) : elle
 * propose les dernières frappes et les premiers écrans. Une palette qui ne
 * montre rien tant qu'on n'a pas tapé demande de SAVOIR ce qu'elle contient ;
 * en montrer un échantillon permet de le RECONNAÎTRE — et ces propositions sont
 * de vraies lignes de la liste, atteignables aux flèches comme les résultats.
 */
export function SearchPalette({ open, onClose, onSelect, localEntries = [] }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [scope, setScope] = useState('all');
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // `resultQuery` est la frappe que les résultats serveur reflètent VRAIMENT,
  // telle que renvoyée par le serveur — pas `query`, qui a pu avancer d'une
  // lettre pendant l'anti-rebond.
  const { loading, error, results, truncated, query: resultQuery } = useSearch(query, open);

  const typed = query.trim();
  const searching = typed.length >= SEARCH_MIN_LENGTH;
  const activeScope = SCOPES.find(s => s.key === scope) ?? SCOPES[0];

  /* --- Résultats ---------------------------------------------------------- */
  const resultItems = useMemo<PaletteItem[]>(() => {
    if (!searching) return [];

    const matched = localEntries.filter(entry => matchesWordStart(entry.name, typed));
    const toItem = (entry: LocalEntry): PaletteItem => ({
      key: entry.key,
      group: localGroup(entry),
      icon: entry.icon,
      name: entry.name,
      path: entry.path,
      facts: [],
      tags: [],
      kindLabel: entry.kindLabel,
      simulated: entry.simulated,
      query: typed,
      activate: entry.open,
    });

    const local = matched.filter(e => !e.simulated).slice(0, LOCAL_LIMIT).map(toItem);
    const simulated = matched.filter(e => e.simulated).slice(0, LOCAL_LIMIT).map(toItem);

    const server: PaletteItem[] = results.map(hit => ({
      key: `${hit.kind}-${hit.id}`,
      group: serverGroup(hit.kind),
      icon: KIND_ICON[hit.kind],
      name: hit.name,
      // `location` et non `path` : le chemin complet se termine par le nom de
      // l'élément, déjà affiché juste au-dessus — et comme le chemin se tronque
      // par la gauche, c'est précisément ce doublon qui survivait à la coupe.
      path: hit.location,
      facts: hitFacts(hit),
      tags: metaTags(hit),
      kindLabel: KIND_LABEL[hit.kind],
      matchedTag: hit.matched_tag,
      query: resultQuery,
      activate: () => onSelect(hit),
    }));

    return [...local, ...server, ...simulated];
  }, [searching, typed, localEntries, results, resultQuery, onSelect]);

  /** Décompte par bloc, calculé sur TOUS les résultats et non sur la portée
      active : une pastille doit annoncer ce qu'elle contient même quand une
      autre est sélectionnée, sinon la choisir devient un pari. */
  const counts = useMemo(() => {
    const out: Partial<Record<GroupKey, number>> = {};
    for (const item of resultItems) out[item.group] = (out[item.group] ?? 0) + 1;
    return out;
  }, [resultItems]);

  const scopeCount = useCallback(
    (s: Scope) => s.groups.reduce((total, g) => total + (counts[g] ?? 0), 0),
    [counts],
  );

  /* --- Champ vide --------------------------------------------------------- */
  const quickItems = useMemo<PaletteItem[]>(
    () =>
      localEntries
        .filter(entry => localGroup(entry) === 'nav')
        .slice(0, QUICK_LIMIT)
        .map(entry => ({
          key: `quick-${entry.key}`,
          group: 'quick' as GroupKey,
          icon: entry.icon,
          name: entry.name,
          path: entry.path,
          facts: [],
          tags: [],
          kindLabel: entry.kindLabel,
          query: '',
          activate: entry.open,
        })),
    [localEntries],
  );

  const recentItems = useMemo<PaletteItem[]>(
    () =>
      recent.map(value => ({
        key: `recent-${value}`,
        group: 'recent' as GroupKey,
        icon: 'i-clock',
        name: value,
        path: 'Recherche précédente',
        facts: [],
        tags: [],
        kindLabel: 'Reprendre',
        query: '',
        keepOpen: true,
        activate: () => setQuery(value),
      })),
    [recent],
  );

  /* --- Sections affichées ------------------------------------------------- */
  const sections = useMemo<PaletteSection[]>(() => {
    if (!searching) {
      const out: PaletteSection[] = [];
      if (recentItems.length) out.push({ key: 'recent', items: recentItems });
      // Une portée restreinte contredirait l'accès rapide, qui ne contient que
      // des écrans : on montre alors la consigne de la portée à la place.
      if (scope === 'all' && quickItems.length) out.push({ key: 'quick', items: quickItems });
      return out;
    }

    return RESULT_GROUPS.filter(g => activeScope.groups.includes(g))
      .map(g => ({ key: g, items: resultItems.filter(item => item.group === g) }))
      .filter(section => section.items.length > 0);
  }, [searching, scope, activeScope, recentItems, quickItems, resultItems]);

  /** La liste à plat, dans l'ordre du rendu : c'est elle que les flèches
      parcourent, les titres de blocs n'étant pas des destinations. */
  const visible = useMemo(() => sections.flatMap(section => section.items), [sections]);

  // Remise à zéro à la fermeture, et focus + relecture de l'historique à
  // l'ouverture. Le focus doit passer par un effet : au premier rendu où `open`
  // devient vrai, l'input vient tout juste d'entrer dans le DOM.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setRecent(readRecentSearches());
    } else {
      setQuery('');
      setCursor(0);
      setScope('all');
    }
  }, [open]);

  // Une nouvelle liste replace la sélection en tête : garder l'ancien index
  // ferait pointer la touche Entrée vers un résultat qui n'est plus celui qu'on
  // regarde.
  useEffect(() => {
    setCursor(0);
  }, [visible]);

  // Maintient le résultat sélectionné visible quand on descend au clavier.
  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const choose = (item: PaletteItem) => {
    item.activate();
    if (item.keepOpen) {
      // La frappe reprise doit pouvoir être corrigée tout de suite : le focus
      // retourne au champ, la palette reste ouverte.
      inputRef.current?.focus();
      return;
    }
    // Mémorisé au moment de l'OUVERTURE d'un résultat, pas à chaque frappe :
    // une recherche qui n'a mené nulle part n'a pas à revenir demain.
    setRecent(pushRecentSearch(typed));
    onClose();
  };

  const pickScope = (key: string) => {
    setScope(key);
    // Le clavier revient au champ : une pastille n'est pas une destination, on
    // la choisit pour continuer à taper.
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    // Le focus ne doit pas sortir de la boîte modale — il n'y a rien derrière
    // elle qu'on puisse actionner sans la fermer. Les lignes de résultat portent
    // `tabIndex={-1}` : l'anneau ne fait donc que le tour du champ, des
    // pastilles et des quelques boutons de l'en-tête.
    if (event.key === 'Tab') {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'input, button:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor(c => (visible.length ? (c + 1) % visible.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(c => (visible.length ? (c - 1 + visible.length) % visible.length : 0));
      return;
    }
    if (event.key === 'Home' && visible.length) {
      event.preventDefault();
      setCursor(0);
      return;
    }
    if (event.key === 'End' && visible.length) {
      event.preventDefault();
      setCursor(visible.length - 1);
      return;
    }
    // Retour arrière sur un champ déjà vide : on retire la portée. C'est le
    // geste qu'on fait spontanément pour « défaire » le dernier choix, et il n'a
    // rien d'autre à défaire à cet endroit.
    if (event.key === 'Backspace' && query.length === 0 && scope !== 'all') {
      event.preventDefault();
      setScope('all');
      return;
    }
    if (event.key === 'Enter' && visible[cursor]) {
      event.preventDefault();
      choose(visible[cursor]);
    }
  };

  const tooShort = typed.length > 0 && typed.length < SEARCH_MIN_LENGTH;
  // « Aucun résultat » n'est vrai qu'une fois le serveur revenu : l'annoncer
  // pendant que la requête est en vol contredirait la liste une demi-seconde
  // plus tard. Les entrées locales, elles, sont immédiates et s'affichent déjà.
  const nothingFound = searching && !loading && !error && visible.length === 0;
  // Une portée peut vider la liste alors que la recherche, elle, a trouvé : le
  // dire évite de conclure à tort que le dossier cherché n'existe pas.
  const emptiedByScope = nothingFound && scope !== 'all' && resultItems.length > 0;

  let flatIndex = -1;

  return (
    <div className="overlay is-active search-palette-overlay" onClick={onClose}>
      <div
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        ref={dialogRef}
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
            // Le champ garde le focus pendant toute la navigation : c'est LUI
            // qui désigne la ligne active (aria-activedescendant), les lignes ne
            // le prennent jamais. Sans ça, chaque flèche déplacerait le curseur
            // de saisie hors du champ et la frappe suivante se perdrait.
            role="combobox"
            aria-expanded
            aria-controls="search-palette-results"
            aria-activedescendant={visible[cursor] ? `search-hit-${cursor}` : undefined}
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              className="search-palette-clear"
              aria-label="Effacer la recherche"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <svg className="icon">
                <use href="#i-x" />
              </svg>
            </button>
          )}
        </div>

        {/* Le filet sous le champ porte la progression : la recherche se signale
            là où l'œil est déjà (sur la frappe), et non par une ligne « Recherche… »
            ajoutée SOUS des résultats déjà affichés, où personne ne la lisait.
            Il occupe la même hauteur qu'il cherche ou non — rien ne se décale. */}
        <div className={loading && searching ? 'search-palette-rule is-loading' : 'search-palette-rule'}>
          <span className="search-palette-rule-bar" />
        </div>

        <div className="search-scopes" role="group" aria-label="Limiter la recherche">
          {SCOPES.map(s => {
            const count = searching ? scopeCount(s) : null;
            return (
              <button
                key={s.key}
                type="button"
                className="search-scope"
                aria-pressed={scope === s.key}
                // Une pastille vide reste lisible mais ne se choisit pas : la
                // sélectionner ne mènerait qu'à une liste vide.
                disabled={count === 0 && scope !== s.key}
                onClick={() => pickScope(s.key)}
              >
                {s.label}
                {count !== null && s.key !== 'all' && (
                  <span className="search-scope-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className="search-palette-results"
          id="search-palette-results"
          ref={listRef}
          role="listbox"
          aria-label="Résultats"
        >
          {!searching && sections.length === 0 && (
            <div className="search-palette-empty dim tiny">
              {activeScope.hint ||
                'Cherchez un dossier, une pièce, un tag, une personne de l’étude — ou un écran de l’application.'}
            </div>
          )}

          {!searching && scope !== 'all' && sections.length > 0 && (
            <div className="search-palette-hint dim tiny">{activeScope.hint}</div>
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
            <div className="search-palette-empty dim tiny">
              {emptiedByScope ? (
                <>
                  Aucun résultat dans « {activeScope.label} » pour « {typed} ». Il y en a
                  ailleurs — <button type="button" className="search-palette-link" onClick={() => pickScope('all')}>
                    chercher partout
                  </button>.
                </>
              ) : (
                <>Aucun résultat pour « {typed} ».</>
              )}
            </div>
          )}

          {/* Première frappe : le filet progresse déjà, mais la liste est vide et
              une liste vide sans un mot ressemble à « aucun résultat ». Dès qu'il
              y a quelque chose à montrer — ne serait-ce qu'un écran trouvé
              localement — cette ligne disparaît. */}
          {searching && loading && visible.length === 0 && !error && (
            <div className="search-palette-empty dim tiny">Recherche…</div>
          )}

          {sections.map(section => (
            <div key={section.key} role="group" aria-label={GROUP_LABEL[section.key]}>
              <div className="search-group-head" aria-hidden="true">
                <span>{GROUP_LABEL[section.key]}</span>
                {section.key === 'recent' && (
                  <button
                    type="button"
                    className="search-group-action"
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                      inputRef.current?.focus();
                    }}
                  >
                    Effacer
                  </button>
                )}
                {section.key === 'simulated' && (
                  <span className="search-group-note">n’existent pas en base</span>
                )}
              </div>

              {section.items.map(item => {
                flatIndex += 1;
                const index = flatIndex;
                const active = index === cursor;
                return (
                  <button
                    key={item.key}
                    id={`search-hit-${index}`}
                    type="button"
                    data-index={index}
                    role="option"
                    aria-selected={active}
                    // Le Tab appartient au champ et aux pastilles : une liste de
                    // trente résultats ne doit pas être un couloir de trente Tab.
                    tabIndex={-1}
                    className={active ? 'search-hit is-active' : 'search-hit'}
                    // Suit la souris : sans ça, survoler un résultat puis appuyer sur
                    // Entrée ouvrirait celui que la souris ne montre pas.
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => choose(item)}
                  >
                    <span className="search-hit-icon">
                      <svg className="icon">
                        <use href={`#${item.icon}`} />
                      </svg>
                    </span>
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
                      <HitMeta item={item} />
                    </span>
                    {/* Le type reste à droite, mais il cède la place à « ↵ » sur la
                        ligne active : c'est là, et seulement là, que la touche Entrée
                        a un effet, et le type de la ligne est déjà dit par son bloc. */}
                    <span className="search-hit-kind tiny dim">{item.kindLabel}</span>
                    <kbd className="search-hit-enter">↵</kbd>
                  </button>
                );
              })}
            </div>
          ))}

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
            <kbd>Tab</kbd> filtrer
          </span>
          <span>
            <kbd>Échap</kbd> fermer
          </span>
        </div>
      </div>
    </div>
  );
}
