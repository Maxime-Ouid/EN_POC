import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { TextInput } from '../../atoms/TextInput';
import { Textarea } from '../../atoms/Textarea';
import { Field } from '../../molecules/Field';
import { V1_AIDE_RESSOURCES } from './V1HomeScreen';

export interface V1SupportScreenProps {
  email: string;
  telephone: string;
  onEnvoyer?: (objet: string, message: string) => void;
}

/* Support (rubrique de premier niveau).

   L'écran de la rubrique n'est sur aucune capture. Ce qui est reconstruit ici
   vient MOT POUR MOT des deux cartes de l'accueil (capture 113344) :

     - carte SUPPORT : « Une question ? », « Notre equipe est disponible pour
       vous accompagner. », l'adresse, le telephone, « Vous rencontrez un
       probleme ou avez une suggestion d'evolution ? » et le bouton « Envoyer
       un message » — c'est ce bouton qui etablit qu'un formulaire existe ;
     - carte AIDE : les trois ressources, reprises telles quelles de
       V1HomeScreen pour qu'elles ne divergent jamais entre les deux ecrans.

   Ce qui reste suppose est dit a l'ecran, pas seulement en commentaire : le
   rattachement des ressources d'aide a cette rubrique, et les champs du
   formulaire (objet + message) dont la V1 n'a jamais montre la saisie. */
export function V1SupportScreen({ email, telephone, onEnvoyer }: V1SupportScreenProps) {
  const [objet, setObjet] = useState('');
  const [message, setMessage] = useState('');
  const [envoye, setEnvoye] = useState(false);

  return (
    <Screen>
      <div className="v1-info-block" style={{ marginTop: 16 }}>
        <Icon id="shield" />
        <div>
          <p>
            Établi par les cartes « Support » et « Aide » de l'accueil de l'interface actuelle :
            les coordonnées, les trois ressources et l'existence d'un bouton « Envoyer un
            message ».
          </p>
          <p>
            Supposé, à confirmer en recette : que la rubrique héberge bien ces ressources, et les
            champs du formulaire — l'écran de saisie n'apparaît sur aucune capture.
          </p>
        </div>
      </div>

      <Card padded style={{ maxWidth: 720 }}>
        <div className="section-title">Une question ?</div>
        <div className="v1-tool-row-desc">Notre équipe est disponible pour vous accompagner.</div>

        <div className="v1-tool-row">
          <Icon id="msg" />
          <div style={{ flex: 1 }}>
            <div className="v1-tool-row-name">{email}</div>
            <div className="v1-tool-row-name mono">{telephone}</div>
          </div>
        </div>

        <div className="v1-tool-row-desc" style={{ marginTop: 12 }}>
          Vous rencontrez un problème ou avez une suggestion d'évolution ?
        </div>

        <Field label="Objet" style={{ marginTop: 12 }}>
          <TextInput
            value={objet}
            placeholder="Objet de votre message"
            onChange={e => {
              setObjet(e.target.value);
              setEnvoye(false);
            }}
          />
        </Field>
        <Field label="Message">
          <Textarea
            rows={6}
            value={message}
            placeholder="Décrivez le problème rencontré ou la suggestion d'évolution."
            onChange={e => {
              setMessage(e.target.value);
              setEnvoye(false);
            }}
          />
        </Field>

        <div style={{ marginTop: 14 }}>
          <Button
            variant="primary"
            disabled={!message.trim()}
            onClick={() => {
              setEnvoye(true);
              onEnvoyer?.(objet, message);
            }}
          >
            <Icon id="send" />
            Envoyer un message
          </Button>
        </div>

        {envoye && (
          <div className="v1-warn-text">
            Rien n'a été envoyé : la reconstruction n'a pas de destinataire, et le POC n'expose
            aucun endpoint de support. Le message est resté dans cette page.
          </div>
        )}
      </Card>

      <Card padded style={{ marginTop: 16, maxWidth: 720 }}>
        <div className="eyebrow">Aide</div>
        {V1_AIDE_RESSOURCES.map(a => (
          <div className="v1-tool-row" key={a.name}>
            <Icon id={a.icon} />
            <div style={{ flex: 1 }}>
              <div className="v1-tool-row-name">{a.name}</div>
              <div className="v1-tool-row-desc">{a.desc}</div>
            </div>
          </div>
        ))}
      </Card>
    </Screen>
  );
}
