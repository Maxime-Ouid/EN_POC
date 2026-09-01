/* Ce hook charge des données au montage : `load` n'écrit l'état qu'APRÈS
   le premier await (la requête réseau). Même exception que useSession.ts. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/endpoints';
import {
  appendWidget,
  newPageId,
  nextPageName,
  removeWidget,
  resolveWidgets,
  sameLayout,
  swapWidgets,
} from '../dashboard/layout';
import { TEMPLATES_BY_ID, pagesOf, templateForRole } from '../dashboard/templates';
import { DASHBOARD_MAX_PAGES, DASHBOARD_MAX_PAGE_NAME } from '../dashboard/types';
import type { DashboardPage, WidgetPlacement } from '../dashboard/types';

/* ===========================================================================
   Onglets et dispositions de l'accueil de l'utilisateur courant.

   Quatre choses valent d'être sues avant d'y toucher :

   1. LE TEMPLATE N'EST PAS UNE SAUVEGARDE. Tant que personne n'a rien déplacé,
      rien n'est écrit côté serveur : `persisted` reste faux et l'accueil suit
      le template du rôle. C'est ce qui permet d'améliorer un template et de le
      voir arriver chez ceux qui ne l'ont jamais modifié — un enregistrement
      automatique au premier affichage aurait figé la version du jour pour tout
      le monde, définitivement.

   2. L'ENREGISTREMENT EST DIFFÉRÉ (`SAVE_DELAY_MS`). react-grid-layout émet une
      disposition à chaque image pendant un glissement ; enregistrer sans délai
      voudrait dire une centaine de PUT pour un widget déplacé.

   3. UNE PANNE D'ENREGISTREMENT NE DOIT PAS ANNULER LE RANGEMENT. En cas
      d'échec, l'état local est conservé tel quel et `error` est renseigné :
      l'utilisateur voit son accueil rangé ET le message. Remettre la
      disposition précédente à l'écran serait plus « cohérent » avec le serveur,
      et insupportable à utiliser.

   4. UN ÉCRAN PLEIN REFUSE UN WIDGET (`addWidget` renvoie false). La grille est
      fermée à 12 × 12 par choix de produit — voir types.ts — et l'appelant doit
      alors proposer un onglet plutôt que faire déborder l'écran.
   =========================================================================== */

const SAVE_DELAY_MS = 700;

export interface DashboardLayoutState {
  status: 'loading' | 'ready';
  pages: DashboardPage[];
  activePageId: string;
  /** Template appliqué en dernier — celui du rôle tant que rien n'a été rangé. */
  templateId: string | null;
  /** Une disposition existe côté serveur pour ce membre. */
  persisted: boolean;
  saving: boolean;
  error: string | null;
}

/** Nettoie les onglets reçus du serveur ; garantit qu'il en reste au moins un. */
function resolvePages(raw: readonly DashboardPage[], fallback: DashboardPage[]): DashboardPage[] {
  const pages = raw
    .slice(0, DASHBOARD_MAX_PAGES)
    .map(page => ({
      id: page.id,
      name: (page.name || 'Écran').slice(0, DASHBOARD_MAX_PAGE_NAME),
      widgets: resolveWidgets(page.widgets ?? []),
    }))
    // Un onglet vidé de tous ses widgets par un changement de catalogue reste
    // légitime : l'utilisateur peut vouloir un écran en cours de composition.
    // C'est l'absence TOTALE d'onglets qui laisserait une interface sans issue.
    .filter(page => typeof page.id === 'string' && page.id.length > 0);
  return pages.length > 0 ? pages : fallback;
}

