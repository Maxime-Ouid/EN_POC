import notantisLogo from '../../assets/notantis-logo.png';

export interface SidebarBrandProps {
  logoUrl?: string;
  name: string;
  sub: string;
}

// En-tête de la sidebar (logo + nom d'office/produit). Sans logo d'office
// fourni, on affiche la marque Notantis — c'est le défaut de la marque grise.
export function SidebarBrand({ logoUrl = notantisLogo, name, sub }: SidebarBrandProps) {
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
      <div>
        <div className="brand-name">{name}</div>
        <div className="brand-sub">{sub}</div>
      </div>
    </div>
  );
}
