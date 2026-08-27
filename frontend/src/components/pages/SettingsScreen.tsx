import { useState } from 'react';
import { Screen } from '../atoms/Screen';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { PageHeader } from '../molecules/PageHeader';
import { TabStrip } from '../molecules/TabStrip';
import { AppearanceTab } from '../organisms/AppearanceTab';
import { IdentityTab } from '../organisms/IdentityTab';
import { ModulesTab } from '../organisms/ModulesTab';
import type { TabDef } from '../molecules/TabStrip';
import type { IdentityTabProps } from '../organisms/IdentityTab';
import type { ModulesTabProps } from '../organisms/ModulesTab';

export type SettingsTabKey = 'sub3-identite' | 'sub3-apparence' | 'sub3-modules';

const TABS: TabDef[] = [
  { key: 'sub3-identite', icon: 'building', label: 'Identité' },
  { key: 'sub3-apparence', icon: 'layers', label: 'Apparence' },
  { key: 'sub3-modules', icon: 'grid', label: 'Modules & modèles' },
];

export interface SettingsScreenProps {
  identity: IdentityTabProps;
  modules: ModulesTabProps;
  defaultTab?: SettingsTabKey;
}

// Écran Personnalisation — index_16.html #screen-settings. Trois onglets :
// Identité (nom, sous-domaine, logo), Apparence (éditeur de design tokens
// branché sur le ThemeProvider) et Modules & modèles.
// L'onglet Apparence ne prend pas de props : il lit et écrit directement le
// moteur de thème, qui s'applique à toute l'application, pas à cet écran.
export function SettingsScreen({ identity, modules, defaultTab = 'sub3-identite' }: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(defaultTab);

  return (
    <Screen>
      <PageHeader
        eyebrow="Office"
        title="Personnalisation"
        sub="Adaptez l'Espace Notarial à l'identité de votre étude — en marque grise, sur votre propre sous-domaine."
      />

      <div style={{ marginTop: 20 }}>
        <TabStrip tabs={TABS} active={activeTab} onChange={k => setActiveTab(k as SettingsTabKey)} />
      </div>

      <SubscreenPanel level={3} active={activeTab === 'sub3-identite'}>
        <IdentityTab {...identity} />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'sub3-apparence'}>
        <AppearanceTab />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'sub3-modules'}>
        <ModulesTab {...modules} />
      </SubscreenPanel>
    </Screen>
  );
}
