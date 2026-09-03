import notantisLogo from '../../assets/notantis-logo.png';

export interface SidebarFootProps {
  initials: string;
  name: string;
  role: string;
  onLogout?: () => void;
  /**
   * Ouvre « Mon compte » (§4.5). Quand elle est fournie, le bloc utilisateur
   * mène au compte et la déconnexion passe par sa seule icône : cliquer son
   * propre nom pour se déconnecter était un piège, et il n'existait aucun
   * chemin vers les réglages personnels.
   */
  onOpenAccount?: () => void;
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
  onOpenAccount,
  poweredByLogoUrl = notantisLogo,
  showPoweredBy = true,
}: SidebarFootProps) {
  return (
    <div className="sidebar-foot">
      <div
        className="foot-user clickable"
        onClick={onOpenAccount ?? onLogout}
        title={onOpenAccount ? `${name} — ${role} · mon compte` : `${name} — ${role}`}
      >
        <div className="avatar">{initials}</div>
        <div className="foot-text">
          <div className="foot-name">{name}</div>
          <div className="foot-role">{role}</div>
        </div>
        <svg
          className="icon"
          aria-label="Se déconnecter"
          onClick={
            onOpenAccount
              ? e => {
                  // Le bloc entier mène au compte : sans cet arrêt, l'icône de
                  // déconnexion ouvrirait le compte au lieu de déconnecter.
                  e.stopPropagation();
                  onLogout?.();
                }
              : undefined
          }
        >
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
