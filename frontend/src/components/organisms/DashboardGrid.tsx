import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { cellOffset, widgetUnderDrop } from './gridGeometry';

export interface DashboardGridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  /** Contenu déjà encadré (typiquement un <WidgetFrame>). */
  content: ReactNode;
}

export interface DashboardGridPosition {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardGridProps {
  items: DashboardGridItem[];
  /** Hors édition, la grille est figée : ni déplacement ni redimensionnement. */
  editing: boolean;
  cols: number;
  /** Nombre de lignes de la grille — plafond dur, rien ne se pose en dessous. */
  rows: number;
  /** Hauteur d'une ligne, calculée par l'appelant sur la place disponible. */
  rowHeight: number;
  onChange: (positions: DashboardGridPosition[]) => void;
  /**
   * Un widget a été lâché SUR un autre. À l'appelant de décider quoi en faire
   * (échanger les deux, ou refuser) : cet organisme constate la cible, il ne
   * connaît pas les règles.
   *
   * Renvoyer `false` quand rien n'a changé : la grille doit alors se
   * resynchroniser d'elle-même, faute de quoi la carte reste affichée là où le
   * glissement l'avait laissée.
   */
  onDropOn?: (draggedId: string, targetId: string) => boolean;
  /**
   * L'échange est-il possible ? Interrogé PENDANT le glissement pour ne montrer
   * l'aperçu que quand le dépôt aboutira vraiment — annoncer un échange qui
   * sera refusé au lâcher serait pire que ne rien annoncer.
   */
  canSwap?: (draggedId: string, targetId: string) => boolean;
}

/* ===========================================================================
   Grille du tableau de bord — enveloppe de react-grid-layout.

   Cet organisme ne connaît NI les widgets NI le registre : il reçoit des
   positions et des nœuds déjà rendus. C'est ce qui permet de le déplacer, de le
   tester ou de le remplacer sans toucher au catalogue — et ce qui garde la
   couche components/ indépendante de src/dashboard/.

   Trois points de comportement à connaître avant d'y toucher :

   0. PLACEMENT LIBRE ET SANS EFFET DE BORD (`compactType={null}` +
      `preventCollision`, 31/08/2026). Un widget reste exactement là où il est
      lâché, trous compris, et AUCUN autre widget ne bouge jamais.

      Deux comportements écartés en chemin, tous deux essayés :
        - compaction verticale : tout remontait au relâchement, poser une carte
          en bas à droite était impossible ;
        - poussée (`preventCollision` à faux) : lâcher une carte en déplaçait
          trois autres en cascade, l'écran devenait imprévisible.

      Le prix du refus est réel : sur une grille pleine, la carte revient à sa
      place. C'est pour ça que `maxRows`, l'échange ci-dessous et le message
      « écran plein » de DashboardScreen existent — l'utilisateur doit
      comprendre qu'il manque de place, pas croire que le glisser-déposer est
      cassé.

   0 ter. ÉCHANGE DE PLACE (`onDropOn`, `canSwap`). react-grid-layout ne sait pas
      échanger deux widgets : il pousse (preventCollision à faux) ou il refuse.
      Lâcher une carte sur une autre et voir les deux permuter demande donc du
      code par dessus, en trois temps :

        - `onDragStart` note la case d'origine de la carte et où elle a été
          saisie (le pointeur n'est presque jamais sur son coin) ;
        - `onDrag` désigne la carte survolée et, si l'échange est possible, la
          déplace vers la place libérée : c'est l'aperçu ;
        - `onDragStop` refait le même calcul et remonte la cible à l'appelant.

      Ne PAS demander à react-grid-layout s'il a « accepté » le déplacement pour
      décider s'il y a un échange (essayé le 31/08/2026, l'échange ne partait
      jamais) : pendant le glissement, `onDrag` déplace réellement la carte dès
      qu'elle survole une case libre, donc comparer la position finale à la
      position de départ ne dit pas « refusé » mais « la carte a bougé en
      chemin ». Le seul juge est la géométrie du dépôt.

      Cet organisme ne décide de rien : il constate « lâché sur X » et demande
      « est-ce échangeable ? ». Les règles appartiennent à `swapWidgets`
      (src/dashboard/layout.ts), pur et vérifiable sans navigateur, et le calcul
      pixels → cases à `gridGeometry.ts`, pur lui aussi.

   0 bis. GRILLE FERMÉE (`maxRows`). Rien ne peut se poser sous la dernière
      ligne : l'écran ne grandit pas, il se remplit. Voir types.ts pour le
      pourquoi, et DashboardScreen pour le calcul de la hauteur de ligne.

   1. `WidthProvider` mesure la largeur du conteneur. Sans lui, react-grid-layout
      exige une prop `width` en pixels, qu'il faudrait recalculer à chaque
      redimensionnement de la fenêtre ET à chaque pliage de la barre latérale.

      NE PAS ajouter `measureBeforeMount` (essayé le 31/08/2026, accueil vide) :
      avec cette option, WidthProvider rend un div VIDE au premier passage et
      n'affiche la grille qu'au premier callback de son ResizeObserver — son
      `componentDidMount` ne déclenche aucun rendu par lui-même. Or l'app est
      montée en `<StrictMode>` (main.tsx) et React 19 y simule un démontage :
      la ref est détachée puis rattachée, le second `observe()` ne reçoit donc
      pas d'élément, le callback ne part jamais et le div vide reste. Sans
      l'option, la grille est rendue tout de suite à la largeur par défaut
      (1280 px) puis corrigée — un rendu de trop, jamais un écran blanc.

   2. Sous 980 px la grille passe à UNE colonne (breakpoint `xs`) et n'y est
      plus modifiable : ranger des widgets au doigt sur un téléphone donne des
      dispositions qu'on ne comprend plus sur écran large. Les changements ne
      sont donc remontés que depuis le breakpoint `lg` — c'est la raison du
      test sur `breakpoint` dans `handleChange`.
   =========================================================================== */

const ResponsiveGrid = WidthProvider(Responsive);

/** Sous cette largeur, une seule colonne et lecture seule. */
const NARROW_BREAKPOINT = 980;

/** Espace entre deux cases — doit rester d'accord avec la prop `margin` plus bas. */
const MARGIN = 16;

export function DashboardGrid({
  items,
  editing,
  cols,
  rows,
  rowHeight,
  onChange,
  onDropOn,
  canSwap,
}: DashboardGridProps) {
  const maxRows = rows;
  // Breakpoint courant, tenu ici plutôt que déduit de la largeur : c'est
  // react-grid-layout qui décide du sien, et recalculer le nôtre en parallèle
  // les ferait diverger d'un pixel près, exactement là où ça compte.
  const [breakpoint, setBreakpoint] = useState<string>('lg');
  // Incrémentée pour forcer la grille à repartir des props — voir handleDragStop.
  const [resyncKey, setResyncKey] = useState(0);

  /* --- Aperçu de l'échange -------------------------------------------------
     Pendant le glissement, la carte visée se déplace vers la place que libère
     celle qu'on traîne : on voit l'échange avant de le valider, et lâcher
     ailleurs remet tout en place.

     Cet aperçu NE PASSE PAS par la disposition de react-grid-layout, et ne peut
     pas y passer : `getDerivedStateFromProps` commence par
     `if (prevState.activeDrag) return null` — tout changement de la prop
     `layouts` est ignoré tant qu'un glissement est en cours. La carte visée est
     donc déplacée par une transformation CSS posée sur `.dash-slot`, un
     conteneur à nous, intérieur à la case que react-grid-layout positionne. Les
     deux transformations se composent sans se gêner.
     ---------------------------------------------------------------------- */
  const [preview, setPreview] = useState<{ targetId: string; dx: number; dy: number } | null>(null);
  /** Case d'origine de la carte saisie — la place qu'elle libère. */
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  // Décalage entre le pointeur et le coin de la carte au moment de la saisie.
  // Sans lui, on croirait que la carte est déposée là où est la souris, alors
  // qu'on peut l'avoir attrapée par son bord droit : la cible serait décalée
  // d'une demi-carte, et l'échange se ferait avec le mauvais voisin.
  const grabRef = useRef<{ dx: number; dy: number } | null>(null);

  // Armé quand un dépôt a été résolu par un échange : le `onLayoutChange` qui
  // suit IMMÉDIATEMENT porte la disposition de react-grid-layout, pas la nôtre,
  // et l'appliquer effacerait l'échange qu'on vient de faire.
  const swapHandledRef = useRef(false);

  const handleDragStart = (
    _layout: Layout[],
    oldItem: Layout,
    _newItem: Layout,
    _placeholder: Layout,
    event: MouseEvent,
    element: HTMLElement,
  ) => {
    swapHandledRef.current = false;
    setPreview(null);
    dragOriginRef.current = { x: oldItem.x, y: oldItem.y };
    const rect = element.getBoundingClientRect();
    grabRef.current =
      typeof event?.clientX === 'number'
        ? { dx: event.clientX - rect.left, dy: event.clientY - rect.top }
        : null;
  };

  /** Cible actuellement survolée, ou null. Facteur commun au glissement et au dépôt. */
  const targetUnder = (draggedId: string, event: MouseEvent, element: HTMLElement) => {
    const grab = grabRef.current;
    const frame = frameRef.current;
    if (!grab || !frame || typeof event?.clientX !== 'number') return null;
    const frameRect = frame.getBoundingClientRect();
    const cardRect = element.getBoundingClientRect();
    return {
      frameRect,
      targetId: widgetUnderDrop(items, draggedId, {
        frame: { left: frameRect.left, top: frameRect.top, width: frameRect.width },
        card: { width: cardRect.width, height: cardRect.height },
        pointer: { x: event.clientX, y: event.clientY },
        grab,
        cols,
        rows,
        rowHeight,
        margin: MARGIN,
      }),
    };
  };

  const handleDrag = (
    _layout: Layout[],
    oldItem: Layout,
    _newItem: Layout,
    _placeholder: Layout,
    event: MouseEvent,
    element: HTMLElement,
  ) => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    const found = targetUnder(oldItem.i, event, element);
    const targetId = found?.targetId ?? null;

    // Rien de nouveau : on ne touche pas à l'état. `onDrag` est appelé à chaque
    // image du glissement ; sans ce test, ce serait un rendu par image.
    if (targetId === (preview?.targetId ?? null)) return;

    if (!targetId || !found) {
      setPreview(null);
      return;
    }
    // Un aperçu d'échange impossible mentirait : on ne l'affiche pas.
    if (canSwap && !canSwap(oldItem.i, targetId)) {
      setPreview(null);
      return;
    }
    const target = items.find(item => item.id === targetId);
    if (!target) {
      setPreview(null);
      return;
    }
    const { dx, dy } = cellOffset(target, origin, {
      frame: {
        left: found.frameRect.left,
        top: found.frameRect.top,
        width: found.frameRect.width,
      },
      cols,
      rowHeight,
      margin: MARGIN,
    });
    setPreview({ targetId, dx, dy });
  };

