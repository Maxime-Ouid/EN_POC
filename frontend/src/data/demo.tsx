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
  AuditEvent,
  ClientUsageRow,
  ConnectedUserRow,
  DataroomDocument,
  DataroomRow,
  HistoryRow,
  InvoiceRow,
  MemberRow,
  MetadataFieldDef,
  ModuleEntry,
  NavSection,
  OfficeActivityStats,
  Portfolio,
  PortfolioDataroomRow,
  QAEntry,
  TemporaryLink,
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
    items: [
      { key: 'stats', icon: 'clock', label: 'Statistiques & facturation' },
      // Audit trail de l'office (§3.2, §4.6) — distinct de l'onglet
      // « Historique » d'un dossier, qui ne montre que la vie de CELUI-LÀ.
      { key: 'audit', icon: 'shield', label: 'Journal des accès' },
    ],
  },
  {
    label: 'Office',
    items: [
      // Annuaire de l'étude : seule entrée de cette section adossée à un vrai
      // endpoint (/api/office-users/). Elle reste visible pour tout le monde —
      // c'est le serveur qui répond 403 aux non-administrateurs, et l'écran
      // qui l'explique, plutôt qu'une entrée qui disparaît sans dire pourquoi.
      // Les modèles de dossier (Template) sont gérés depuis Personnalisation
      // → onglet Template (02/09/2026) : plus d'entrée de nav séparée pour
      // eux, voir CLAUDE.md.
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
    tags: [{ id: 1, name: 'Vente', color: 'brass' }],
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
    tags: [
      { id: 1, name: 'Vente', color: 'brass' },
      { id: 2, name: 'Prioritaire', color: 'critical' },
    ],
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
    tags: [{ id: 3, name: 'APUI', color: 'info' }],
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
    tags: [{ id: 4, name: 'Copropriété', color: 'neutral' }],
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
    tags: [{ id: 5, name: 'Template', color: 'neutral' }],
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
  {
    id: 'republique', name: 'République', dataroomCount: 18, storage: '96,4 Go',
    sharePercent: 31, lastActivity: "Aujourd'hui",
    datarooms: [
      { id: 'caudan', name: 'Dossier de vente Caudan', documents: 412, storage: '18,2 Go', sharePercent: 19, lastActivity: "Aujourd'hui" },
      { id: 'republique-2', name: 'Cession parts SCI République', documents: 268, storage: '41,7 Go', sharePercent: 43, lastActivity: '2 jours' },
      { id: 'republique-3', name: 'Baux commerciaux 2026', documents: 154, storage: '36,5 Go', sharePercent: 38, lastActivity: '6 jours' },
    ],
  },
  {
    id: 'arsenal', name: 'Arsenal', dataroomCount: 52, storage: '142,0 Go',
    sharePercent: 45, lastActivity: 'Hier',
    datarooms: [
      { id: 'arsenal-1', name: 'Portefeuille Arsenal — lot A', documents: 1206, storage: '78,3 Go', sharePercent: 55, lastActivity: 'Hier' },
      { id: 'arsenal-2', name: 'Portefeuille Arsenal — lot B', documents: 884, storage: '49,1 Go', sharePercent: 35, lastActivity: '4 jours' },
      { id: 'arsenal-3', name: 'Contentieux Arsenal', documents: 197, storage: '14,6 Go', sharePercent: 10, lastActivity: '3 semaines' },
    ],
  },
  {
    id: 'ivry', name: 'Ivry — Le Monde', dataroomCount: 4, storage: '54,8 Go',
    sharePercent: 18, shareWarning: true, lastActivity: '3 jours',
    datarooms: [
      { id: 'ivry-halle', name: 'Ivry — Halle commerciale', documents: 523, storage: '31,4 Go', sharePercent: 57, lastActivity: '3 jours' },
      { id: 'ivry-bureaux', name: 'Ivry — Plateau de bureaux', documents: 341, storage: '18,9 Go', sharePercent: 35, lastActivity: '5 jours' },
      { id: 'ivry-parking', name: 'Ivry — Parkings', documents: 88, storage: '4,5 Go', sharePercent: 8, lastActivity: '2 semaines' },
    ],
  },
  {
    id: 'modeles', name: 'Modèles internes', dataroomCount: 4, storage: '1,1 Go',
    sharePercent: 2, lastActivity: '—',
    datarooms: [
      { id: 'modeles-1', name: 'Trame vente d\'actif', documents: 42, storage: '0,7 Go', sharePercent: 64, lastActivity: '—' },
      { id: 'modeles-2', name: 'Trame APUI', documents: 21, storage: '0,4 Go', sharePercent: 36, lastActivity: '—' },
    ],
  },
];

/** Périodes proposées au relevé d'usage en marque grise (§4.6). */
export const STATEMENT_PERIODS = [
  'Août 2026',
  'Juillet 2026',
  '3e trimestre 2026',
  '2e trimestre 2026',
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

/** Options proposées dans la modale de création de dossier. */
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
  tags: [
    { id: 1, name: 'Vente', color: 'brass' as const },
    { id: 6, name: 'Immobilier commercial', color: 'info' as const },
  ],
  status: { kind: 'success' as const, label: 'Actif' },
  meta: [
    { label: 'Créé le', value: '19 mai 2026 · Cyril Dumont' },
    { label: 'Documents', value: '312 fichiers' },
    { label: 'Poids', value: <span className="mono">18,2 Go</span> },
    { label: 'Dernière modification', value: "Aujourd'hui, 10:42" },
    { label: 'Modèle', value: 'Vente immobilière — standard' },
  ],
};

/* ---------------------------------------------------------------------------
   Lot « valeur MVP » (§3.2 / §4.6) — jeux de démonstration des écrans ajoutés
   le 03/09/2026 : journal des accès, méta-données, portefeuille consolidé,
   liens temporaires et reporting d'activité.

   Comme tout ce fichier : rien de ceci n'a d'équivalent en base. Ces constantes
   disparaîtront au fur et à mesure que les endpoints apparaîtront — l'audit
   trail en premier, puisque le reporting d'activité en dépend entièrement.
   ------------------------------------------------------------------------- */

/** Durée de conservation affichée par le journal. Non arbitrée (§11) : la
    valeur ci-dessous est une proposition, pas une règle appliquée. */
export const AUDIT_RETENTION = '3 ans glissants';

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: 'a1', timestamp: '03/09/2026 16:42', day: '2026-09-03', actor: 'Delphine Briand', actorInitials: 'DB', category: 'depot', action: 'Dépôt de document', target: 'Rapport Géorisques du 09.07.2026.pdf', dataroom: 'Dossier de vente Caudan', origin: '92.184.x.x · Web' },
  { id: 'a2', timestamp: '03/09/2026 16:31', day: '2026-09-03', actor: 'Sandrine — Acquéreur', actorInitials: 'SA', actorGray: true, category: 'acces', action: 'Téléchargement du document', target: 'DPE Bâtiment Entier.pdf', dataroom: 'Dossier de vente Caudan', origin: '78.203.x.x · Web' },
  { id: 'a3', timestamp: '03/09/2026 15:58', day: '2026-09-03', actor: 'Cyril Dumont', actorInitials: 'CD', category: 'droits', action: "Ajout d'un membre au dossier", target: 'Maître Hamon — lecture', dataroom: 'Cession parts SCI République', origin: '92.184.x.x · Web' },
  { id: 'a4', timestamp: '03/09/2026 15:12', day: '2026-09-03', actor: 'Delphine Briand', actorInitials: 'DB', category: 'partage', action: "Création d'un lien temporaire", target: 'État des Risques du 09.07.2026.pdf', dataroom: 'Dossier de vente Caudan', origin: '92.184.x.x · Web' },
  { id: 'a5', timestamp: '03/09/2026 14:03', day: '2026-09-03', actor: 'Jean Delaunay', actorInitials: 'JD', category: 'modification', action: "Renommage d'un sous-dossier", target: '7. Urbanisme → 7. Urbanisme et cadastre', dataroom: 'Ivry — Halle commerciale', origin: '92.184.x.x · Web' },
  { id: 'a6', timestamp: '03/09/2026 11:47', day: '2026-09-03', actor: 'Sandrine — Acquéreur', actorInitials: 'SA', actorGray: true, category: 'acces', action: "Consultation de l'arborescence", target: '10. Diagnostics', dataroom: 'Dossier de vente Caudan', origin: '78.203.x.x · Web' },
  { id: 'a7', timestamp: '03/09/2026 09:22', day: '2026-09-03', actor: 'Cyril Dumont', actorInitials: 'CD', category: 'securite', action: 'Connexion avec authentification forte', target: 'Session ouverte', origin: '92.184.x.x · Web' },
  { id: 'a8', timestamp: '02/09/2026 18:36', day: '2026-09-02', actor: 'Delphine Briand', actorInitials: 'DB', category: 'suppression', action: "Suppression d'un document", target: 'Plan topographique T1 (brouillon).dwg', dataroom: 'Ivry — Halle commerciale', origin: '92.184.x.x · Web' },
  { id: 'a9', timestamp: '02/09/2026 17:04', day: '2026-09-02', actor: 'Hélène Hamon', actorInitials: 'HH', category: 'depot', action: 'Dépôt multiple (12 documents)', target: '8. Autorisations administratives', dataroom: 'Cession parts SCI République', origin: '92.184.x.x · Web' },
  { id: 'a10', timestamp: '02/09/2026 16:15', day: '2026-09-02', actor: 'Sandrine — Acquéreur', actorInitials: 'SA', actorGray: true, category: 'acces', action: 'Téléchargement groupé ZIP', target: '4. Situation hypothécaire (7 pièces)', dataroom: 'Dossier de vente Caudan', origin: '78.203.x.x · Web' },
  { id: 'a11', timestamp: '02/09/2026 14:51', day: '2026-09-02', actor: 'Cyril Dumont', actorInitials: 'CD', category: 'droits', action: 'Restriction posée sur un sous-dossier', target: '12. Situation locative — étude seule', dataroom: 'Baux commerciaux 2026', origin: '92.184.x.x · Web' },
  { id: 'a12', timestamp: '02/09/2026 10:08', day: '2026-09-02', actor: 'Jean Delaunay', actorInitials: 'JD', category: 'modification', action: 'Modification des méta-données', target: 'Prix de cession — 4 250 000 €', dataroom: 'Ivry — Halle commerciale', origin: '92.184.x.x · Web' },
  { id: 'a13', timestamp: '01/09/2026 19:22', day: '2026-09-01', actor: 'Sandrine — Acquéreur', actorInitials: 'SA', actorGray: true, category: 'securite', action: "Échec d'authentification (code invalide)", target: '3e tentative consécutive', origin: '78.203.x.x · Web' },
  { id: 'a14', timestamp: '01/09/2026 16:40', day: '2026-09-01', actor: 'Delphine Briand', actorInitials: 'DB', category: 'partage', action: "Révocation d'un lien temporaire", target: 'Note de désignation.doc', dataroom: 'Dossier de vente Caudan', origin: '92.184.x.x · Web' },
  { id: 'a15', timestamp: '01/09/2026 15:03', day: '2026-09-01', actor: 'Hélène Hamon', actorInitials: 'HH', category: 'acces', action: "Prévisualisation d'un document", target: 'Statuts SOCIÉTÉ A - 11.09.2025.pdf', dataroom: 'Cession parts SCI République', origin: '92.184.x.x · Web' },
  { id: 'a16', timestamp: '01/09/2026 11:30', day: '2026-09-01', actor: 'Cyril Dumont', actorInitials: 'CD', category: 'modification', action: 'Clôture du dossier', target: 'Copropriété Nice Étoile', dataroom: 'Copropriété Nice Étoile', origin: '92.184.x.x · Web' },
  { id: 'a17', timestamp: '31/08/2026 17:58', day: '2026-08-31', actor: 'Jean Delaunay', actorInitials: 'JD', category: 'depot', action: 'Dépôt de document', target: 'Audit énergétique du 28.05.2026.pdf', dataroom: 'Ivry — Plateau de bureaux', origin: '92.184.x.x · Web' },
  { id: 'a18', timestamp: '31/08/2026 14:12', day: '2026-08-31', actor: 'Delphine Briand', actorInitials: 'DB', category: 'droits', action: "Retrait d'un membre", target: 'Stagiaire — accès révoqué', dataroom: 'Baux commerciaux 2026', origin: '92.184.x.x · Web' },
  { id: 'a19', timestamp: '28/08/2026 16:44', day: '2026-08-28', actor: 'Hélène Hamon', actorInitials: 'HH', category: 'acces', action: 'Consultation de la liste des questions', target: '6 questions sans réponse', dataroom: 'Dossier de vente Caudan', origin: '92.184.x.x · Web' },
  { id: 'a20', timestamp: '28/08/2026 09:15', day: '2026-08-28', actor: 'Cyril Dumont', actorInitials: 'CD', category: 'securite', action: 'Modification du mot de passe', target: 'Compte cyril.dumont', origin: '92.184.x.x · Web' },
  { id: 'a21', timestamp: '24/08/2026 15:36', day: '2026-08-24', actor: 'Jean Delaunay', actorInitials: 'JD', category: 'depot', action: 'Dépôt multiple (30 documents)', target: '13. Technique — courriers décret tertiaire', dataroom: 'Ivry — Halle commerciale', origin: '92.184.x.x · Web' },
  { id: 'a22', timestamp: '19/08/2026 10:02', day: '2026-08-19', actor: 'Delphine Briand', actorInitials: 'DB', category: 'partage', action: 'Partage du dossier avec un autre office', target: 'SCP Moreau & Associés — vendeur', dataroom: 'Cession parts SCI République', origin: '92.184.x.x · Web' },
  { id: 'a23', timestamp: '12/08/2026 11:19', day: '2026-08-12', actor: 'Cyril Dumont', actorInitials: 'CD', category: 'modification', action: 'Archivage du dossier', target: 'Vente actifs Choleur SA', dataroom: 'Vente actifs Choleur SA', origin: '92.184.x.x · Web' },
  { id: 'a24', timestamp: '05/07/2026 14:47', day: '2026-07-05', actor: 'Hélène Hamon', actorInitials: 'HH', category: 'suppression', action: "Suppression d'un sous-dossier vide", target: '6. Organisation juridique', dataroom: 'Dossier de vente Caudan', origin: '92.184.x.x · Web' },
  { id: 'a25', timestamp: '02/06/2026 09:31', day: '2026-06-02', actor: 'Delphine Briand', actorInitials: 'DB', category: 'depot', action: 'Création du dossier', target: 'Dossier de vente Caudan', dataroom: 'Dossier de vente Caudan', origin: '92.184.x.x · Web' },
];

