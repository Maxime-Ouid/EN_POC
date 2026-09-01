import notantisLogo from '../../assets/notantis-logo.png';

export interface SidebarBrandProps {
  logoUrl?: string;
  name: string;
  sub: string;
  /** Rail replié : pilote le sens du chevron et l'intitulé du bouton. */
  collapsed?: boolean;
  /**
   * Absent = pas de bouton. C'est le cas quand il n'y a rien à replier : office
   * déjà en « icônes seules », ou navigation en barre d'onglets.
   */
  onToggleCollapse?: () => void;
  /** Identifiant de la zone de navigation, pour `aria-controls`. */
  navId?: string;
}

// En-tête de la sidebar (logo + nom d'office/produit). Sans logo d'office
// fourni, on affiche la marque Notantis — c'est le défaut de la marque grise.
export function SidebarBrand({
  logoUrl = notantisLogo,
  name,
  sub,
  collapsed,
  onToggleCollapse,
  navId,
}: SidebarBrandProps) {
  const toggleLabel = collapsed ? 'Déployer la navigation' : 'Réduire la navigation';
  return (
    <div className="brand">
      <div className="mark">
        {logoUrl ? (
          <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <svg className="icon" style={{ width: '60%', height: '60%', color: '#fff' }}>
            <use href="#i-building" />
          </svg>
        )}
      </div>
      {/* .brand-text est le crochet du mode « icônes seules » : seul le bloc
          textuel est masqué, la marque reste visible. */}
      <div className="brand-text">
        <div className="brand-name">{name}</div>
        <div className="brand-sub">{sub}</div>
      </div>
      {/* Le bouton reste dans l'en-tête une fois le rail replié : c'est le seul
          moyen de rouvrir la colonne, il ne peut pas disparaître avec les
          libellés. Le CSS le recentre sous la marque — voir components.css,
          « Repli du rail ». */}
      {onToggleCollapse && (
        <button
          type="button"
          className="nav-collapse"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-controls={navId}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#i-chevr" />
          </svg>
        </button>
      )}
    </div>
  );
}