  const handleDragStop = (
    _layout: Layout[],
    oldItem: Layout,
    _newItem: Layout,
    _placeholder: Layout,
    event: MouseEvent,
    element: HTMLElement,
  ) => {
    // ATTENTION À L'ORDRE : la cible est calculée AVANT de vider `grabRef`.
    // Écrit dans l'autre sens — vider la ref puis laisser le calcul la relire —
    // l'échange ne partait jamais : la fonction trouvait `null` et sortait
    // aussitôt (bug du 31/08/2026). C'est la raison d'être de gridGeometry.ts :
    // ce calcul reçoit des nombres, il ne va plus chercher de refs lui-même.
    const found = onDropOn ? targetUnder(oldItem.i, event, element) : null;
    grabRef.current = null;
    dragOriginRef.current = null;
    // L'aperçu a fait son travail ; la disposition réelle prend le relais.
    setPreview(null);

    // On ne demande PAS à react-grid-layout s'il a accepté le déplacement
    // (essayé le 31/08/2026, l'échange ne partait jamais) : pendant le
    // glissement, `onDrag` déplace réellement la carte dès qu'elle survole une
    // case libre. Comparer la position finale à la position de départ ne dit
    // donc pas « refusé », seulement « la carte a bougé en chemin » — ce qui
    // est vrai presque à chaque fois.
    //
    // Le seul juge est la géométrie du dépôt : y a-t-il un widget sous la carte
    // lâchée, oui ou non. Lâchée ailleurs, les deux cartes retrouvent leur
    // place — l'aperçu vient d'être effacé, et rien n'est enregistré.
    const targetId = found?.targetId ?? null;
    if (!onDropOn || !targetId) return;

    // Un dépôt sur un widget est résolu par l'échange, et par lui seul —
    // qu'il réussisse ou qu'il soit refusé faute de place. Sans ce drapeau, le
    // `onLayoutChange` que react-grid-layout émet juste après (il appelle
    // `props.onDragStop` PUIS `onLayoutMaybeChanged`) écraserait le résultat
    // avec sa propre disposition.
    swapHandledRef.current = true;
    const handled = onDropOn(oldItem.i, targetId);

    // Échange refusé : notre disposition n'a pas bougé, donc la prop `layouts`
    // est identique et react-grid-layout ne se resynchronise pas (il compare en
    // profondeur). La carte resterait affichée là où le glissement l'a laissée,
    // en désaccord avec l'état. Changer la clé le force à repartir des props.
    // Chemin rare — deux widgets de gabarits différents — d'où le remontage
    // plutôt qu'un mécanisme de synchronisation permanent.
    if (!handled) setResyncKey(k => k + 1);
  };

