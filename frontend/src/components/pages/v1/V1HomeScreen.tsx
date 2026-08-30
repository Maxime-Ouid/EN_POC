import { Card } from '../../atoms/Card';
import { Grid } from '../../atoms/Grid';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';

export interface V1HomeDossier {
  id: string;
  name: string;
  date: string;
}

export interface V1HomeScreenProps {
  derniersDossiers: V1HomeDossier[];
  supportEmail: string;
  supportTelephone: string;
  onCreerDossier?: () => void;
  onListeDossiers?: () => void;
  onOpenDossier?: (id: string) => void;
  onOutil?: (key: 'transfert-data' | 'structmaker' | 'transfert-fichiers') => void;
  onEnvoyerMessage?: () => void;
}

const OUTILS = [
  {
    key: 'transfert-data' as const,
    name: 'Transfert Data',
    desc: "Transférer vos dossiers depuis votre PC ou serveur vers un dossier de l'Espace Notarial.",
    icon: 'up',
  },
  {
    key: 'structmaker' as const,
    name: 'Structmaker',
    desc: "Importez l'arborescence complète d'un dossier Windows vers une dataroom de l'espace notarial.",
    icon: 'layers',
  },
  {
    key: 'transfert-fichiers' as const,
    name: 'Transfert de fichiers volumineux',
    desc: 'Envoyez ou recevez des fichiers volumineux avec un client.',
    icon: 'send',
  },
];

const AIDE = [
  {
    name: "Manuel utilisateur — Étude",
    desc: "Le guide complet de l'Espace Notarial pour les collaborateurs et notaires.",
    icon: 'file',
  },
  {
    name: "Support d'utilisation",
    desc: 'Consultez la documentation technique et fonctionnelle de la plateforme.',
    icon: 'shield',
  },
  {
    name: "Formulaire de création d'un accès administrateur",
    desc: 'Créez un accès administrateur pour un nouveau membre',
    icon: 'users',
  },
];

// Accueil de l'interface actuelle (docs/reference-v1, captures 113344 et 113401) :
// quatre cartes — Accès rapides, Outils essentiels, Aide, Support. Les libellés
// et les descriptifs sont ceux de la production, mot pour mot.
export function V1HomeScreen({
  derniersDossiers,
  supportEmail,
  supportTelephone,
  onCreerDossier,
  onListeDossiers,
  onOpenDossier,
  onOutil,
  onEnvoyerMessage,
}: V1HomeScreenProps) {
  return (
    <Screen>
      <Grid columns={2} style={{ marginTop: 18, alignItems: 'start' }}>
        <Card padded>
          <div className="eyebrow">Accès rapides</div>
          <div className="v1-tile-grid">
            <button type="button" className="v1-tile" onClick={onCreerDossier}>
              <Icon id="plus" />
              Créer un dossier
            </button>
            <button type="button" className="v1-tile" onClick={onListeDossiers}>
              <Icon id="list" />
              Liste des dossiers
            </button>
          </div>

          <div className="eyebrow" style={{ marginTop: 22 }}>
            Derniers dossiers ouverts
          </div>
          {derniersDossiers.length === 0 ? (
            <div className="tiny dim" style={{ marginTop: 8 }}>
              Aucun dossier ouvert récemment.
            </div>
          ) : (
            derniersDossiers.map(d => (
              <div className="v1-tool-row" key={d.id}>
                <Icon id="folder" />
                <div style={{ flex: 1 }}>
                  <button
                    type="button"
                    className="v1-tool-row-name"
                    onClick={() => onOpenDossier?.(d.id)}
                  >
                    {d.name}
                  </button>
                </div>
                <span className="tiny dim mono">{d.date}</span>
              </div>
            ))
          )}
        </Card>

        <Card padded>
          <div className="eyebrow">Outils essentiels</div>
          {OUTILS.map(o => (
            <div className="v1-tool-row" key={o.key}>
              <Icon id={o.icon} />
              <div style={{ flex: 1 }}>
                <button type="button" className="v1-tool-row-name" onClick={() => onOutil?.(o.key)}>
                  {o.name}
                </button>
                <div className="v1-tool-row-desc">{o.desc}</div>
              </div>
            </div>
          ))}
        </Card>

        <Card padded>
          <div className="eyebrow">Aide</div>
          {AIDE.map(a => (
            <div className="v1-tool-row" key={a.name}>
              <Icon id={a.icon} />
              <div style={{ flex: 1 }}>
                <div className="v1-tool-row-name">{a.name}</div>
                <div className="v1-tool-row-desc">{a.desc}</div>
              </div>
            </div>
          ))}
        </Card>

        <Card padded>
          <div className="eyebrow">Support</div>
          <div className="section-title" style={{ marginTop: 8 }}>
            Une question ?
          </div>
          <div className="v1-tool-row-desc">
            Notre équipe est disponible pour vous accompagner.
          </div>
          <div className="v1-tool-row">
            <Icon id="msg" />
            <div style={{ flex: 1 }}>
              <div className="v1-tool-row-name">{supportEmail}</div>
              <div className="v1-tool-row-name mono">{supportTelephone}</div>
            </div>
          </div>
          <div className="v1-tool-row-desc" style={{ marginTop: 10 }}>
            Vous rencontrez un problème ou avez une suggestion d'évolution ?
          </div>
          <div style={{ marginTop: 10 }}>
            <button type="button" className="v1-tile" onClick={onEnvoyerMessage}>
              <Icon id="send" />
              Envoyer un message
            </button>
          </div>
        </Card>
      </Grid>
    </Screen>
  );
}
