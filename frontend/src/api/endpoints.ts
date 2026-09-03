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
// La palette de tags appartient au design system, pas à l'API : elle est
// déclarée avec le composant qui la rend (même parti pris que le catalogue de
// tokens dans theme/schema.ts) et seulement RÉ-EXPORTÉE ici pour que les
// appelants n'aient pas à connaître les deux chemins.
import type { TagColor } from '../components/atoms/Tag';

export type { TagColor };

export interface WhoAmI {
  username: string;
  is_hyperadmin: boolean;
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

/**
 * Disposition d'accueil d'un membre (GET/PUT/DELETE /api/dashboard/).
 *
 * `widgets[].id` est volontairement une chaîne libre côté API : le catalogue
 * des widgets vit dans src/dashboard/registry.tsx et le serveur ne le connaît
 * pas (voir OfficeMembership.dashboard côté Django). Un identifiant retiré du
 * catalogue est donc écarté à la lecture, pas rejeté à l'écriture.
 */
export interface DashboardWidgetPayload {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  options?: Record<string, string | number | boolean>;
}

export interface DashboardPagePayload {
  id: string;
  name: string;
  widgets: DashboardWidgetPayload[];
}

export interface DashboardPayload {
  template: string | null;
  /**
   * Les onglets. Le serveur convertit les dispositions enregistrées AVANT les
   * onglets (forme `{template, widgets}`) en un onglet unique — voir
   * validators.clean_dashboard_payload : le front n'a donc jamais à connaître
   * l'ancienne forme, et personne ne perd son rangement au déploiement.
   */
  pages: DashboardPagePayload[];
}

/**
 * Une entrée du catalogue de tags de l'office (GET /api/tags/).
 *
 * `color` est une CLÉ sémantique, pas un hexadécimal : la couleur affichée est
 * résolue par le thème de l'office (voir components/atoms/Tag.tsx). Un office
 * qui personnalise sa palette voit ses tags suivre.
 *
 * `usage` (nombre d'éléments portant le tag) n'est renseigné que par les
 * endpoints du catalogue — les tags portés par un dossier ou une pièce ne le
 * transportent pas, ce compte n'ayant aucun sens à cet endroit.
 */
export interface TagSummary {
  id: number;
  name: string;
  slug: string;
  color: TagColor;
  usage?: number;
}

export interface DataroomSummary {
  id: number;
  name: string;
  created_at: string;
  tags: TagSummary[];
}

export interface DocumentSummary {
  id: number;
  name: string;
  file: string;
  uploaded_at: string;
  tags: TagSummary[];
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

/**
 * Réponse GET/POST des endpoints d'accès (dataroom, dossier ou document).
 * Accès si l'appelant figure dans `user_ids` OU si son rôle figure dans
 * `allowed_roles` (superadmin toujours ouvert, hors de ces deux listes —
 * voir CLAUDE.md, "État réel du code", 02/09/2026).
 */
export interface AccessRestrictionState {
  user_ids: number[];
  allowed_roles: string[];
}

/** Une restriction active de l'office, avec libellé résolu — GET /api/access-restrictions/. */
export interface AccessRestrictionSummary {
  id: number;
  kind: 'dataroom' | 'folder' | 'document';
  dataroom_id: number;
  target_id: number;
  label: string;
  user_ids: number[];
  allowed_roles: string[];
}

/**
 * Un résultat de recherche globale — GET /api/search/.
 *
 * `folder_id` désigne le dossier À OUVRIR pour montrer le résultat, pas le
 * résultat lui-même : pour un `document` c'est son dossier contenant (`null` =
 * racine de la dataroom), pour un `folder` c'est lui-même, pour une `dataroom`
 * c'est `null`. L'interface peut donc naviguer sans retraiter les trois cas.
 */
export interface SearchHit {
  kind: 'dataroom' | 'folder' | 'document' | 'person';
  /** Pour une `person`, l'id du MEMBERSHIP (celui de /api/office-users/<id>/). */
  id: number;
  name: string;
  /** `null` pour une `person` : elle n'appartient à aucune dataroom. */
  dataroom_id: number | null;
  dataroom_name: string | null;
  folder_id: number | null;
  /** Chemin lisible, ex. « Succession Dupont / Actes / compromis.pdf ». */
  path: string;
  /**
   * Le tag qui a fait remonter cet élément, quand ce n'est pas son nom qui
   * correspond à la frappe — `null` sinon (et toujours `null` pour un
   * sous-dossier ou une personne, qui ne portent pas de tags).
   *
   * Sans ce champ, un dossier « Succession Dupont » étiqueté « Vente » remonterait
   * sur « vente » avec un nom où la frappe est introuvable : la palette a besoin de
   * savoir quoi surligner pour que le résultat ne paraisse pas arbitraire.
   */
  matched_tag: TagSummary | null;
}

export interface SearchResponse {
  query: string;
  results: SearchHit[];
  /** Vrai si des résultats ont été coupés : inviter à préciser, pas afficher « tout ». */
  truncated: boolean;
}

export interface OfficeUserRow {
  membership_id: number;
  user_id: number;
  username: string;
  role: string;
}

/** Un modèle de dataroom réutilisable — GET/POST/PATCH/DELETE /api/templates/. */
export interface TemplateSummary {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

/**
 * Un nœud de l'arborescence d'un Template — GET/POST/PATCH/DELETE
 * /api/templates/<id>/folders/... En miroir d'AccessRestriction (même
 * critère double, rôle OU utilisateur nommé — voir CLAUDE.md, 02/09/2026) :
 * `allowed_roles` est copié tel quel à l'application du template,
 * `user_ids` est re-résolu contre les membres RÉELS de l'office à ce
 * moment-là (voir createDataroom) — ici, les deux listes sont déjà
 * directement exploitables, pas besoin de résolution différée côté front.
 */
export interface TemplateFolderSummary {
  id: number;
  name: string;
  parent: number | null;
  allowed_roles: string[];
  user_ids: number[];
}

/** Contenu d'un niveau de l'arborescence d'un Template (racine si `parent` omis). */
export interface TemplateFolderLevel {
  folders: TemplateFolderSummary[];
}

/** Un office tel que vu par l'interface hyperadmin — GET/POST/PATCH /api/hyperadmin/offices/. */
export interface HyperadminOfficeRow {
  id: number;
  subdomain: string;
  name: string;
  is_active: boolean;
  /** Slugs des modules activés — voir ModuleSummary pour le catalogue complet. */
  enabled_modules: string[];
}

/** Une entrée du catalogue COMPLET des modules — GET /api/hyperadmin/modules/. */
export interface ModuleSummary {
  slug: string;
  name: string;
  description: string;
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

