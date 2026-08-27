import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { ModuleRow } from '../molecules/ModuleRow';
import { TemplateOption } from '../molecules/TemplateOption';
import type { DataroomTemplate } from '../molecules/TemplateOption';

export interface ModuleEntry {
  /** Identifiant côté backend (Module.slug) — « coffre-fort », « confiance-rib »… */
  slug: string;
  name: string;
  desc: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  muted?: boolean;
  /** `undefined` = pas encore activable (affiche la pastille « À venir »). */
  enabled?: boolean;
  comingSoon?: boolean;
}

export interface ModulesTabProps {
  modules: ModuleEntry[];
  templates: DataroomTemplate[];
  onToggleModule?: (slug: string, next: boolean) => void;
  /** Interrupteurs consultables mais inactifs (aucun endpoint d'activation). */
  readOnly?: boolean;
  /** Pourquoi ils sont inactifs — affiché sous le titre, obligatoire en pratique. */
  readOnlyNote?: string;
  onCreateTemplate?: () => void;
  onOpenTemplateMenu?: (id: string) => void;
}

// Personnalisation → Modules & modèles (index_16.html #sub3-modules). Les
// modules activables correspondent au M2M Office.enabled_modules côté backend ;
// les modèles de dataroom n'ont pas encore de modèle Django (voir CLAUDE.md).
export function ModulesTab({
  modules,
  templates,
  onToggleModule,
  readOnly,
  readOnlyNote,
  onCreateTemplate,
  onOpenTemplateMenu,
}: ModulesTabProps) {
  return (
    <Card padded style={{ maxWidth: 640 }}>
      <div className="section-title" style={{ marginBottom: readOnlyNote ? 6 : 14 }}>
        Modules activables
      </div>
      {readOnlyNote && (
        <div className="tiny dim" style={{ marginBottom: 14 }}>
          {readOnlyNote}
        </div>
      )}
      {modules.map((m, i) => (
        <ModuleRow
          key={m.slug}
          icon={m.icon}
          iconBg={m.iconBg}
          iconColor={m.iconColor}
          muted={m.muted}
          name={m.name}
          desc={m.desc}
          enabled={m.comingSoon ? undefined : (m.enabled ?? false)}
          onToggle={next => onToggleModule?.(m.slug, next)}
          disabled={readOnly}
          pill={m.comingSoon ? { kind: 'neutral', label: 'À venir' } : undefined}
          last={i === modules.length - 1}
        />
      ))}

      <div className="section-title" style={{ margin: '22px 0 12px' }}>
        Modèles de dataroom
      </div>
      {templates.map(t => (
        <TemplateOption
          key={t.id}
          icon={t.icon}
          name={t.name}
          desc={t.desc}
          onMenu={() => onOpenTemplateMenu?.(t.id)}
        />
      ))}
      <Button size="sm" style={{ marginTop: 4 }} onClick={onCreateTemplate}>
        <Icon id="plus" />
        Créer un modèle
      </Button>
    </Card>
  );
}
