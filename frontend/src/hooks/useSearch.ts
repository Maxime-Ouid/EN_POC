/* Ce hook écrit son état APRÈS un await (la requête réseau) : même situation
   que les autres hooks de chargement du projet, même dérogation ciblée. */
/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { api, type SearchHit } from '../api/endpoints';

/** Doit rester d'accord avec SEARCH_MIN_LENGTH côté Django (datarooms/views.py) :
    en dessous, le serveur répond vide de toute façon, autant ne pas l'appeler. À 1,
    la recherche part dès la première lettre — seul le champ vide ne cherche rien. */
export const SEARCH_MIN_LENGTH = 1;

/** Frappe moyenne ≈ 150 ms entre deux touches : 250 ms laisse finir un mot sans
    donner l'impression d'attendre. Chaque frappe annule la requête précédente,
    donc ce délai borne la charge serveur, pas la fraîcheur du résultat. */
const DEBOUNCE_MS = 250;

export interface SearchState {
  /** Vrai dès la frappe, avant même le départ de la requête : sans ça l'interface
      clignote « aucun résultat » pendant le debounce sur une recherche qui va
      pourtant en ramener. */
  loading: boolean;
  error: string | null;
  results: SearchHit[];
  truncated: boolean;
  /** La requête effectivement reflétée par `results` — pas la frappe en cours. */
  query: string;
}

const EMPTY: SearchState = { loading: false, error: null, results: [], truncated: false, query: '' };

/**
 * Recherche globale sur l'office courant (GET /api/search/), avec anti-rebond et
 * annulation de la requête précédente à chaque frappe.
 *
 * Volontairement sans cache : les restrictions d'accès peuvent changer d'une
 * minute à l'autre (un admin retire un membre d'une pièce), et une palette de
 * recherche qui ressort un résultat périmé montrerait le nom d'un document
 * auquel l'utilisateur n'a plus droit — exactement ce que le contrôle d'accès
 * côté serveur cherche à empêcher.
 */
export function useSearch(query: string, enabled = true) {
  const [state, setState] = useState<SearchState>(EMPTY);

  const trimmed = query.trim();
  const active = enabled && trimmed.length >= SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!active) {
      setState(EMPTY);
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await api.search(trimmed, controller.signal);
          if (controller.signal.aborted) return;
          setState({
            loading: false,
            error: null,
            results: res.results,
            truncated: res.truncated,
            query: res.query,
          });
        } catch (err) {
          // Une requête annulée par la frappe suivante n'est pas une erreur à
          // afficher : le signal est déjà avorté, l'état appartient au nouvel appel.
          if (controller.signal.aborted) return;
          setState({
            loading: false,
            error: err instanceof Error ? err.message : 'Recherche impossible',
            results: [],
            truncated: false,
            query: trimmed,
          });
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, active]);

  const reset = useCallback(() => setState(EMPTY), []);

  return { ...state, reset };
}
