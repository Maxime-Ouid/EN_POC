import { Screen } from '../../atoms/Screen';
import { SubscreenPanel } from '../../atoms/SubscreenPanel';
import { AppearanceTab } from '../../organisms/AppearanceTab';
import { ModulesTab } from '../../organisms/ModulesTab';
import { OfficeContentTab } from '../../organisms/OfficeContentTab';
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
  /** Section affichée. Choisie dans le sous-menu « Personnalisation » de la navigation. */
  activeTab: V1PersonnalisationTab;
  content: OfficeContent;
  onContentChange: (next: OfficeContent) => void;
  onSaveContent?: () => void;
  /** Pourquoi l'enregistrement du contenu n'est pas (encore) persistant. */
  contentNote?: string | null;
  modules: ModulesTabProps;
}

/* Personnalisation — la rubrique de l'interface actuelle, élargie.

   En V1, « Personnalisation » ne contient que « Coordonnées et logo de
   l'office » et « En-tête des emails » : une étude ne peut pas changer une
   couleur, un texte d'accueil ni ce que voient ses clients.

   Cet écran garde ces deux entrées à l'identique et leur ajoute ce que la V2
   sait déjà faire (Apparence, branchée sur le moteur de thème et l'API
   /api/tenant-theme/) et ce qu'elle doit savoir faire (accueil, mentions
   légales, espace client). Ce qui n'a pas d'endpoint le dit à l'écran plutôt
   que de simuler un enregistrement.

   Les six sections étaient AUSSI une barre d'onglets en haut de l'écran, alors
   qu'elles figurent déjà dans le sous-menu « Personnalisation » de la
   navigation : les mêmes six choix, deux fois, à deux endroits, avec deux
   états à garder d'accord. La barre a été retirée le 28/08/2026 ; la navigation
   reste seule maîtresse de la section affichée.

   Le titre de page a suivi le même jour, pour la même raison : il répétait le
   libellé du sous-menu. C'est le fil d'Ariane (« office › Personnalisation ›
   section ») qui dit désormais où l'on se trouve. */
export function V1PersonnalisationScreen({
  activeTab,
  content,
  onContentChange,
  onSaveContent,
  contentNote,
  modules,
}: V1PersonnalisationScreenProps) {
  return (
    <Screen>
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
