import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { Select } from '../../atoms/Select';
import { TextInput } from '../../atoms/TextInput';
import { Field } from '../../molecules/Field';
import { FieldRow } from '../../molecules/FieldRow';
import { PageHeader } from '../../molecules/PageHeader';

export type V1StatsPortee = 'tous' | 'espace-client' | 'dossier' | 'groupe' | 'utilisateur';
export type V1StatsDonnees = 'tout' | 'telechargements' | 'previsualisations';

export interface V1StatsCriteres {
  mois: string;
  annee: string;
  du: string;
  au: string;
  portee: V1StatsPortee;
  donnees: V1StatsDonnees;
}

export interface V1StatsConsultationsScreenProps {
  onAfficher?: (criteres: V1StatsCriteres) => void;
}

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const PORTEES: Array<{ key: V1StatsPortee; label: string }> = [
  { key: 'tous', label: 'Tous' },
  { key: 'espace-client', label: "Utilisateurs d'un espace client" },
  { key: 'dossier', label: "Utilisateurs d'un dossier" },
  { key: 'groupe', label: "Utilisateurs faisant partie d'un groupe" },
  { key: 'utilisateur', label: 'Utilisateur unique' },
];

const DONNEES: Array<{ key: V1StatsDonnees; label: string }> = [
  { key: 'tout', label: 'Tout' },
  { key: 'telechargements', label: 'Téléchargements' },
  { key: 'previsualisations', label: 'Prévisualisations' },
];

// Activités > Statistiques de consultations (captures 113500 et 115702).
// L'écran de RÉSULTATS n'apparaît sur aucune capture : seul le formulaire de
// paramétrage est reconstruit, et le bouton « Afficher » le dit.
export function V1StatsConsultationsScreen({ onAfficher }: V1StatsConsultationsScreenProps) {
  const [criteres, setCriteres] = useState<V1StatsCriteres>({
    mois: 'Août',
    annee: '2026',
    du: '01/08/2026',
    au: '21/08/2026',
    portee: 'tous',
    donnees: 'tout',
  });
  const [demande, setDemande] = useState(false);

  return (
    <Screen>
      <PageHeader title="Statistiques de consultation de la documentation" />

      <Card padded style={{ marginTop: 16, maxWidth: 720 }}>
        <div className="section-title">Sélectionnez la période</div>
        <FieldRow>
          <Field label="Mois">
            <Select
              value={criteres.mois}
              onChange={e => setCriteres({ ...criteres, mois: e.target.value })}
            >
              {MOIS.map(m => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Année">
            <TextInput
              value={criteres.annee}
              onChange={e => setCriteres({ ...criteres, annee: e.target.value })}
            />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Du">
            <TextInput
              value={criteres.du}
              onChange={e => setCriteres({ ...criteres, du: e.target.value })}
            />
          </Field>
          <Field label="Au">
            <TextInput
              value={criteres.au}
              onChange={e => setCriteres({ ...criteres, au: e.target.value })}
            />
          </Field>
        </FieldRow>

        <div className="section-title" style={{ marginTop: 20 }}>
          Sélectionnez les utilisateurs
        </div>
        {PORTEES.map(p => (
          <label key={p.key} className="v1-list-controls" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <input
              type="radio"
              name="portee"
              checked={criteres.portee === p.key}
              onChange={() => setCriteres({ ...criteres, portee: p.key })}
            />
            <span className="tiny">{p.label}</span>
          </label>
        ))}

        <div className="section-title" style={{ marginTop: 20 }}>
          Sélectionnez les données
        </div>
        {DONNEES.map(d => (
          <label key={d.key} className="v1-list-controls" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <input
              type="radio"
              name="donnees"
              checked={criteres.donnees === d.key}
              onChange={() => setCriteres({ ...criteres, donnees: d.key })}
            />
            <span className="tiny">{d.label}</span>
          </label>
        ))}

        <div style={{ marginTop: 18 }}>
          <Button
            variant="primary"
            onClick={() => {
              setDemande(true);
              onAfficher?.(criteres);
            }}
          >
            <Icon id="eye" />
            Afficher
          </Button>
        </div>

        {demande && (
          <div className="v1-empty" style={{ marginTop: 16 }}>
            <div className="v1-empty-title">Résultats non reconstruits</div>
            <div className="v1-empty-desc">
              Aucune capture de l'écran de résultats n'a été fournie, et le backend du POC ne
              journalise pas encore les consultations : afficher un tableau ici reviendrait à
              inventer des chiffres. Critères retenus : {criteres.mois} {criteres.annee}, du{' '}
              {criteres.du} au {criteres.au}.
            </div>
          </div>
        )}
      </Card>
    </Screen>
  );
}
