import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../components/atoms/Button';
import { IconButton } from '../components/atoms/IconButton';
import { WidgetFrame } from '../components/molecules/WidgetFrame';
import { ConfirmModal } from '../components/organisms/ConfirmModal';
import { DashboardGrid } from '../components/organisms/DashboardGrid';
import type { DashboardGridItem } from '../components/organisms/DashboardGrid';
import { DashboardTabs } from '../components/organisms/DashboardTabs';
import { TemplateGallery } from '../components/organisms/TemplateGallery';
import type { TemplateGalleryEntry } from '../components/organisms/TemplateGallery';
import { WidgetLibrary } from '../components/organisms/WidgetLibrary';
import type { WidgetLibraryGroup } from '../components/organisms/WidgetLibrary';
import { useTopbarSlots } from '../components/templates/topbarSlots';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { swapWidgets } from './layout';
import { WIDGETS, WIDGETS_BY_ID, WIDGET_CATEGORIES } from './registry';
import { DASHBOARD_TEMPLATES, TEMPLATES_BY_ID } from './templates';
import {
  DASHBOARD_COLS,
  DASHBOARD_MAX_PAGES,
  DASHBOARD_ROWS,
  rowHeightFor,
} from './types';
import type { WidgetContext } from './types';

/* ===========================================================================
   Écran d'accueil modulable.

   POURQUOI CET ÉCRAN N'EST PAS DANS components/pages/
   La règle de dépendance de la bibliothèque (components/index.ts) veut qu'une
   couche n'importe que des couches inférieures. Or cet écran a besoin du
   CATALOGUE des widgets (registry.tsx), qui est de la matière applicative :
   quels widgets existent, ce qu'ils affichent, quels templates on propose. Le
   placer dans components/pages aurait fait remonter cet import — une page tirant
   du code au-dessus d'elle — et la bibliothèque de composants aurait cessé
   d'être utilisable seule.

   Le partage est donc : components/ fournit des pièces qui ignorent tout des
   widgets (WidgetFrame, DashboardGrid, DashboardTabs, WidgetLibrary,
   TemplateGallery), et src/dashboard/ les assemble avec le catalogue.

   MODE ÉDITION
   Le déplacement n'est actif qu'en édition, pas en permanence : sur un écran de
   consultation, un clic un peu long sur une carte suffirait sinon à déranger un
   accueil qu'on croyait figé, et le retour en arrière n'existe pas.
   =========================================================================== */

/** Marge sous la grille, pour ne pas coller la dernière carte au bas de la fenêtre. */
const BOTTOM_GUTTER = 24;

/**
 * Hauteur réellement disponible sous un élément, jusqu'au bas de la fenêtre.
 *
 * Mesurée depuis le haut de l'élément plutôt que déduite d'une chaîne de
 * hauteurs CSS : la grille est loin du `<body>` (coquille, topbar, barre
 * d'outils, onglets), et imposer `height: 100%` à tous ces parents aurait
 * changé le comportement de TOUS les écrans pour n'en servir qu'un.
 */
function useAvailableHeight(ref: React.RefObject<HTMLDivElement | null>): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const top = node.getBoundingClientRect().top;
      setHeight(Math.max(0, window.innerHeight - top - BOTTOM_GUTTER));
    };
    measure();
    window.addEventListener('resize', measure);
    // La barre d'outils passe à deux lignes quand un message d'erreur s'y
    // ajoute : la grille descend, et sa hauteur disponible change sans que la
    // fenêtre ait bougé. Un ResizeObserver sur le conteneur le voit, pas
    // l'évènement `resize`.
    const observer = new ResizeObserver(measure);
    if (ref.current?.parentElement) observer.observe(ref.current.parentElement);
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [ref]);

  return height;
}

export interface DashboardScreenProps extends WidgetContext {
  /** Rôle du membre dans l'office — décide du template servi par défaut. */
  role: string | undefined;
  /** Faux tant que la session n'est pas prête : évite un GET /api/dashboard/ anonyme. */
  ready: boolean;
}

