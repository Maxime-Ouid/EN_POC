import { Card } from '../atoms/Card';
import { ModuleRow } from '../molecules/ModuleRow';

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
  onToggleModule?: (slug: string, next: boolean) => void;
  /** Interrupteurs consultables mais inactifs (aucun endpoint d'activation). */
  readOnly?: boolean;
  /** Pourquoi ils sont inactifs — affiché sous le titre, obligatoire en pratique. */
  readOnlyNote?: string;
}

// Personnalisation → Modules (index_16.html #sub3-modules). Les modules
// activables correspondent au M2M Office.enabled_modules côté backend. Les
// modèles de dataroom (Template/TemplateFolder) ont leur propre onglet
// « Template » depuis le 02/09/2026 — voir CLAUDE.md ; cet onglet-ci ne
// montre plus qu'eux, ce composant ne connaît donc plus la notion de modèle.
export function ModulesTab({ modules, onToggleModule, readOnly, readOnlyNote }: ModulesTabProps) {
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
    </Card>
  );
}
