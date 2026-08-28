import { Card } from '../../atoms/Card';
import { Screen } from '../../atoms/Screen';
import { PageHeader } from '../../molecules/PageHeader';

export interface V1PlaceholderScreenProps {
  eyebrow?: string;
  title: string;
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
export function V1PlaceholderScreen({
  eyebrow,
  title,
  role,
  known,
  manque,
}: V1PlaceholderScreenProps) {
  return (
    <Screen>
      <PageHeader eyebrow={eyebrow} title={title} sub={role} />

      <Card padded style={{ marginTop: 18 }}>
        <div className="v1-empty">
          <div className="v1-empty-title">Écran non reconstruit — aucune capture de référence</div>
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
