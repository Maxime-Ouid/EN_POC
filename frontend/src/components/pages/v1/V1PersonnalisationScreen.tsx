import { Screen } from '../../atoms/Screen';
import { SubscreenPanel } from '../../atoms/SubscreenPanel';
import { PageHeader } from '../../molecules/PageHeader';
import { TabStrip } from '../../molecules/TabStrip';
import { AppearanceTab } from '../../organisms/AppearanceTab';
import { ModulesTab } from '../../organisms/ModulesTab';
import { OfficeContentTab } from '../../organisms/OfficeContentTab';
import type { TabDef } from '../../molecules/TabStrip';
import type { ModulesTabProps } from '../../organisms/ModulesTab';
import type { OfficeContent } from '../../organisms/OfficeContentTab';

export type V1PersonnalisationTab =
  | 'coordonnees'
  | 'emails'
  | 'apparence'
  | 'accueil'
  | 'espace-client'
  | 'modules';

export interface V1PersonnalisationScreenProps {
  activeTab: V1PersonnalisationTab;
  onTabChange: (tab: V1PersonnalisationTab) => void;
  content: OfficeContent;
  onContentChange: (next: OfficeContent) => void;
  onSaveContent?: () => void;
  /** Pourquoi l'enregistrement du contenu n'est pas (encore) persistant. */
  contentNote?: string | null;
  modules: ModulesTabProps;
}

const TABS: TabDef[] = [
  { key: 'coordonnees', icon: 'building', label: "Coordonnées et logo" },
  { key: 'emails', icon: 'send', label: 'En-tête des emails' },
  { key: 'apparence', icon: 'layers', label: 'Apparence' },
  { key: 'accueil', icon: 'home', label: 'Accueil & mentions' },
  { key: 'espace-client', icon: 'users', label: 'Espace client' },
  { key: 'modules', icon: 'grid', label: 'Modules & modèles' },
];

/* Personnalisation — la rubrique de l'interface actuelle, élargie.

   En V1, « Personnalisation » ne contient que « Coordonnées et logo de
   l'office » et « En-tête des emails » : une étude ne peut pas changer une
   couleur, un texte d'accueil ni ce que voient ses clients.

   Cet écran garde ces deux entrées à l'identique et leur ajoute ce que la V2
   sait déjà faire (Apparence, branchée sur le moteur de thème et l'API
   /api/tenant-theme/) et ce qu'elle doit savoir faire (accueil, mentions
   légales, espace client). Ce qui n'a pas d'endpoint le dit à l'écran plutôt
   que de simuler un enregistrement. */
export function V1PersonnalisationScreen({
  activeTab,
  onTabChange,
  content,
  onContentChange,
  onSaveContent,
  contentNote,
  modules,
}: V1PersonnalisationScreenProps) {
  return (
    <Screen>
      <PageHeader
        eyebrow="Office"
        title="Personnalisation"
        sub="Adaptez l'Espace Notarial à l'identité de votre étude — coordonnées, emails, couleurs, textes affichés à vos clients."
      />

      <div style={{ marginTop: 20 }}>
        <TabStrip
          tabs={TABS}
          active={activeTab}
          onChange={k => onTabChange(k as V1PersonnalisationTab)}
        />
      </div>

      <SubscreenPanel level={3} active={activeTab === 'coordonnees'}>
        <OfficeContentTab
          section="coordonnees"
          content={content}
          onChange={onContentChange}
          onSave={onSaveContent}
          note={contentNote}
        />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'emails'}>
        <OfficeContentTab
          section="emails"
          content={content}
          onChange={onContentChange}
          onSave={onSaveContent}
          note={contentNote}
        />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'apparence'}>
        <AppearanceTab />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'accueil'}>
        <OfficeContentTab
          section="accueil"
          content={content}
          onChange={onContentChange}
          onSave={onSaveContent}
          note={contentNote}
        />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'espace-client'}>
        <OfficeContentTab
          section="espace-client"
          content={content}
          onChange={onContentChange}
          onSave={onSaveContent}
          note={contentNote}
        />
      </SubscreenPanel>

      <SubscreenPanel level={3} active={activeTab === 'modules'}>
        <ModulesTab {...modules} />
      </SubscreenPanel>
    </Screen>
  );
}