/** Schéma de méta-données de l'office — §4.6, volet « champs définis ». */
export const METADATA_FIELDS: MetadataFieldDef[] = [
  { id: 'mf-type', label: "Type d'opération", type: 'liste', required: true, options: ["Vente d'actif", 'Acquisition', 'Cession de parts', 'Bail commercial', 'Succession'] },
  { id: 'mf-ref', label: "Référence de l'étude", type: 'texte', required: true, help: 'Ex. 2026-BH-0142' },
  { id: 'mf-notaire', label: 'Notaire référent', type: 'texte', required: true },
  { id: 'mf-prix', label: "Prix / montant de l'opération", type: 'montant', required: false },
  { id: 'mf-signature', label: 'Date de signature prévisionnelle', type: 'date', required: false },
  { id: 'mf-confidentiel', label: 'Dossier confidentiel', type: 'booleen', required: false },
];

/** Champs ajoutés pour la seule dataroom ouverte en démonstration. */
export const DATAROOM_CUSTOM_FIELDS: MetadataFieldDef[] = [
  { id: 'df-cadastre', label: 'Référence cadastrale', type: 'texte', required: false },
  { id: 'df-surface', label: 'Surface utile (m²)', type: 'nombre', required: false },
];

export const DATAROOM_METADATA_VALUES: Record<string, string> = {
  'mf-type': "Vente d'actif",
  'mf-ref': '2026-BH-0142',
  'mf-notaire': 'Delphine Briand',
  'mf-prix': '4 250 000 €',
  'mf-signature': '2026-11-14',
  'mf-confidentiel': 'non',
  'df-cadastre': 'AB 0142 / AB 0143',
  'df-surface': '1840',
};

