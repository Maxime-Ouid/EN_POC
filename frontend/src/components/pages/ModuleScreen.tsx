import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { RowIcon } from '../atoms/RowIcon';

export type ModuleScreenStatus = 'loading' | 'ready' | 'disabled' | 'no-screen' | 'error';

export interface ModuleScreenProps {
  name: string;
  desc: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  status: ModuleScreenStatus;
  /** Contenu renvoyé par le module (GET /api/modules/<slug>/). */
  message?: string | null;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Écran d'un module activé pour l'office.
 *
 * C'est la traduction visible du pari n°1 du POC : un module s'active par office
 * sans redéploiement. L'écran ne fabrique donc rien — il montre ce que le
 * serveur répond, y compris quand la réponse est un refus. Les quatre états ont
 * chacun leur formulation : « pas encore d'écran » n'est pas une panne, et
 * « module non activé » n'est pas une erreur technique.
 */
export function ModuleScreen({
  name,
  desc,
  icon,
  iconBg,
  iconColor,
  status,
  message,
  error,
  onRetry,
}: ModuleScreenProps) {
  return (
    <section className="screen is-active">
      <div className="eyebrow">Module de l'office</div>
      <h1 className="page-title">{name}</h1>
      <div className="page-sub">{desc}</div>

      <Card padded style={{ marginTop: 20, maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <RowIcon icon={icon} bg={iconBg} color={iconColor} />
          <div style={{ flex: 1 }}>
            <div className="section-title">{name}</div>
            <div className="tiny dim">Servi par le backend de l'office, pas par le front</div>
          </div>
          {status === 'ready' && <Pill kind="success">Activé</Pill>}
          {status === 'disabled' && <Pill kind="neutral">Non activé</Pill>}
          {status === 'no-screen' && <Pill kind="neutral">Écran à venir</Pill>}
        </div>

        <hr className="sep" style={{ margin: '0 0 14px' }} />

        {status === 'loading' && <div className="dim">Chargement du module…</div>}

        {status === 'ready' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Icon id="check" style={{ width: 14, height: 14, marginTop: 2, color: 'var(--success)' }} />
            <div>{message}</div>
          </div>
        )}

        {status === 'disabled' && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Ce module n'est pas activé pour cet office.
            </div>
            <div className="tiny dim">
              L'activation se fait office par office, sans redéploiement — voir
              Personnalisation → Modules & modèles.
            </div>
          </div>
        )}

        {status === 'no-screen' && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Module activé, écran pas encore livré.
            </div>
            <div className="tiny dim">
              L'office y a droit et le menu le montre ; il n'y a simplement pas encore de
              contenu servi pour ce module.
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Module injoignable</div>
            <div className="tiny dim" style={{ marginBottom: 12 }}>
              {error}
            </div>
            {onRetry && (
              <Button size="sm" onClick={onRetry}>
                Réessayer
              </Button>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
