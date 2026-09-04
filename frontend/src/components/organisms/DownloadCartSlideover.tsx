import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { RowIcon } from '../atoms/RowIcon';
import { Slideover } from './Slideover';

/* ===========================================================================
   Panier de téléchargement — §11.1.

   Le besoin vient de l'arborescence notariale elle-même : les pièces utiles à
   une même vérification sont dispersées dans dix rubriques (voir l'annexe A),
   et l'export ZIP d'un sous-dossier en ramène beaucoup trop. Le panier permet
   de composer une sélection en parcourant, puis de tout emporter d'un coup.

   Il survit au changement de dossier À L'INTÉRIEUR d'une même dataroom mais
   pas au-delà : mélanger des pièces de deux dossiers dans une archive rendrait
   l'origine de chaque fichier illisible, et le journal des accès devrait
   rattacher un même téléchargement à deux dossiers. Le panier est donc vidé
   quand on quitte la dataroom, et l'écran le dit.
   =========================================================================== */

export interface CartItem {
  id: string;
  name: string;
  folderPath: string;
  size: string;
}

export interface DownloadCartSlideoverProps {
  open: boolean;
  onClose: () => void;
  dataroomName: string;
  items: CartItem[];
  onRemove?: (id: string) => void;
  onClear?: () => void;
  onDownload?: () => void;
}

export function DownloadCartSlideover({
  open,
  onClose,
  dataroomName,
  items,
  onRemove,
  onClear,
  onDownload,
}: DownloadCartSlideoverProps) {
  return (
    <Slideover open={open} onClose={onClose} title={`Panier — ${items.length} pièce(s)`}>
      <div className="tiny dim" style={{ marginBottom: 14 }}>
        Sélection en cours dans <b>{dataroomName}</b>. Le panier se vide en quittant le dossier.
      </div>

      {items.length === 0 ? (
        <Card padded>
          <div className="tiny dim">
            Panier vide. Utilisez « Ajouter au panier » dans le menu d'une pièce pour composer
            une sélection à travers les rubriques.
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {items.map(i => (
              <div
                key={i.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                <RowIcon icon="file" bg="var(--critical-bg)" color="var(--critical)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
                  <div className="tiny dim">
                    {i.folderPath} · {i.size}
                  </div>
                </div>
                <IconButton
                  icon="x"
                  aria-label={`Retirer ${i.name} du panier`}
                  onClick={() => onRemove?.(i.id)}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="accent" size="sm" onClick={onDownload}>
              <Icon id="zip" />
              Télécharger le panier
            </Button>
            <Button size="sm" onClick={onClear}>
              Vider
            </Button>
          </div>
        </>
      )}
    </Slideover>
  );
}
