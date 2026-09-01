import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { Tag, TAG_COLORS, TAG_COLOR_LABELS } from '../atoms/Tag';
import { TextInput } from '../atoms/TextInput';
import type { TagColor } from '../atoms/Tag';

/** Ce dont le sélecteur a besoin pour afficher un tag — volontairement moins que
    `TagSummary` de l'API : le design system ne connaît ni `slug` ni `usage`. */
export interface TagRef {
  id: number;
  name: string;
  color: TagColor;
}

export interface TagPickerProps {
  /** Tags actuellement posés sur l'élément. */
  value: TagRef[];
  /** Catalogue de l'office — ce qu'on peut ajouter sans rien créer. */
  catalog: TagRef[];
  /** Reçoit la sélection COMPLÈTE après ajout ou retrait (jamais un delta). */
  onChange: (tagIds: number[]) => void | Promise<void>;
  /**
   * Création à la volée. Absent = le sélecteur ne propose que le catalogue
   * existant — c'est ce qui permet d'utiliser le même composant dans un
   * contexte où l'utilisateur n'a pas le droit d'enrichir le catalogue.
   */
  onCreate?: (name: string, color: TagColor) => Promise<TagRef>;
  /** Lecture seule : les pastilles restent, la croix et le bouton disparaissent. */
  readOnly?: boolean;
  /** Texte affiché quand aucun tag n'est posé (mode lecture seule uniquement). */
  emptyLabel?: string;
}

// Sélecteur de tags d'un élément (dossier ou pièce) : les pastilles posées, une
// croix pour retirer, un bouton « + » qui ouvre le catalogue filtrable — et, si
// `onCreate` est fourni, la création à la volée du nom saisi quand il ne
// correspond à rien.
export function TagPicker({
  value,
  catalog,
  onChange,
  onCreate,
  readOnly,
  emptyLabel = '—',
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  /** Couleur choisie pour le PROCHAIN tag créé — sans effet sur les tags
      existants, qu'un sélecteur d'élément n'a pas vocation à recolorer. */
  const [newColor, setNewColor] = useState<TagColor>('brass');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = value.map(t => t.id);

  /** La saisie et l'erreur sont propres à une ouverture : rouvrir le menu doit
      repartir du catalogue entier, pas du filtre laissé la fois d'avant. La
      remise à zéro est faite ICI et pas dans un effet — c'est l'événement qui
      ferme le menu qui la déclenche, pas un rendu de plus. */
  function setMenuOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery('');
      setError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    // Le champ prend le focus à l'ouverture : le geste attendu est de taper,
    // pas de viser une ligne à la souris dans une liste qui peut être longue.
    inputRef.current?.focus();
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const trimmed = query.trim();
  const matches = useMemo(() => {
    const needle = foldForSearch(trimmed);
    return catalog.filter(tag => !needle || foldForSearch(tag.name).includes(needle));
  }, [catalog, trimmed]);

  // Comparaison repliée (accents et casse écrasés) — miroir de `tag_slug` côté
  // Django : sans elle, « Copropriété » proposerait de créer un doublon alors
  // que « copropriete » existe déjà, et le serveur renverrait le tag existant
  // en laissant croire à une création.
  const exactExists = catalog.some(tag => foldForSearch(tag.name) === foldForSearch(trimmed));
  const canCreate = Boolean(onCreate) && trimmed.length > 0 && !exactExists;

  async function run(action: () => Promise<void> | void) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  }

  function toggle(tag: TagRef) {
    void run(async () => {
      const next = selectedIds.includes(tag.id)
        ? selectedIds.filter(id => id !== tag.id)
        : [...selectedIds, tag.id];
      await onChange(next);
    });
  }

  function createAndAdd() {
    if (!onCreate || !canCreate) return;
    void run(async () => {
      const tag = await onCreate(trimmed, newColor);
      // Le serveur déduplique : si le tag existait déjà sous une autre casse, on
      // reçoit l'existant. Le `includes` évite alors de l'ajouter deux fois.
      if (!selectedIds.includes(tag.id)) await onChange([...selectedIds, tag.id]);
      setQuery('');
    });
  }

  if (readOnly) {
    return value.length ? (
      <span className="tag-list">
        {value.map(tag => (
          <Tag key={tag.id} color={tag.color} icon="tag">
            {tag.name}
          </Tag>
        ))}
      </span>
    ) : (
      <span className="dim">{emptyLabel}</span>
    );
  }

  return (
    <div className="tag-menu-root tag-picker" ref={rootRef}>
      <span className="tag-list">
        {value.map(tag => (
          <Tag
            key={tag.id}
            color={tag.color}
            icon="tag"
            removeLabel={`Retirer le tag ${tag.name}`}
            onRemove={() => toggle(tag)}
          >
            {tag.name}
          </Tag>
        ))}
        <button
          type="button"
          className="tag-add"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Ajouter un tag"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(!open);
          }}
        >
          <Icon id="plus" />
        </button>
      </span>

      {open && (
        // stopPropagation sur tout le panneau : ces sélecteurs vivent dans des
        // lignes de tableau cliquables, et taper dans le champ ne doit pas
        // ouvrir l'élément derrière.
        <div className="tag-menu" onClick={e => e.stopPropagation()}>
          <TextInput
            ref={inputRef}
            small
            className="tag-menu-search"
            value={query}
            placeholder={onCreate ? 'Rechercher ou créer…' : 'Rechercher…'}
            aria-label="Rechercher un tag"
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (canCreate) createAndAdd();
              else if (matches.length === 1) toggle(matches[0]);
            }}
          />

          <div className="tag-menu-list">
            {matches.map(tag => {
              const checked = selectedIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={checked ? 'tag-menu-item active' : 'tag-menu-item'}
                  disabled={busy}
                  onClick={() => toggle(tag)}
                >
                  <span className={`tag-dot tag-${tag.color}`} aria-hidden="true" />
                  <span className="tag-menu-label">{tag.name}</span>
                  {checked && <Icon id="check" />}
                </button>
              );
            })}
            {matches.length === 0 && !canCreate && (
              <div className="tag-menu-empty tiny dim">Aucun tag ne correspond.</div>
            )}
          </div>

          {canCreate && (
            <>
              {/* La couleur se choisit AVANT la création, pas après : le
                  catalogue n'a pas d'écran d'édition dans cette itération, et un
                  tag créé sans choix resterait violet pour toujours. */}
              <div className="tag-menu-colors" role="group" aria-label="Couleur du nouveau tag">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={
                      color === newColor ? 'tag-color-choice active' : 'tag-color-choice'
                    }
                    aria-label={TAG_COLOR_LABELS[color]}
                    aria-pressed={color === newColor}
                    title={TAG_COLOR_LABELS[color]}
                    onClick={() => setNewColor(color)}
                  >
                    <span className={`tag-dot tag-${color}`} />
                  </button>
                ))}
              </div>
              <button type="button" className="tag-menu-create" disabled={busy} onClick={createAndAdd}>
                <Icon id="plus" />
                Créer «&nbsp;{trimmed}&nbsp;»
              </button>
            </>
          )}

          {error && <div className="tag-menu-error tiny">{error}</div>}
        </div>
      )}
    </div>
  );
}

/** Casse et accents écrasés — même repliage que `tag_slug` côté Django, pour que
    la recherche dans le menu et la déduplication du serveur soient d'accord. */
function foldForSearch(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
