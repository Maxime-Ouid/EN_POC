/* ===========================================================================
   Jeux de données de démonstration — reprises telles quelles du prototype
   index_16.html (office fictif « Briand & Hamon »).

   Règle de lecture : tout ce qui est ici n'a PAS d'équivalent en base. Le
   backend du POC ne modélise aujourd'hui que Office / Module / Membership /
   Dataroom / Document (backend/datarooms/models.py). Les Q&R, membres d'une
   dataroom, historique d'audit, arborescence de rubriques, statistiques
   d'usage, facturation, sessions ouvertes et modèles de dataroom n'existent
   nulle part côté serveur : ils sont figés ici pour que la maquette reste
   navigable, et devront disparaître de ce fichier au fur et à mesure que les
   endpoints correspondants apparaissent.
   =========================================================================== */

import type { ReactNode } from 'react';
import type {
  ClientUsageRow,
  ConnectedUserRow,
  DataroomDocument,
  DataroomRow,
  DataroomTemplate,
  HistoryRow,
  InvoiceRow,
  MemberRow,
  ModuleEntry,
  NavSection,
  Portfolio,
  QAEntry,
  TreeNodeData,
} from '../components';
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Général',
    items: [
      { key: 'dashboard', icon: 'home', label: 'Accueil' },
      { key: 'portfolios', icon: 'layers', label: 'Portefeuilles' },
      { key: 'datarooms', icon: 'folder', label: 'Dossiers', count: 245 },
    ],
  },
  {
    label: 'Pilotage',
    items: [{ key: 'stats', icon: 'clock', label: 'Statistiques & facturation' }],
  },
  {
    label: 'Office',
    items: [
      // Annuaire de l'étude : seule entrée de cette section adossée à un vrai
      // endpoint (/api/office-users/). Elle reste visible pour tout le monde —
      // c'est le serveur qui répond 403 aux non-administrateurs, et l'écran qui
      // l'explique, plutôt qu'une entrée qui disparaît sans dire pourquoi.
      { key: 'users', icon: 'users', label: "Annuaire de l'étude" },
      { key: 'settings', icon: 'settings', label: 'Personnalisation' },
    ],
  },
];

export const PORTFOLIOS: Portfolio[] = [
  {
    id: 'ivry',
    icon: 'layers',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: 'Opération Ivry — Le Monde Commerce',
    desc: 'Projet APUI · 4 datarooms',
    status: { kind: 'success', label: 'Actif' },
    storage: '86,4 Go',
    lastActivity: "Aujourd'hui",
    members: [{ label: 'DB' }, { label: 'BH', gray: true }, { label: '+6', gray: true }],
  },
  {
    id: 'jo2024',
    icon: 'layers',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: 'JO 2024 — Parc immobilier',
    desc: 'Multi-actifs · 12 datarooms',
    status: { kind: 'success', label: 'Actif' },
    storage: '1,8 To',
    lastActivity: 'Hier',
    members: [{ label: 'CD' }, { label: 'JD', gray: true }, { label: '+11', gray: true }],
  },
  {
    id: 'nice-etoile',
    icon: 'layers',
    iconBg: 'var(--surface-alt)',
    iconColor: 'var(--ink-500)',
    muted: true,
    name: 'Copropriété Nice Étoile',
    desc: "Vente d'actif · 2 datarooms",
    status: { kind: 'neutral', label: 'Clôturé' },
    storage: '14,2 Go',
    lastActivity: '12 juil. 2026',
    members: [{ label: 'HH' }, { label: '+2', gray: true }],
  },
];

