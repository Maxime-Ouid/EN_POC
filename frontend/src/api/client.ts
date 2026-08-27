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

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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
    try {
      const payload = (await res.json()) as { error?: string; detail?: string };
      message = payload.error ?? payload.detail ?? message;
    } catch {
      /* réponse non JSON (page d'erreur Django en DEBUG) — on garde le statut */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