  const layout = useMemo<Layout[]>(
    () =>
      items.map(item => ({
        i: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
      })),
    [items],
  );

  const handleChange = (next: Layout[]) => {
    if (breakpoint !== 'lg') return;
    // Ce changement-ci est celui qui suit un dépôt déjà résolu par un échange :
    // on le laisse passer sans l'appliquer. Le drapeau se consomme, et il est
    // de toute façon remis à zéro au glissement suivant.
    if (swapHandledRef.current) {
      swapHandledRef.current = false;
      return;
    }
    onChange(next.map(l => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  };

  return (
    // Ce cadre sert de repère de mesure : c'est par rapport à lui qu'on convertit
    // des pixels en cases de grille (voir targetUnderDrop). `containerPadding`
    // valant zéro, il coïncide exactement avec la grille.
    <div className="dash-frame" ref={frameRef}>
    <ResponsiveGrid
      key={resyncKey}
      className={editing ? 'dash-grid dash-grid-editing' : 'dash-grid'}
      breakpoints={{ lg: NARROW_BREAKPOINT, xs: 0 }}
      cols={{ lg: cols, xs: 1 }}
      layouts={{ lg: layout, xs: layout }}
      rowHeight={rowHeight}
      margin={[MARGIN, MARGIN]}
      containerPadding={[0, 0]}
      isDraggable={editing && breakpoint === 'lg'}
      isResizable={editing && breakpoint === 'lg'}
      onBreakpointChange={setBreakpoint}
      // Toute la carte est saisissable en édition, pas seulement sa barre de
      // titre : viser une bande de 36 px de haut pour déplacer un bloc de 300 px
      // est un geste d'expert imposé à tout le monde. `.widget-editing` n'existe
      // qu'en mode édition (voir WidgetFrame), donc hors édition ce sélecteur ne
      // désigne rien — ceinture et bretelles avec `isDraggable`.
      draggableHandle=".widget-editing"
      // Ce qui doit rester cliquable malgré la saisie : le bouton de retrait.
      draggableCancel=".widget-remove"
      resizeHandles={['se']}
      compactType={null}
      preventCollision
      maxRows={maxRows}
      onLayoutChange={handleChange}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      // Un redimensionnement n'a rien à voir avec un échange : le drapeau ne
      // doit pas traîner d'un geste à l'autre et avaler ce changement-là.
      onResizeStart={() => { swapHandledRef.current = false; }}
    >
      {items.map(item => {
        const shifted = preview?.targetId === item.id;
        return (
          <div key={item.id}>
            {/* `.dash-slot` est à NOUS : react-grid-layout positionne la case
                extérieure, nous décalons son contenu pour l'aperçu d'échange.
                Sans ce conteneur intermédiaire, il faudrait écraser la
                transformation de la librairie — et donc casser le placement. */}
            <div
              className={shifted ? 'dash-slot is-swapping' : 'dash-slot'}
              style={shifted ? { transform: `translate(${preview.dx}px, ${preview.dy}px)` } : undefined}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </ResponsiveGrid>
    </div>
  );
}
