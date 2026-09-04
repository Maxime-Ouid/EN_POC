import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { Toolbar } from '../../molecules/Toolbar';

export interface V1StructmakerScreenProps {
  onTelechargerApp?: () => void;
}

/* Outils > Structmaker.

   Établi : le descriptif de la tuile « Structmaker » de l'accueil (capture
   113344), repris mot pour mot, et la forme des pages de la rubrique Outils —
   des pages éditoriales qui distribuent un logiciel Windows, forme relevée sur
   « Transfert Data » (captures 115231 et 115237).

   Non relevé, et donc absent de l'écran plutôt qu'inventé : le numéro de
   version, la date de publication, les prérequis techniques, le manuel et le
   jeu de test. Le bouton de téléchargement ne porte aucune version. */
export function V1StructmakerScreen({ onTelechargerApp }: V1StructmakerScreenProps) {
  return (
    <Screen>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={onTelechargerApp}>
          <Icon id="down" />
          Télécharger l'application Structmaker
        </Button>
        <span className="tiny dim">version non relevée</span>
      </Toolbar>

      <div className="v1-info-block">
        <Icon id="shield" />
        <div>
          <p>
            Seul le descriptif de l'outil est établi. La page de la rubrique n'apparaît sur aucune
            capture : sa mise en page est reprise de « Transfert Data », l'autre outil de la
            rubrique, et le reste de son contenu attend une capture ou une session de recette.
          </p>
        </div>
      </div>

      <Card padded>
        <div className="v1-editorial">
          <p>
            Importez l'arborescence complète d'un dossier Windows vers une dataroom de l'espace
            notarial.
          </p>

          <h3>Ce qui reste à relever</h3>
          <ul>
            <li>La version distribuée et sa date de publication.</li>
            <li>Les prérequis d'installation.</li>
            <li>Les ressources jointes à la page (manuel, jeu de test).</li>
            <li>
              La différence de périmètre exacte avec Transfert Data, que les deux descriptifs de
              l'accueil ne suffisent pas à trancher.
            </li>
          </ul>
        </div>
      </Card>
    </Screen>
  );
}