export const DATAROOM_ROWS: DataroomRow[] = [
  {
    id: 'caudan',
    icon: 'folder',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: 'Dossier de vente Caudan',
    portfolio: 'Ivry — Le Monde',
    tags: [{ label: 'Vente' }],
    members: [{ label: 'DB' }, { label: '+4', gray: true }],
    storage: '18,2 Go',
    activity: "Aujourd'hui",
    status: { kind: 'success', label: 'Actif' },
  },
  {
    id: 'choleur',
    icon: 'folder',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: 'Vente actifs Choleur SA',
    tags: [{ label: 'Vente' }, { label: 'Prioritaire', plain: true }],
    members: [{ label: 'JD' }, { label: '+2', gray: true }],
    storage: '6,1 Go',
    activity: 'Hier',
    status: { kind: 'success', label: 'Actif' },
  },
  {
    id: 'hamon',
    icon: 'folder',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: 'Dossier Hamon',
    tags: [],
    members: [{ label: 'BH' }],
    storage: '640 Mo',
    activity: 'Hier',
    status: { kind: 'success', label: 'Actif' },
  },
  {
    id: 'ivry-commerce',
    icon: 'folder',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    name: 'IVRY — LE MONDE (COMMERCE)',
    portfolio: 'Ivry — Le Monde',
    tags: [{ label: 'APUI' }],
    members: [{ label: 'CD' }, { label: '+9', gray: true }],
    storage: '54,8 Go',
    activity: '3 jours',
    status: { kind: 'success', label: 'Actif' },
  },
  {
    id: 'nice',
    icon: 'folder',
    iconBg: 'var(--surface-alt)',
    iconColor: 'var(--ink-500)',
    muted: true,
    name: 'Nice étoile',
    portfolio: 'Nice Étoile',
    tags: [{ label: 'Copropriété', plain: true }],
    members: [{ label: 'HH' }],
    storage: '14,2 Go',
    activity: '12 juil.',
    status: { kind: 'neutral', label: 'Clôturé' },
  },
  {
    id: 'modele-vente',
    icon: 'file',
    iconBg: 'var(--brass-100)',
    iconColor: 'var(--brass-700)',
    name: 'Dataroom — modèle vente immobilière',
    portfolio: 'Modèles',
    tags: [{ label: 'Template', plain: true }],
    members: [],
    storage: '212 Mo',
    activity: '—',
    status: { kind: 'info', label: 'Modèle' },
  },
];

export const TREE: TreeNodeData[] = [
  {
    id: '1',
    label: '1. Aspects sociétaires',
    count: 6,
    children: [
      { id: '1.1', label: '1.1 Société A' },
      { id: '1.2', label: '1.2 Société B' },
    ],
  },
  {
    id: '2',
    label: "2. Présentation de l'actif",
    count: 11,
    children: [
      { id: '2.1', label: '2.1 Plans' },
      { id: '2.2', label: '2.2 Note de désignation' },
    ],
  },
  { id: '3', label: '3. Droit de propriété', count: 10 },
  { id: '4', label: '4. Situation hypothécaire', count: 7 },
  { id: '5', label: '5. Servitudes', count: 4 },
  { id: '7', label: '7. Urbanisme', count: 5 },
  { id: '8', label: '8. Autorisations administratives', count: 21 },
  { id: '10', label: '10. Diagnostics', count: 6 },
  { id: '14', label: '14. Fiscalité', count: 5 },
];

export const DOCS_BY_FOLDER: Record<string, DataroomDocument[]> = {
  '2.1': [
    {
      id: 'd1',
      name: 'REF — COMMUNE X — Extrait du plan cadastral.pdf',
      status: { kind: 'neutral', label: 'Consulté' },
      addedBy: 'D. Briand',
      date: '14/07/2026',
      size: '2,1 Mo',
      customFields: [
        { label: 'Référence cadastrale', value: 'AB-0412', mono: true },
        { label: 'Confidentiel', value: 'Non' },
      ],
      activity: [
        {
          id: 'd1-a1',
          icon: 'eye',
          tone: 'info',
          text: 'Consulté par Sandrine — Acquéreur',
          time: "Aujourd'hui, 09:02",
        },
        {
          id: 'd1-a2',
          icon: 'file',
          tone: 'success',
          text: 'Déposé par Delphine Briand',
          time: '14/07/2026, 11:20',
        },
      ],
    },
    {
      id: 'd2',
      name: "Plan d'aménagement intérieur T2.pdf",
      status: { kind: 'warning', label: 'Nouveau' },
      addedBy: 'C. Dumont',
      date: "Aujourd'hui",
      size: '4,7 Mo',
      customFields: [
        { label: 'Référence cadastrale', value: 'AB-0413', mono: true },
        { label: 'Confidentiel', value: 'Non' },
      ],
      activity: [
        {
          id: 'd2-a1',
          icon: 'file',
          tone: 'success',
          text: 'Déposé par Cyril Dumont',
          time: "Aujourd'hui, 10:42",
        },
      ],
    },
    {
      id: 'd3',
      name: 'Plan topographique T1.dwg',
      status: { kind: 'neutral', label: 'Consulté' },
      addedBy: 'C. Dumont',
      date: '02/06/2026',
      size: '11,4 Mo',
    },
    {
      id: 'd4',
      name: 'Géoportail — relevé.pdf',
      status: { kind: 'neutral', label: 'Consulté' },
      addedBy: 'D. Briand',
      date: '02/06/2026',
      size: '870 Ko',
    },
    {
      id: 'd5',
      name: 'Plan SDP — en attente de dépôt',
      status: { kind: 'info', label: 'En attente' },
      addedBy: '—',
      date: '—',
      size: '—',
      muted: true,
    },
  ],
};

