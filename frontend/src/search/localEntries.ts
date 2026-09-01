/* ===========================================================================
   Sources de recherche qui n'ont pas d'endpoint.

   Trois familles, pour une raison différente chacune :
   - les ÉCRANS de l'application — ils n'existent que dans la navigation du
     front, c'est ce qui fait qu'une palette ⌘K remplace le menu ;
   - les MODULES activés — la liste vient bien du serveur
     (/api/tenant-config/), mais leurs libellés et descriptions vivent dans le
     catalogue front (data/demo.tsx), le backend ne les expose pas ;
   - les données de DÉMONSTRATION — portefeuilles, factures, Q&R… inventées
     côté front en attendant leurs modèles. Elles portent `simulated: true`
     pour que la palette le dise : une recherche qui renvoie des résultats
     indiscernables du réel alors qu'ils n'existent en base nulle part est pire
     qu'une recherche incomplète.

   Chaque entrée porte sa propre action d'ouverture plutôt qu'un identifiant à
   réinterpréter : les destinations n'ont rien de commun entre un écran, un
   module et une ligne de facture.
   =========================================================================== */

export interface LocalEntry {
  key: string;
  /** Id du sprite d'icônes, sans le « # » (voir atoms/IconSprite). */
  icon: string;
  name: string;
  /** Chemin lisible affiché sous le nom, même rôle que `path` côté serveur. */
  path: string;
  /** Libellé de type affiché à droite (« Écran », « Portefeuille »…). */
  kindLabel: string;
  /** Donnée inventée côté front : la palette affiche une pastille. */
  simulated?: boolean;
  open: () => void;
}
