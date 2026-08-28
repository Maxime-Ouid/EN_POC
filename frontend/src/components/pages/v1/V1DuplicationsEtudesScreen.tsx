import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Grid } from '../../atoms/Grid';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { Select } from '../../atoms/Select';
import { TextInput } from '../../atoms/TextInput';
import { Toggle } from '../../atoms/Toggle';
import { Field } from '../../molecules/Field';
import { FieldRow } from '../../molecules/FieldRow';
import { PageHeader } from '../../molecules/PageHeader';

export interface V1EtudeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface V1DuplicationsEtudesScreenProps {
  dossiers: Array<{ id: string; name: string }>;
  etudes: V1EtudeOption[];
  dossiersExportes?: Array<{ id: string; label: string }>;
  dossiersImportes?: Array<{ id: string; label: string }>;
  onDupliquer?: (dossierId: string, etudeValue: string, tempsReel: boolean) => void;
  onHistorique?: () => void;
}

// Dossiers > Duplications entre études (captures 113246, 115130, 115142).
export function V1DuplicationsEtudesScreen({
  dossiers,
  etudes,
  dossiersExportes = [],
  dossiersImportes = [],
  onDupliquer,
  onHistorique,
}: V1DuplicationsEtudesScreenProps) {
  const [dossier, setDossier] = useState(dossiers[0]?.id ?? '');
  const [etude, setEtude] = useState('');
  const [tempsReel, setTempsReel] = useState(false);
  const [rechExport, setRechExport] = useState('');
  const [rechImport, setRechImport] = useState('');

  const filtre = (rows: Array<{ id: string; label: string }>, q: string) =>
    q ? rows.filter(r => r.label.toLowerCase().includes(q.toLowerCase())) : rows;

  return (
    <Screen>
      <PageHeader
        title="Duplication de dossiers avec d'autres études de l'espacenotarial"
        actions={
          <Button size="sm" variant="ghost" onClick={onHistorique}>
            <Icon id="clock" />
            voir l'historique
          </Button>
        }
      />

      <div className="v1-info-block" style={{ marginTop: 16 }}>
        <Icon id="shield" />
        <div>
          <p>
            La duplication transmet une copie d'un dossier à une autre étude de l'espacenotarial —
            typiquement du notaire vendeur au notaire acquéreur — sans passer par un envoi de
            fichiers hors plateforme.
          </p>
          <p>
            Le dossier dupliqué est déposé dans un sous-dossier de premier niveau d'une dataroom de
            l'étude destinataire, qui en conserve une copie.
          </p>
        </div>
      </div>

      <Card padded>
        <FieldRow>
          <Field label="Dossier à dupliquer">
            <Select value={dossier} onChange={e => setDossier(e.target.value)}>
              {dossiers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Étude destinataire">
            <Select value={etude} onChange={e => setEtude(e.target.value)}>
              <option value="">Sélectionnez l'étude destinataire</option>
              {etudes.map(e => (
                <option key={e.value} value={e.value} disabled={e.disabled}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>

        <div className="v1-list-controls" style={{ justifyContent: 'flex-start', gap: 12 }}>
          <span className="tiny">Synchroniser en temps réel</span>
          <Toggle checked={tempsReel} onChange={setTempsReel} />
          <span className="tiny dim">{tempsReel ? 'Oui' : 'Non'}</span>
        </div>

        {tempsReel && (
          <div className="v1-warn-text">
            La synchronisation réplique les mouvements de la documentation en temps réel dans un
            sous-dossier de premier niveau d'une dataroom de l'étude cible, qui en conserve une
            copie en lecture seule.
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Button
            variant="primary"
            disabled={!etude}
            onClick={() => onDupliquer?.(dossier, etude, tempsReel)}
          >
            <Icon id="link" />
            Dupliquer
          </Button>
        </div>
      </Card>

      <Grid columns={2} style={{ marginTop: 18, alignItems: 'start' }}>
        <Card padded>
          <div className="section-title">Dossiers exportés</div>
          <div className="field" style={{ marginTop: 10 }}>
            <TextInput
              value={rechExport}
              placeholder="Rechercher..."
              aria-label="Rechercher parmi les dossiers exportés"
              onChange={e => setRechExport(e.target.value)}
            />
          </div>
          {filtre(dossiersExportes, rechExport).length === 0 ? (
            <div className="tiny dim" style={{ marginTop: 10 }}>
              Aucun dossier exporté.
            </div>
          ) : (
            filtre(dossiersExportes, rechExport).map(r => (
              <div className="v1-tool-row" key={r.id}>
                <Icon id="folder" />
                <div className="v1-tool-row-name">{r.label}</div>
              </div>
            ))
          )}
        </Card>

        <Card padded>
          <div className="section-title">Dossiers importés</div>
          <div className="field" style={{ marginTop: 10 }}>
            <TextInput
              value={rechImport}
              placeholder="Rechercher..."
              aria-label="Rechercher parmi les dossiers importés"
              onChange={e => setRechImport(e.target.value)}
            />
          </div>
          {filtre(dossiersImportes, rechImport).length === 0 ? (
            <div className="tiny dim" style={{ marginTop: 10 }}>
              Aucun dossier importé.
            </div>
          ) : (
            filtre(dossiersImportes, rechImport).map(r => (
              <div className="v1-tool-row" key={r.id}>
                <Icon id="folder" />
                <div className="v1-tool-row-name">{r.label}</div>
              </div>
            ))
          )}
        </Card>
      </Grid>
    </Screen>
  );
}
