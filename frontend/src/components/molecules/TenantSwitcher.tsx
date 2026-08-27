export interface TenantSwitcherProps {
  name: string;
  role: string;
  onClick?: () => void;
}

// Sélecteur d'office cliquable — pattern de la V1 (voir §6.14 / mémoire de
// projet "personnalisation") : à brancher sur l'échange de ticket SSO déjà en
// place côté backend (voir switchOffice() dans App.tsx).
export function TenantSwitcher({ name, role, onClick }: TenantSwitcherProps) {
  return (
    <div className="tenant-switcher clickable" onClick={onClick}>
      <div className="tsicon">
        <svg className="icon">
          <use href="#i-building" />
        </svg>
      </div>
      <div>
        <div className="tenant-name">{name}</div>
        <div className="tenant-role">{role}</div>
      </div>
      <svg className="icon chev">
        <use href="#i-chevd" />
      </svg>
    </div>
  );
}
