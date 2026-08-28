import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { PageHeader } from '../../molecules/PageHeader';
import { Toolbar } from '../../molecules/Toolbar';

export interface V1TransfertDataScreenProps {
  version: string;
  publieeLe: string;
  contactEmail: string;
  onTelechargerApp?: () => void;
  onTelechargerManuel?: () => void;
  onTelechargerDemo?: () => void;
}

// Outils > Transfert Data (captures 115231 et 115237). Page éditoriale : elle
// distribue l'application Windows, son manuel et un jeu de test. La capture du
// LOGICIEL de bureau présente en bas de la page V1 n'est pas reconstruite — ce
// n'est pas un écran de l'application web.
export function V1TransfertDataScreen({
  version,
  publieeLe,
  contactEmail,
  onTelechargerApp,
  onTelechargerManuel,
  onTelechargerDemo,
}: V1TransfertDataScreenProps) {
  return (
    <Screen>
      <PageHeader eyebrow="Outils" title="Transfert Data" />

      <Toolbar>
        <Button size="sm" variant="primary" onClick={onTelechargerApp}>
          <Icon id="down" />
          Télécharger l'application TransfertData
        </Button>
        <span className="tiny dim">
          version {version}, publiée le {publieeLe}
        </span>
      </Toolbar>

      <Card padded>
        <div className="v1-editorial">
          <p>
            TransfertData envoie vers l'Espace Notarial le contenu d'un dossier de votre poste ou
            de votre serveur, en conservant l'arborescence, et met à jour un dossier déjà en ligne
            sans réenvoyer ce qui n'a pas changé.
          </p>

          <h3>Les étapes de la mise à jour des dossiers via Transfert Data</h3>
          <ol>
            <li>Sélection de l'Espace Client (possibilité de le créer)</li>
            <li>Sélection du dossier de l'Espace Notarial (possibilité de le créer)</li>
            <li>Sélection du dossier en local</li>
            <li>Lancement de la mise à jour</li>
            <li>Envoi des notifications aux membres du dossier</li>
          </ol>

          <h3>Installation</h3>
          <p>
            Pré-requis technique : le logiciel « Microsoft .Net » (version 4.5 minimum) doit être
            installé au préalable sur votre PC.
          </p>
          <p>
            Une question sur l'installation ? <strong>{contactEmail}</strong>
          </p>
        </div>

        <div className="v1-tile-grid">
          <button type="button" className="v1-tile" onClick={onTelechargerManuel}>
            <Icon id="file" />
            Manuel utilisateur (PDF)
          </button>
          <button type="button" className="v1-tile" onClick={onTelechargerDemo}>
            <Icon id="zip" />
            Dossier de test (ZIP)
          </button>
        </div>
        <div className="help">
          dataroom-demo.zip, 665 Ko — arborescence de 12 sous-dossiers et 14 fichiers.
        </div>
      </Card>
    </Screen>
  );
}