export const QA_ENTRIES: QAEntry[] = [
  {
    id: 'q104',
    status: { kind: 'warning', label: 'Sans réponse' },
    object: 'Question sur : EHF réel 15.07.2026',
    meta: "Réf. #Q104 · Sandrine ACQUÉREUR · aujourd'hui 09:15",
    body: 'La fiche réelle mentionne une inscription de 1994 — est-elle toujours valable ou faut-il une mise à jour avant la signature ?',
  },
  {
    id: 'q101',
    status: { kind: 'info', label: 'Restreinte · Étude' },
    object: 'Question sur : Servitude de passage 1989',
    meta: 'Réf. #Q101 · Cyril Dumont · hier 16:20',
    body: "Le vendeur souhaite-t-il que cette pièce reste masquée aux acquéreurs jusqu'à la levée des conditions suspensives ?",
    answer: {
      author: 'Delphine Briand',
      text: "Oui, garder restreinte à l'étude pour l'instant.",
      time: 'hier 17:02',
    },
  },
  {
    id: 'q098',
    status: { kind: 'success', label: 'Répondue' },
    object: 'Question sur : Rapport Géorisques du 09.07.2026',
    meta: 'Réf. #Q098 · Marc VENDEUR · 18/07 11:03',
    body: "Le rapport couvre-t-il l'intégralité de la parcelle B ou uniquement le bâtiment principal ?",
    answer: {
      author: 'Cyril Dumont',
      text: "Il couvre l'intégralité de la parcelle, bâtiment et abords compris.",
      time: '18/07 14:40',
    },
  },
];

export const MEMBERS: MemberRow[] = [
  { id: 'm1', initials: 'DB', name: 'Delphine Briand', group: 'Étude', access: { kind: 'success', label: 'Lecture / Écriture' }, lastLogin: "Aujourd'hui, 10:40" },
  { id: 'm2', initials: 'MV', name: 'Marc — Vendeur', group: 'Vendeur', access: { kind: 'info', label: 'Lecture seule' }, lastLogin: '18/07/2026' },
  { id: 'm3', initials: 'SA', name: 'Sandrine — Acquéreur', group: 'Acquéreur', access: { kind: 'info', label: 'Lecture seule' }, lastLogin: "Aujourd'hui, 09:15" },
  { id: 'm4', initials: 'EX', gray: true, name: 'Cabinet Ferrand — Expert', group: 'Experts', access: { kind: 'warning', label: 'Sous-dossier limité' }, lastLogin: '12/07/2026' },
  { id: 'm5', initials: '?', gray: true, name: 'Invitation en attente', group: 'Acquéreur', access: { kind: 'neutral', label: '—' }, lastLogin: 'Jamais connecté' },
];

