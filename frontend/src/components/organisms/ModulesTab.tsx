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
  /** Ouvre l'éditeur du modèle. Absent = les modèles restent en lecture seule. */
  onOpenTemplate?: (id: string) => void;
  /** Vrai tant que le catalogue de modèles n'est pas revenu du serveur. */
  templatesLoading?: boolean;
  /**
   * Pourquoi la liste des modèles est vide autrement que par absence de
   * modèle — un 403 sur /api/templates/, typiquement. Affiché tel quel.
   */
  templatesError?: string | null;
}

// Personnalisation → Modules & modèles (index_16.html #sub3-modules). Les
// modules activables correspondent au M2M Office.enabled_modules côté backend,
// les modèles au modèle Django `Template` (/api/templates/, branché le
// 02/09/2026 — ils venaient jusque-là du jeu de démonstration).
export function ModulesTab({
  modules,
  templates,
  onToggleModule,
  readOnly,
  readOnlyNote,
  onCreateTemplate,
  onOpenTemplate,
  templatesLoading,
  templatesError,
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

      <div className="section-title" style={{ margin: '22px 0 6px' }}>
        Modèles de dossier
      </div>
      <div className="tiny dim" style={{ marginBottom: 12 }}>
        Une structure de dossiers réutilisable, proposée à la création d'un dossier.
        La modifier ne touche pas aux dossiers déjà ouverts à partir d'elle.
      </div>

      {templatesError && (
        <div className="tiny" style={{ marginBottom: 10, color: 'var(--critical)' }}>
          {templatesError}
        </div>
      )}

      {templatesLoading && <div className="tiny dim">Chargement des modèles…</div>}

      {!templatesLoading && !templatesError && templates.length === 0 && (
        <div className="tiny dim">Aucun modèle pour l'instant.</div>
      )}

      {templates.map(t => (
        <TemplateOption
          key={t.id}
          icon={t.icon}
          name={t.name}
          desc={t.desc}
          onClick={onOpenTemplate ? () => onOpenTemplate(t.id) : undefined}
        />
      ))}

      {onCreateTemplate && (
        <Button size="sm" style={{ marginTop: 4 }} onClick={onCreateTemplate}>
          <Icon id="plus" />
          Créer un modèle
        </Button>
      )}
    </Card>
  );
}
