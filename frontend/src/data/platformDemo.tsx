/* ===========================================================================
   Jeux de démonstration de l'APPLICATION D'ADMINISTRATION (§5.1) — parc des
   Espaces Notariaux, annonces, journal transverse, reprise V1 → cible.

   Séparé de `demo.tsx`, qui décrit l'intérieur d'UN office : ici tout est
   transverse, et aucun utilisateur d'office ne doit pouvoir le lire. Les
   séparer évite qu'un écran d'office importe par mégarde des chiffres qui
   traversent les tenants.

   Même statut que demo.tsx : rien de ceci n'existe côté serveur. La liste des
   offices, elle, vient déjà de /api/hyperadmin/offices/ — ce fichier ne la
   duplique pas, il ne porte que ce qui n'a pas d'endpoint.
   ------------------------------------------------------------------------ */

import type {
  AccountingExportRow,
  AuditEvent,
  MigrationBatch,
  OfficeReportRow,
  SentNotice,
} from '../components';

export const PLATFORM_STATS = {
  officeCount: 42,
  activeOfficeCount: 39,
  dataroomCount: 3184,
  documentCount: 1_482_610,
  storageTotal: '14,7 To',
  activeUsers30d: 2148,
  peakConcurrent: 187,
};

export const PLATFORM_OFFICES: OfficeReportRow[] = [
  { id: 'o1', name: 'Briand & Hamon', subdomain: 'briand-hamon.espacenotarial.fr', active: true, datarooms: 245, documents: 118_420, storage: '1,9 To', sharePercent: 13, activeUsers: 96, lastActivity: "Aujourd'hui", version: '2.4.1' },
  { id: 'o2', name: 'SCP Moreau & Associés', subdomain: 'moreau.espacenotarial.fr', active: true, datarooms: 412, documents: 231_004, storage: '3,1 To', sharePercent: 21, activeUsers: 154, lastActivity: "Aujourd'hui", version: '2.4.1' },
  { id: 'o3', name: 'Étude Vasseur', subdomain: 'vasseur.espacenotarial.fr', active: true, datarooms: 88, documents: 34_112, storage: '0,6 To', sharePercent: 4, activeUsers: 31, lastActivity: 'Hier', version: '2.4.1' },
  { id: 'o4', name: 'Notaires du Littoral', subdomain: 'littoral.espacenotarial.fr', active: true, datarooms: 604, documents: 388_940, storage: '4,2 To', sharePercent: 29, activeUsers: 288, lastActivity: "Aujourd'hui", version: '2.5.0-beta' },
  { id: 'o5', name: 'Étude Ravel & Fils', subdomain: 'ravel.espacenotarial.fr', active: true, datarooms: 173, documents: 71_338, storage: '1,1 To', sharePercent: 7, activeUsers: 44, lastActivity: '3 jours', version: '2.4.1' },
  { id: 'o6', name: 'Étude Carbonel', subdomain: 'carbonel.espacenotarial.fr', active: false, datarooms: 21, documents: 4_802, storage: '0,1 To', sharePercent: 1, activeUsers: 0, lastActivity: '12 juin 2026', version: '2.3.6' },
];

export const PLATFORM_NOTICES: SentNotice[] = [
  { id: 'n1', kind: 'maintenance', title: 'Interruption de service samedi 6 septembre, 22h–23h', audienceLabel: 'Tous les EN (42)', sentAt: '01/09/2026 10:12', readBy: '31 / 42' },
  { id: 'n2', kind: 'nouveaute', title: 'Modèles de dataroom : droits par rôle', audienceLabel: 'Tous les EN (42)', sentAt: '28/08/2026 16:40', readBy: '38 / 42' },
  { id: 'n3', kind: 'alerte', title: 'Mise à jour de sécurité à appliquer côté poste', audienceLabel: 'Sélection — 6 offices', sentAt: '21/08/2026 09:05', readBy: '6 / 6' },
  { id: 'n4', kind: 'nouveaute', title: 'Bêta 2.5 : personnalisation avancée', audienceLabel: 'Notaires du Littoral', sentAt: '14/08/2026 11:30', readBy: '1 / 1' },
];

/** Journal de sécurité transverse — même forme que le journal d'un office,
    avec l'office renseigné (§7.7, objectif OS10). */
