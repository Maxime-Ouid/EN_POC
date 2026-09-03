import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Screen } from '../../atoms/Screen';
import { TextInput } from '../../atoms/TextInput';
import { Textarea } from '../../atoms/Textarea';
import { Dropzone } from '../../molecules/Dropzone';
import { Field } from '../../molecules/Field';
import { TabStrip } from '../../molecules/TabStrip';

export type V1TransfertSens = 'envoyer' | 'recevoir';

export interface V1TransfertFichiersScreenProps {
  onEnvoyer?: (destinataire: string, message: string) => void;
  onDemander?: (destinataire: string, message: string) => void;
}

/* Transfert de fichiers (rubrique de premier niveau).

   Établi : le rôle de la rubrique, mot pour mot depuis la tuile « TRANSFERT de
   fichiers volumineux » de l'accueil administrateur (capture 113344) —
   « Envoyez ou recevez des fichiers volumineux avec un client » — et le fait
   que le client final a la même entrée dans son menu (capture 113322). Les
   deux sens du transfert viennent de ce descriptif, pas d'une supposition.

   Non relevé : l'écran lui-même. Les champs ci-dessous sont le minimum
   qu'implique le descriptif (un correspondant, un message, des fichiers) ; la
   durée de validité du lien, les quotas et les notifications ne sont pas
   modélisés faute de source. L'avertissement le dit à l'écran. */
export function V1TransfertFichiersScreen({
  onEnvoyer,
  onDemander,
}: V1TransfertFichiersScreenProps) {
  const [sens, setSens] = useState<V1TransfertSens>('envoyer');
  const [destinataire, setDestinataire] = useState('');
  const [message, setMessage] = useState('');
  const [fichiers, setFichiers] = useState<string[]>([]);

  const envoi = sens === 'envoyer';

  return (
    <Screen>
      <div className="v1-info-block" style={{ marginTop: 16 }}>
        <Icon id="shield" />
        <div>
          <p>
            Établi : la rubrique envoie ou reçoit des fichiers volumineux avec un client, et le
            client final y accède depuis son propre menu.
          </p>
          <p>
            Supposé : la composition de l'écran. Durée de validité du lien, taille maximale et
            notifications restent à relever.
          </p>
        </div>
      </div>

      <TabStrip
        tabs={[
          { key: 'envoyer', label: 'Envoyer des fichiers' },
          { key: 'recevoir', label: 'Recevoir des fichiers' },
        ]}
        active={sens}
        onChange={key => setSens(key as V1TransfertSens)}
      />

      <Card padded style={{ marginTop: 16, maxWidth: 720 }}>
        <Field label={envoi ? 'Destinataire' : 'Correspondant sollicité'}>
          <TextInput
            value={destinataire}
            placeholder="Adresse email du client"
            onChange={e => setDestinataire(e.target.value)}
          />
        </Field>

        <Field label="Message">
          <Textarea
            rows={4}
            value={message}
            placeholder={
              envoi
                ? "Message joint à l'envoi."
                : 'Précisez les pièces attendues et pour quand.'
            }
            onChange={e => setMessage(e.target.value)}
          />
        </Field>

        {envoi && (
          <>
            <div className="section-title" style={{ marginTop: 16 }}>
              Fichiers à envoyer
            </div>
            <Dropzone
              hint="Glisser des fichiers ou"
              onFiles={list => setFichiers(Array.from(list).map(f => f.name))}
            />
            {fichiers.length > 0 && (
              <ul className="v1-known">
                {fichiers.map(nom => (
                  <li key={nom}>
                    <span className="k">Fichier</span>
                    <span>{nom}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <Button
            variant="primary"
            disabled={!destinataire.trim()}
            onClick={() =>
              envoi ? onEnvoyer?.(destinataire, message) : onDemander?.(destinataire, message)
            }
          >
            <Icon id={envoi ? 'send' : 'down'} />
            {envoi ? 'Envoyer' : 'Demander les fichiers'}
          </Button>
        </div>

        <div className="v1-warn-text">
          Reconstruction : rien n'est transféré. Le POC ne porte pas de service d'échange de
          fichiers volumineux, et les fichiers déposés ici ne quittent pas la page.
        </div>
      </Card>
    </Screen>
  );
}
