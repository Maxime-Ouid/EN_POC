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

import { apiFetch, apiFetchBlob } from './client';

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

export interface FolderSummary {
  id: number;
  name: string;
  created_at: string;
}

/** Contenu combiné d'un niveau de l'arborescence (racine si `parent` omis). */
export interface FolderLevel {
  folders: FolderSummary[];
  documents: DocumentSummary[];
}

/** Réponse GET/POST des endpoints d'accès (dataroom, dossier ou document). */
export interface AccessRestrictionState {
  user_ids: number[];
}

/** Une restriction active de l'office, avec libellé résolu — GET /api/access-restrictions/. */
export interface AccessRestrictionSummary {
  id: number;
  kind: 'dataroom' | 'folder' | 'document';
  dataroom_id: number;
  target_id: number;
  label: string;
  user_ids: number[];
}

export interface OfficeUserRow {
  membership_id: number;
  user_id: number;
  username: string;
  role: string;
}

export const api = {
  ping: () => apiFetch<{ status: string }>('/api/ping/'),

  /**
   * `/api/login/` ne connecte jamais directement : `enrollment` indique s'il
   * faut passer par `mfaSetup`/`confirmMfaSetup` (pas de dispositif confirmé) ou
   * directement `verifyMfa` (dispositif déjà confirmé) — voir hooks/useSession.ts.
   */
  login: (username: string, password: string) =>
    apiFetch<{ mfa_required: true; enrollment: boolean }>('/api/login/', {
      method: 'POST',
      body: { username, password },
    }),

  /** Récupère le QR code d'enrôlement — réutilise le dispositif non confirmé déjà créé entre deux appels. */
  mfaSetup: (signal?: AbortSignal) =>
    apiFetch<{ qr_code: string; secret: string }>('/api/mfa/setup/', { signal }),

  /** Confirme l'enrôlement avec le premier code TOTP généré — ouvre la session. */
  confirmMfaSetup: (token: string) =>
    apiFetch<{ username: string }>('/api/mfa/setup/', { method: 'POST', body: { token } }),

  /** Dispositif déjà confirmé — vérifie le code TOTP et ouvre la session. */
  verifyMfa: (token: string) =>
    apiFetch<{ username: string }>('/api/mfa/verify/', { method: 'POST', body: { token } }),

  whoami: (signal?: AbortSignal) => apiFetch<WhoAmI>('/api/whoami/', { signal }),

  myOffices: (signal?: AbortSignal) => apiFetch<OfficeMembership[]>('/api/my-offices/', { signal }),

  tenantConfig: (signal?: AbortSignal) => apiFetch<TenantConfig>('/api/tenant-config/', { signal }),

  /** Thème de l'office. `undefined` = 204, l'office n'a jamais personnalisé. */
  tenantTheme: (signal?: AbortSignal) =>
    apiFetch<TenantThemePayload | undefined>('/api/tenant-theme/', { signal }),

  /** Réservé aux rôles admin/superadmin de l'office (403 sinon). */
  saveTenantTheme: (theme: TenantThemePayload) =>
    apiFetch<TenantThemePayload>('/api/tenant-theme/', { method: 'PUT', body: theme }),

  /**
   * Contenu servi par un module activé pour l'office.
   *
   * Une seule route existe aujourd'hui côté Django (`coffre-fort`) : tout autre
   * slug répond 404, ce que l'écran de module traite comme « module activé mais
   * pas encore d'écran livré ». Le chemin est générique parce que c'est la
   * forme que prendra la suite, pas pour faire croire que les autres existent.
   * 403 = module non activé pour cet office (ou accès refusé).
   */
  moduleContent: (slug: string, signal?: AbortSignal) =>
    apiFetch<{ message: string }>(`/api/modules/${encodeURIComponent(slug)}/`, { signal }),

  /** Émet un ticket SSO pour basculer vers un autre office du même utilisateur. */
  issueSsoTicket: (target: string) =>
    apiFetch<{ ticket: string }>('/api/sso/issue/', { method: 'POST', body: { target } }),

  listDatarooms: (signal?: AbortSignal) => apiFetch<DataroomSummary[]>('/api/datarooms/', { signal }),

  createDataroom: (name: string) =>
    apiFetch<{ id: number; name: string }>('/api/datarooms/', { method: 'POST', body: { name } }),

  /** `folderId` omis = dépose à la racine de la dataroom. */
  uploadDocument: (dataroomId: number, file: File, folderId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId != null) formData.append('folder', String(folderId));
    return apiFetch<{ id: number; name: string; file: string }>(
      `/api/datarooms/${dataroomId}/documents/`,
      { method: 'POST', formData },
    );
  },

  /**
   * Contenu combiné (sous-dossiers + documents) d'un niveau de l'arborescence.
   * `parentId` omis = racine de la dataroom. La visibilité de chemin est déjà
   * calculée côté serveur (un dossier apparaît s'il est accessible ou mène à un
   * accès plus profond) — aucun filtrage supplémentaire n'est nécessaire ici.
   */
  listFolderLevel: (dataroomId: number, parentId?: number, signal?: AbortSignal) =>
    apiFetch<FolderLevel>(
      `/api/datarooms/${dataroomId}/folders/${parentId != null ? `?parent=${parentId}` : ''}`,
      { signal },
    ),

  /** `parentId` omis = dossier créé à la racine de la dataroom. */
  createFolder: (dataroomId: number, name: string, parentId?: number) =>
    apiFetch<{ id: number; name: string; parent: number | null }>(
      `/api/datarooms/${dataroomId}/folders/`,
      { method: 'POST', body: { name, parent: parentId ?? null } },
    ),

  /** Restriction d'accès de la dataroom elle-même (pas un dossier/document précis). */
  getDataroomAccess: (dataroomId: number, signal?: AbortSignal) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/access/`, { signal }),

  /** Réservé aux rôles admin/superadmin de l'office. `user_ids` vide = supprime la restriction (accès ouvert). */
  setDataroomAccess: (dataroomId: number, userIds: number[]) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/access/`, {
      method: 'POST',
      body: { user_ids: userIds },
    }),

  getFolderAccess: (dataroomId: number, folderId: number, signal?: AbortSignal) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/folders/${folderId}/access/`, { signal }),

  setFolderAccess: (dataroomId: number, folderId: number, userIds: number[]) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/folders/${folderId}/access/`, {
      method: 'POST',
      body: { user_ids: userIds },
    }),

  getDocumentAccess: (dataroomId: number, documentId: number, signal?: AbortSignal) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/documents/${documentId}/access/`, { signal }),

  setDocumentAccess: (dataroomId: number, documentId: number, userIds: number[]) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/documents/${documentId}/access/`, {
      method: 'POST',
      body: { user_ids: userIds },
    }),

  /** Toutes les restrictions actives de l'office, libellé résolu — réservé admin/superadmin. */
  listAccessRestrictions: (signal?: AbortSignal) =>
    apiFetch<AccessRestrictionSummary[]>('/api/access-restrictions/', { signal }),

  /**
   * Contenu binaire d'un document, servi par Django et non par MinIO : l'URL de
   * stockage est en http alors que l'app est en https (contenu mixte bloqué), et
   * ce relais applique les mêmes restrictions d'accès que la fiche.
   */
  documentContent: (dataroomId: number, documentId: number, signal?: AbortSignal) =>
    apiFetchBlob(`/api/datarooms/${dataroomId}/documents/${documentId}/content/`, signal),

  /** Membres de l'office visibles par l'appelant (un admin ne voit pas les superadmin) — réservé admin/superadmin. */
  listOfficeUsers: (signal?: AbortSignal) =>
    apiFetch<OfficeUserRow[]>('/api/office-users/', { signal }),

  /** Crée un NOUVEAU compte (pas un rattachement) + son OfficeMembership. Réservé admin/superadmin. */
  createOfficeUser: (username: string, password: string, role: string) =>
    apiFetch<OfficeUserRow>('/api/office-users/', { method: 'POST', body: { username, password, role } }),

  /** Rattache un utilisateur EXISTANT (recherche par nom exact, pas d'annuaire) — réservé admin/superadmin. */
  attachOfficeUser: (username: string, role: string) =>
    apiFetch<OfficeUserRow>('/api/office-users/attach/', { method: 'POST', body: { username, role } }),

  /** Change le rôle d'un membership — réservé admin/superadmin, `membershipId` scopé à l'office courant. */
  updateOfficeUserRole: (membershipId: number, role: string) =>
    apiFetch<OfficeUserRow>(`/api/office-users/${membershipId}/`, { method: 'PATCH', body: { role } }),

  /**
   * Retire un membre de l'office courant. Le compte lui-même n'est pas supprimé :
   * il peut rester membre d'autres offices, et être rattaché à nouveau. Le serveur
   * purge au passage son id des restrictions d'accès de cet office.
   */
  removeOfficeUser: (membershipId: number) =>
    apiFetch<void>(`/api/office-users/${membershipId}/`, { method: 'DELETE' }),
};