  /** Ferme la session de l'office courant (les autres sous-domaines gardent la leur). */
  logout: () => apiFetch<{ status: string }>('/api/logout/', { method: 'POST' }),

  whoami: (signal?: AbortSignal) => apiFetch<WhoAmI>('/api/whoami/', { signal }),

  myOffices: (signal?: AbortSignal) => apiFetch<OfficeMembership[]>('/api/my-offices/', { signal }),

  tenantConfig: (signal?: AbortSignal) => apiFetch<TenantConfig>('/api/tenant-config/', { signal }),

  /**
   * Identité de l'office — nom et logo. Réservé admin/superadmin (403 sinon), même
   * porte que l'apparence : renommer l'étude ou changer son logo engage tout le monde.
   *
   * Multipart parce qu'un fichier peut accompagner le nom, et les champs omis ne sont
   * pas touchés : enregistrer un nom seul ne retire pas le logo. `removeLogo` est le
   * chemin explicite du retour à la marque Notantis.
   *
   * Le `logo_url` renvoyé est une URL de RELAIS Django (`/api/tenant-logo/?v=…`), pas
   * l'adresse du stockage : MinIO sert en http quand l'application est en https, et le
   * navigateur bloquerait l'image. Le `?v=` change à chaque dépôt, sans quoi le
   * navigateur continuerait d'afficher l'ancien logo depuis son cache.
   */
  saveTenantIdentity: (patch: { name?: string; logoFile?: File | null; removeLogo?: boolean }) => {
    const formData = new FormData();
    if (patch.name !== undefined) formData.append('name', patch.name);
    if (patch.logoFile) formData.append('logo', patch.logoFile);
    if (patch.removeLogo) formData.append('remove_logo', 'true');
    return apiFetch<TenantConfig>('/api/tenant-config/', { method: 'PATCH', formData });
  },

