import notantisLogo from '../../assets/notantis-logo.png';

export interface SidebarFootProps {
  initials: string;
  name: string;
  role: string;
  onLogout?: () => void;
  poweredByLogoUrl?: string;
  /**
   * Retire la mention « propulsé par Notantis ». C'est un réglage de marque
   * grise (personnalisation par office), pas une préférence d'affichage :
   * certaines études sont contractuellement les seules à devoir apparaître
   * devant leurs clients.
   */
  showPoweredBy?: boolean;
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
  showPoweredBy = true,
}: SidebarFootProps) {
  return (
    <div className="sidebar-foot">
      <div className="foot-user clickable" onClick={onLogout} title={`${name} — ${role}`}>
        <div className="avatar">{initials}</div>
        <div className="foot-text">
          <div className="foot-name">{name}</div>
          <div className="foot-role">{role}</div>
        </div>
        <svg className="icon">
          <use href="#i-logout" />
        </svg>
      </div>
      {showPoweredBy && poweredByLogoUrl && (
        <div className="notantis-mark">
          <img src={poweredByLogoUrl} alt="" style={{ width: 11, height: 11, display: 'block' }} />
          propulsé par Notantis
        </div>
      )}
    </div>
  );
}