export const HISTORY: HistoryRow[] = [
  { id: 'h1', timestamp: '2026-08-25 10:42:11', user: 'Delphine Briand', action: { kind: 'success', label: 'Dépôt' }, target: "Plan d'aménagement intérieur T2.pdf" },
  { id: 'h2', timestamp: '2026-08-25 09:15:04', user: 'Sandrine — Acquéreur', action: { kind: 'info', label: 'Question posée' }, target: 'EHF réel 15.07.2026' },
  { id: 'h3', timestamp: '2026-08-24 17:02:38', user: 'Delphine Briand', action: { kind: 'info', label: 'Réponse' }, target: 'Servitude de passage 1989' },
  { id: 'h4', timestamp: '2026-08-24 16:12:57', user: 'Cyril Dumont', action: { kind: 'critical', label: 'Suppression' }, target: 'Ancien plan T2 (v1) — historisé' },
  { id: 'h5', timestamp: '2026-08-24 11:20:02', user: 'Marc — Vendeur', action: { kind: 'neutral', label: 'Consultation' }, target: 'Titre immédiat — Vente Société C' },
];

export interface DemoActivityEntry {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  text: ReactNode;
  time: string;
}

export const RECENT_ACTIVITY: DemoActivityEntry[] = [
  {
    id: 'a1',
    icon: 'file',
    iconBg: 'var(--info-bg)',
    iconColor: 'var(--info)',
    text: (
      <>
        <b>Delphine Briand</b> a déposé <b>3 pièces</b> dans « Dossier de vente Caudan »
      </>
    ),
    time: "Aujourd'hui, 10:42",
  },
  {
    id: 'a2',
    icon: 'msg',
    iconBg: 'var(--warning-bg)',
    iconColor: 'var(--warning)',
    text: 'Nouvelle question sur « EHF réel 15.07.2026 »',
    time: "Aujourd'hui, 09:15",
  },
  {
    id: 'a3',
    icon: 'users',
    iconBg: 'var(--success-bg)',
    iconColor: 'var(--success)',
    text: (
      <>
        <b>Jules Dalier</b> a ajouté un membre à « Vente actifs Choleur SA »
      </>
    ),
    time: 'Hier, 17:03',
  },
  {
    id: 'a4',
    icon: 'zip',
    iconBg: 'var(--brass-100)',
    iconColor: 'var(--brass-700)',
    text: 'Export ZIP généré pour « IVRY — LE MONDE (COMMERCE) »',
    time: 'Hier, 15:47',
  },
  {
    id: 'a5',
    icon: 'x',
    iconBg: 'var(--critical-bg)',
    iconColor: 'var(--critical)',
    text: 'Document supprimé dans « Dossier Hamon » — historisé',
    time: 'Hier, 11:20',
  },
];

export const CLIENT_USAGE: ClientUsageRow[] = [
  { id: 'republique', name: 'République', dataroomCount: 18, storage: '96,4 Go', sharePercent: 31, lastActivity: "Aujourd'hui" },
  { id: 'arsenal', name: 'Arsenal', dataroomCount: 52, storage: '142,0 Go', sharePercent: 45, lastActivity: 'Hier' },
  { id: 'ivry', name: 'Ivry — Le Monde', dataroomCount: 4, storage: '54,8 Go', sharePercent: 18, shareWarning: true, lastActivity: '3 jours' },
  { id: 'modeles', name: 'Modèles internes', dataroomCount: 4, storage: '1,1 Go', sharePercent: 2, lastActivity: '—' },
];

export const INVOICES: InvoiceRow[] = [
  { id: 'inv-2026-07', period: 'Juillet 2026', averageStorage: '298 Go', amountExclTax: '412,00 €' },
  { id: 'inv-2026-06', period: 'Juin 2026', averageStorage: '276 Go', amountExclTax: '381,00 €' },
  { id: 'inv-2026-05', period: 'Mai 2026', averageStorage: '260 Go', amountExclTax: '359,00 €' },
];

export const CONNECTED_USERS: ConnectedUserRow[] = [
  { id: 'c1', initials: 'CD', name: 'Cyril Dumont', company: 'Briand & Hamon', role: 'Superadmin', connectedFor: '32 min' },
  { id: 'c2', initials: 'DB', name: 'Delphine Briand', company: 'Briand & Hamon', role: 'Notaire', connectedFor: '8 min' },
  { id: 'c3', initials: 'SA', name: 'Sandrine — Acquéreur', company: 'Externe', role: 'Client', connectedFor: '4 min' },
];

