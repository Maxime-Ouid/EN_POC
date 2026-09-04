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

/* ===========================================================================
   Schéma de méta-données de l'office — §3.2 et §4.6 du document de vision.

   « Formulaire à champs définis, avec possibilité d'ajouter des champs
   spécifiques au besoin d'une dataroom. » Deux niveaux, donc deux endroits :
   ici, l'office définit les champs que TOUTES ses datarooms porteront ; dans
   la fiche d'un dossier (DataroomMetadataPanel), on renseigne ces champs et on
   en ajoute au besoin pour ce dossier-là seulement.

   Le champ « clé » n'est pas exposé : le libellé suffit à l'utilisateur, et une
   clé technique modifiable à la main est le meilleur moyen de casser un export
   déjà en production. Elle sera dérivée du libellé côté serveur, comme le slug
   d'un Tag l'est déjà aujourd'hui.
   =========================================================================== */

export type MetadataFieldType = 'texte' | 'nombre' | 'montant' | 'date' | 'liste' | 'booleen';

export const METADATA_TYPE_LABELS: Record<MetadataFieldType, string> = {
  texte: 'Texte',
  nombre: 'Nombre',
  montant: 'Montant',
  date: 'Date',
  liste: 'Liste de valeurs',
  booleen: 'Oui / Non',
};

export interface MetadataFieldDef {
  id: string;
  label: string;
  type: MetadataFieldType;
  required: boolean;
  /** Valeurs proposées, pour le type « liste » uniquement. */
  options?: string[];
  /** Aide affichée sous le champ dans la fiche d'un dossier. */
  help?: string;
}

export interface MetadataSchemaTabProps {
  fields: MetadataFieldDef[];
  onChange?: (fields: MetadataFieldDef[]) => void;
}

const EMPTY_DRAFT = { label: '', type: 'texte' as MetadataFieldType, required: false, options: '' };

export function MetadataSchemaTab({ fields, onChange }: MetadataSchemaTabProps) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  /** Déplace un champ d'un cran. L'ordre du schéma est l'ordre du formulaire
      côté dossier : c'est la seule chose qui rende la saisie prévisible. */
  function move(index: number, delta: number) {
    const next = [...fields];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange?.(next);
  }

  function remove(id: string) {
    onChange?.(fields.filter(f => f.id !== id));
  }

  function patch(id: string, change: Partial<MetadataFieldDef>) {
    onChange?.(fields.map(f => (f.id === id ? { ...f, ...change } : f)));
  }

  function add() {
    const label = draft.label.trim();
    if (!label) return;
    onChange?.([
      ...fields,
      {
        id: `mf-${Date.now()}`,
        label,
        type: draft.type,
        required: draft.required,
        options:
          draft.type === 'liste'
            ? draft.options.split(',').map(o => o.trim()).filter(Boolean)
            : undefined,
      },
    ]);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <>
      <Card padded style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon id="list" style={{ width: 20, height: 20, color: 'var(--brass-700)', flex: 'none' }} />
        <div>
          <div className="section-title">Champs communs à toutes vos datarooms</div>
          <div className="tiny dim">
            Ces champs apparaissent dans l'onglet « Informations » de chaque dossier. Un dossier
            peut en ajouter d'autres pour lui seul, sans toucher à cette liste.
          </div>
        </div>
      </Card>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Type</th>
                <th>Valeurs proposées</th>
                <th>Obligatoire</th>
                <th>Ordre</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id}>
                  <td className="row-name">{f.label}</td>
                  <td>
                    <Select
                      small
                      value={f.type}
                      onChange={e => patch(f.id, { type: e.target.value as MetadataFieldType })}
                    >
                      {(Object.keys(METADATA_TYPE_LABELS) as MetadataFieldType[]).map(t => (
                        <option key={t} value={t}>
                          {METADATA_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="tiny dim">
                    {f.type === 'liste' ? (f.options ?? []).join(' · ') || '—' : '—'}
                  </td>
                  <td>
                    <Toggle
                      checked={f.required}
                      onChange={checked => patch(f.id, { required: checked })}
                    />
                  </td>
                  <td>
                    <IconButton
                      icon="up"
                      title="Monter"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    />
                    <IconButton
                      icon="down"
                      title="Descendre"
                      disabled={i === fields.length - 1}
                      onClick={() => move(i, 1)}
                    />
                  </td>
                  <td>
                    <IconButton icon="x" title="Retirer" onClick={() => remove(f.id)} />
                  </td>
                </tr>
              ))}
              {fields.length === 0 && (
                <tr>
                  <td colSpan={6} className="tiny dim" style={{ textAlign: 'center', padding: 24 }}>
                    Aucun champ défini — les dossiers n'auront que leurs champs spécifiques.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Card padded style={{ marginTop: 16 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>
          Ajouter un champ
        </div>
        <FieldRow>
          <Field label="Libellé">
            <input
              type="text"
              placeholder="Ex. Référence cadastrale"
              value={draft.label}
              onChange={e => setDraft({ ...draft, label: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <Select
              value={draft.type}
              onChange={e => setDraft({ ...draft, type: e.target.value as MetadataFieldType })}
            >
              {(Object.keys(METADATA_TYPE_LABELS) as MetadataFieldType[]).map(t => (
                <option key={t} value={t}>
                  {METADATA_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>
        {draft.type === 'liste' && (
          <Field label="Valeurs proposées, séparées par une virgule">
            <input
              type="text"
              placeholder="Vente, Acquisition, Succession"
              value={draft.options}
              onChange={e => setDraft({ ...draft, options: e.target.value })}
            />
          </Field>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
          <Toggle
            checked={draft.required}
            onChange={checked => setDraft({ ...draft, required: checked })}
          />
          <span style={{ fontSize: 13 }}>Champ obligatoire à la création d'un dossier</span>
          {draft.required && <Pill kind="warning">Bloquant</Pill>}
        </div>
        <Button variant="accent" size="sm" onClick={add} disabled={!draft.label.trim()}>
          <Icon id="plus" />
          Ajouter le champ
        </Button>
      </Card>
    </>
  );
}
