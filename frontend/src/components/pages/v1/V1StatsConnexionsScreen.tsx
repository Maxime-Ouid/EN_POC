import { Icon } from '../../atoms/Icon';
import {
  V1StatsConsultationsScreen,
  type V1StatsCriteres,
} from './V1StatsConsultationsScreen';

export interface V1StatsConnexionsScreenProps {
  onAfficher?: (criteres: V1StatsCriteres) => void;
}

/* Activités > Statistiques de connexions.

   Aucune capture. Ce qui est établi : la rubrique existe, elle est voisine
   immédiate de « Statistiques de consultations » dans le sous-menu Activités,
   et cette voisine EST documentée (captures 113500 et 115702) — période, puis
   portée sur les utilisateurs.

   L'écran réutilise donc ce formulaire, moins le bloc « Sélectionnez les
   données » (Tout / Téléchargements / Prévisualisations), qui n'a pas d'objet
   pour des connexions. C'est une hypothèse, et elle est affichée au-dessus du
   formulaire plutôt que cachée dans ce commentaire : personne ne doit valider
   cet écran en croyant qu'il a été relevé. */
export function V1StatsConnexionsScreen({ onAfficher }: V1StatsConnexionsScreenProps) {
  return (
    <V1StatsConsultationsScreen
      onAfficher={onAfficher}
      avecDonnees={false}
      notice={
        <div className="v1-info-block" style={{ marginTop: 16 }}>
          <Icon id="shield" />
          <div>
            <p>
              Formulaire supposé identique à celui des statistiques de consultations — période,
              puis sélection des utilisateurs —, sans le filtre sur les données consultées.
            </p>
            <p>
              À confirmer en recette : l'écran de la rubrique n'apparaît sur aucune capture de
              l'interface actuelle.
            </p>
          </div>
        </div>
      }
      resultatsNote="Aucune capture de l'écran de résultats n'a été fournie, et le POC ne journalise pas les connexions : afficher un tableau ici reviendrait à inventer des chiffres."
    />
  );
}
