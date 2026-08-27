/* ===========================================================================
   Surface d'API réellement exposée par le backend du POC
   (backend/datarooms/urls.py au 27/08/2026).

   Ce fichier est volontairement exhaustif ET limité : tout ce qui est ici
   existe côté Django. Les écrans du prototype qui demandent des données non
   encore modélisées (statistiques d'usage, facturation, sessions ouvertes,
   modèles de dataroom, Q&R, membres, historique) sont servis par des jeux de
   démonstration explicites — voir src/data/demo.ts et le tableau des écarts
   dans README.md. On ne fabrique pas de faux endpoints ici : le jour où ils
   existent, ils s'ajoutent à ce fichier et les écrans changent de source sans
   changer de forme.
   =========================================================================== */

import { apiFetch } from './client';

export interface WhoAmI {
  username: string;
}

export interface OfficeMembership {
  subdomain: string;
  name: string;
  role: string;
}

export interface TenantConfig {
  name: string;
  logo_url: string;
  primary_color: string;
  /** Slugs des modules activés pour cet office (Module.slug). */
  enabled_modules: string[];
}

/**
 * Thème enregistré pour l'office (GET/PUT /api/tenant-theme/).
 *
 * `colors` est volontairement un dictionnaire ouvert : le catalogue des tokens
 * vit dans src/theme/schema.ts, et une couleur ajoutée au design system ne doit
 * exiger ni migration Django ni changement de type ici.
 */
export interface TenantThemePayload {
  colors: { light: Record<string, string>; dark: Record<string, string> };
  typography: string;
  shape: string;
}

export interface DataroomSummary {
  id: number;
  name: string;
  created_at: string;
}

export interface DocumentSummary {
  id: number;
  name: string;
  file: string;
  uploaded_at: string;
}

export const api = {
  ping: () => apiFetch<{ status: string }>('/api/ping/'),

  login: (username: string, password: string) =>
    apiFetch<{ username: string }>('/api/login/', { method: 'POST', body: { username, password } }),

  whoami: (signal?: AbortSignal) => apiFetch<WhoAmI>('/api/whoami/', { signal }),

  myOffices: (signal?: AbortSignal) => apiFetch<OfficeMembership[]>('/api/my-offices/', { signal }),

  tenantConfig: (signal?: AbortSignal) => apiFetch<TenantConfig>('/api/tenant-config/', { signal }),

  /** Thème de l'office. `undefined` = 204, l'office n'a jamais personnalisé. */
  tenantTheme: (signal?: AbortSignal) =>
    apiFetch<TenantThemePayload | undefined>('/api/tenant-theme/', { signal }),

  /** Réservé aux rôles admin/superadmin de l'office (403 sinon). */
  saveTenantTheme: (theme: TenantThemePayload) =>
    apiFetch<TenantThemePayload>('/api/tenant-theme/', { method: 'PUT', body: theme }),

  coffreFort: () => apiFetch<{ message: string }>('/api/modules/coffre-fort/'),

  /** Émet un ticket SSO pour basculer vers un autre office du même utilisateur. */
  issueSsoTicket: (target: string) =>
    apiFetch<{ ticket: string }>('/api/sso/issue/', { method: 'POST', body: { target } }),

  listDatarooms: (signal?: AbortSignal) => apiFetch<DataroomSummary[]>('/api/datarooms/', { signal }),

  createDataroom: (name: string) =>
    apiFetch<{ id: number; name: string }>('/api/datarooms/', { method: 'POST', body: { name } }),

  listDocuments: (dataroomId: number, signal?: AbortSignal) =>
    apiFetch<DocumentSummary[]>(`/api/datarooms/${dataroomId}/documents/`, { signal }),

  uploadDocument: (dataroomId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ id: number; name: string; file: string }>(
      `/api/datarooms/${dataroomId}/documents/`,
      { method: 'POST', formData },
    );
  },
};