/**
 * Catalogue des modules affichés dans Personnalisation → Modules.
 * `slug` correspond à Module.slug côté Django : l'état activé/désactivé peut
 * donc, lui, venir de /api/tenant-config/ (`enabled_modules`).
 */
export const MODULE_CATALOG: ModuleEntry[] = [
  { slug: 'coffre-fort', name: 'Coffre-fort électronique', desc: 'Archivage à valeur probante — module Notantis', icon: 'lock', iconBg: 'var(--info-bg)', iconColor: 'var(--info)', enabled: false },
  { slug: 'confiance-rib', name: 'Confiance RIB', desc: 'Vérification des coordonnées bancaires', icon: 'shield', iconBg: 'var(--info-bg)', iconColor: 'var(--info)', enabled: false },
  { slug: 'chatbot', name: 'Chatbot de support client', desc: 'Répond en 1er niveau aux questions fréquentes', icon: 'msg', iconBg: 'var(--brass-100)', iconColor: 'var(--brass-700)', enabled: true },
  { slug: 'mcp', name: 'Serveur MCP', desc: "Connexion aux outils IA internes de l'étude", icon: 'layers', iconBg: 'var(--surface-alt)', iconColor: 'var(--ink-400)', muted: true, comingSoon: true },
];

export const DATAROOM_TEMPLATES: DataroomTemplate[] = [
  { id: 'vente', name: 'Vente immobilière — standard', desc: '14 rubriques · diagnostics, urbanisme, fiscalité…' },
  { id: 'divorce', name: 'Dossier de divorce', desc: 'Groupes Conjoint 1 / Conjoint 2 / Magistrats' },
];

/** Options proposées dans la modale de création de dossier. */
export const NEW_DATAROOM_TEMPLATES = [
  { id: 'vente', icon: 'folder', name: 'Vente immobilière — standard', desc: 'Recommandé · le plus utilisé par les offices' },
  { id: 'divorce', icon: 'folder', name: 'Dossier de divorce', desc: 'Groupes prédéfinis' },
  { id: 'vide', icon: 'file', name: 'Dataroom vide', desc: 'Sans arborescence pré-remplie' },
];

export const PORTFOLIO_OPTIONS = [
  { id: 'ivry', label: 'Opération Ivry — Le Monde Commerce' },
  { id: 'jo2024', label: 'JO 2024 — Parc immobilier' },
];

export const CLIENT_SPACE_OPTIONS = [
  { id: 'republique', label: 'République' },
  { id: 'arsenal', label: 'Arsenal' },
  // Affordance de création d'un espace client depuis la modale, présente dans
  // le prototype — à câbler sur un vrai formulaire quand l'endpoint existera.
  { id: 'new', label: '+ Créer…' },
];

export const DEMO_OFFICE = {
  name: 'Briand & Hamon',
  fullName: 'Briand & Hamon, notaires associés',
  role: 'Notaires associés',
  subdomain: 'briand-hamon.espacenotarial.fr',
  userInitials: 'CD',
  userName: 'Cyril Dumont',
  userFirstName: 'Cyril',
  userRole: 'Superadmin',
  identifier: 'cyril.dumont@paris.notaires.fr',
};

export const DEMO_HOME_STATS = {
  activeDatarooms: 64,
  activeDeltaText: '+6 ce mois',
  storageUsedGo: 312,
  storageQuotaGo: 500,
  pendingQuestions: 7,
  pendingWarnText: '3 depuis plus de 48h',
  connectedMembers: 18,
  totalMembers: 43,
};

export const DEMO_DATAROOM_DETAIL = {
  portfolioName: 'Ivry — Le Monde',
  name: 'Dossier de vente Caudan',
  tags: [{ label: 'Vente' }, { label: 'Immobilier commercial', plain: true }],
  status: { kind: 'success' as const, label: 'Actif' },
  meta: [
    { label: 'Créé le', value: '19 mai 2026 · Cyril Dumont' },
    { label: 'Documents', value: '312 fichiers' },
    { label: 'Poids', value: <span className="mono">18,2 Go</span> },
    { label: 'Dernière modification', value: "Aujourd'hui, 10:42" },
    { label: 'Modèle', value: 'Vente immobilière — standard' },
  ],
};