export function DashboardScreen({ role, ready, ...ctx }: DashboardScreenProps) {
  const layout = useDashboardLayout(role, ready);
  const slots = useTopbarSlots();
  const [editing, setEditing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [resetAsked, setResetAsked] = useState(false);
  const [fullNotice, setFullNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const available = useAvailableHeight(canvasRef);
  const rowHeight = rowHeightFor(available);

  const widgets = layout.activePage?.widgets ?? [];
  const { dropWidget, addWidget, swap, activePageId } = layout;

  // Changer d'onglet efface l'avertissement « écran plein » : il parlait de
  // l'écran précédent, le laisser affiché le ferait mentir.
  useEffect(() => setFullNotice(null), [activePageId]);

  const items = useMemo<DashboardGridItem[]>(
    () =>
      widgets.flatMap(placement => {
        const def = WIDGETS_BY_ID[placement.id];
        // `resolveWidgets` a déjà écarté les inconnus ; ce garde-fou couvre le
        // rendu qui suivrait un retrait de widget entre deux rendus.
        if (!def) return [];
        // Les cartes de chiffres portent déjà leur propre carte (StatCard) : le
        // cadre se réduit alors à la couche d'édition — voir WidgetFrame.
        const bare = def.category === 'chiffres';
        const screen = def.screen;
        return [
          {
            id: placement.id,
            x: placement.x,
            y: placement.y,
            w: placement.w,
            h: placement.h,
            minW: def.minSize.w,
            minH: def.minSize.h,
            content: (
              <WidgetFrame
                title={def.name}
                icon={def.icon}
                editing={editing}
                bare={bare}
                linkLabel={screen ? 'Tout voir' : undefined}
                onOpenScreen={screen ? () => ctx.navigate(screen) : undefined}
                onRemove={() => dropWidget(placement.id)}
              >
                {def.render(ctx)}
              </WidgetFrame>
            ),
          },
        ];
      }),
    [widgets, dropWidget, editing, ctx],
  );

  const libraryGroups = useMemo<WidgetLibraryGroup[]>(() => {
    const present = new Set(widgets.map(w => w.id));
    return WIDGET_CATEGORIES.map(category => ({
      label: category.label,
      items: WIDGETS.filter(w => w.category === category.key).map(w => ({
        id: w.id,
        name: w.name,
        desc: w.desc,
        icon: w.icon,
        added: present.has(w.id),
      })),
    }));
  }, [widgets]);

  const galleryEntries = useMemo<TemplateGalleryEntry[]>(
    () =>
      DASHBOARD_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        desc: t.desc,
        icon: t.icon,
        group: t.family === 'role' ? "Selon le rôle dans l'office" : 'Selon le métier',
        // L'aperçu montre le PREMIER onglet ; le nombre d'écrans est dit à côté.
        cells: t.pages[0].widgets.map(w => ({ x: w.x, y: w.y, w: w.w, h: w.h })),
        widgetCount: t.pages.reduce((n, p) => n + p.widgets.length, 0),
        pageCount: t.pages.length,
      })),
    [],
  );

  const handleAddWidget = useCallback(
    (id: string) => {
      if (addWidget(id)) {
        setFullNotice(null);
        return;
      }
      const def = WIDGETS_BY_ID[id];
      setFullNotice(
        `Pas de place pour « ${def?.name ?? id} » sur cet écran. Retirez un widget, ` +
          'réduisez-en un, ou ajoutez un écran avec le + de la barre d’onglets.',
      );
    },
    [addWidget],
  );

  /**
   * Lâché sur un autre widget : on échange, ou on dit pourquoi c'est impossible.
   * Renvoie faux quand rien n'a changé — la grille s'en sert pour se remettre
   * d'aplomb (voir DashboardGrid).
   */
  const handleDropOn = useCallback(
    (draggedId: string, targetId: string): boolean => {
      if (swap(draggedId, targetId)) {
        setFullNotice(null);
        return true;
      }
      const a = WIDGETS_BY_ID[draggedId]?.name ?? draggedId;
      const b = WIDGETS_BY_ID[targetId]?.name ?? targetId;
      setFullNotice(
        `« ${a} » et « ${b} » n’ont pas la même taille : les échanger déborderait ` +
          'de l’écran ou recouvrirait un voisin. Redimensionnez-en un d’abord.',
      );
      return false;
    },
    [swap],
  );

  /**
   * L'échange serait-il accepté ? Consulté pendant le glissement pour l'aperçu.
   * Même règle que `swap`, mais sans rien modifier — d'où `swapWidgets` appelé
   * directement plutôt qu'un second chemin qui pourrait diverger.
   */
  const canSwap = useCallback(
    (draggedId: string, targetId: string) => swapWidgets(widgets, draggedId, targetId) !== null,
    [widgets],
  );

  const pending = pendingTemplate ? TEMPLATES_BY_ID[pendingTemplate] : null;

  return (
    <section className="screen is-active dash-screen">
      {/* La barre d'outils de l'accueil a été supprimée le 01/09/2026 : elle
          doublait la topbar. Ses commandes n'ont pas disparu pour autant, elles
          se projettent dans la barre unique — onglets d'écrans au début,
          boutons juste avant la cloche (voir templates/topbarSlots.ts).

          Le portail plutôt qu'un composant monté là-haut : ces commandes
          pilotent l'état de CET écran (mode édition, bibliothèque ouverte,
          écran courant), qui n'a rien à faire dans la coquille. Rien n'est
          projeté hors AppShell — les conteneurs valent alors `null`, et
          l'accueil s'affiche sans commandes plutôt que de planter. */}
      {slots.start &&
        createPortal(
          <DashboardTabs
            tabs={layout.pages.map(p => ({ id: p.id, name: p.name, count: p.widgets.length }))}
            activeId={layout.activePageId}
            editing={editing}
            canAdd={layout.pages.length < DASHBOARD_MAX_PAGES}
            onSelect={layout.selectPage}
            onAdd={layout.addPage}
            onRename={layout.renamePage}
            onRemove={layout.removePage}
          />,
          slots.start,
        )}

      {slots.end &&
        createPortal(
          <>
            {/* « Dispositions » et « Personnaliser » sont passés en icônes le
                01/09/2026 : deux libellés larges pour des commandes rarement
                utilisées poussaient la recherche et les onglets à l'étroit.
                L'intitulé survit en `title` + `aria-label` — sans quoi ces
                boutons seraient muets pour le lecteur d'écran comme pour qui
                hésite sur le pictogramme. */}
            <IconButton
              icon="grid"
              title="Dispositions"
              aria-label="Dispositions"
              onClick={() => setGalleryOpen(true)}
            />
            {editing && (
              <>
                <Button size="sm" onClick={() => setLibraryOpen(true)}>
                  Ajouter un widget
                </Button>
                <Button size="sm" onClick={() => setResetAsked(true)} disabled={!layout.persisted}>
                  Réinitialiser
                </Button>
              </>
            )}
            {/* En mode édition le bouton devient la sortie : icône de
                validation et fond plein, pour qu'on voie d'un coup d'œil que
                l'accueil est dans un état particulier. `btn-primary` plutôt
                qu'un état inventé pour le bouton icône : c'est la couleur que
                porte déjà toute action primaire de l'interface, la dupliquer
                sous un autre nom la ferait diverger à la première retouche. */}
            <IconButton
              icon={editing ? 'check' : 'settings'}
              className={editing ? 'btn-primary' : undefined}
              title={editing ? 'Terminer la personnalisation' : 'Personnaliser'}
              aria-label={editing ? 'Terminer la personnalisation' : 'Personnaliser'}
              aria-pressed={editing}
              onClick={() => {
                setEditing(prev => !prev);
                setLibraryOpen(false);
                setFullNotice(null);
              }}
            />
          </>,
          slots.end,
        )}

      {(fullNotice || layout.error || (editing && !fullNotice && !layout.error)) && (
        <div className="dash-message-row">
          {layout.error && <span className="dash-error">{layout.error}</span>}
          {!layout.error && fullNotice && <span className="dash-warn">{fullNotice}</span>}
          {!layout.error && !fullNotice && editing && (
            <span className="dash-state">
              Saisissez un widget n’importe où pour le déplacer ; son coin bas-droit le
              redimensionne. Lâchez-le sur un autre widget de même taille pour échanger
              leurs places.
            </span>
          )}
          {layout.saving && <span className="dash-state">Enregistrement…</span>}
        </div>
      )}

      <div className="dash-canvas" ref={canvasRef}>
        {items.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-title">Cet écran est vide</div>
            <div className="dash-empty-desc">
              Passez en mode Personnaliser pour y poser des widgets, ou partez d’une
              disposition prête à l’emploi.
            </div>
            <Button variant="primary" size="sm" onClick={() => setGalleryOpen(true)}>
              Choisir une disposition
            </Button>
          </div>
        ) : (
          <DashboardGrid
            items={items}
            editing={editing}
            cols={DASHBOARD_COLS}
            rows={DASHBOARD_ROWS}
            rowHeight={rowHeight}
            onDropOn={handleDropOn}
            canSwap={canSwap}
            onChange={positions =>
              layout.setWidgets(
                positions.map(p => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h })),
              )
            }
          />
        )}
      </div>

      <WidgetLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        groups={libraryGroups}
        onAdd={handleAddWidget}
        onRemove={dropWidget}
      />

      <TemplateGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        entries={galleryEntries}
        activeId={layout.templateId}
        cols={DASHBOARD_COLS}
        onApply={id => {
          // Des écrans rangés à la main ne se remplacent pas sans le dire ;
          // un accueil encore au template, si — il n'y a rien à perdre.
          if (layout.persisted) setPendingTemplate(id);
          else layout.applyTemplate(id);
          setGalleryOpen(false);
        }}
      />

      <ConfirmModal
        open={pending !== null}
        title="Remplacer tous vos écrans ?"
        confirmLabel="Appliquer"
        destructive
        onCancel={() => setPendingTemplate(null)}
        onConfirm={() => {
          if (pending) layout.applyTemplate(pending.id);
          setPendingTemplate(null);
        }}
      >
        La disposition « {pending?.name} » remplacera TOUS vos onglets, y compris ceux que
        vous avez créés. Vos widgets et leurs positions seront perdus.
      </ConfirmModal>

      <ConfirmModal
        open={resetAsked}
        title="Réinitialiser votre accueil ?"
        confirmLabel="Réinitialiser"
        destructive
        onCancel={() => setResetAsked(false)}
        onConfirm={() => {
          void layout.reset();
          setResetAsked(false);
        }}
      >
        Vos écrans repartiront de la disposition prévue pour votre rôle, et suivront de
        nouveau ses évolutions.
      </ConfirmModal>
    </section>
  );
}