  /** Thème de l'office. `undefined` = 204, l'office n'a jamais personnalisé. */
  tenantTheme: (signal?: AbortSignal) =>
    apiFetch<TenantThemePayload | undefined>('/api/tenant-theme/', { signal }),

  /** Réservé aux rôles admin/superadmin de l'office (403 sinon). */
  saveTenantTheme: (theme: TenantThemePayload) =>
    apiFetch<TenantThemePayload>('/api/tenant-theme/', { method: 'PUT', body: theme }),

  /**
   * Tableau de bord de l'appelant dans l'office courant.
   * `undefined` = 204, ce membre n'a jamais réorganisé son accueil : le front
   * applique alors le template déduit de son rôle (src/dashboard/templates.ts).
   */
  dashboard: (signal?: AbortSignal) =>
    apiFetch<DashboardPayload | undefined>('/api/dashboard/', { signal }),

  /** Ouvert à tout membre : chacun range SON accueil, personne ne range celui d'un autre. */
  saveDashboard: (dashboard: DashboardPayload) =>
    apiFetch<DashboardPayload>('/api/dashboard/', { method: 'PUT', body: dashboard }),

  /** Efface la personnalisation — l'accueil repart du template. */
  resetDashboard: () => apiFetch<void>('/api/dashboard/', { method: 'DELETE' }),

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

  /**
   * Recherche globale sur les dossiers, sous-dossiers et pièces de l'office
   * courant. Le serveur applique exactement les mêmes restrictions d'accès que
   * les écrans de consultation, et renvoie une liste vide en dessous de deux
   * caractères — le front n'a pas à connaître ce seuil.
   */
  search: (query: string, signal?: AbortSignal) =>
    apiFetch<SearchResponse>(`/api/search/?q=${encodeURIComponent(query)}`, { signal }),

  /** Catalogue de tags de l'office, avec le nombre d'éléments portant chacun. */
  listTags: (signal?: AbortSignal) => apiFetch<TagSummary[]>('/api/tags/', { signal }),

  /**
   * Ajoute un tag au catalogue. Le serveur déduplique sur le nom replié
   * (« Vente » / « vente » / « VENTE » = une seule entrée) et renvoie alors le
   * tag existant plutôt qu'une erreur — c'est ce qui rend la création à la
   * volée depuis un dossier sans danger pour le catalogue.
   */
  createTag: (name: string, color: TagColor = 'brass') =>
    apiFetch<TagSummary>('/api/tags/', { method: 'POST', body: { name, color } }),

  /** Renommer/recolorer — réservé aux admins de l'office (403 sinon). */
  updateTag: (tagId: number, patch: { name?: string; color?: TagColor }) =>
    apiFetch<TagSummary>(`/api/tags/${tagId}/`, { method: 'PATCH', body: patch }),

  /**
   * Retire le tag du catalogue ET de tous les éléments qui le portaient.
   * Réservé aux admins de l'office. Ne supprime aucun dossier ni document.
   */
  deleteTag: (tagId: number) => apiFetch<void>(`/api/tags/${tagId}/`, { method: 'DELETE' }),

