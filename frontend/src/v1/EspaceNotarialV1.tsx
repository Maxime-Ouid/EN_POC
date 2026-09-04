import { useState } from 'react';
import {
  AppShell,
  V1AdminsParDossierScreen,
  V1AnnuaireClientsScreen,
  V1AnnuaireEtudeScreen,
  V1DossiersScreen,
  V1DuplicationsEtudesScreen,
  V1EspacesClientsScreen,
  V1FacturationScreen,
  V1HomeScreen,
  V1PersonnalisationScreen,
  V1PlaceholderScreen,
  V1QuiEstConnecteScreen,
  V1StatsConnexionsScreen,
  V1StatsConsultationsScreen,
  V1StructmakerScreen,
  V1SupportScreen,
  V1TransfertDataScreen,
  V1TransfertFichiersScreen,
  type ModulesTabProps,
  type OfficeContent,
  type TenantOption,
  type V1AdminDelegueRow,
  type V1ClientRow,
  type V1ConnecteRow,
  type V1DossierRow,
  type V1EspaceClientRow,
  type V1EtudeOption,
  type V1FactureRow,
  type V1MembreRow,
  type V1PersonnalisationTab,
} from '../components';
import { NAV_V1, PERSO_TABS, V1_CRUMBS, type V1ScreenKey } from './nav';
import { PLACEHOLDERS } from './placeholders';

export interface EspaceNotarialV1Props {
  officeName: string;
  officeRole: string;
  userName: string;
  userInitials: string;
  userRole: string;
  logoUrl?: string;

  dossiers: V1DossierRow[];
  dossiersTotal: number;
  /** Message d'état à la place du tableau des dossiers (chargement, erreur). */
  dossiersNotice?: string | null;
  espacesClients: V1EspaceClientRow[];
  espacesClientsTotal: number;
  annuaire: V1MembreRow[];
  annuaireTotal: number;
  annuaireClients: V1ClientRow[];
  adminsParDossier: V1AdminDelegueRow[];
  adminsTotal: number;
  connectes: V1ConnecteRow[];
  facturationAnnees: string[];
  factures: Record<string, V1FactureRow[]>;
  etudesDestinataires: V1EtudeOption[];
  derniersDossiers: Array<{ id: string; name: string; date: string }>;
  supportEmail: string;
  supportTelephone: string;

  content: OfficeContent;
  onContentChange: (next: OfficeContent) => void;
  onSaveContent?: () => void;
  contentNote?: string | null;
  modules: ModulesTabProps;

  onCreateDossier?: () => void;
  onOpenDossier?: (id: string) => void;
  onLogout?: () => void;
  /** Offices disponibles pour le sélecteur du rail (voir TenantSwitcher). */
  offices?: TenantOption[];
  officeSubdomain?: string;
  onSelectOffice?: (subdomain: string) => void;
  noticeLabel?: string | null;
  /** Écran ouvert au montage — sert au partage d'un lien et aux tests de rendu. */
  initialScreen?: V1ScreenKey;
}

/* Coquille de la reconstruction V1 : la navigation complète de l'Espace
   Notarial actuel, et l'écran correspondant à l'entrée sélectionnée.

   Le composant est purement présentationnel — toutes ses données arrivent en
   props. C'est ce qui permet de le monter deux fois : sur données de
   démonstration pour la maquette partageable (?view=v1), et branché sur le
   backend Django pour l'application réelle (?view=v1-app). */
export function EspaceNotarialV1(props: EspaceNotarialV1Props) {
  const [screen, setScreen] = useState<V1ScreenKey>(props.initialScreen ?? 'accueil');
  const persoTab = (PERSO_TABS[screen] ?? 'coordonnees') as V1PersonnalisationTab;

  const placeholder = PLACEHOLDERS[screen];

  return (
    <AppShell
      officeName={props.officeName}
      officeRole={props.officeRole}
      logoUrl={props.logoUrl}
      navSections={NAV_V1}
      hideSectionLabels
      activeScreen={screen}
      onNavigate={key => setScreen(key as V1ScreenKey)}
      offices={props.offices}
      officeSubdomain={props.officeSubdomain}
      onSelectOffice={props.onSelectOffice}
      userInitials={props.userInitials}
      userName={props.userName}
      userRole={props.userRole}
      onLogout={props.onLogout}
      breadcrumbRoot={props.officeName}
      breadcrumbCurrent={V1_CRUMBS[screen]}
      noticeLabel={props.noticeLabel}
    >
      {screen === 'accueil' && (
        <V1HomeScreen
          derniersDossiers={props.derniersDossiers}
          supportEmail={props.supportEmail}
          supportTelephone={props.supportTelephone}
          onCreerDossier={props.onCreateDossier}
          onListeDossiers={() => setScreen('dossiers')}
          onOpenDossier={props.onOpenDossier}
          onOutil={key =>
            setScreen(
              key === 'transfert-data'
                ? 'outils-transfert-data'
                : key === 'structmaker'
                  ? 'outils-structmaker'
                  : 'transfert-fichiers',
            )
          }
          onEnvoyerMessage={() => setScreen('support')}
        />
      )}

      {screen === 'dossiers' && (
        <V1DossiersScreen
          rows={props.dossiers}
          total={props.dossiersTotal}
          notice={props.dossiersNotice}
          onCreate={props.onCreateDossier}
          onOpen={props.onOpenDossier}
        />
      )}

      {screen === 'espaces-clients' && (
        <V1EspacesClientsScreen
          rows={props.espacesClients}
          total={props.espacesClientsTotal}
        />
      )}

      {screen === 'duplications-etudes' && (
        <V1DuplicationsEtudesScreen
          dossiers={props.dossiers.map(d => ({ id: d.id, name: d.name }))}
          etudes={props.etudesDestinataires}
        />
      )}

      {screen === 'annuaire-etude' && (
        <V1AnnuaireEtudeScreen rows={props.annuaire} total={props.annuaireTotal} />
      )}

      {screen === 'annuaire-clients' && (
        <V1AnnuaireClientsScreen rows={props.annuaireClients} />
      )}

      {screen === 'admins-par-dossier' && (
        <V1AdminsParDossierScreen rows={props.adminsParDossier} total={props.adminsTotal} />
      )}

      {screen === 'qui-est-connecte' && <V1QuiEstConnecteScreen rows={props.connectes} />}

      {screen === 'facturation' && (
        <V1FacturationScreen
          annees={props.facturationAnnees}
          facturesParAnnee={props.factures}
        />
      )}

      {screen === 'stats-consultations' && <V1StatsConsultationsScreen />}

      {screen === 'stats-connexions' && <V1StatsConnexionsScreen />}

      {screen === 'transfert-fichiers' && <V1TransfertFichiersScreen />}

      {screen === 'support' && (
        <V1SupportScreen email={props.supportEmail} telephone={props.supportTelephone} />
      )}

      {screen === 'outils-structmaker' && <V1StructmakerScreen />}

      {screen === 'outils-transfert-data' && (
        <V1TransfertDataScreen
          version="3.0.0.12"
          publieeLe="10/07/2025 à 09h48"
          contactEmail="espacenotarial@paris.notaires.fr"
        />
      )}

      {screen.startsWith('perso-') && (
        <V1PersonnalisationScreen
          activeTab={persoTab}
          content={props.content}
          onContentChange={props.onContentChange}
          onSaveContent={props.onSaveContent}
          contentNote={props.contentNote}
          modules={props.modules}
        />
      )}

      {placeholder && <V1PlaceholderScreen {...placeholder} />}
    </AppShell>
  );
}