export function useDashboardLayout(role: string | undefined, enabled: boolean) {
  const fallback = templateForRole(role);
  const initialPages = pagesOf(fallback);
  const [state, setState] = useState<DashboardLayoutState>({
    status: 'loading',
    pages: initialPages,
    activePageId: initialPages[0].id,
    templateId: fallback.id,
    persisted: false,
    error: null,
    saving: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    const load = async () => {
      const template = templateForRole(role);
      const templatePages = pagesOf(template);
      const asTemplate = {
        status: 'ready' as const,
        pages: templatePages,
        activePageId: templatePages[0].id,
        templateId: template.id,
        persisted: false,
        saving: false,
        error: null,
      };

      try {
        const payload = await api.dashboard(controller.signal);
        if (controller.signal.aborted) return;
        if (!payload) {
          // 204 : jamais personnalisé. Le template fait foi, rien n'est écrit.
          setState(asTemplate);
          return;
        }
        const pages = resolvePages(payload.pages ?? [], templatePages);
        setState({
          status: 'ready',
          pages,
          activePageId: pages[0].id,
          templateId: payload.template ?? template.id,
          persisted: pages !== templatePages,
          saving: false,
          error: null,
        });
      } catch {
        if (controller.signal.aborted) return;
        // Endpoint absent ou injoignable : l'accueil reste utilisable en local.
        // On ne montre pas d'erreur ici — l'utilisateur n'a rien demandé encore.
        setState(asTemplate);
      }
    };

    void load();
    return () => controller.abort();
  }, [enabled, role]);

  /** Enregistre après un instant de calme ; annule le rendez-vous précédent. */
  const scheduleSave = useCallback((pages: DashboardPage[], templateId: string | null) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setState(prev => ({ ...prev, saving: true, error: null }));
      api
        .saveDashboard({ template: templateId, pages })
        .then(() => {
          setState(prev => ({ ...prev, saving: false, persisted: true, error: null }));
        })
        .catch((err: unknown) => {
          setState(prev => ({
            ...prev,
            saving: false,
            error:
              err instanceof Error
                ? `Disposition non enregistrée : ${err.message}`
                : 'Disposition non enregistrée.',
          }));
        });
    }, SAVE_DELAY_MS);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  /* --- Modifications de l'onglet actif -------------------------------------
     Ces fonctions RENVOIENT si elles ont abouti, et l'appelant s'en sert
     (message « écran plein », resynchronisation de la grille après un échange
     refusé). Elles ne peuvent donc PAS décider à l'intérieur d'un
     `setState(prev => …)` : React n'exécute pas cet argument au moment de
     l'appel mais pendant le rendu suivant, si bien qu'une variable renseignée
     dedans est encore à sa valeur initiale quand on la lit. Écrit ainsi au
     premier jet, `addWidget` et `swap` répondaient « refusé » à tous les coups
     — l'échange partait puis se faisait effacer, et l'écran s'annonçait plein
     alors qu'il ne l'était pas.

     D'où `stateRef` : la décision se prend sur l'état courant, en clair, avant
     tout appel à setState. Affecter la ref pendant le rendu est volontaire et
     idempotent — c'est ce qui la garde à jour même quand deux actions se
     suivent dans le même tour de boucle.
     ---------------------------------------------------------------------- */
  const stateRef = useRef(state);
  stateRef.current = state;

  const commitPages = useCallback(
    (pages: DashboardPage[], templateId: string | null) => {
      scheduleSave(pages, templateId);
      setState(prev => ({ ...prev, pages }));
    },
    [scheduleSave],
  );

  /**
   * Applique une transformation à l'onglet actif. Renvoie `false` quand la
   * transformation est refusée (`null`) ou ne change rien — auquel cas rien
   * n'est enregistré.
   */
  const editActivePage = useCallback(
    (change: (widgets: WidgetPlacement[]) => WidgetPlacement[] | null): boolean => {
      const prev = stateRef.current;
      const page = prev.pages.find(p => p.id === prev.activePageId);
      if (!page) return false;
      const next = change(page.widgets);
      if (next === null || sameLayout(page.widgets, next)) return false;
      commitPages(
        prev.pages.map(p => (p.id === page.id ? { ...p, widgets: next } : p)),
        prev.templateId,
      );
      return true;
    },
    [commitPages],
  );

  const setWidgets = useCallback(
    (next: WidgetPlacement[]) => {
      editActivePage(() => next);
    },
    [editActivePage],
  );

  /**
   * Ajoute un widget à l'onglet actif. Renvoie `false` si l'écran est plein —
   * l'appelant doit alors proposer un onglet, pas insister.
   */
  const addWidget = useCallback(
    (id: string): boolean => editActivePage(widgets => appendWidget(widgets, id)),
    [editActivePage],
  );

  const dropWidget = useCallback(
    (id: string) => {
      editActivePage(widgets => removeWidget(widgets, id));
    },
    [editActivePage],
  );

  /**
   * Échange deux widgets de place. Renvoie `false` si l'échange est impossible
   * (tailles différentes qui déborderaient ou recouvriraient un voisin) —
   * l'appelant l'explique alors, plutôt que de laisser le geste sans effet.
   */
  const swap = useCallback(
    (draggedId: string, targetId: string): boolean =>
      editActivePage(widgets => swapWidgets(widgets, draggedId, targetId)),
    [editActivePage],
  );

  const selectPage = useCallback((pageId: string) => {
    setState(prev => (prev.pages.some(p => p.id === pageId) ? { ...prev, activePageId: pageId } : prev));
  }, []);

  /** Nouvel onglet vide, activé aussitôt. Sans effet au-delà de la limite. */
  const addPage = useCallback(() => {
    setState(prev => {
      if (prev.pages.length >= DASHBOARD_MAX_PAGES) return prev;
      const page: DashboardPage = { id: newPageId(), name: nextPageName(prev.pages), widgets: [] };
      const pages = [...prev.pages, page];
      scheduleSave(pages, prev.templateId);
      return { ...prev, pages, activePageId: page.id };
    });
  }, [scheduleSave]);

  const renamePage = useCallback(
    (pageId: string, name: string) => {
      const clean = name.trim().slice(0, DASHBOARD_MAX_PAGE_NAME);
      if (!clean) return;
      setState(prev => {
        const pages = prev.pages.map(p => (p.id === pageId ? { ...p, name: clean } : p));
        scheduleSave(pages, prev.templateId);
        return { ...prev, pages };
      });
    },
    [scheduleSave],
  );

  /** Retire un onglet. Le dernier onglet ne se retire pas : il n'y aurait plus d'accueil. */
  const removePage = useCallback(
    (pageId: string) => {
      setState(prev => {
        if (prev.pages.length <= 1) return prev;
        const index = prev.pages.findIndex(p => p.id === pageId);
        if (index < 0) return prev;
        const pages = prev.pages.filter(p => p.id !== pageId);
        scheduleSave(pages, prev.templateId);
        const activePageId =
          prev.activePageId === pageId
            ? pages[Math.min(index, pages.length - 1)].id
            : prev.activePageId;
        return { ...prev, pages, activePageId };
      });
    },
    [scheduleSave],
  );

  /** Remplace TOUS les onglets par ceux d'un template — confirmé par l'appelant. */
  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = TEMPLATES_BY_ID[templateId];
      if (!template) return;
      const pages = pagesOf(template);
      scheduleSave(pages, template.id);
      setState(prev => ({ ...prev, pages, activePageId: pages[0].id, templateId: template.id }));
    },
    [scheduleSave],
  );

  /** Efface la personnalisation côté serveur et revient au template du rôle. */
  const reset = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const pages = pagesOf(templateForRole(role));
    setState(prev => ({
      ...prev,
      pages,
      activePageId: pages[0].id,
      templateId: templateForRole(role).id,
      saving: true,
      error: null,
    }));
    try {
      await api.resetDashboard();
      setState(prev => ({ ...prev, saving: false, persisted: false, error: null }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        saving: false,
        error:
          err instanceof Error
            ? `Réinitialisation refusée : ${err.message}`
            : 'Réinitialisation refusée.',
      }));
    }
  }, [role]);

  const activePage =
    state.pages.find(p => p.id === state.activePageId) ?? state.pages[0];

  return {
    ...state,
    activePage,
    setWidgets,
    addWidget,
    dropWidget,
    swap,
    selectPage,
    addPage,
    renamePage,
    removePage,
    applyTemplate,
    reset,
  };
}