  /**
   * Liste des dossiers. `tagIds` non vide filtre côté serveur en OU (un dossier
   * remonte s'il porte AU MOINS UN des tags demandés) — le filtrage n'est pas
   * fait côté client parce que le décompte affiché sous le tableau doit rester
   * celui de l'office, pas celui de la page déjà chargée.
   */
  listDatarooms: (tagIds?: number[], signal?: AbortSignal) =>
    apiFetch<DataroomSummary[]>(
      `/api/datarooms/${tagIds?.length ? `?tags=${tagIds.join(',')}` : ''}`,
      { signal },
    ),

  /**
   * `templateId` reproduit récursivement l'arborescence du Template choisi en
   * vrais Folder/AccessRestriction (voir _apply_template côté serveur) — copie
   * ponctuelle, jamais un lien vivant : modifier le Template ensuite n'affecte
   * jamais les datarooms déjà créées à partir de lui.
   */
  createDataroom: (name: string, tagIds?: number[], templateId?: number | null) =>
    apiFetch<{ id: number; name: string; tags: TagSummary[] }>('/api/datarooms/', {
      method: 'POST',
      body: { name, tags: tagIds ?? [], template_id: templateId ?? undefined },
    }),

  /** Remplace l'ensemble des tags du dossier (PUT idempotent, pas d'ajout unitaire). */
  setDataroomTags: (dataroomId: number, tagIds: number[]) =>
    apiFetch<{ id: number; tags: TagSummary[] }>(`/api/datarooms/${dataroomId}/tags/`, {
      method: 'PUT',
      body: { tags: tagIds },
    }),

  /** Idem pour une pièce. */
  setDocumentTags: (dataroomId: number, documentId: number, tagIds: number[]) =>
    apiFetch<{ id: number; tags: TagSummary[] }>(
      `/api/datarooms/${dataroomId}/documents/${documentId}/tags/`,
      { method: 'PUT', body: { tags: tagIds } },
    ),

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

  /** Renommage seul — les droits d'accès du dossier restent gérés via setFolderAccess. Réservé admin/superadmin. */
  renameFolder: (dataroomId: number, folderId: number, name: string) =>
    apiFetch<{ id: number; name: string; parent: number | null }>(
      `/api/datarooms/${dataroomId}/folders/${folderId}/`,
      { method: 'PATCH', body: { name } },
    ),

  /**
   * Réservé aux rôles admin/superadmin de l'office. Remplace la restriction
   * dans son ENTIER (userIds ET allowedRoles) — pas un ajout unitaire. Les
   * deux vides = supprime la restriction (accès ouvert, sauf client — voir
   * CLAUDE.md). Pas de `getDataroomAccess`/`getFolderAccess`/
   * `getDocumentAccess` ici : le GET existe côté serveur (et reste couvert par
   * les tests backend) mais aucun écran ne l'appelle — `AccessRightsTable` se
   * préremplit en bloc via `listAccessRestrictions` (dataroom) ou directement
   * depuis l'arbre du Template, jamais un fetch par ligne.
   */
  setDataroomAccess: (dataroomId: number, state: { userIds: number[]; allowedRoles: string[] }) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/access/`, {
      method: 'POST',
      body: { user_ids: state.userIds, allowed_roles: state.allowedRoles },
    }),

  setFolderAccess: (
    dataroomId: number,
    folderId: number,
    state: { userIds: number[]; allowedRoles: string[] },
  ) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/folders/${folderId}/access/`, {
      method: 'POST',
      body: { user_ids: state.userIds, allowed_roles: state.allowedRoles },
    }),