/** Liens temporaires en cours sur la dataroom de démonstration — §3.2. */
export const TEMPORARY_LINKS: TemporaryLink[] = [
  { id: 'tl1', target: 'DPE Bâtiment Entier.pdf', recipient: 'expert@bureau-controle.fr', expiresAt: '10 sept. 2026, 18:00', downloads: 1, maxDownloads: 3, passwordProtected: true },
  { id: 'tl2', target: 'État des Risques du 09.07.2026.pdf', recipient: 'sandrine.acquereur@exemple.fr', expiresAt: '06 sept. 2026, 12:00', downloads: 2, maxDownloads: 2, passwordProtected: false, expired: true },
  { id: 'tl3', target: '4. Situation hypothécaire (dossier)', recipient: 'banque@credit-exemple.fr', expiresAt: '30 sept. 2026, 23:59', downloads: 0, maxDownloads: null, passwordProtected: true },
];

/** Reporting d'activité de l'office — §3.2, volet « côté EN d'un office ». */
export const OFFICE_ACTIVITY: OfficeActivityStats = {
  activeDatarooms: 24,
  activeDatatoomsDelta: '+3 ce mois',
  documentsAdded30d: 1284,
  documentsAdded30dDelta: '+18 %',
  activeUsers30d: 47,
  openQuestions: 6,
  storageTotal: '294,3 Go',
  storageGrowth30d: '+21,4 Go',
  topDatarooms: [
    { id: 'arsenal-1', name: 'Portefeuille Arsenal — lot A', storage: '78,3 Go', sharePercent: 27 },
    { id: 'arsenal-2', name: 'Portefeuille Arsenal — lot B', storage: '49,1 Go', sharePercent: 17 },
    { id: 'republique-2', name: 'Cession parts SCI République', storage: '41,7 Go', sharePercent: 14 },
    { id: 'republique-3', name: 'Baux commerciaux 2026', storage: '36,5 Go', sharePercent: 12 },
    { id: 'ivry-halle', name: 'Ivry — Halle commerciale', storage: '31,4 Go', sharePercent: 11 },
  ],
  members: [
    { id: 'm1', initials: 'DB', name: 'Delphine Briand', role: 'Notaire', documentsAdded: 218, documentsViewed: 1140, questionsAnswered: 34, lastSeen: "Aujourd'hui" },
    { id: 'm2', initials: 'CD', name: 'Cyril Dumont', role: 'Superadmin', documentsAdded: 96, documentsViewed: 872, questionsAnswered: 12, lastSeen: "Aujourd'hui" },
    { id: 'm3', initials: 'HH', name: 'Hélène Hamon', role: 'Notaire', documentsAdded: 341, documentsViewed: 654, questionsAnswered: 27, lastSeen: 'Hier' },
    { id: 'm4', initials: 'JD', name: 'Jean Delaunay', role: 'Clerc', documentsAdded: 512, documentsViewed: 1508, questionsAnswered: 9, lastSeen: 'Hier' },
    { id: 'm5', initials: 'SA', name: 'Sandrine — Acquéreur', gray: true, role: 'Client', documentsAdded: 0, documentsViewed: 396, questionsAnswered: 0, lastSeen: "Aujourd'hui" },
  ],
};