export const PLATFORM_AUDIT_EVENTS: AuditEvent[] = [
  { id: 'p1', timestamp: '03/09/2026 17:04', day: '2026-09-03', office: 'Notaires du Littoral', actor: 'support.notantis', actorInitials: 'SN', category: 'securite', action: "Prise d'identité ouverte — ticket TCK-4821", target: 'g.perrin (client)', origin: '10.4.x.x · Console' },
  { id: 'p2', timestamp: '03/09/2026 16:58', day: '2026-09-03', office: 'Briand & Hamon', actor: 'Cyril Dumont', actorInitials: 'CD', category: 'securite', action: 'Connexion avec authentification forte', target: 'Session ouverte', origin: '92.184.x.x · Web' },
  { id: 'p3', timestamp: '03/09/2026 15:22', day: '2026-09-03', office: 'SCP Moreau & Associés', actor: 'p.moreau', actorInitials: 'PM', category: 'droits', action: "Création d'un compte superadmin", target: 'l.fabre', origin: '78.140.x.x · Web' },
  { id: 'p4', timestamp: '03/09/2026 14:10', day: '2026-09-03', office: 'Étude Vasseur', actor: 'e.vasseur', actorInitials: 'EV', category: 'partage', action: 'Partage de dataroom avec un office tiers', target: 'Briand & Hamon', dataroom: 'Ivry — Parkings', origin: '109.22.x.x · Web' },
  { id: 'p5', timestamp: '03/09/2026 11:47', day: '2026-09-03', office: 'Notaires du Littoral', actor: 'inconnu', actorInitials: '??', actorGray: true, category: 'securite', action: "Cinq échecs d'authentification consécutifs", target: 'compte j.roux — verrouillé', origin: '185.62.x.x · Web' },
  { id: 'p6', timestamp: '02/09/2026 18:31', day: '2026-09-02', office: 'Étude Ravel & Fils', actor: 'support.notantis', actorInitials: 'SN', category: 'securite', action: "Prise d'identité terminée (durée 22 min)", target: 'a.ravel (superadmin)', origin: '10.4.x.x · Console' },
  { id: 'p7', timestamp: '02/09/2026 09:14', day: '2026-09-02', office: 'Étude Carbonel', actor: 'support.notantis', actorInitials: 'SN', category: 'modification', action: "Désactivation de l'office", target: 'carbonel.espacenotarial.fr', origin: '10.4.x.x · Console' },
  { id: 'p8', timestamp: '31/08/2026 22:02', day: '2026-08-31', office: 'Tous', actor: 'système', actorInitials: 'SY', actorGray: true, category: 'securite', action: 'Sauvegarde chiffrée vérifiée par restauration test', target: '42 bases tenant', origin: 'Ordonnanceur' },
  { id: 'p9', timestamp: '28/08/2026 16:40', day: '2026-08-28', office: 'Tous', actor: 'support.notantis', actorInitials: 'SN', category: 'modification', action: 'Annonce diffusée à tous les EN', target: 'Modèles de dataroom : droits par rôle', origin: '10.4.x.x · Console' },
];

export const ACCOUNTING_EXPORTS: AccountingExportRow[] = [
  { id: 'x1', period: 'Août 2026', officeCount: 39, amountExclTax: '48 210,00 €', status: { label: 'Transmis', kind: 'success' }, exportedAt: '01/09/2026 03:12' },
  { id: 'x2', period: 'Juillet 2026', officeCount: 39, amountExclTax: '46 880,00 €', status: { label: 'Transmis', kind: 'success' }, exportedAt: '01/08/2026 03:11' },
  { id: 'x3', period: 'Juin 2026', officeCount: 38, amountExclTax: '45 102,00 €', status: { label: 'Rejeté — 2 offices sans référence comptable', kind: 'critical' }, exportedAt: '01/07/2026 03:14' },
];

