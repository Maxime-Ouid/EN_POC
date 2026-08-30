import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { TabStrip } from '../../molecules/TabStrip';
import { Toolbar } from '../../molecules/Toolbar';

export interface V1FactureRow {
  id: string;
  libelle: string;
  montant: string;
}

export interface V1FacturationScreenProps {
  annees: string[];
  facturesParAnnee: Record<string, V1FactureRow[]>;
  onModalites?: () => void;
  onTelecharger?: (id: string) => void;
}

// Activités > Facturation du service (captures 113545, 113634, 113720, 113821) :
// bouton « Modalités de facturation », bandeau d'années, puis l'historique des
// factures mensuelles téléchargeables en PDF.
export function V1FacturationScreen({
  annees,
  facturesParAnnee,
  onModalites,
  onTelecharger,
}: V1FacturationScreenProps) {
  const [annee, setAnnee] = useState(annees[0] ?? '');
  const factures = facturesParAnnee[annee] ?? [];

  return (
    <Screen>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={onModalites}>
          <Icon id="file" />
          Modalités de facturation
        </Button>
      </Toolbar>

      <TabStrip
        tabs={annees.map(a => ({ key: a, label: a }))}
        active={annee}
        onChange={setAnnee}
      />

      <Card padded style={{ marginTop: 16 }}>
        <div className="section-title">Historique</div>
        {factures.length === 0 ? (
          <div className="tiny dim" style={{ marginTop: 10 }}>
            Aucune facture enregistrée pour {annee}.
          </div>
        ) : (
          factures.map(f => (
            <div className="v1-tool-row" key={f.id}>
              <Icon id="file" />
              <div style={{ flex: 1 }}>
                <div className="v1-tool-row-name">{f.libelle}</div>
              </div>
              <span className="mono tiny dim">{f.montant}</span>
              <Button
                size="sm"
                variant="ghost"
                title="Télécharger au format PDF"
                onClick={() => onTelecharger?.(f.id)}
              >
                <Icon id="down" />
                PDF
              </Button>
            </div>
          ))
        )}
      </Card>
    </Screen>
  );
}
