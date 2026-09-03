import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../atoms/Card';
import { Screen } from '../atoms/Screen';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { TabStrip } from '../molecules/TabStrip';
import { AppearanceTab } from '../organisms/AppearanceTab';
import { IdentityTab } from '../organisms/IdentityTab';
import { ModulesTab } from '../organisms/ModulesTab';
import type { ReactNode } from 'react';
import type { TabDef } from '../molecules/TabStrip';
import type { IdentityTabProps } from '../organisms/IdentityTab';
import type { ModulesTabProps } from '../organisms/ModulesTab';
import { useTopbarSlots } from '../templates/topbarSlots';

export type SettingsTabKey = 'sub3-identite' | 'sub3-apparence' | 'sub3-modules' | 'sub3-template';

const TABS: TabDef[] = [
  { key: 'sub3-identite', icon: 'building', label: 'Identité' },
  { key: 'sub3-apparence', icon: 'layers', label: 'Apparence' },
  { key: 'sub3-modules', icon: 'grid', label: 'Modules' },
  { key: 'sub3-template', icon: 'clip', label: 'Template' },
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
  defaultTab?: SettingsTabKey;
}

// Écran Personnalisation — index_16.html #screen-settings. Quatre onglets :
// Identité (nom, sous-domaine, logo), Apparence (éditeur de design tokens
// branché sur le ThemeProvider), Modules et Template (gestion des modèles de
// dataroom).
// L'onglet Apparence ne prend pas de props : il lit et écrit directement le
// moteur de thème, qui s'applique à toute l'application, pas à cet écran.
export function SettingsScreen({ identity, modules, templatesTab, defaultTab = 'sub3-identite' }: SettingsScreenProps) {
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
    </Screen>
  );
}