export const MIGRATION_BATCHES: MigrationBatch[] = [
  {
    id: 'm1', officeName: 'Étude Vasseur', pilot: true, phase: 'bascule', progress: 100,
    sourceDatarooms: 88, migratedDatarooms: 88, sourceDocuments: 34_112, migratedDocuments: 34_112,
    accounts: '31 / 44', checksumErrors: 0, lastRun: '28/08/2026 02:10',
    log: [
      { id: 'l1', time: '02:10:04', level: 'info', text: 'Inventaire source : 88 datarooms, 34 112 documents, 44 comptes.' },
      { id: 'l2', time: '02:31:52', level: 'info', text: 'Dédoublonnage : 13 comptes fusionnés sur adresse électronique.' },
      { id: 'l3', time: '03:48:19', level: 'info', text: 'Empreintes vérifiées : 34 112 / 34 112 identiques.' },
      { id: 'l4', time: '03:49:02', level: 'info', text: 'Double run ouvert — V1 et cible servies en parallèle.' },
      { id: 'l5', time: '31/08 09:15', level: 'info', text: 'Bascule confirmée par le superadmin de l’office.' },
    ],
  },
  {
    id: 'm2', officeName: 'Briand & Hamon', pilot: true, phase: 'double-run', progress: 100,
    sourceDatarooms: 245, migratedDatarooms: 245, sourceDocuments: 118_420, migratedDocuments: 118_420,
    accounts: '96 / 141', checksumErrors: 0, lastRun: '02/09/2026 01:40',
    log: [
      { id: 'l1', time: '01:40:11', level: 'info', text: 'Reprise rejouée après correction du mapping des groupes métier.' },
      { id: 'l2', time: '04:22:37', level: 'warn', text: '4 dossiers de type « travail collaboratif » sans équivalent cible — importés comme datarooms simples.' },
      { id: 'l3', time: '04:55:03', level: 'info', text: 'Empreintes vérifiées : 118 420 / 118 420 identiques.' },
      { id: 'l4', time: '04:55:40', level: 'info', text: 'Double run ouvert — en attente de recette fonctionnelle.' },
    ],
  },
  {
    id: 'm3', officeName: 'SCP Moreau & Associés', phase: 'controles', progress: 72,
    sourceDatarooms: 412, migratedDatarooms: 412, sourceDocuments: 231_004, migratedDocuments: 230_991,
    accounts: '154 / 233', checksumErrors: 13, lastRun: '03/09/2026 02:05',
    log: [
      { id: 'l1', time: '02:05:00', level: 'info', text: 'Reprise terminée : 412 datarooms, 230 991 documents.' },
      { id: 'l2', time: '05:12:44', level: 'error', text: '13 écarts d’empreinte — fichiers tronqués côté source (archives .zip imbriquées).' },
      { id: 'l3', time: '05:13:02', level: 'warn', text: 'Bascule bloquée tant que les 13 écarts ne sont pas tranchés.' },
    ],
  },
  {
    id: 'm4', officeName: 'Notaires du Littoral', phase: 'reprise', progress: 41,
    sourceDatarooms: 604, migratedDatarooms: 248, sourceDocuments: 388_940, migratedDocuments: 159_402,
    accounts: '— / 402', checksumErrors: 0, lastRun: 'en cours',
    log: [
      { id: 'l1', time: '01:00:00', level: 'info', text: 'Lot 1/4 démarré — datarooms actives des 18 derniers mois.' },
      { id: 'l2', time: '03:44:21', level: 'info', text: '248 datarooms reprises, 159 402 documents transférés.' },
    ],
  },
  {
    id: 'm5', officeName: 'Étude Ravel & Fils', phase: 'inventaire', progress: 18,
    sourceDatarooms: 173, migratedDatarooms: 0, sourceDocuments: 71_338, migratedDocuments: 0,
    accounts: '— / 88', checksumErrors: 0, lastRun: '03/09/2026 06:00',
    log: [
      { id: 'l1', time: '06:00:12', level: 'info', text: 'Cartographie du modèle source en cours.' },
      { id: 'l2', time: '06:41:55', level: 'warn', text: 'Documentation du modèle V1 incomplète sur les matrices de droits par défaut.' },
    ],
  },
  {
    id: 'm6', officeName: 'Étude Carbonel', phase: 'a-planifier', progress: 0,
    sourceDatarooms: 21, migratedDatarooms: 0, sourceDocuments: 4_802, migratedDocuments: 0,
    accounts: '— / 12', checksumErrors: 0, lastRun: '—',
    log: [{ id: 'l1', time: '—', level: 'info', text: 'Office désactivé — reprise à planifier après réactivation.' }],
  },
];

/** Utilisateurs proposés à la prise d'identité, pour l'office ouvert. */
export const IMPERSONATE_CANDIDATES = [
  { id: 'u1', name: 'Delphine Briand', initials: 'DB', email: 'd.briand@briand-hamon.fr', role: 'Notaire' },
  { id: 'u2', name: 'Cyril Dumont', initials: 'CD', email: 'c.dumont@briand-hamon.fr', role: 'Superadmin' },
  { id: 'u3', name: 'Jean Delaunay', initials: 'JD', email: 'j.delaunay@briand-hamon.fr', role: 'Clerc' },
  { id: 'u4', name: 'Sandrine Acquéreur', initials: 'SA', email: 'sandrine.acquereur@exemple.fr', role: 'Client' },
];
