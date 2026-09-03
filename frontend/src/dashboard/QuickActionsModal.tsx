import { Button } from '../components/atoms/Button';
import { Modal } from '../components/organisms/Modal';
import { MAX_CARD_ACTIONS, QUICK_ACTIONS, QUICK_ACTIONS_BY_KEY } from './actions';

/* ===========================================================================
   Contenu de la carte « Actions rapides ».

   POURQUOI CETTE FENÊTRE VIT DANS src/dashboard/ ET NON DANS components/
   Elle connaît le catalogue des actions, qui est de la matière applicative —
   la même raison qui garde DashboardScreen hors de components/pages (voir son
   en-tête). Elle n'apporte donc aucune pièce nouvelle à la bibliothèque : elle
   assemble Modal, Button et IconChip avec le catalogue.

   DEUX LISTES ET NON UNE LISTE DE CASES À COCHER. Ce qu'on choisit ici, ce
   n'est pas seulement QUOI afficher mais DANS QUEL ORDRE : la première action
   est celle qu'on vise sans lire. Des cases à cocher auraient imposé l'ordre du
   catalogue, c'est-à-dire l'ordre de personne.

   Chaque geste est appliqué IMMÉDIATEMENT — pas de bouton « Enregistrer » : la
   carte est visible derrière la fenêtre et se met à jour à mesure, et
   l'enregistrement côté serveur est déjà différé par le hook de disposition.
   =========================================================================== */

export interface QuickActionsModalProps {
  open: boolean;
  onClose: () => void;
  /** Actions affichées, dans l'ordre. */
  selected: readonly string[];
  /** Actions praticables par ce membre — le reste n'est pas proposé. */
  allowed: readonly string[];
  onChange: (keys: string[]) => void;
}

export function QuickActionsModal({
  open,
  onClose,
  selected,
  allowed,
  onChange,
}: QuickActionsModalProps) {
  const available = QUICK_ACTIONS.filter(a => allowed.includes(a.key) && !selected.includes(a.key));
  const full = selected.length >= MAX_CARD_ACTIONS;

  const move = (index: number, delta: number) => {
    const next = [...selected];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Contenu de la carte « Actions rapides »"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Terminé
        </Button>
      }
    >
      <div className="qa-group-title">Affichées, dans l’ordre</div>
      {selected.length === 0 ? (
        <div className="qa-empty">
          La carte est vide. Ajoutez une action ci-dessous — sans quoi elle n’affichera rien.
        </div>
      ) : (
        <div className="qa-list">
          {selected.map((key, index) => {
            const action = QUICK_ACTIONS_BY_KEY[key];
            if (!action) return null;
            return (
              <div className="qa-row" key={key}>
                <span className="qa-icon">
                  <svg className="icon">
                    <use href={`#i-${action.icon}`} />
                  </svg>
                </span>
                <div className="qa-text">
                  <div className="qa-name">{action.label}</div>
                  <div className="qa-desc">{action.desc}</div>
                </div>
                <button
                  type="button"
                  className="qa-ctl qa-ctl-up"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Monter ${action.label}`}
                >
                  <svg className="icon">
                    <use href="#i-chevd" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="qa-ctl"
                  onClick={() => move(index, 1)}
                  disabled={index === selected.length - 1}
                  aria-label={`Descendre ${action.label}`}
                >
                  <svg className="icon">
                    <use href="#i-chevd" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="qa-ctl qa-ctl-off"
                  onClick={() => onChange(selected.filter(k => k !== key))}
                  aria-label={`Retirer ${action.label}`}
                >
                  <svg className="icon">
                    <use href="#i-x" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="qa-group-title">Disponibles</div>
      {available.length === 0 ? (
        <div className="qa-empty">Toutes les actions ouvertes à votre rôle sont déjà affichées.</div>
      ) : (
        <div className="qa-list">
          {available.map(action => (
            <div className="qa-row" key={action.key}>
              <span className="qa-icon qa-icon-off">
                <svg className="icon">
                  <use href={`#i-${action.icon}`} />
                </svg>
              </span>
              <div className="qa-text">
                <div className="qa-name">{action.label}</div>
                <div className="qa-desc">{action.desc}</div>
              </div>
              <button
                type="button"
                className="qa-ctl"
                onClick={() => onChange([...selected, action.key])}
                disabled={full}
                aria-label={`Ajouter ${action.label}`}
              >
                <svg className="icon">
                  <use href="#i-plus" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {full && (
        <div className="qa-empty">
          {MAX_CARD_ACTIONS} actions au maximum : au-delà, la carte devient un second menu.
          Retirez-en une pour en ajouter une autre.
        </div>
      )}
    </Modal>
  );
}
