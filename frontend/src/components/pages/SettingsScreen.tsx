import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../atoms/Card';
import { Screen } from '../atoms/Screen';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { TabStrip } from '../molecules/TabStrip';
import { AppearanceTab } from '../organisms/AppearanceTab';
import { IdentityTab } from '../organisms/IdentityTab';
import { MetadataSchemaTab } from '../organisms/MetadataSchemaTab';
import { ModulesTab } from '../organisms/ModulesTab';
import type { ReactNode } from 'react';
import type { TabDef } from '../molecules/TabStrip';
import type { IdentityTabProps } from '../organisms/IdentityTab';
import type { ModulesTabProps } from '../organisms/ModulesTab';
import type { MetadataSchemaTabProps } from '../organisms/MetadataSchemaTab';
import { useTopbarSlots } from '../templates/topbarSlots';

export type SettingsTabKey =
  | 'sub3-identite'
  | 'sub3-apparence'
  | 'sub3-modules'
  | 'sub3-template'
  | 'sub3-groupes'
  | 'sub3-metadonnees';

const TABS: TabDef[] = [
  { key: 'sub3-identite', icon: 'building', label: 'Identité' },
  { key: 'sub3-apparence', icon: 'layers', label: 'Apparence' },
  { key: 'sub3-modules', icon: 'grid', label: 'Modules' },
  { key: 'sub3-template', icon: 'clip', label: 'Template' },
  { key: 'sub3-groupes', icon: 'users', label: 'Groupes' },
  // Le schéma de méta-données est un réglage d'OFFICE, au même titre que les
  // modèles de dossier : il vit donc ici et non dans un dossier, où l'on ne
  // renseigne que les valeurs (voir DataroomMetadataPanel).
  { key: 'sub3-metadonnees', icon: 'list', label: 'Méta-données' },
];

export interface SettingsScreenProps {
  identity: IdentityTabProps;
  modules: ModulesTabProps;
  /**
   * Gestion des modèles de dataroom (TemplatesListScreen ou TemplateDetailScreen
   * selon ce que l'appelant a choisi d'afficher — App.tsx tranche seul via
   * openTemplateId, cet écran ne fait qu'accueillir le résultat). Déplacé le
   * 02/09/2026 depuis l'ancienne entrée de navigation top-level « Modèles de
   * dossier » — voir CLAUDE.md. Absent dans les maquettes hors backend
   * (UiKit, PrototypeDemo, V1) : ces vues n'ont pas de vrais Template à
   * montrer, l'onglet affiche alors un simple message plutôt qu'un écran vide.
   */
  templatesTab?: ReactNode;
  /** Gestion des groupes de droits de l'office (GroupsScreen + modale) —
      ajouté le 04/09/2026, même absence dans les maquettes hors backend
      (UiKit, PrototypeDemo, V1) que templatesTab. */
  groupsTab?: ReactNode;
  /**
   * Schéma de méta-données de l'office (§4.6). Absent dans les maquettes hors
   * backend, comme `templatesTab` : l'onglet affiche alors un message plutôt
   * qu'un éditeur qui n'enregistrerait nulle part.
   */
  metadata?: MetadataSchemaTabProps;
  defaultTab?: SettingsTabKey;
}

// Écran Personnalisation — index_16.html #screen-settings. Six onglets :
// Identité (nom, sous-domaine, logo), Apparence (éditeur de design tokens
// branché sur le ThemeProvider), Modules, Template (gestion des modèles de
// dataroom), Groupes (droits transverses aux rôles) et Méta-données (schéma
// des champs communs aux dossiers).
// L'onglet Apparence ne prend pas de props : il lit et écrit directement le
// moteur de thème, qui s'applique à toute l'application, pas à cet écran.
export function SettingsScreen({
  identity,
  modules,
  templatesTab,
  groupsTab,
  metadata,
  defaultTab = 'sub3-identite',
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(defaultTab);
  const slots = useTopbarSlots();

  /* La barre d'onglets remonte dans la topbar (01/09/2026), comme celle de
     l'accueil : elle nomme la rubrique ouverte — c'est le repère qui a remplacé
     le titre de page retiré le 28/08/2026 — et posée dans le contenu elle
     glissait hors de vue au défilement des formulaires, longs sur cet écran. Le
     début de barre est libre ici, et la page ouvre directement sur son panneau.

     Portail plutôt que props : la topbar est montée par AppShell, très au-dessus
     de cet écran, et l'onglet courant est un état qui n'appartient qu'à lui
     (voir templates/topbarSlots.ts). */
  const tabs = (
    <TabStrip tabs={TABS} active={activeTab} onChange={k => setActiveTab(k as SettingsTabKey)} />
  );

  return (
    <Screen>
      {/* Hors AppShell (UiKit, démos isolées) le conteneur vaut `null` : les
          onglets restent alors en tête d'écran plutôt que de disparaître. */}
      {slots.start ? createPortal(tabs, slots.start) : tabs}

      <SubscreenPanel level={3} active={activeTab === 'sub3-identite'}>
        <IdentityTab {...identity} />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'sub3-apparence'}>
        <AppearanceTab />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'sub3-modules'}>
        <ModulesTab {...modules} />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'sub3-template'}>
        {templatesTab ?? (
          <Card padded style={{ maxWidth: 640 }}>
            <div className="tiny dim">
              La gestion des modèles de dataroom a besoin du backend — pas disponible dans
              cette maquette.
            </div>
          </Card>
        )}
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'sub3-groupes'}>
        {groupsTab ?? (
          <Card padded style={{ maxWidth: 640 }}>
            <div className="tiny dim">
              La gestion des groupes de droits a besoin du backend — pas disponible dans
              cette maquette.
            </div>
          </Card>
        )}
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'sub3-metadonnees'}>
        {metadata ? (
          <MetadataSchemaTab {...metadata} />
        ) : (
          <Card padded style={{ maxWidth: 640 }}>
            <div className="tiny dim">
              Le schéma de méta-données a besoin du backend — pas disponible dans cette maquette.
            </div>
          </Card>
        )}
      </SubscreenPanel>
    </Screen>
  );
}
