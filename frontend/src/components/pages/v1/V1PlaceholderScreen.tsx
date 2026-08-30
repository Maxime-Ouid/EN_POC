import { Card } from '../../atoms/Card';
import { Screen } from '../../atoms/Screen';

export interface V1PlaceholderScreenProps {
  /** Ce que fait la rubrique dans l'interface actuelle, si on le sait. */
  role?: string;
  /** Ce qui est établi : source, éléments d'interface relevés ailleurs… */
  known?: Array<{ label: string; value: string }>;
  /** Ce qu'il faut obtenir pour reconstruire l'écran pour de bon. */
  manque?: string;
}

// Coquille structurée des rubriques dont aucune capture de l'interface actuelle
// n'a été fournie. Elle donne la navigation complète et dit explicitement ce qui
// manque, au lieu d'inventer un tableau vraisemblable : une maquette plausible
// mais fausse coûte plus cher qu'un écran vide, parce qu'elle se fait valider.
export function V1PlaceholderScreen({ role, known, manque }: V1PlaceholderScreenProps) {
  return (
    <Screen>
      {/* Le titre et le surtitre ont été retirés le 28/08/2026 : le fil
          d'Ariane nomme déjà la rubrique et l'écran. Le rôle de la rubrique,
          lui, est du contenu — il descend dans la carte au lieu de disparaître
          avec le sous-titre. */}
      <Card padded>
        <div className="v1-empty">
          <div className="v1-empty-title">Écran non reconstruit — aucune capture de référence</div>
          {role && <div className="v1-empty-desc">{role}</div>}
          <div className="v1-empty-desc">
            {manque ??
              "Cette rubrique existe dans la navigation de l'Espace Notarial actuel, mais son écran n'apparaît sur aucune des captures fournies. La navigation est donc reconstruite, l'écran non : il sera modélisé dès qu'une capture ou une session de recette sera disponible."}
          </div>
          {known && known.length > 0 && (
            <ul className="v1-known">
              {known.map(k => (
                <li key={k.label}>
                  <span className="k">{k.label}</span>
                  <span>{k.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </Screen>
  );
}
