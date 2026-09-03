import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { Pill } from '../atoms/Pill';
import { Select } from '../atoms/Select';
import { Toggle } from '../atoms/Toggle';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';
import { METADATA_TYPE_LABELS } from './MetadataSchemaTab';
import type { MetadataFieldDef, MetadataFieldType } from './MetadataSchemaTab';

/* ===========================================================================
   Méta-données d'UNE dataroom — §4.6, second volet.

   Le schéma de l'office (MetadataSchemaTab) donne les champs communs ; ce
   panneau les renseigne et permet d'en ajouter qui n'existeront que pour ce
   dossier. Les deux familles sont visuellement séparées et le restent : un
   champ spécifique promu en champ d'office est une décision de l'office, pas
   un effet de bord de la saisie d'un dossier.

   Un champ obligatoire non renseigné est signalé sans bloquer la lecture de
   l'écran — la vision ne dit pas à quel moment l'obligation s'applique
   (création ? clôture ?), et deviner reviendrait à empêcher l'utilisateur
   d'avancer sur une règle qu'on aurait inventée.
   =========================================================================== */

export interface DataroomMetadataPanelProps {
  /** Champs définis au niveau de l'office — non supprimables depuis ici. */
  officeFields: MetadataFieldDef[];
  /** Champs propres à cette dataroom. */
  customFields: MetadataFieldDef[];
  /** Valeurs saisies, indexées par id de champ. */
  values: Record<string, string>;
  readOnly?: boolean;
  onValueChange?: (fieldId: string, value: string) => void;
  onAddCustomField?: (field: MetadataFieldDef) => void;
  onRemoveCustomField?: (fieldId: string) => void;
}

/** Un contrôle par type de champ. Le type « montant » reste un input texte :
    l'unité et le séparateur décimal varient, et un input number les mange. */
function FieldControl({
  def,
  value,
  readOnly,
  onChange,
}: {
  def: MetadataFieldDef;
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  if (def.type === 'liste') {
    return (
      <Select value={value} disabled={readOnly} onChange={e => onChange?.(e.target.value)}>
        <option value="">—</option>
        {(def.options ?? []).map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }
  if (def.type === 'booleen') {
    return (
      <div style={{ paddingTop: 6 }}>
        <Toggle
          checked={value === 'oui'}
          disabled={readOnly}
          onChange={checked => onChange?.(checked ? 'oui' : 'non')}
        />
      </div>
    );
  }
  return (
    <input
      type={def.type === 'date' ? 'date' : def.type === 'nombre' ? 'number' : 'text'}
      value={value}
      readOnly={readOnly}
      placeholder={def.help ?? ''}
      onChange={e => onChange?.(e.target.value)}
    />
  );
}

export function DataroomMetadataPanel({
  officeFields,
  customFields,
  values,
  readOnly,
  onValueChange,
  onAddCustomField,
  onRemoveCustomField,
}: DataroomMetadataPanelProps) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<MetadataFieldType>('texte');

  const missing = officeFields.filter(f => f.required && !(values[f.id] ?? '').trim());

  function addCustom() {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAddCustomField?.({ id: `df-${Date.now()}`, label: trimmed, type, required: false });
    setLabel('');
    setType('texte');
  }

  return (
    <>
      {missing.length > 0 && (
        <Card padded style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Pill kind="warning">
            {missing.length} champ{missing.length > 1 ? 's' : ''} obligatoire
            {missing.length > 1 ? 's' : ''} non renseigné{missing.length > 1 ? 's' : ''}
          </Pill>
          <span className="tiny dim">{missing.map(f => f.label).join(', ')}</span>
        </Card>
      )}

      <Card padded>
        <div className="section-title" style={{ marginBottom: 12 }}>
          Informations du dossier
        </div>
        <FieldRow>
          {officeFields.map(f => (
            <Field key={f.id} label={f.required ? `${f.label} *` : f.label}>
              <FieldControl
                def={f}
                value={values[f.id] ?? ''}
                readOnly={readOnly}
                onChange={v => onValueChange?.(f.id, v)}
              />
            </Field>
          ))}
        </FieldRow>
        {officeFields.length === 0 && (
          <div className="tiny dim">
            Aucun champ commun défini. Ils se règlent dans Personnalisation → Méta-données.
          </div>
        )}
      </Card>

      <Card padded style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="section-title">Champs spécifiques à ce dossier</div>
            <div className="tiny dim">
              Visibles ici seulement — le schéma des autres dossiers n'est pas modifié.
            </div>
          </div>
        </div>

        <FieldRow>
          {customFields.map(f => (
            <Field key={f.id} label={f.label}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <FieldControl
                    def={f}
                    value={values[f.id] ?? ''}
                    readOnly={readOnly}
                    onChange={v => onValueChange?.(f.id, v)}
                  />
                </div>
                {!readOnly && (
                  <IconButton
                    icon="x"
                    title={`Retirer ${f.label}`}
                    onClick={() => onRemoveCustomField?.(f.id)}
                  />
                )}
              </div>
            </Field>
          ))}
        </FieldRow>
        {customFields.length === 0 && (
          <div className="tiny dim" style={{ marginBottom: 12 }}>
            Aucun champ spécifique pour l'instant.
          </div>
        )}

        {!readOnly && (
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4 }}>
            <FieldRow>
              <Field label="Nouveau champ">
                <input
                  type="text"
                  placeholder="Ex. Numéro de lot"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                />
              </Field>
              <Field label="Type">
                <Select value={type} onChange={e => setType(e.target.value as MetadataFieldType)}>
                  {(Object.keys(METADATA_TYPE_LABELS) as MetadataFieldType[])
                    .filter(t => t !== 'liste')
                    .map(t => (
                      <option key={t} value={t}>
                        {METADATA_TYPE_LABELS[t]}
                      </option>
                    ))}
                </Select>
              </Field>
            </FieldRow>
            <Button size="sm" onClick={addCustom} disabled={!label.trim()}>
              <Icon id="plus" />
              Ajouter à ce dossier
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
