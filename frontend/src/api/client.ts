/* ===========================================================================
   Client HTTP du POC.

   Le backend Django tourne sur le même sous-domaine que le front mais sur le
   port 8000 (voir SETUP.md) : l'origine est donc dérivée de window.location, ce
   qui fait que le multi-tenant par sous-domaine (briand-hamon.localhost) marche
   sans configuration. Session par cookie + CSRF, comme les vues DRF du POC.
   =========================================================================== */

export const apiOrigin = `https://${window.location.hostname}:8000`;

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Émis quand un appel API révèle une session absente/invalidée. **Pas un
 * simple test sur le code HTTP** : vérifié empiriquement (curl, sans cookie)
 * que ce backend répond ici 403, jamais 401 — DRF lève bien `NotAuthenticated`
 * (401 par défaut) quand `IsAuthenticated` échoue faute de session, mais
 * `APIView.handle_exception` le rétrograde en 403 dès que l'authenticator
 * configuré ne fournit pas d'en-tête `WWW-Authenticate` (le cas ici :
 * `SessionAuthentication` seule, `settings.REST_FRAMEWORK`). Ce 403 partage
 * donc son code avec les refus métier volontaires du backend
 * (`_manager_role`/`_is_hyperadmin`/`_can_create_dataroom`...), qui eux ne
 * doivent SURTOUT PAS déclencher une déconnexion globale de l'app — un membre
 * qui se voit refuser un `/api/templates/` reste authentifié.
 *
 * Distinction retenue : la FORME du corps de réponse, pas seulement le code.
 * DRF sérialise ses propres exceptions en `{"detail": "..."}` ; toutes les
 * vues de ce projet répondent leurs refus métier à la main en `{"error":
 * "..."}` (jamais `detail`) — un 403 avec `detail` et sans `error` ne peut
 * donc venir que de DRF lui-même, c'est-à-dire d'une session absente. 401 est
 * gardé en plus par prudence (jamais observé ici, mais sans ambiguïté
 * possible si un jour rencontré).
 *
 * useSession.ts écoute cet événement pour repasser l'app en `anonymous` même
 * en cours d'utilisation — pas seulement au chargement — depuis que la
 * déconnexion ferme TOUTES les sessions de l'utilisateur (02/09/2026) : un
 * onglet resté ouvert sur un autre office ne l'apprend qu'à son prochain
 * appel, et doit alors retomber sur l'écran de connexion plutôt que de rester
 * bloqué sur l'erreur locale de ce seul appel.
 */
export const AUTH_EXPIRED_EVENT = 'espace-notarial:auth-expired';

function notifyAuthExpired(status: number, payload?: { error?: string; detail?: string }) {
  const sessionIsGone = status === 401 || (status === 403 && Boolean(payload?.detail) && !payload?.error);
  if (sessionIsGone) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Corps JSON. Ignoré si `formData` est fourni. */
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
}

/**
 * Appel API : cookies de session inclus, CSRF posé sur les méthodes non sûres,
 * erreurs DRF (`{"error": "..."}`) remontées en `ApiError` avec le statut.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, signal } = options;
  const headers: Record<string, string> = {};

  if (method !== 'GET') {
    headers['X-CSRFToken'] = getCookie('csrftoken') ?? '';
  }
  if (!formData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${apiOrigin}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal,
  });

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    let payload: { error?: string; detail?: string } | undefined;
    try {
      payload = (await res.json()) as { error?: string; detail?: string };
      message = payload.error ?? payload.detail ?? message;
    } catch {
      /* réponse non JSON (page d'erreur Django en DEBUG) — on garde le statut */
    }
    notifyAuthExpired(res.status, payload);
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Même contrat que `apiFetch`, mais pour une réponse binaire (contenu d'un
 * document). Séparé plutôt que paramétré : le corps d'erreur reste du JSON, et
 * mélanger les deux lectures dans une seule fonction rendait le typage de
 * retour mensonger.
 */
export async function apiFetchBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${apiOrigin}${path}`, { credentials: 'include', signal });

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    let payload: { error?: string; detail?: string } | undefined;
    try {
      payload = (await res.json()) as { error?: string; detail?: string };
      message = payload.error ?? payload.detail ?? message;
    } catch {
      /* réponse non JSON — on garde le statut */
    }
    notifyAuthExpired(res.status, payload);
    throw new ApiError(message, res.status);
  }

  return await res.blob();
}
