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
  /**
   * Rang Notantis TRANSVERSE a tous les offices (HyperadminAccess cote Django),
   * distinct du role `superadmin` d'un membership, qui reste scope a UN office.
   * Il n'apparait dans aucune autre reponse — `my-offices` ne porte que des
   * roles d'office — d'ou sa place ici : sans lui, l'interface ne pourrait
   * decider de monter la console Notantis qu'en provoquant un 403.
   */
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

/**
 * Un modele de dossier de l'office — GET /api/templates/.
 *
 * A ne pas confondre avec deux homonymes du front : `DataroomTemplate`
 * (molecules/TemplateOption) est la forme d'AFFICHAGE d'une ligne de modele, et
 * les « templates » du tableau de bord (dashboard/templates.ts) sont des
 * dispositions de widgets, sans aucun rapport. Seul ce type-ci correspond au
 * modele Django `Template`.
 *
 * Un modele est une definition PURE : l'appliquer copie son arborescence en
 * vrais dossiers, et le lien est rompu aussitot — modifier le modele ensuite ne
 * touche aucun dossier deja cree (voir models.Template).
 */
export interface TemplateSummary {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

/**
 * Un dossier dans l'arborescence d'un modele — GET /api/templates/<id>/folders/.
 *
 * `visible_to_roles` porte des ROLES, pas des utilisateurs : ils ne sont
 * resolus en personnes reelles qu'au moment ou le modele est applique a un
 * dossier (views._apply_template), avec les membres que l'office a CE
 * moment-la. Une liste vide = aucune restriction posee, le dossier cree suivra
 * la regle d'acces par defaut.
 */
export interface TemplateFolderSummary {
  id: number;
  name: string;
  parent: number | null;
  visible_to_roles: string[];
}

/**
 * Un office vu par la console Notantis — GET /api/hyperadmin/offices/.
 *
 * Reserve aux hyperadmins (403 sinon), et volontairement joignable depuis
 * n'importe quel sous-domaine : le rang ne depend d'aucun office.
 */
export interface HyperadminOffice {
  id: number;
  subdomain: string;
  name: string;
  is_active: boolean;
  enabled_modules: string[];
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
   * Cree un dossier — reserve admin/superadmin depuis le 01/09/2026 (meme gate
   * que les modeles). `templateId` reproduit l'arborescence du modele en vrais
   * dossiers ET pose les restrictions d'acces qu'il decrit, en une seule
   * requete : le front n'enchaine pas des creations de dossiers a la main, ce
   * qui laisserait un dossier a moitie prepare si l'une d'elles echouait.
   */
  createDataroom: (name: string, tagIds?: number[], templateId?: number | null) =>
    apiFetch<{ id: number; name: string; tags: TagSummary[] }>('/api/datarooms/', {
      method: 'POST',
      body: { name, tags: tagIds ?? [], ...(templateId ? { template_id: templateId } : {}) },
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

  /**
   * Modeles de dossier de l'office — reserve admin/superadmin (403 sinon), la
   * meme porte que la gestion des utilisateurs. La modale « Nouveau dossier »
   * appelle donc cette liste seulement pour un appelant qui peut deja creer un
   * dossier : depuis le 01/09/2026 les deux exigent le meme rang.
   */
  listTemplates: (signal?: AbortSignal) => apiFetch<TemplateSummary[]>('/api/templates/', { signal }),

  createTemplate: (name: string, description = '') =>
    apiFetch<TemplateSummary>('/api/templates/', { method: 'POST', body: { name, description } }),

  updateTemplate: (templateId: number, patch: { name?: string; description?: string }) =>
    apiFetch<TemplateSummary>(`/api/templates/${templateId}/`, { method: 'PATCH', body: patch }),

  /**
   * Supprime le modele et son arborescence. Les dossiers deja crees a partir de
   * lui ne bougent pas : la copie est independante des l'application (voir
   * TemplateSummary).
   */
  deleteTemplate: (templateId: number) =>
    apiFetch<void>(`/api/templates/${templateId}/`, { method: 'DELETE' }),

  /**
   * Un NIVEAU de l'arborescence du modele — `parentId` omis = la racine. Meme
   * forme que listFolderLevel, sans documents : un modele ne porte que des
   * dossiers.
   */
  listTemplateFolders: (templateId: number, parentId?: number, signal?: AbortSignal) =>
    apiFetch<{ folders: TemplateFolderSummary[] }>(
      `/api/templates/${templateId}/folders/${parentId != null ? `?parent=${parentId}` : ''}`,
      { signal },
    ),

  createTemplateFolder: (
    templateId: number,
    name: string,
    parentId?: number | null,
    visibleToRoles: string[] = [],
  ) =>
    apiFetch<TemplateFolderSummary>(`/api/templates/${templateId}/folders/`, {
      method: 'POST',
      body: { name, parent: parentId ?? null, visible_to_roles: visibleToRoles },
    }),

  updateTemplateFolder: (
    templateId: number,
    folderId: number,
    patch: { name?: string; visible_to_roles?: string[] },
  ) =>
    apiFetch<TemplateFolderSummary>(`/api/templates/${templateId}/folders/${folderId}/`, {
      method: 'PATCH',
      body: patch,
    }),

  /** Supprime le dossier de modele ET sa descendance (cascade cote Django). */
  deleteTemplateFolder: (templateId: number, folderId: number) =>
    apiFetch<void>(`/api/templates/${templateId}/folders/${folderId}/`, { method: 'DELETE' }),

  /** Tous les offices de la plateforme — reserve aux hyperadmins Notantis. */
  listHyperadminOffices: (signal?: AbortSignal) =>
    apiFetch<HyperadminOffice[]>('/api/hyperadmin/offices/', { signal }),

  /**
   * Cree un office ET son premier administrateur dans le meme appel — le
   * serveur valide tout avant d'ecrire quoi que ce soit, il n'existe donc pas
   * d'etat intermediaire « office sans admin ». `adminMode: 'create'` ouvre un
   * nouveau compte (mot de passe requis, valide par Django), `'attach'`
   * rattache un compte existant designe par son nom exact.
   *
   * L'appel provisionne aussi la base SQLite du nouvel office : il est lent a
   * l'echelle d'un clic (migration complete), l'interface doit le dire.
   */
  createHyperadminOffice: (payload: {
    subdomain: string;
    name: string;
    adminMode: 'create' | 'attach';
    adminUsername: string;
    adminPassword?: string;
  }) =>
    apiFetch<HyperadminOffice>('/api/hyperadmin/offices/', {
      method: 'POST',
      body: {
        subdomain: payload.subdomain,
        name: payload.name,
        admin_mode: payload.adminMode,
        admin_username: payload.adminUsername,
        ...(payload.adminMode === 'create' ? { admin_password: payload.adminPassword ?? '' } : {}),
      },
    }),

  /**
   * Active/desactive un office et/ou remplace la liste de ses modules actives.
   * Un office desactive devient inaccessible comme un sous-domaine inconnu
   * (TenantResolutionMiddleware) — ses donnees restent, ses membres non.
   */
  updateHyperadminOffice: (
    officeId: number,
    patch: { is_active?: boolean; enabled_module_slugs?: string[] },
  ) =>
    apiFetch<HyperadminOffice>(`/api/hyperadmin/offices/${officeId}/`, {
      method: 'PATCH',
      body: patch,
    }),

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
