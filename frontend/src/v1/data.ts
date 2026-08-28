/* ===========================================================================
   Jeux de démonstration de la reconstruction V1.

   Toutes les valeurs viennent des captures de production (docs/reference-v1/,
   office fictif « BRIAND & HAMON », relevé du 25/08/2026) ou sont des données
   plausibles fabriquées pour remplir un tableau. AUCUNE ne vient du backend :
   le POC ne modélise aujourd'hui que Office / Module / Membership / Dataroom /
   Document. Ce fichier doit maigrir au fur et à mesure que des endpoints
   existent, pas grossir.
   =========================================================================== */

import type {
  OfficeContent,
  V1AdminDelegueRow,
  V1ConnecteRow,
  V1DossierRow,
  V1EspaceClientRow,
  V1EtudeOption,
  V1FactureRow,
  V1MembreRow,
} from '../components';

export type {
  OfficeContent,
  V1AdminDelegueRow,
  V1ConnecteRow,
  V1DossierRow,
  V1EspaceClientRow,
  V1EtudeOption,
  V1FactureRow,
  V1MembreRow,
};

/** Volumétrie réelle constatée sur l'office de démonstration. */
export const V1_DOSSIERS_TOTAL = 245;

export const V1_DOSSIERS: V1DossierRow[] = [
  { id: 'caudan', name: 'Dossier de vente Caudan', numero: '', espaceClient: 'REPUBLIQUE', type: 'Dataroom', synchronise: true },
  { id: 'choleur', name: 'Vente actifs Choleur SA', numero: '', espaceClient: 'REPUBLIQUE', type: 'Dataroom', synchronise: true },
  { id: 'hamon', name: 'Dossier Hamon', numero: '', espaceClient: 'REPUBLIQUE', type: 'Dataroom' },
  { id: 'bayen', name: 'Dossier de vente Bayen', numero: '', espaceClient: 'REPUBLIQUE', type: 'Dataroom' },
  { id: 'gok', name: 'Test Gok', numero: '', espaceClient: 'REPUBLIQUE', type: 'Dataroom', verrouille: true },
  { id: 'modele-1', name: 'Dataroom - modèle 1', numero: '', espaceClient: 'TEMPLATES', type: 'Dataroom' },
  { id: 'modele-2', name: 'Dataroom - modèle 2', numero: '', espaceClient: 'TEMPLATES', type: 'Dataroom' },
  { id: 'modele-3', name: 'Dataroom - modèle 3', numero: '', espaceClient: 'TEMPLATES', type: 'Dataroom' },
  { id: 'modele-4', name: 'Dataroom - modèle 4', numero: '', espaceClient: 'TEMPLATES', type: 'Dataroom' },
  { id: 'extensions', name: 'Extensions', numero: '', espaceClient: 'TEMPLATES', type: 'Dataroom' },
  { id: 'beaumarchais', name: 'Beaumarchais', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'konk-kerne', name: 'Konk Kerne', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'matignon', name: 'Matignon - Dossier de vente', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'export', name: 'Export', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'test-new-export', name: 'test new export', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'heavy', name: 'Heavy dataroom', numero: '1234', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'ivry', name: 'IVRY - LE MONDE (COMMERCE)', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'nice-etoile', name: 'Nice étoile', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'test-test', name: 'TEST TEST', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'steel', name: 'steel', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'mon-dossier', name: 'Mon dossier', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom', verrouille: true },
  { id: 'toto', name: 'Toto', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'demonstration', name: 'Démonstration', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'demo-td', name: 'Démo TD', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
  { id: 'ai', name: 'AI', numero: '', espaceClient: 'ARSENAL', type: 'Dataroom' },
];

export const V1_ESPACES_CLIENTS_TOTAL = 33;

export const V1_ESPACES_CLIENTS: V1EspaceClientRow[] = [
  { id: 'cassiopee', nom: '1000536 - Le Cassiopée', dossiers: 1, volume: '1,2 Go' },
  { id: 'arsenal', nom: 'ARSENAL', dossiers: 15, volume: '212,4 Go', synchronise: true },
  { id: 'banque-de-france', nom: 'BANQUE DE FRANCE', dossiers: 2, volume: '4,8 Go' },
  { id: 'chatelet', nom: 'CHATELET', dossiers: 3, volume: '9,1 Go' },
  { id: 'divorces', nom: 'DIVORCES', dossiers: 6, volume: '640 Mo' },
  { id: 'duplication-test', nom: 'Duplication TEST', dossiers: 1, volume: '112 Mo' },
  { id: 'ebo', nom: 'EBO-ESPACECLIENT SYNCHRO', dossiers: 4, volume: '18,7 Go', synchronise: true },
  { id: 'esp1', nom: 'esp1', dossiers: 1, volume: '38 Mo' },
  { id: 'republique', nom: 'REPUBLIQUE', dossiers: 5, volume: '64,3 Go' },
  { id: 'templates', nom: 'TEMPLATES', dossiers: 5, volume: '2,1 Go' },
  { id: 'test-cd', nom: 'Test CD', dossiers: 2, volume: '665,75 Ko' },
];

export const V1_ANNUAIRE_TOTAL = 43;

export const V1_ANNUAIRE_ETUDE: V1MembreRow[] = [
  { id: 'm1', nom: 'DUMONT Cyril', fonction: 'Chef de projet', email: 'c.dumont@briand-hamon.fr' },
  { id: 'm2', nom: 'BRIAND Hélène', fonction: 'Notaire', email: 'h.briand@briand-hamon.fr' },
  { id: 'm3', nom: 'HAMON Julien', fonction: 'Notaire', email: 'j.hamon@briand-hamon.fr' },
  { id: 'm4', nom: 'MOREL Sandrine', fonction: 'Clerc', email: 's.morel@briand-hamon.fr' },
  { id: 'm5', nom: 'LEROY Marc', fonction: 'Notaire assistant', email: 'm.leroy@briand-hamon.fr' },
  { id: 'm6', nom: 'PETIT Claire', fonction: 'Notaire salarié', email: 'c.petit@briand-hamon.fr' },
  { id: 'm7', nom: 'GARNIER Aline', fonction: 'Collaboratrice', email: 'a.garnier@briand-hamon.fr' },
  { id: 'm8', nom: 'ROUX Pierre', fonction: 'caissier', email: 'p.roux@briand-hamon.fr' },
  { id: 'm9', nom: 'FABRE Nadia', fonction: 'MOA', email: 'n.fabre@briand-hamon.fr' },
  { id: 'm10', nom: 'BONNET Théo', fonction: 'Développeur', email: 't.bonnet@briand-hamon.fr' },
  { id: 'm11', nom: 'LAMBERT Sophie', fonction: 'Secrétaire', email: 's.lambert@briand-hamon.fr' },
  { id: 'm12', nom: 'GIRAUD Karim', fonction: 'Technicien Support Applicatif', email: 'k.giraud@briand-hamon.fr' },
  { id: 'm13', nom: 'ANDRÉ Lucie', fonction: 'Assistant', email: 'l.andre@briand-hamon.fr' },
];

export const V1_ADMINS_TOTAL = 221;

export const V1_ADMINS_PAR_DOSSIER: V1AdminDelegueRow[] = [
  { id: 'a1', espaceClient: 'ARSENAL', dossier: 'Beaumarchais', titulaire: 'BRIAND Hélène', administrateur: 'MOREL Sandrine' },
  { id: 'a2', espaceClient: 'ARSENAL', dossier: 'Konk Kerne', titulaire: 'BRIAND Hélène', administrateur: 'LEROY Marc' },
  { id: 'a3', espaceClient: 'ARSENAL', dossier: 'Matignon - Dossier de vente', titulaire: 'HAMON Julien', administrateur: 'PETIT Claire' },
  { id: 'a4', espaceClient: 'REPUBLIQUE', dossier: 'Dossier de vente Caudan', titulaire: 'HAMON Julien', administrateur: 'GARNIER Aline' },
  { id: 'a5', espaceClient: 'REPUBLIQUE', dossier: 'Vente actifs Choleur SA', titulaire: 'BRIAND Hélène', administrateur: 'DUMONT Cyril' },
  { id: 'a6', espaceClient: 'Test CD', dossier: 'CD Test dataroom', titulaire: 'DUMONT Cyril', administrateur: 'GIRAUD Karim' },
];

export const V1_CONNECTES: V1ConnecteRow[] = [
  { id: 'c1', nom: 'DUMONT', prenom: 'Cyril', societe: 'BRIAND & HAMON', fonction: 'Chef de projet' },
];

export const V1_FACTURATION_ANNEES = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019',
  '2018', '2017', '2016', '2015', '2014', '2013', '2012',
];

export const V1_FACTURES: Record<string, V1FactureRow[]> = {
  '2026': [
    { id: 'f7', libelle: 'Facturation juillet 2026', montant: '0.00 € HT' },
    { id: 'f6', libelle: 'Facturation juin 2026', montant: '0.00 € HT' },
    { id: 'f5', libelle: 'Facturation mai 2026', montant: '0.00 € HT' },
    { id: 'f4', libelle: 'Facturation avril 2026', montant: '0.00 € HT' },
    { id: 'f3', libelle: 'Facturation mars 2026', montant: '0.00 € HT' },
    { id: 'f2', libelle: 'Facturation février 2026', montant: '0.00 € HT' },
    { id: 'f1', libelle: 'Facturation janvier 2026', montant: '0.00 € HT' },
  ],
};

/** Études destinataires possibles pour une duplication inter-études. */
export const V1_ETUDES_DESTINATAIRES: V1EtudeOption[] = [
  { value: '14-pyramides', label: '14 PYRAMIDES NOTAIRES' },
  { value: 'spring-14-pyramides', label: 'SPRING : 14 Pyramides Notaires', disabled: true },
  { value: 'chatelet-notaires', label: 'CHÂTELET NOTAIRES ASSOCIÉS' },
];

export const V1_DERNIERS_DOSSIERS = [
  { id: 'cd-test', name: 'CD Test dataroom', date: '21/08/2026 à 12h34' },
];

export const DEMO_OFFICE_CONTENT: OfficeContent = {
  raisonSociale: 'BRIAND & HAMON, Notaires associés',
  adresse: '12 rue de la République, 75011 Paris',
  telephone: '01 76 53 73 91',
  email: 'contact@briand-hamon.notaires.fr',
  siteWeb: 'https://briand-hamon.notaires.fr',
  emailExpediteur: 'espacenotarial@briand-hamon.notaires.fr',
  emailObjetPrefixe: '[Espace Notarial]',
  emailSignature:
    "L'équipe de l'étude BRIAND & HAMON\n12 rue de la République, 75011 Paris\n01 76 53 73 91",
  accueilTitre: 'Bienvenue sur votre Espace Notarial',
  accueilTexte:
    "Retrouvez ici l'ensemble des pièces de vos opérations, mises à jour par l'étude au fil du dossier.",
  mentionsLegales:
    "Les documents mis à disposition dans cet espace sont confidentiels et réservés aux personnes autorisées par l'étude.",
  espaceClientTitre: 'Vos dossiers en ligne',
  espaceClientTexte:
    "Cliquez sur un dossier pour consulter les pièces et poser vos questions à l'étude.",
  espaceClientAfficherLogo: true,
};