/** Vue consolidée par portefeuille — §2.1. Clé = id de PORTFOLIOS. */
export const PORTFOLIO_DETAILS: Record<
  string,
  {
    apui: boolean;
    meta: Array<{ label: string; value: string }>;
    stats: {
      dataroomCount: number;
      documentCount: number;
      storage: string;
      memberCount: number;
      openQuestions: number;
    };
    datarooms: PortfolioDataroomRow[];
  }
> = {
  ivry: {
    apui: true,
    meta: [
      { label: 'Client', value: 'Le Monde Commerce' },
      { label: 'Opération', value: 'APUI — 4 participants' },
      { label: 'Office pilote', value: 'Briand & Hamon' },
      { label: 'Ouvert le', value: '12 février 2026' },
    ],
    stats: { dataroomCount: 4, documentCount: 1284, storage: '86,4 Go', memberCount: 18, openQuestions: 4 },
    datarooms: [
      { id: 'ivry-halle', name: 'Ivry — Halle commerciale', holder: 'Briand & Hamon', status: { kind: 'success', label: 'Actif' }, documents: 523, storage: '31,4 Go', sharePercent: 36, lastActivity: '3 jours', members: [{ label: 'DB' }, { label: '+5', gray: true }] },
      { id: 'ivry-bureaux', name: 'Ivry — Plateau de bureaux', holder: 'SCP Moreau & Associés', status: { kind: 'success', label: 'Actif' }, documents: 341, storage: '18,9 Go', sharePercent: 22, lastActivity: '5 jours', members: [{ label: 'PM', gray: true }, { label: '+3', gray: true }] },
      { id: 'ivry-parking', name: 'Ivry — Parkings', holder: 'Étude Vasseur', status: { kind: 'warning', label: 'En attente' }, documents: 88, storage: '4,5 Go', sharePercent: 5, lastActivity: '2 semaines', members: [{ label: 'EV', gray: true }] },
      { id: 'ivry-commun', name: 'Ivry — Pièces communes', holder: 'Briand & Hamon', status: { kind: 'success', label: 'Actif' }, documents: 332, storage: '31,6 Go', sharePercent: 37, lastActivity: "Aujourd'hui", members: [{ label: 'DB' }, { label: 'HH', gray: true }, { label: '+8', gray: true }] },
    ],
  },
  jo2024: {
    apui: false,
    meta: [
      { label: 'Client', value: 'Foncière JO 2024' },
      { label: 'Opération', value: 'Multi-actifs — 12 immeubles' },
      { label: 'Référent', value: 'Hélène Hamon' },
      { label: 'Ouvert le', value: '4 novembre 2025' },
    ],
    stats: { dataroomCount: 12, documentCount: 4820, storage: '1,8 To', memberCount: 31, openQuestions: 2 },
    datarooms: [
      { id: 'jo-1', name: 'Immeuble Pantin — Cartier', holder: 'Hélène Hamon', status: { kind: 'success', label: 'Actif' }, documents: 612, storage: '244,0 Go', sharePercent: 13, lastActivity: 'Hier', members: [{ label: 'HH' }, { label: '+4', gray: true }] },
      { id: 'jo-2', name: 'Immeuble Saint-Denis — Nord', holder: 'Hélène Hamon', status: { kind: 'success', label: 'Actif' }, documents: 588, storage: '218,5 Go', sharePercent: 12, lastActivity: '2 jours', members: [{ label: 'HH' }, { label: '+3', gray: true }] },
      { id: 'jo-3', name: 'Village — lots résiduels', holder: 'Jean Delaunay', status: { kind: 'neutral', label: 'Clôturé' }, documents: 219, storage: '61,2 Go', sharePercent: 3, lastActivity: '12 juil. 2026', members: [{ label: 'JD', gray: true }] },
    ],
  },
  'nice-etoile': {
    apui: false,
    meta: [
      { label: 'Client', value: 'Syndicat Nice Étoile' },
      { label: 'Opération', value: "Vente d'actif" },
      { label: 'Référent', value: 'Hélène Hamon' },
      { label: 'Clôturé le', value: '12 juillet 2026' },
    ],
    stats: { dataroomCount: 2, documentCount: 318, storage: '14,2 Go', memberCount: 6, openQuestions: 0 },
    datarooms: [
      { id: 'nice-1', name: 'Nice Étoile — Lot principal', holder: 'Hélène Hamon', status: { kind: 'neutral', label: 'Archivé' }, documents: 244, storage: '11,8 Go', sharePercent: 83, lastActivity: '12 juil. 2026', members: [{ label: 'HH' }, { label: '+2', gray: true }] },
      { id: 'nice-2', name: 'Nice Étoile — Annexes', holder: 'Hélène Hamon', status: { kind: 'neutral', label: 'Archivé' }, documents: 74, storage: '2,4 Go', sharePercent: 17, lastActivity: '12 juil. 2026', members: [{ label: 'HH' }] },
    ],
  },
};

/** Fil d'activité consolidé d'un portefeuille — même forme que RECENT_ACTIVITY. */
export const PORTFOLIO_ACTIVITY = [
  { id: 'pa1', icon: 'file', iconBg: 'var(--info-bg)', iconColor: 'var(--info)', text: <><b>Delphine Briand</b> a déposé 12 pièces dans <b>Ivry — Pièces communes</b></>, time: "Aujourd'hui, 16:42" },
  { id: 'pa2', icon: 'msg', iconBg: 'var(--warning-bg)', iconColor: 'var(--warning)', text: <><b>SCP Moreau &amp; Associés</b> a posé une question sur <b>Ivry — Plateau de bureaux</b></>, time: 'Hier, 11:08' },
  { id: 'pa3', icon: 'users', iconBg: 'var(--success-bg)', iconColor: 'var(--success)', text: <><b>Étude Vasseur</b> a rejoint le portefeuille comme participant APUI</>, time: '28 août 2026' },
  { id: 'pa4', icon: 'zip', iconBg: 'var(--brass-100)', iconColor: 'var(--brass-700)', text: <><b>Le Monde Commerce</b> a exporté l'ensemble du portefeuille</>, time: '24 août 2026' },
];