  setDocumentAccess: (
    dataroomId: number,
    documentId: number,
    state: { userIds: number[]; allowedRoles: string[] },
  ) =>
    apiFetch<AccessRestrictionState>(`/api/datarooms/${dataroomId}/documents/${documentId}/access/`, {
      method: 'POST',
      body: { user_ids: state.userIds, allowed_roles: state.allowedRoles },
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

  /** Réservé au rôle transverse HyperadminAccess — 403 sinon, quel que soit l'hôte appelant. */
  listHyperadminOffices: (signal?: AbortSignal) =>
    apiFetch<HyperadminOfficeRow[]>('/api/hyperadmin/offices/', { signal }),

  /**
   * Crée un office ET son premier admin dans le même appel. `admin_mode: 'create'`
   * ouvre un nouveau compte (mot de passe requis) ; `'attach'` rattache un compte
   * EXISTANT par son nom exact (pas d'annuaire, même parti pris que
   * attachOfficeUser).
   */
  createHyperadminOffice: (payload: {
    subdomain: string;
    name: string;
    admin_mode: 'create' | 'attach';
    admin_username: string;
    admin_password?: string;
  }) => apiFetch<HyperadminOfficeRow>('/api/hyperadmin/offices/', { method: 'POST', body: payload }),

  /** Partiel : n'envoyer que ce qui change (is_active et/ou enabled_module_slugs). */
  updateHyperadminOffice: (
    officeId: number,
    patch: { is_active?: boolean; enabled_module_slugs?: string[] },
  ) => apiFetch<HyperadminOfficeRow>(`/api/hyperadmin/offices/${officeId}/`, { method: 'PATCH', body: patch }),

  /** Catalogue COMPLET des modules existants (pas seulement ceux activés quelque part). */
  listHyperadminModules: (signal?: AbortSignal) =>
    apiFetch<ModuleSummary[]>('/api/hyperadmin/modules/', { signal }),

  /** Modèles de dataroom de l'office courant — réservé admin/superadmin (403 sinon). */
  listTemplates: (signal?: AbortSignal) => apiFetch<TemplateSummary[]>('/api/templates/', { signal }),

  createTemplate: (name: string, description?: string) =>
    apiFetch<TemplateSummary>('/api/templates/', {
      method: 'POST',
      body: { name, description: description ?? '' },
    }),

  /** Partiel : n'envoyer que ce qui change (name et/ou description). */
  updateTemplate: (templateId: number, patch: { name?: string; description?: string }) =>
    apiFetch<TemplateSummary>(`/api/templates/${templateId}/`, { method: 'PATCH', body: patch }),

  /** Supprime le modèle ET son arborescence de TemplateFolder (cascade) — sans effet sur les datarooms déjà créées à partir de lui. */
  deleteTemplate: (templateId: number) => apiFetch<void>(`/api/templates/${templateId}/`, { method: 'DELETE' }),

  /**
   * Contenu (sous-dossiers uniquement, pas de documents) d'un niveau de
   * l'arborescence d'un Template. `parentId` omis = racine du modèle.
   */
  listTemplateFolderLevel: (templateId: number, parentId?: number, signal?: AbortSignal) =>
    apiFetch<TemplateFolderLevel>(
      `/api/templates/${templateId}/folders/${parentId != null ? `?parent=${parentId}` : ''}`,
      { signal },
    ),

  /** `parentId` omis = dossier créé à la racine du modèle. */
  createTemplateFolder: (
    templateId: number,
    name: string,
    parentId?: number,
    allowedRoles?: string[],
    userIds?: number[],
  ) =>
    apiFetch<TemplateFolderSummary>(`/api/templates/${templateId}/folders/`, {
      method: 'POST',
      body: {
        name, parent: parentId ?? null,
        allowed_roles: allowedRoles ?? [], user_ids: userIds ?? [],
      },
    }),

  /** Partiel : n'envoyer que ce qui change (name, allowed_roles et/ou user_ids). */
  updateTemplateFolder: (
    templateId: number,
    folderId: number,
    patch: { name?: string; allowed_roles?: string[]; user_ids?: number[] },
  ) =>
    apiFetch<TemplateFolderSummary>(`/api/templates/${templateId}/folders/${folderId}/`, {
      method: 'PATCH',
      body: patch,
    }),

  /** Supprime le dossier ET ses sous-dossiers (cascade, self-FK). */
  deleteTemplateFolder: (templateId: number, folderId: number) =>
    apiFetch<void>(`/api/templates/${templateId}/folders/${folderId}/`, { method: 'DELETE' }),
};
