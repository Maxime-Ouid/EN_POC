import type { NavActiveKey, NavDensityKey, NavPlacement } from '../../theme/schema';

export interface NavSwatchProps {
  /** Bord où la vignette dessine la navigation. */
  placement: NavPlacement;
  /** Rail/barre réduit — illustre le mode « icônes seules ». */
  thin?: boolean;
  /** Forme de l'indicateur dessinée sur la première entrée. */
  indicator?: NavActiveKey;
  /** Écart entre les entrées de la vignette. */
  density?: NavDensityKey;
}

/**
 * Miniature de la coquille de l'app : un cadre, une bande de navigation sur un
 * bord, trois entrées dont la première est active.
 *
 * Elle existe parce que les mots ne suffisent pas ici — « barre » et
 * « contour » ne se distinguent qu'en les voyant. Elle reste volontairement
 * schématique : l'aperçu exact, c'est l'application elle-même, qui se réagence
 * dès le clic.
 */
export function NavSwatch({ placement, thin, indicator, density }: NavSwatchProps) {
  const classes = ['nav-swatch', `is-${placement}`];
  if (thin) classes.push('is-thin');
  if (density) classes.push(`is-${density}`);

  return (
    <div className={classes.join(' ')} aria-hidden="true">
      <div className="nav-swatch-bar">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={i === 0 ? `nav-swatch-item is-active ind-${indicator ?? 'plein'}` : 'nav-swatch-item'}
          />
        ))}
      </div>
      <div className="nav-swatch-body" />
    </div>
  );
}
