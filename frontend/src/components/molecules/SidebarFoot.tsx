import notantisLogo from '../../assets/notantis-logo.png';

export interface SidebarFootProps {
  initials: string;
  name: string;
  role: string;
  onLogout?: () => void;
  poweredByLogoUrl?: string;
}

// Pied de sidebar : utilisateur connecté (clic = déconnexion) + mention
// "propulsé par Notantis" — les tokens --brand-strong/--brand-soft existent
// spécifiquement pour garder cette mention lisible en thème sombre (voir
// DESIGN_SYSTEM.md §3, note du 26/08/2026).
export function SidebarFoot({
  initials,
  name,
  role,
  onLogout,
  poweredByLogoUrl = notantisLogo,
}: SidebarFootProps) {
  return (
    <div className="sidebar-foot">
      <div className="foot-user clickable" onClick={onLogout}>
        <div className="avatar">{initials}</div>
        <div>
          <div className="foot-name">{name}</div>
          <div className="foot-role">{role}</div>
        </div>
        <svg className="icon">
          <use href="#i-logout" />
        </svg>
      </div>
      {poweredByLogoUrl && (
        <div className="notantis-mark">
          <img src={poweredByLogoUrl} alt="" style={{ width: 11, height: 11, display: 'block' }} />
          propulsé par Notantis
        </div>
      )}
    </div>
  );
}
